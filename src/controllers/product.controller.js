import { prisma, validationError, notFound, parsePage, pagedResult, publicProduct, withPrismaErrors, schemas, validateData } from './public.helpers.js';

export const getProducts = withPrismaErrors(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const category = req.query.category;
  const search = req.query.q;
  if (typeof search === 'string' && search.length > 100) throw validationError('Maksimum 100 karakter.', 'q');
  const where = {
    status_tampil: true,
    ...(typeof category === 'string' ? { kategori: category } : {}),
    ...(typeof search === 'string' && search ? { nama: { contains: search, mode: 'insensitive' } } : {}),
  };
  const [rows, total, about] = await Promise.all([
    prisma.produk.findMany({ where, orderBy: [{ urutan: 'asc' }, { created_at: 'desc' }], skip, take: limit }),
    prisma.produk.count({ where }),
    prisma.aboutOrganisasi.findUnique({ where: { id: 1 }, select: { wa_katalog_default: true } }),
  ]);
  res.json(pagedResult(rows.map((item) => publicProduct(item, about?.wa_katalog_default)), total, page, limit));
});

export const getProduct = withPrismaErrors(async (req, res) => {
  const [product, about] = await Promise.all([
    prisma.produk.findFirst({ where: { slug: req.params.slug, status_tampil: true } }),
    prisma.aboutOrganisasi.findUnique({ where: { id: 1 }, select: { wa_katalog_default: true } }),
  ]);
  if (!product) throw notFound('Produk tidak ditemukan.');
  res.json({ data: publicProduct(product, about?.wa_katalog_default, { detail: true }) });
});

export const recordProductClick = withPrismaErrors(async (req, res) => {
  const input = validateData(schemas.click, req.body);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) {
    throw validationError('ID produk tidak valid.', 'id');
  }
  const product = await prisma.produk.findFirst({ where: { id: req.params.id, status_tampil: true } });
  if (!product) throw notFound('Produk tidak ditemukan.');
  if (input.channel === 'shopee' && (!product.link_shopee || product.status_stok === 'habis')) {
    throw validationError('Channel pembelian tidak tersedia untuk produk ini.', 'channel');
  }
  if (input.channel === 'whatsapp') {
    const about = await prisma.aboutOrganisasi.findUnique({ where: { id: 1 }, select: { wa_katalog_default: true } });
    if (!product.no_whatsapp && !about?.wa_katalog_default) {
      throw validationError('WhatsApp tidak tersedia untuk produk ini.', 'channel');
    }
  }
  await prisma.produkKlik.create({ data: { produk_id: product.id, channel: input.channel } });
  res.status(204).end();
});
