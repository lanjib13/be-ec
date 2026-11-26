-- Satu bucket publik per fitur upload. Semua bucket memakai batas 2 MB dan
-- MIME yang sama seperti bucket lama `ec-public`.
INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES
    ('ec-about', 'ec-about', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
    ('ec-program', 'ec-program', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
    ('ec-event', 'ec-event', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
    ('ec-berita', 'ec-berita', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
    ('ec-produk', 'ec-produk', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
    ('ec-mitra', 'ec-mitra', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
    ('ec-achievement', 'ec-achievement', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
    ('ec-lainnya', 'ec-lainnya', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- `ec-public` sengaja tidak dihapus di sini. Skrip
-- `scripts/migrate-storage-buckets.js` memindahkan objek lama lalu menghapus
-- bucket tersebut setelah semua URL di database diverifikasi.
