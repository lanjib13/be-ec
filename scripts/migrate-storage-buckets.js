import { Prisma } from '@prisma/client';
import { env } from '../src/config/env.js';
import { prisma } from '../src/config/prisma.js';
import { STORAGE_FEATURES, bucketForFeature } from '../src/config/storage.js';
import { getSupabaseStorageClient } from '../src/config/supabase.js';
import { detectImageType } from '../src/services/storage.service.js';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BUCKET_OPTIONS = {
  public: true,
  fileSizeLimit: MAX_FILE_SIZE,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
};

// Kolom teks yang menyimpan satu URL gambar.
const textColumns = [
  ['about_misi', 'gambar_url'],
  ['about_output', 'gambar_url'],
  ['events', 'foto_cover'],
  ['produk', 'foto_cover'],
  ['berita', 'gambar_sampul'],
  ['program', 'foto_cover'],
  ['achievements', 'gambar'],
  ['mitra', 'logo_url'],
];

// Kolom JSON yang menyimpan array URL gambar.
const jsonColumns = [
  ['produk', 'galeri'],
  ['program', 'galeri'],
];

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const deleteLegacy = argv.includes('--delete-legacy');
const featureArg = argv.find((arg) => arg.startsWith('--feature='));
const featureFilter = featureArg ? featureArg.slice('--feature='.length) : null;

function fail(message) {
  throw new Error(message);
}

function log(message = '') {
  console.log(message);
}

async function listObjects(storage, bucket, prefix = '') {
  const entries = [];
  const limit = 1000;
  let offset = 0;

  for (;;) {
    const { data, error } = await storage.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) fail(`Gagal membaca daftar objek ${bucket}/${prefix}: ${error.message}`);

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        entries.push({ path, item });
      } else {
        entries.push(...await listObjects(storage, bucket, path));
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return entries;
}

async function ensureBuckets(storage, features) {
  const { data: buckets, error } = await storage.storage.listBuckets();
  if (error) fail(`Gagal membaca daftar bucket: ${error.message}`);

  const existing = new Set(buckets.map((bucket) => bucket.id));

  for (const feature of features) {
    const bucket = bucketForFeature(feature);
    if (existing.has(bucket)) continue;

    if (!apply) {
      log(`[dry-run] buat bucket ${bucket}`);
      continue;
    }

    const { error: createError } = await storage.storage.createBucket(bucket, BUCKET_OPTIONS);
    if (createError) fail(`Gagal membuat bucket ${bucket}: ${createError.message}`);
    log(`Bucket ${bucket} dibuat.`);
  }

  return existing;
}

async function countReferences(needle) {
  let total = 0;

  for (const [table, column] of [...textColumns, ...jsonColumns]) {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT count(*)::int AS count
      FROM ${Prisma.raw(`"${table}"`)}
      WHERE ${Prisma.raw(`"${column}"`)} IS NOT NULL
        AND strpos(${Prisma.raw(`"${column}"`)}::text, ${needle}) > 0
    `);
    total += rows[0].count;
  }

  return total;
}

async function rewriteReferences(oldBase, newBase) {
  const result = { text: 0, json: 0 };

  for (const [table, column] of textColumns) {
    result.text += await prisma.$executeRaw(Prisma.sql`
      UPDATE ${Prisma.raw(`"${table}"`)}
      SET ${Prisma.raw(`"${column}"`)} = replace(${Prisma.raw(`"${column}"`)}, ${oldBase}, ${newBase})
      WHERE ${Prisma.raw(`"${column}"`)} IS NOT NULL
        AND strpos(${Prisma.raw(`"${column}"`)}, ${oldBase}) > 0
    `);
  }

  for (const [table, column] of jsonColumns) {
    result.json += await prisma.$executeRaw(Prisma.sql`
      UPDATE ${Prisma.raw(`"${table}"`)}
      SET ${Prisma.raw(`"${column}"`)} = replace(${Prisma.raw(`"${column}"`)}::text, ${oldBase}, ${newBase})::jsonb
      WHERE ${Prisma.raw(`"${column}"`)} IS NOT NULL
        AND strpos(${Prisma.raw(`"${column}"`)}::text, ${oldBase}) > 0
    `);
  }

  return result;
}

async function migrateFeature(storage, feature, baseUrl, legacyBucket) {
  const targetBucket = bucketForFeature(feature);
  const oldBase = `${baseUrl}/storage/v1/object/public/${legacyBucket}/${feature}/`;
  const newBase = `${baseUrl}/storage/v1/object/public/${targetBucket}/`;
  const objects = await listObjects(storage, legacyBucket, feature);
  const references = await countReferences(oldBase);

  log(`\n[${feature}] ${objects.length} objek, ${references} referensi URL di database`);
  log(`  ${legacyBucket}/${feature}/ -> ${targetBucket}/`);

  if (objects.length === 0 && references === 0) {
    log('  Tidak ada yang perlu dimigrasikan.');
    return { feature, moved: 0, failed: 0, rewritten: 0, legacyPaths: [] };
  }

  if (objects.length === 0 && references > 0) {
    log('  Peringatan: referensi URL lama ditemukan tetapi objeknya tidak ada di bucket lama. Rewrite dilewati.');
    return { feature, moved: 0, failed: references, rewritten: 0, legacyPaths: [] };
  }

  if (!apply) {
    for (const { path } of objects) {
      log(`  [dry-run] pindah ${legacyBucket}/${path} -> ${targetBucket}/${path.slice(feature.length + 1)}`);
    }
    log(`  [dry-run] tulis ulang ${references} referensi URL`);
    return { feature, moved: 0, failed: 0, rewritten: 0, legacyPaths: [] };
  }

  let moved = 0;
  let failed = 0;
  const legacyPaths = [];

  for (const entry of objects) {
    const targetPath = entry.path.slice(feature.length + 1);

    try {
      const { data: blob, error: downloadError } = await storage.storage
        .from(legacyBucket)
        .download(entry.path);
      if (downloadError) fail(downloadError.message);

      const buffer = Buffer.from(await blob.arrayBuffer());
      const detected = detectImageType(buffer);
      const contentType = entry.item.metadata?.mimetype ?? detected?.mimeType ?? 'application/octet-stream';

      const { error: uploadError } = await storage.storage
        .from(targetBucket)
        .upload(targetPath, buffer, {
          contentType,
          cacheControl: '3600',
          upsert: true,
        });
      if (uploadError) fail(uploadError.message);

      const { data: publicUrl } = storage.storage.from(targetBucket).getPublicUrl(targetPath);
      const head = await fetch(publicUrl.publicUrl, { method: 'HEAD' });
      if (!head.ok) fail(`verifikasi URL gagal (HTTP ${head.status})`);

      moved += 1;
      legacyPaths.push(entry.path);
      log(`  OK ${legacyBucket}/${entry.path} -> ${targetBucket}/${targetPath}`);
    } catch (error) {
      failed += 1;
      console.error(`  GAGAL ${legacyBucket}/${entry.path}: ${error.message}`);
    }
  }

  let rewritten = 0;
  if (failed === 0) {
    const result = await rewriteReferences(oldBase, newBase);
    rewritten = result.text + result.json;
    log(`  ${rewritten} baris database diperbarui.`);
  } else {
    log('  Rewrite database dilewati karena ada objek yang gagal dipindah.');
  }

  const remaining = await countReferences(oldBase);
  if (remaining > 0) {
    failed += remaining;
    console.error(`  Masih ada ${remaining} referensi URL lama di database.`);
  }

  return { feature, moved, failed, rewritten, legacyPaths };
}

async function removeLegacy(storage, legacyBucket, legacyPaths) {
  const chunkSize = 100;

  for (let index = 0; index < legacyPaths.length; index += chunkSize) {
    const chunk = legacyPaths.slice(index, index + chunkSize);
    const { error } = await storage.storage.from(legacyBucket).remove(chunk);
    if (error) fail(`Gagal menghapus objek lama: ${error.message}`);
  }

  const remaining = await listObjects(storage, legacyBucket);
  if (remaining.length > 0) {
    log(`\nBucket ${legacyBucket} masih berisi ${remaining.length} objek; bucket tidak dihapus.`);
    for (const entry of remaining.slice(0, 20)) log(`  - ${entry.path}`);
    if (remaining.length > 20) log(`  ... dan ${remaining.length - 20} objek lain`);
    return;
  }

  const { error } = await storage.storage.deleteBucket(legacyBucket);
  if (error) fail(`Gagal menghapus bucket ${legacyBucket}: ${error.message}`);
  log(`\nBucket ${legacyBucket} kosong dan sudah dihapus.`);
}

async function main() {
  const features = featureFilter ? [featureFilter] : [...STORAGE_FEATURES];
  const invalid = features.filter((feature) => !STORAGE_FEATURES.includes(feature));
  if (invalid.length > 0) fail(`Fitur tidak dikenal: ${invalid.join(', ')}`);
  if (featureFilter && deleteLegacy) fail('--delete-legacy tidak boleh dipakai bersama --feature.');

  const legacyBucket = env.SUPABASE_STORAGE_LEGACY_BUCKET;
  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
  const storage = getSupabaseStorageClient();

  log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}${deleteLegacy ? ' + hapus bucket lama' : ''}`);
  log(`Bucket lama: ${legacyBucket}`);
  log(`Bucket baru: ${features.map((feature) => bucketForFeature(feature)).join(', ')}`);

  const existingBuckets = await ensureBuckets(storage, features);

  if (!existingBuckets.has(legacyBucket)) {
    log(`\nBucket lama ${legacyBucket} tidak ditemukan; tidak ada aset yang dipindahkan.`);
    return;
  }

  const summary = [];
  for (const feature of features) {
    summary.push(await migrateFeature(storage, feature, baseUrl, legacyBucket));
  }

  const moved = summary.reduce((total, item) => total + item.moved, 0);
  const failed = summary.reduce((total, item) => total + item.failed, 0);
  const rewritten = summary.reduce((total, item) => total + item.rewritten, 0);
  const legacyPaths = summary.flatMap((item) => item.legacyPaths);

  log(`\nRingkasan: ${moved} objek dipindah, ${rewritten} baris diperbarui, ${failed} masalah.`);

  if (failed > 0) {
    process.exitCode = 1;
    return;
  }

  if (!apply) {
    log('Jalankan ulang dengan --apply untuk mengeksekusi migrasi.');
    return;
  }

  if (deleteLegacy) {
    await removeLegacy(storage, legacyBucket, legacyPaths);
  } else if (legacyPaths.length > 0) {
    log(`\nObjek lama dipertahankan. Jalankan dengan --delete-legacy untuk menghapus ${legacyBucket}.`);
  }
}

try {
  await main();
} catch (error) {
  console.error(`\nMigrasi gagal: ${error.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
