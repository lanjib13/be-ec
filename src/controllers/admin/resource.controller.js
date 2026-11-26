import { prisma } from '../../lib/prisma.js';
import { cleanupImagesInBackground } from '../../services/image-cleanup.service.js';
import { httpError, notFound, normalizeWhatsApp, parsePage, withPrismaErrors } from '../../utils/http-error.js';
import { partialSchema, schemas, validateData } from '../../utils/validation.js';
import { adminHelpers } from './shared.js';

const { responsePage, queryText, dbInput, parseAdminFilters, attachSearch } = adminHelpers;

// Kolom gambar per resource; dipakai untuk membersihkan file lama.
const imageFieldsByResource = {
  program: ['foto_cover', 'galeri'],
  achievement: ['gambar'],
  news: ['gambar_sampul'],
  events: ['foto_cover'],
  partners: ['logo_url'],
  products: ['foto_cover', 'galeri'],
};

function collectImageUrls(row, fields) {
  if (!row) return [];

  const urls = [];
  for (const field of fields) {
    const value = row[field];
    if (typeof value === 'string') {
      urls.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') urls.push(item);
      }
    }
  }
  return urls;
}

const resourceConfig = {
  stats: {
    delegate: prisma.statistik,
    resource: 'statistik',
    schema: schemas.statistik,
    searchable: ['label'],
    orderBy: { urutan: 'asc' },
    filters: {},
    transform: (row) => ({ ...row, nilai_angka: Number(row.nilai_angka), persentase_pertumbuhan: row.persentase_pertumbuhan === null ? null : Number(row.persentase_pertumbuhan) }),
  },
  programs: {
    delegate: prisma.program,
    resource: 'program',
    schema: schemas.program,
    searchable: ['nama', 'kategori'],
    orderBy: { nama: 'asc' },
    filters: { status_aktif: 'boolean' },
  },
  achievements: {
    delegate: prisma.achievement,
    resource: 'achievement',
    schema: schemas.achievement,
    searchable: ['judul', 'nama_anggota'],
    orderBy: [{ tahun: 'desc' }, { judul: 'asc' }],
    filters: { type: 'enum:prestasi,karya' },
  },
  social: {
    delegate: prisma.sosmed,
    resource: 'social',
    schema: schemas.social,
    searchable: ['url'],
    orderBy: { urutan: 'asc' },
    filters: { kind: 'enum:link,post', platform: 'enum:youtube,linkedin,tiktok,instagram', status_tampil: 'boolean' },
  },
  news: {
    delegate: prisma.berita,
    resource: 'news',
    schema: schemas.news,
    searchable: ['judul', 'kategori'],
    orderBy: { created_at: 'desc' },
    filters: { status: 'enum:draft,scheduled,published', kategori: 'string' },
  },
  events: {
    delegate: prisma.event,
    resource: 'events',
    schema: schemas.event,
    searchable: ['judul'],
    orderBy: { tanggal_mulai: 'desc' },
    filters: { status_aktif: 'boolean' },
    include: { _count: { select: { pendaftar: true } } },
    transform: ({ _count, ...row }) => ({ ...row, jumlah_pendaftar: _count.pendaftar }),
  },
  partners: {
    delegate: prisma.mitra,
    resource: 'partners',
    schema: schemas.partner,
    searchable: ['nama_mitra', 'tier'],
    orderBy: { nama_mitra: 'asc' },
    filters: { status_tampil: 'boolean' },
  },
  products: {
    delegate: prisma.produk,
    resource: 'products',
    schema: schemas.product,
    searchable: ['nama', 'kategori'],
    orderBy: [{ urutan: 'asc' }, { created_at: 'desc' }],
    filters: { kategori: 'string', status_tampil: 'boolean', status_stok: 'enum:tersedia,habis' },
    transform: (row) => ({ ...row, harga: row.harga === null ? null : Number(row.harga) }),
  },
};


export function createCrudHandlers(config) {
  const { delegate, resource, schema } = config;
  const updateSchema = partialSchema(schema);

  return {
    list: withPrismaErrors(async (req, res) => {
    const { page, limit, skip } = parsePage(req.query, 20, 100);
    const where = attachSearch(parseAdminFilters(req.query, config.filters), queryText(req.query), config.searchable);
    const [rows, total] = await prisma.$transaction([
      delegate.findMany({ where, orderBy: config.orderBy, include: config.include, skip, take: limit }),
      delegate.count({ where }),
    ]);
    res.json(responsePage(config.transform ? rows.map(config.transform) : rows, total, page, limit));
    }),

    create: withPrismaErrors(async (req, res) => {
    const input = validateData(schema, req.body);
    const data = await delegate.create({ data: dbInput(resource, input, req) });
    res.status(201).json({ data: config.transform ? config.transform(data) : data });
    }),

    getById: withPrismaErrors(async (req, res) => {
    const where = { id: req.params.id };
    const data = await delegate.findUnique({ where, include: config.include });
    if (!data) throw notFound();
    res.json({ data: config.transform ? config.transform(data) : data });
    }),

    update: withPrismaErrors(async (req, res) => {
    const input = validateData(updateSchema, req.body);
    const imageFields = imageFieldsByResource[resource] ?? [];
    const needsCurrent = imageFields.length > 0 || ['events', 'news', 'social'].includes(resource);
    let current;
    if (needsCurrent) {
      current = await delegate.findUnique({ where: { id: req.params.id } });
      if (!current) throw notFound();
    }
    if (resource === 'events') {
      const start = input.tanggal_mulai ?? current.tanggal_mulai;
      const end = input.tanggal_selesai ?? current.tanggal_selesai;
      const deadline = input.batas_daftar ?? current.batas_daftar;
      if (end <= start) throw httpError(422, 'VALIDATION_ERROR', 'Tanggal selesai harus setelah tanggal mulai.');
      if (deadline > end) throw httpError(422, 'VALIDATION_ERROR', 'Batas pendaftaran tidak boleh melewati waktu selesai event.');
    }
    if (resource === 'news') {
      const status = input.status ?? current.status;
      const schedule = Object.hasOwn(input, 'jadwal_terbit') ? input.jadwal_terbit : current.jadwal_terbit;
      if (status === 'scheduled' && (!schedule || schedule <= new Date())) {
        throw httpError(422, 'VALIDATION_ERROR', 'Berita terjadwal wajib memiliki waktu terbit di masa depan.', [
          { field: 'jadwal_terbit', message: 'Masukkan waktu terbit di masa depan.' },
        ]);
      }
      if (status === 'published' && current.status !== 'published') {
        input.published_at = new Date();
      }
    }
    if (resource === 'social') {
      const kind = input.kind ?? current.kind;
      const platform = input.platform ?? current.platform;
      if (kind === 'post' && !['instagram', 'tiktok'].includes(platform)) {
        throw httpError(422, 'VALIDATION_ERROR', 'Konten embed hanya mendukung Instagram atau TikTok.');
      }
    }
    const data = await delegate.update({
      where: { id: req.params.id },
      data: resource === 'news'
        ? { ...dbInput(resource, input, req), ...(input.published_at ? { published_at: input.published_at } : {}) }
        : dbInput(resource, input, req),
      include: config.include,
    });
    res.json({ data: config.transform ? config.transform(data) : data });
    if (imageFields.length > 0) {
      const after = new Set(collectImageUrls(data, imageFields));
      cleanupImagesInBackground(collectImageUrls(current, imageFields).filter((url) => !after.has(url)));
    }
    }),

    delete: withPrismaErrors(async (req, res) => {
    const imageFields = imageFieldsByResource[resource] ?? [];
    const current = imageFields.length > 0
      ? await delegate.findUnique({ where: { id: req.params.id } })
      : null;
    if (imageFields.length > 0 && !current) throw notFound();
    await delegate.delete({ where: { id: req.params.id } });
    res.status(204).end();
    if (current) cleanupImagesInBackground(collectImageUrls(current, imageFields));
    }),
  };
}


export { resourceConfig };
export const getSettings = withPrismaErrors(async (_req, res) => {
  const data = await prisma.aboutOrganisasi.findUnique({
    where: { id: 1 },
    include: { misi: { orderBy: { urutan: 'asc' } } },
  });
  if (!data) throw notFound('Pengaturan About belum tersedia.');
  const output = await prisma.aboutOutput.findMany({ orderBy: { urutan: 'asc' } });
  res.json({
    data: {
      tagline: data.tagline,
      visi: data.visi,
      deskripsi_singkat: data.deskripsi_singkat,
      wa_katalog_default: data.wa_katalog_default,
      misi: data.misi,
      output,
      updated_at: data.updated_at,
    },
  });
});

export const updateSettings = withPrismaErrors(async (req, res) => {
  const input = validateData(schemas.settings, req.body);
  const removedImages = [];
  const data = await prisma.$transaction(async (tx) => {
    const currentMisi = await tx.aboutMisi.findMany({ where: { about_id: 1 }, select: { id: true, gambar_url: true } });
    const currentOutput = await tx.aboutOutput.findMany({ select: { id: true, gambar_url: true } });
    for (const item of [...input.misi, ...input.output]) {
      if (item.id && ![...currentMisi, ...currentOutput].some((row) => row.id === item.id)) {
        throw notFound('ID item About tidak ditemukan.');
      }
    }
    await tx.aboutOrganisasi.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        tagline: input.tagline,
        visi: input.visi,
        deskripsi_singkat: input.deskripsi_singkat,
        wa_katalog_default: input.wa_katalog_default ? normalizeWhatsApp(input.wa_katalog_default) : null,
      },
      update: {
        tagline: input.tagline,
        visi: input.visi,
        deskripsi_singkat: input.deskripsi_singkat,
        wa_katalog_default: input.wa_katalog_default ? normalizeWhatsApp(input.wa_katalog_default) : null,
      },
    });
    const misiIds = input.misi.map(({ id }) => id).filter(Boolean);
    for (const row of currentMisi) {
      if (row.gambar_url && !misiIds.includes(row.id)) removedImages.push(row.gambar_url);
    }
    await tx.aboutMisi.deleteMany({ where: { about_id: 1, ...(misiIds.length ? { id: { notIn: misiIds } } : {}) } });
    for (const item of input.misi) {
      const { id, ...values } = item;
      if (id) {
        const before = currentMisi.find((row) => row.id === id);
        const next = Object.hasOwn(values, 'gambar_url') ? values.gambar_url : before?.gambar_url;
        if (before?.gambar_url && before.gambar_url !== next) removedImages.push(before.gambar_url);
        await tx.aboutMisi.update({ where: { id }, data: values });
      } else {
        await tx.aboutMisi.create({ data: { ...values, about_id: 1 } });
      }
    }
    const outputIds = input.output.map(({ id }) => id).filter(Boolean);
    for (const row of currentOutput) {
      if (row.gambar_url && !outputIds.includes(row.id)) removedImages.push(row.gambar_url);
    }
    await tx.aboutOutput.deleteMany({ where: outputIds.length ? { id: { notIn: outputIds } } : {} });
    for (const item of input.output) {
      const { id, ...values } = item;
      if (id) {
        const before = currentOutput.find((row) => row.id === id);
        const next = Object.hasOwn(values, 'gambar_url') ? values.gambar_url : before?.gambar_url;
        if (before?.gambar_url && before.gambar_url !== next) removedImages.push(before.gambar_url);
        await tx.aboutOutput.update({ where: { id }, data: values });
      } else {
        await tx.aboutOutput.create({ data: values });
      }
    }
    return tx.aboutOrganisasi.findUnique({
      where: { id: 1 },
      include: { misi: { orderBy: { urutan: 'asc' } } },
    });
  });
  const output = await prisma.aboutOutput.findMany({ orderBy: { urutan: 'asc' } });
  res.json({
    data: {
      tagline: data.tagline,
      visi: data.visi,
      deskripsi_singkat: data.deskripsi_singkat,
      wa_katalog_default: data.wa_katalog_default,
      misi: data.misi,
      output,
      updated_at: data.updated_at,
    },
  });
  cleanupImagesInBackground(removedImages);
});
