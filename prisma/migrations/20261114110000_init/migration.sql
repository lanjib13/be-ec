-- CreateEnum
CREATE TYPE "sosmed_kind" AS ENUM ('link', 'post');

-- CreateEnum
CREATE TYPE "sosmed_platform" AS ENUM ('youtube', 'linkedin', 'tiktok', 'instagram');

-- CreateEnum
CREATE TYPE "periode_status" AS ENUM ('akan_dibuka', 'dibuka', 'ditutup', 'pengumuman');

-- CreateEnum
CREATE TYPE "status_seleksi" AS ENUM ('terkirim', 'seleksi_berkas', 'wawancara', 'diterima', 'tidak_lolos');

-- CreateEnum
CREATE TYPE "status_stok" AS ENUM ('tersedia', 'habis');

-- CreateEnum
CREATE TYPE "klik_channel" AS ENUM ('whatsapp', 'shopee');

-- CreateEnum
CREATE TYPE "berita_status" AS ENUM ('draft', 'scheduled', 'published');

-- CreateEnum
CREATE TYPE "achievement_tipe" AS ENUM ('prestasi', 'karya');

-- CreateEnum
CREATE TYPE "komentar_target" AS ENUM ('news', 'program', 'achievement');

-- CreateEnum
CREATE TYPE "komentar_status" AS ENUM ('pending', 'approved', 'hidden');

-- CreateEnum
CREATE TYPE "partnership_status" AS ENUM ('baru', 'dihubungi', 'selesai');

-- CreateTable
CREATE TABLE "about_organisasi" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "tagline" VARCHAR(255) NOT NULL,
    "visi" TEXT NOT NULL,
    "deskripsi_singkat" TEXT NOT NULL,
    "wa_katalog_default" VARCHAR(25),
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "about_organisasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "about_misi" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "about_id" INTEGER NOT NULL,
    "teks_misi" TEXT NOT NULL,
    "gambar_url" VARCHAR(500),
    "urutan" INTEGER NOT NULL,

    CONSTRAINT "about_misi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "about_output" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "judul" VARCHAR(150) NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "gambar_url" VARCHAR(500),
    "tahun" INTEGER NOT NULL,
    "urutan" INTEGER NOT NULL,

    CONSTRAINT "about_output_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistik" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "label" VARCHAR(100) NOT NULL,
    "nilai_angka" DECIMAL(20,2) NOT NULL,
    "persentase_pertumbuhan" DECIMAL(7,2),
    "prefix" VARCHAR(20),
    "suffix" VARCHAR(20),
    "ikon" VARCHAR(50),
    "keterangan_bulan" VARCHAR(100) NOT NULL,
    "urutan" INTEGER NOT NULL,

    CONSTRAINT "statistik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sosmed" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "sosmed_kind" NOT NULL,
    "platform" "sosmed_platform" NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "status_tampil" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sosmed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "judul" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "foto_cover" VARCHAR(500),
    "tanggal_mulai" TIMESTAMPTZ(6) NOT NULL,
    "tanggal_selesai" TIMESTAMPTZ(6) NOT NULL,
    "batas_daftar" TIMESTAMPTZ(6) NOT NULL,
    "kuota" INTEGER NOT NULL,
    "status_aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pendaftar_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "nama" VARCHAR(150) NOT NULL,
    "institusi" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "no_whatsapp" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pendaftar_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rekrutmen_periode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "judul" VARCHAR(150) NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "tanggal_buka" TIMESTAMPTZ(6) NOT NULL,
    "tanggal_tutup" TIMESTAMPTZ(6) NOT NULL,
    "status" "periode_status" NOT NULL DEFAULT 'akan_dibuka',
    "syarat_umum" JSONB NOT NULL,
    "tahapan_seleksi" JSONB NOT NULL,
    "kontak_panitia" JSONB NOT NULL,

    CONSTRAINT "rekrutmen_periode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rekrutmen_posisi" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "periode_id" UUID NOT NULL,
    "nama_posisi" VARCHAR(100) NOT NULL,
    "deskripsi_tugas" TEXT NOT NULL,
    "syarat_khusus" TEXT NOT NULL,
    "kuota" INTEGER,
    "status_buka" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rekrutmen_posisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pelamar_anggota" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kode_pendaftaran" VARCHAR(20) NOT NULL,
    "periode_id" UUID NOT NULL,
    "posisi_pilihan_1_id" UUID NOT NULL,
    "posisi_pilihan_2_id" UUID,
    "nama_lengkap" VARCHAR(150) NOT NULL,
    "institusi" VARCHAR(150) NOT NULL,
    "jurusan_prodi" VARCHAR(100) NOT NULL,
    "angkatan_semester" VARCHAR(50) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "no_whatsapp" VARCHAR(25) NOT NULL,
    "alasan_bergabung" VARCHAR(1000) NOT NULL,
    "link_cv_portofolio" VARCHAR(500),
    "status_seleksi" "status_seleksi" NOT NULL DEFAULT 'terkirim',
    "catatan_admin" TEXT,
    "setuju_privasi" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pelamar_anggota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produk" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nama" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "harga" DECIMAL(14,0),
    "kategori" VARCHAR(100) NOT NULL,
    "foto_cover" VARCHAR(500),
    "galeri" JSONB,
    "link_shopee" VARCHAR(500),
    "no_whatsapp" VARCHAR(25),
    "status_stok" "status_stok" NOT NULL DEFAULT 'tersedia',
    "unggulan" BOOLEAN NOT NULL DEFAULT false,
    "status_tampil" BOOLEAN NOT NULL DEFAULT true,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "produk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produk_klik" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "produk_id" UUID NOT NULL,
    "channel" "klik_channel" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produk_klik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "berita" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "penulis_id" UUID,
    "judul" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "konten" TEXT NOT NULL,
    "gambar_sampul" VARCHAR(500),
    "kategori" VARCHAR(100) NOT NULL,
    "status" "berita_status" NOT NULL DEFAULT 'draft',
    "jadwal_terbit" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "berita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nama" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "kategori" VARCHAR(100) NOT NULL,
    "foto_cover" VARCHAR(500),
    "galeri" JSONB,
    "status_aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tipe" "achievement_tipe" NOT NULL,
    "judul" VARCHAR(200) NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "gambar" VARCHAR(500),
    "link_eksternal" VARCHAR(500),
    "nama_anggota" VARCHAR(150) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "komentar" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "target_tipe" "komentar_target" NOT NULL,
    "target_id" UUID NOT NULL,
    "approved_by" UUID,
    "nama_pengirim" VARCHAR(100) NOT NULL,
    "email_pengirim" VARCHAR(150),
    "isi_komentar" VARCHAR(1000) NOT NULL,
    "status" "komentar_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "komentar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating_hero" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "skor" SMALLINT NOT NULL,
    "perangkat_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rating_hero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mitra" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nama_mitra" VARCHAR(150) NOT NULL,
    "logo_url" VARCHAR(500) NOT NULL,
    "website_url" VARCHAR(500),
    "tier" VARCHAR(50),
    "status_tampil" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mitra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengajuan_partnership" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nama" VARCHAR(150) NOT NULL,
    "institusi" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "no_whatsapp" VARCHAR(25) NOT NULL,
    "jenis_kerjasama" VARCHAR(100) NOT NULL,
    "pesan" TEXT NOT NULL,
    "status" "partnership_status" NOT NULL DEFAULT 'baru',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pengajuan_partnership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_status_aktif_tanggal_mulai_idx" ON "events"("status_aktif", "tanggal_mulai");

-- CreateIndex
CREATE UNIQUE INDEX "pendaftar_event_event_id_email_key" ON "pendaftar_event"("event_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "pelamar_anggota_kode_pendaftaran_key" ON "pelamar_anggota"("kode_pendaftaran");

-- CreateIndex
CREATE INDEX "pelamar_anggota_periode_id_status_seleksi_idx" ON "pelamar_anggota"("periode_id", "status_seleksi");

-- CreateIndex
CREATE UNIQUE INDEX "pelamar_anggota_periode_id_email_key" ON "pelamar_anggota"("periode_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "produk_slug_key" ON "produk"("slug");

-- CreateIndex
CREATE INDEX "produk_status_tampil_unggulan_urutan_idx" ON "produk"("status_tampil", "unggulan", "urutan");

-- CreateIndex
CREATE INDEX "produk_klik_produk_id_channel_created_at_idx" ON "produk_klik"("produk_id", "channel", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "berita_slug_key" ON "berita"("slug");

-- CreateIndex
CREATE INDEX "berita_status_published_at_idx" ON "berita"("status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "program_slug_key" ON "program"("slug");

-- CreateIndex
CREATE INDEX "komentar_target_tipe_target_id_status_idx" ON "komentar"("target_tipe", "target_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rating_hero_perangkat_hash_key" ON "rating_hero"("perangkat_hash");

-- AddForeignKey
ALTER TABLE "about_misi" ADD CONSTRAINT "about_misi_about_id_fkey" FOREIGN KEY ("about_id") REFERENCES "about_organisasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendaftar_event" ADD CONSTRAINT "pendaftar_event_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rekrutmen_posisi" ADD CONSTRAINT "rekrutmen_posisi_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "rekrutmen_periode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pelamar_anggota" ADD CONSTRAINT "pelamar_anggota_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "rekrutmen_periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pelamar_anggota" ADD CONSTRAINT "pelamar_anggota_posisi_pilihan_1_id_fkey" FOREIGN KEY ("posisi_pilihan_1_id") REFERENCES "rekrutmen_posisi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pelamar_anggota" ADD CONSTRAINT "pelamar_anggota_posisi_pilihan_2_id_fkey" FOREIGN KEY ("posisi_pilihan_2_id") REFERENCES "rekrutmen_posisi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produk_klik" ADD CONSTRAINT "produk_klik_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep the organization profile table as a singleton and enforce key invariants.
ALTER TABLE "about_organisasi"
    ADD CONSTRAINT "about_organisasi_singleton_id_check" CHECK ("id" = 1);
ALTER TABLE "rating_hero"
    ADD CONSTRAINT "rating_hero_skor_check" CHECK ("skor" BETWEEN 1 AND 5);
ALTER TABLE "pelamar_anggota"
    ADD CONSTRAINT "pelamar_posisi_pilihan_berbeda_check"
    CHECK ("posisi_pilihan_2_id" IS NULL OR "posisi_pilihan_2_id" <> "posisi_pilihan_1_id");
ALTER TABLE "events"
    ADD CONSTRAINT "events_kuota_positive_check" CHECK ("kuota" > 0);

-- Direct access through Supabase Data API is denied unless an explicit policy is added.
ALTER TABLE "about_organisasi" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "about_misi" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "about_output" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "statistik" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sosmed" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pendaftar_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rekrutmen_periode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rekrutmen_posisi" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pelamar_anggota" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "produk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "produk_klik" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "berita" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "program" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "achievements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "komentar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rating_hero" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mitra" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pengajuan_partnership" ENABLE ROW LEVEL SECURITY;
