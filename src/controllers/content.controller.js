import { prisma, notFound, parsePage, pagedResult, publicEvent, publicProduct, validationError, withPrismaErrors } from './public.helpers.js';

export const getHome = withPrismaErrors(async (_req, res) => {
  const [about, statistik, events, recruitment, programs, products, news, social, partners] = await Promise.all([
    prisma.aboutOrganisasi.findUnique({ where: { id: 1 } }),
    prisma.statistik.findMany({ orderBy: { urutan: 'asc' } }),
    prisma.event.findMany({
      where: { status_aktif: true },
      include: { _count: { select: { pendaftar: true } } },
      orderBy: { tanggal_mulai: 'desc' },
      take: 3,
    }),
    prisma.rekrutmenPeriode.findFirst({
      where: { status: 'dibuka', tanggal_buka: { lte: new Date() }, tanggal_tutup: { gt: new Date() } },
      orderBy: { tanggal_buka: 'desc' },
      select: { id: true, judul: true, tanggal_tutup: true },
    }),
    prisma.program.findMany({ where: { status_aktif: true }, orderBy: { nama: 'asc' }, take: 4 }),
    prisma.produk.findMany({ where: { status_tampil: true, unggulan: true }, orderBy: { urutan: 'asc' }, take: 4 }),
    prisma.berita.findMany({
      where: { status: 'published', published_at: { lte: new Date() } },
      orderBy: { published_at: 'desc' },
      take: 4,
    }),
    prisma.sosmed.findMany({ where: { status_tampil: true }, orderBy: { urutan: 'asc' } }),
    prisma.mitra.findMany({ where: { status_tampil: true }, orderBy: { nama_mitra: 'asc' } }),
  ]);
  res.json({
    data: {
      about: { tagline: about?.tagline ?? '', deskripsi_singkat: about?.deskripsi_singkat ?? '' },
      statistik: statistik.map((item) => ({
        ...item,
        nilai_angka: Number(item.nilai_angka),
        persentase_pertumbuhan: item.persentase_pertumbuhan === null ? null : Number(item.persentase_pertumbuhan),
      })),
      event_aktif: events.map(({ _count, ...event }) => publicEvent(event, _count.pendaftar)),
      rekrutmen_aktif: recruitment,
      program: programs,
      produk_unggulan: products.map((product) => publicProduct(product, about?.wa_katalog_default)),
      berita_terbaru: news.map((item) => ({ ...item, penulis: null })),
      sosmed: social,
      mitra: partners,
    },
  });
});

export const getAbout = withPrismaErrors(async (_req, res) => {
  const data = await prisma.aboutOrganisasi.findUnique({
    where: { id: 1 },
    include: { misi: { orderBy: { urutan: 'asc' } } },
  });
  if (!data) throw notFound('Profil organisasi belum tersedia.');
  const output = await prisma.aboutOutput.findMany({ orderBy: { urutan: 'asc' } });
  res.json({
    data: {
      tagline: data.tagline,
      visi: data.visi,
      deskripsi_singkat: data.deskripsi_singkat,
      misi: data.misi,
      output,
    },
  });
});

export const getPrograms = withPrismaErrors(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const where = {
    status_aktif: true,
    ...(typeof req.query.kategori === 'string' ? { kategori: req.query.kategori } : {}),
  };
  const [data, total] = await prisma.$transaction([
    prisma.program.findMany({ where, orderBy: { nama: 'asc' }, skip, take: limit }),
    prisma.program.count({ where }),
  ]);
  res.json(pagedResult(data, total, page, limit));
});

export const getProgram = withPrismaErrors(async (req, res) => {
  const data = await prisma.program.findFirst({ where: { slug: req.params.slug, status_aktif: true } });
  if (!data) throw notFound('Program tidak ditemukan.');
  res.json({ data });
});

export const getAchievements = withPrismaErrors(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const type = req.query.type;
  if (type !== undefined && !['prestasi', 'karya'].includes(type)) {
    throw validationError('Tipe achievement tidak valid.', 'type');
  }
  const where = type ? { tipe: type } : {};
  const [data, total] = await prisma.$transaction([
    prisma.achievement.findMany({ where, orderBy: [{ tahun: 'desc' }, { judul: 'asc' }], skip, take: limit }),
    prisma.achievement.count({ where }),
  ]);
  res.json(pagedResult(data, total, page, limit));
});

export const getPartners = withPrismaErrors(async (_req, res) => {
  const data = await prisma.mitra.findMany({ where: { status_tampil: true }, orderBy: { nama_mitra: 'asc' } });
  res.json({ data });
});

export const getSocial = withPrismaErrors(async (req, res) => {
  const kind = req.query.kind;
  const platform = req.query.platform;
  if (kind !== undefined && !['link', 'post'].includes(kind)) {
    throw validationError('Kind sosial media tidak valid.', 'kind');
  }
  if (platform !== undefined && !['youtube', 'linkedin', 'tiktok', 'instagram'].includes(platform)) {
    throw validationError('Platform sosial media tidak valid.', 'platform');
  }
  const data = await prisma.sosmed.findMany({
    where: { status_tampil: true, ...(kind ? { kind } : {}), ...(platform ? { platform } : {}) },
    orderBy: { urutan: 'asc' },
  });
  res.json({ data });
});
