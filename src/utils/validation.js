import { z } from 'zod';

const phone = z.string().regex(/^(\+62|0)8[0-9]{8,12}$/);
const email = z.email().max(150).transform((value) => value.toLowerCase());
const uuid = z.uuid();
const url = z.url().max(500);
const nullableUrl = url.nullable().optional();
const gallery = z.array(url).max(50).default([]);
const honeypot = z.string().max(0).optional();
const dateTime = z.iso.datetime().transform((value) => new Date(value));
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

function object(shape) {
  return z.object(shape).strict();
}

export const schemas = {
  eventRegistration: object({
    nama: z.string().trim().min(1).max(150),
    institusi: z.string().trim().min(1).max(150),
    email,
    no_whatsapp: phone,
    website: honeypot,
  }),
  partnership: object({
    nama: z.string().trim().min(1).max(150),
    institusi: z.string().trim().min(1).max(150),
    email,
    no_whatsapp: phone,
    jenis_kerjasama: z.string().trim().min(1).max(100),
    pesan: z.string().trim().min(1).max(3000),
    website: honeypot,
  }),
  click: object({ channel: z.enum(['whatsapp', 'shopee']) }),
  rating: object({ skor: z.number().int().min(1).max(5), website: honeypot }),
  comment: object({
    target_type: z.enum(['news', 'program', 'achievement']),
    target_id: uuid,
    nama_pengirim: z.string().trim().min(1).max(100),
    email_pengirim: email.nullable().optional(),
    isi_komentar: z.string().trim().min(1).max(1000),
    website: honeypot,
  }),
  apply: object({
    periode_id: uuid,
    nama_lengkap: z.string().trim().min(1).max(150),
    institusi: z.string().trim().min(1).max(150),
    jurusan_prodi: z.string().trim().min(1).max(100),
    angkatan_semester: z.string().trim().min(1).max(50),
    email,
    no_whatsapp: phone,
    posisi_pilihan_1_id: uuid,
    posisi_pilihan_2_id: uuid.nullable().optional(),
    alasan_bergabung: z.string().trim().min(1).max(1000),
    link_cv_portofolio: url.max(500).nullable().optional(),
    setuju_privasi: z.literal(true),
    website: honeypot,
  }).refine((value) => !value.posisi_pilihan_2_id || value.posisi_pilihan_1_id !== value.posisi_pilihan_2_id, {
    path: ['posisi_pilihan_2_id'],
    message: 'Pilihan posisi tidak boleh sama.',
  }),
  status: object({
    code: z.string().regex(/^EC-R-[A-Z0-9]{6}$/),
    email,
  }),
  statistik: object({
    label: z.string().trim().min(1).max(100),
    nilai_angka: z.number().finite(),
    persentase_pertumbuhan: z.number().finite().nullable().optional(),
    prefix: z.string().max(20).nullable().optional(),
    suffix: z.string().max(20).nullable().optional(),
    ikon: z.string().max(50).nullable().optional(),
    keterangan_bulan: z.string().trim().min(1).max(100),
    urutan: z.number().int().optional(),
  }),
  program: object({
    nama: z.string().trim().min(1).max(150),
    slug: slug.optional(),
    deskripsi: z.string().min(1),
    kategori: z.string().trim().min(1).max(100),
    foto_cover: nullableUrl,
    galeri: gallery,
    status_aktif: z.boolean().default(true),
  }),
  achievement: object({
    tipe: z.enum(['prestasi', 'karya']),
    judul: z.string().trim().min(1).max(200),
    deskripsi: z.string().min(1),
    tahun: z.number().int().min(1900).max(2100),
    gambar: nullableUrl,
    link_eksternal: nullableUrl,
    nama_anggota: z.string().trim().min(1).max(150),
  }),
  social: object({
    kind: z.enum(['link', 'post']),
    platform: z.enum(['youtube', 'linkedin', 'tiktok', 'instagram']),
    url,
    urutan: z.number().int().default(0),
    status_tampil: z.boolean().default(true),
  }).refine((value) => value.kind !== 'post' || ['instagram', 'tiktok'].includes(value.platform), {
    path: ['platform'],
    message: 'Konten embed hanya mendukung Instagram atau TikTok.',
  }),
  event: object({
    judul: z.string().trim().min(1).max(200),
    slug: slug.optional(),
    deskripsi: z.string().min(1),
    foto_cover: nullableUrl,
    tanggal_mulai: dateTime,
    tanggal_selesai: dateTime,
    batas_daftar: dateTime,
    kuota: z.number().int().min(1),
    status_aktif: z.boolean().default(true),
  }).refine((value) => value.tanggal_selesai > value.tanggal_mulai, {
    path: ['tanggal_selesai'],
    message: 'Tanggal selesai harus setelah tanggal mulai.',
  }),
  news: object({
    judul: z.string().trim().min(1).max(255),
    slug: slug.optional(),
    konten: z.string().min(1),
    gambar_sampul: nullableUrl,
    kategori: z.string().trim().min(1).max(100),
    status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
    jadwal_terbit: dateTime.nullable().optional(),
  }),
  partner: object({
    nama_mitra: z.string().trim().min(1).max(150),
    logo_url: url,
    website_url: nullableUrl,
    tier: z.string().max(50).nullable().optional(),
    status_tampil: z.boolean().default(true),
  }),
  product: object({
    nama: z.string().trim().min(1).max(150),
    slug: slug.optional(),
    deskripsi: z.string().min(1),
    harga: z.number().finite().min(0).nullable().optional(),
    kategori: z.string().trim().min(1).max(100),
    foto_cover: nullableUrl,
    galeri: gallery,
    link_shopee: z.string().url().max(500).regex(/^https:\/\/([a-z0-9-]+\.)*(shopee\.co\.id|shopee\.com|shp\.ee)(\/.*)?$/i).nullable().optional(),
    no_whatsapp: phone.nullable().optional(),
    status_stok: z.enum(['tersedia', 'habis']).default('tersedia'),
    unggulan: z.boolean().default(false),
    status_tampil: z.boolean().default(true),
    urutan: z.number().int().default(0),
  }),
  recruitment: object({
    judul: z.string().trim().min(1).max(150),
    deskripsi: z.string().min(1),
    tanggal_buka: dateTime,
    tanggal_tutup: dateTime,
    status: z.enum(['akan_dibuka', 'dibuka', 'ditutup', 'pengumuman']).default('akan_dibuka'),
    syarat_umum: z.array(z.string().trim().min(1)).max(100),
    tahapan_seleksi: z.array(z.object({
      nama: z.string().trim().min(1),
      tanggal: z.string().optional(),
      keterangan: z.string().optional(),
    })).max(50),
    kontak_panitia: z.object({
      whatsapp: z.string().optional(),
      email: z.email().optional(),
    }),
    posisi: z.array(z.object({
      id: uuid.optional(),
      nama_posisi: z.string().trim().min(1).max(100),
      deskripsi_tugas: z.string().min(1),
      syarat_khusus: z.string().min(1),
      kuota: z.number().int().positive().nullable().optional(),
      status_buka: z.boolean().default(true),
    })).max(100),
  }).refine((value) => value.tanggal_tutup > value.tanggal_buka, {
    path: ['tanggal_tutup'],
    message: 'Tanggal tutup harus setelah tanggal buka.',
  }),
  settings: object({
    tagline: z.string().trim().min(1).max(255).refine((value) => {
      const words = value.trim().split(/\s+/).filter(Boolean).length;
      return words >= 20 && words <= 30;
    }, 'Tagline harus terdiri dari 20-30 kata.'),
    visi: z.string().trim().min(1),
    deskripsi_singkat: z.string().trim().min(1),
    wa_katalog_default: phone.nullable().optional(),
    misi: z.array(z.object({
      id: uuid.optional(),
      teks_misi: z.string().trim().min(1),
      gambar_url: nullableUrl,
      urutan: z.number().int(),
    })),
    output: z.array(z.object({
      id: uuid.optional(),
      judul: z.string().trim().min(1).max(150),
      deskripsi: z.string().min(1),
      gambar_url: nullableUrl,
      tahun: z.number().int().min(1900).max(2100),
      urutan: z.number().int(),
    })),
  }),
};

export function validateData(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const error = new Error('Data tidak valid.');
  error.status = 422;
  error.code = 'VALIDATION_ERROR';
  error.details = result.error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  throw error;
}

export function partialSchema(schema) {
  const partial = z.object(schema.shape).partial().strict();
  return partial.refine((value) => Object.keys(value).length > 0, 'Minimal satu field harus dikirim.');
}
