# EC Backend

Backend Express.js menggunakan Prisma ORM dan PostgreSQL Supabase. Definisi model database berada di `prisma/schema.prisma`.

Struktur aplikasi backend tetap berada di `backend/` sesuai PRD. Semua deklarasi endpoint HTTP berada di file router per domain dalam `src/routes/` (publik, admin, health, dan upload); controller hanya menangani request/response. `src/routes/public.routes.js` dan `src/routes/admin.routes.js` menggabungkan router domain, lalu `src/routes/index.js` memasang router API. Seluruh route admin dilindungi autentikasi, termasuk upload. Integrasi Prisma, Supabase, dan email disediakan di `src/lib/`, sementara cron berada di `src/jobs/`.

## Setup

1. Gunakan Node.js 20 atau lebih baru.
2. Salin `.env.example` menjadi `.env`.
3. Isi `DATABASE_URL` dengan connection string Supabase pooler untuk runtime dan `DIRECT_URL` dengan koneksi langsung untuk migrasi. Simpan kredensial asli hanya di `.env`.
4. Instal dependensi, generate Prisma Client, lalu terapkan migrasi awal ke project Supabase kosong:

```powershell
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Migrasi pertama membuat tabel baru dan ditujukan untuk database kosong. Migrasi Storage membuat satu bucket publik per fitur (`ec-about`, `ec-program`, `ec-event`, `ec-berita`, `ec-produk`, `ec-mitra`, `ec-achievement`, `ec-lainnya`), masing-masing dengan batas ukuran 2 MB dan MIME JPG/PNG/WebP. Aset lama di bucket `ec-public` dipindahkan dengan `npm run db:migrate:storage` (dry-run) lalu `npm run db:migrate:storage -- --apply`, dan `-- --apply --delete-legacy` untuk menghapus bucket lama setelah verifikasi. Jika target sudah memiliki tabel atau data aplikasi, hentikan sebelum migrasi dan siapkan baseline/rekonsiliasi skema terlebih dahulu. Untuk membuat migrasi perubahan selama pengembangan, gunakan database PostgreSQL lokal dan jalankan `npm run db:migrate -- --name nama_perubahan`; jangan jalankan `migrate dev` pada project Supabase produksi.

Server menyediakan `GET /api/health` untuk liveness, `GET /api/health/ready` untuk memeriksa koneksi database, dan `POST /api/admin/upload` (Bearer admin, multipart field `file` + `folder`) untuk mengunggah gambar ke bucket Supabase Storage sesuai fitur. Bucket hanya dapat ditulis oleh server dengan service-role key; pembacaan file publik mengikuti konfigurasi bucket. Upload memeriksa signature file, bukan hanya MIME yang dikirim browser. Saat gambar diganti atau konten dihapus, file lama dihapus dari bucket hanya jika tidak lagi dirujuk baris lain.

## Swagger UI

Atur `ADMIN_USERNAME`, `ADMIN_PASSWORD` (minimal 12 karakter), dan `ADMIN_JWT_SECRET` (minimal 32 karakter) di `.env`. Gunakan nilai acak dan jangan commit kredensial. Login dilakukan melalui `POST /api/admin/login`; token yang diterbitkan berlaku 15 menit. Token Supabase admin yang sudah ada tetap bisa digunakan.

Saat `NODE_ENV` bukan `production`, dokumentasi interaktif tersedia di `http://localhost:3000/api-docs/` berdasarkan kontrak [openapi.yaml](../openapi.yaml). Pilih **Try it out** pada `/api/admin/login` untuk memperoleh token, lalu klik **Authorize** dan masukkan access token (tanpa awalan `Bearer `). Swagger UI tidak menyimpan token setelah halaman dimuat ulang.

## Otomasi dan email

Berita berstatus `scheduled` diterbitkan oleh cron setiap menit setelah waktu jadwal tercapai. Scheduler juga memeriksa berita yang sudah jatuh tempo saat server mulai.

Email konfirmasi pendaftaran event dan rekrutmen menggunakan SMTP. Isi `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_SECURE`, dan bila diwajibkan server, `EMAIL_SMTP_USER`/`EMAIL_SMTP_PASS` pada `.env`. Alamat pengirim default adalah `entrepreneurs.club@unu-jogja.ac.id`; pengiriman dinyatakan di respons melalui `email_konfirmasi` (`sent`, `failed`, atau `not_configured`). Data pendaftaran tetap tersimpan bila pengiriman email gagal.

## Migrasi deployment

Jalankan `npm run db:deploy` saat deployment. Perubahan skema harus dibuat sebagai migrasi Prisma dan tidak dilakukan manual melalui Supabase Dashboard. Migrasi mengaktifkan RLS tanpa policy untuk tabel aplikasi; akses aplikasi tetap melalui API server. Jangan pernah mengekspos kredensial database atau service-role key ke frontend.

File di `uploads/` hanya tempat sementara lokal dan tidak dipakai oleh endpoint upload. Jangan mengandalkan filesystem lokal pada deployment.

Catatan progres implementasi dan batas verifikasi saat ini tersedia di [PROGRESS.md](./PROGRESS.md).
