import { prisma } from '../../lib/prisma.js';
import { withPrismaErrors } from '../../utils/http-error.js';

export const getDashboard = withPrismaErrors(async (_req, res) => {
  const [
    jumlah_event,
    jumlah_pendaftar_event,
    pelamar_baru,
    jumlah_berita,
    komentar_pending,
    pengajuan_kerja_sama_baru,
    jumlah_produk,
    total_klik_produk,
    latestNews,
  ] = await Promise.all([
    prisma.event.count(),
    prisma.pendaftarEvent.count(),
    prisma.pelamarAnggota.count({ where: { status_seleksi: 'terkirim' } }),
    prisma.berita.count(),
    prisma.komentar.count({ where: { status: 'pending' } }),
    prisma.pengajuanPartnership.count({ where: { status: 'baru' } }),
    prisma.produk.count(),
    prisma.produkKlik.count(),
    prisma.berita.findFirst({ where: { status: 'published' }, orderBy: { published_at: 'desc' }, select: { published_at: true } }),
  ]);
  const days = latestNews?.published_at ? Math.floor((Date.now() - latestNews.published_at.getTime()) / 86400000) : null;
  res.json({
    data: {
      jumlah_event,
      jumlah_pendaftar_event,
      pelamar_baru,
      jumlah_berita,
      komentar_pending,
      pengajuan_kerja_sama_baru,
      jumlah_produk,
      total_klik_produk,
      pengingat_berita: {
        perlu_pengingat: days === null || days > 14,
        terakhir_terbit: latestNews?.published_at ?? null,
        hari_sejak_terbit: days,
      },
    },
  });
});
