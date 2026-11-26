import { prisma, validationError, notFound, parsePage, pagedResult, withPrismaErrors } from './public.helpers.js';

export const getNews = withPrismaErrors(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const category = req.query.kategori;
  const search = req.query.q;
  if (typeof search === 'string' && search.length > 100) throw validationError('Maksimum 100 karakter.', 'q');
  const where = {
    status: 'published',
    published_at: { lte: new Date() },
    ...(typeof category === 'string' ? { kategori: category } : {}),
    ...(typeof search === 'string' && search ? { judul: { contains: search, mode: 'insensitive' } } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.berita.findMany({ where, orderBy: { published_at: 'desc' }, skip, take: limit }),
    prisma.berita.count({ where }),
  ]);
  res.json(pagedResult(rows.map((item) => ({ ...item, penulis: null })), total, page, limit));
});

export const getNewsArticle = withPrismaErrors(async (req, res) => {
  const item = await prisma.berita.findFirst({
    where: { slug: req.params.slug, status: 'published', published_at: { lte: new Date() } },
  });
  if (!item) throw notFound('Berita tidak ditemukan.');
  res.json({ data: { ...item, penulis: null } });
});
