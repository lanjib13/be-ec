import { prisma } from '../../lib/prisma.js';
import { httpError, withPrismaErrors } from '../../utils/http-error.js';
import { createCrudHandlers, resourceConfig } from './resource.controller.js';

export const getProductStats = withPrismaErrors(async (req, res) => {
  const from = req.query.dari ? new Date(`${req.query.dari}T00:00:00.000Z`) : null;
  const to = req.query.sampai ? new Date(`${req.query.sampai}T23:59:59.999Z`) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && from > to)) {
    throw httpError(422, 'VALIDATION_ERROR', 'Rentang tanggal tidak valid.');
  }
  const where = {
    ...(from || to ? { created_at: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };
  const groups = await prisma.produkKlik.groupBy({
    by: ['produk_id', 'channel'],
    where,
    _count: { _all: true },
  });
  const productIds = [...new Set(groups.map((group) => group.produk_id))];
  const products = productIds.length
    ? await prisma.produk.findMany({ where: { id: { in: productIds } }, select: { id: true, nama: true, slug: true } })
    : [];
  const details = products.map((product) => {
    const clicks = groups.filter((group) => group.produk_id === product.id);
    const klik_whatsapp = clicks.find((group) => group.channel === 'whatsapp')?._count._all ?? 0;
    const klik_shopee = clicks.find((group) => group.channel === 'shopee')?._count._all ?? 0;
    return { produk_id: product.id, nama: product.nama, slug: product.slug, klik_whatsapp, klik_shopee, total: klik_whatsapp + klik_shopee };
  });
  const total_whatsapp = details.reduce((sum, item) => sum + item.klik_whatsapp, 0);
  const total_shopee = details.reduce((sum, item) => sum + item.klik_shopee, 0);
  res.json({
    data: {
      ...(req.query.dari ? { dari: req.query.dari } : {}),
      ...(req.query.sampai ? { sampai: req.query.sampai } : {}),
      total_klik: total_whatsapp + total_shopee,
      total_whatsapp,
      total_shopee,
      produk: details,
    },
  });
});
export const productCrudHandlers = createCrudHandlers(resourceConfig.products);
