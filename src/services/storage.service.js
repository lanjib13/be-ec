import { randomUUID } from 'node:crypto';
import { bucketForFeature, STORAGE_FEATURES } from '../config/storage.js';
import { getSupabaseStorageClient } from '../config/supabase.js';

const imageTypes = new Map([
  ['image/jpeg', { extension: 'jpg', matches: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff }],
  ['image/png', { extension: 'png', matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ['image/webp', { extension: 'webp', matches: (buffer) => buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' }],
]);

export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;

  for (const [mimeType, imageType] of imageTypes) {
    if (imageType.matches(buffer)) return { mimeType, extension: imageType.extension };
  }

  return null;
}

export async function uploadImage(file, feature = 'lainnya') {
  const detected = detectImageType(file.buffer);

  if (!detected || detected.mimeType !== file.mimetype) {
    const error = new Error('Format file harus berupa JPG, PNG, atau WebP yang valid.');
    error.status = 415;
    error.code = 'UNSUPPORTED_MEDIA_TYPE';
    throw error;
  }

  const bucket = bucketForFeature(feature);
  const path = `${randomUUID()}.${detected.extension}`;
  const storage = getSupabaseStorageClient();
  const { data, error: uploadError } = await storage.storage
    .from(bucket)
    .upload(path, file.buffer, {
      contentType: detected.mimeType,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    const error = new Error('Gambar gagal diunggah ke Supabase Storage.');
    error.status = 502;
    error.code = 'STORAGE_UPLOAD_FAILED';
    error.cause = uploadError;
    throw error;
  }

  const { data: publicUrl } = storage.storage.from(bucket).getPublicUrl(data.path);
  return {
    bucket,
    feature,
    path: data.path,
    url: publicUrl.publicUrl,
    content_type: detected.mimeType,
    size: file.size,
  };
}

export function parseStorageUrl(url) {
  if (typeof url !== 'string') return null;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const match = parsed.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return null;

  try {
    return { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) };
  } catch {
    return { bucket: match[1], path: match[2] };
  }
}

export function isManagedBucket(bucket) {
  return STORAGE_FEATURES.some((feature) => bucketForFeature(feature) === bucket);
}

// Menghapus objek hanya dari bucket yang dikelola aplikasi. Kegagalan satu
// objek tidak menghentikan pembersihan objek lain.
export async function deleteImages(urls) {
  const byBucket = new Map();

  for (const url of urls ?? []) {
    const target = parseStorageUrl(url);
    if (!target || !isManagedBucket(target.bucket)) continue;
    if (!byBucket.has(target.bucket)) byBucket.set(target.bucket, new Set());
    byBucket.get(target.bucket).add(target.path);
  }

  if (byBucket.size === 0) return 0;

  const storage = getSupabaseStorageClient();
  let deleted = 0;

  for (const [bucket, paths] of byBucket) {
    const list = [...paths];

    for (let index = 0; index < list.length; index += 100) {
      const chunk = list.slice(index, index + 100);
      const { error } = await storage.storage.from(bucket).remove(chunk);
      if (error) {
        console.warn(`Gagal menghapus gambar dari ${bucket}: ${error.message}`);
        continue;
      }
      deleted += chunk.length;
    }
  }

  return deleted;
}
