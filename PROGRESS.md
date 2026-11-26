# Catatan Pengerjaan Backend EC

## Sebelum pengerjaan

- PRD belum memiliki backend yang siap menjalankan API dan migrasi database.
- Belum ada skema Prisma dan migrasi database aplikasi yang digunakan backend.
- Foto belum memiliki alur unggah terpusat ke Supabase Storage.
- Endpoint backend untuk konten publik dan administrasi belum tersedia.

## Sesudah pengerjaan

- Backend Express 5 dan Prisma tersedia di folder `backend/`, dengan contoh konfigurasi environment, seed, dan panduan menjalankan aplikasi.
- Skema Prisma mencakup 19 model. Migrasi awal membuat tabel aplikasi dan mengaktifkan RLS; migrasi Storage mengonfigurasi satu bucket publik per fitur (`ec-about`, `ec-program`, `ec-event`, `ec-berita`, `ec-produk`, `ec-mitra`, `ec-achievement`, `ec-lainnya`) dengan batas ukuran 2 MB dan MIME JPG/PNG/WebP.
- Endpoint upload admin menyimpan gambar ke bucket Supabase Storage sesuai fitur, menggunakan pemeriksaan signature file dan service-role key hanya di backend. Aset lama dipindahkan dari `ec-public` dengan `npm run db:migrate:storage`. Gambar yang diganti atau ikut terhapus dibersihkan dari bucket bila tidak lagi dirujuk baris lain.
- Route publik dan admin mencakup konten, event, produk, berita, pendaftaran, komentar/rating, rekrutmen, statistik, ekspor, dan pengelolaan data.
- Endpoint health menyediakan pemeriksaan liveness dan readiness. Jika database tidak dapat dijangkau, readiness melaporkan `503 DATABASE_UNAVAILABLE`.
- Berita terjadwal kini dipublikasikan otomatis oleh cron setiap menit, termasuk saat startup; filter komentar publik memastikan target konten masih tersedia untuk publik.
- Endpoint admin memvalidasi UUID path, dan filter status/ID daftar admin yang didukung menolak nilai tidak valid sebagai `422`.
- Alur pendaftaran event dan rekrutmen sudah menggunakan controller khusus dan mengirim email konfirmasi melalui SMTP bila dikonfigurasi. Status pengiriman dicantumkan dalam respons; pendaftaran tetap disimpan jika SMTP gagal.
- Struktur aplikasi dirapikan per domain: controller publik untuk konten, event, produk, berita, interaksi, dan rekrutmen; controller admin untuk dashboard, CRUD resource, statistik produk, ekspor event, rekrutmen/pelamar, moderasi, dan upload. Route API digabungkan melalui `src/routes/index.js`; adapter Prisma, Supabase, dan email tersedia di `src/lib/`.
- Tes smoke API dan validasi skema Prisma telah dijalankan; penerapan migrasi dilakukan pada tahap sebelumnya.

## Status verifikasi dan batasan

- Tes otomatis backend terakhir: 12 lulus.
- `prisma validate` lulus. Percobaan `db:generate` pada sesi ini gagal dua kali saat Windows menolak rename `query_engine-windows.dll.node` (`EPERM`), kemungkinan karena file engine sedang dipakai; skema tidak berubah dan tes API tetap lulus menggunakan Prisma Client yang tersedia.
- Pemeriksaan API langsung saat catatan ini dibuat: liveness, endpoint yang tidak membutuhkan akses database, validasi komentar, serta proteksi admin/upload berjalan sesuai status yang diharapkan.
- Koneksi langsung ke database Supabase pada pemeriksaan terakhir gagal dijangkau di `aws-0-ap-southeast-2.pooler.supabase.com:6543`. Karena itu, endpoint yang membaca database belum dapat diverifikasi end-to-end pada sesi ini; migrasi yang pernah berhasil diterapkan tidak dianggap sebagai bukti konektivitas saat ini.
- Upload ke Storage belum dapat diuji end-to-end karena service-role key yang terkonfigurasi sebelumnya ditolak oleh Storage API (`JWS Protected Header is invalid`). Perbarui key langsung di `backend/.env`; jangan mengirimkannya melalui chat.
- Server SMTP kampus belum dikonfigurasi atau diuji secara live. Lengkapi nilai `EMAIL_SMTP_*` di `backend/.env`; password tidak perlu dikirim melalui chat.
- Tes integrasi untuk seluruh endpoint bisnis belum tersedia.
