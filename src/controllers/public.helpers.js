import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { assertUuid, httpError, notFound, parsePage, paginationMeta, normalizeWhatsApp, withPrismaErrors } from '../utils/http-error.js';
import { schemas, validateData } from '../utils/validation.js';

export { prisma, env, assertUuid, httpError, notFound, parsePage, normalizeWhatsApp, withPrismaErrors, schemas, validateData };

export function validationError(message, field) {
  return httpError(422, 'VALIDATION_ERROR', message, field ? [{ field, message }] : undefined);
}

export function conflictError(message, code = 'CONFLICT') {
  return httpError(409, code, message);
}

export function pagedResult(rows, total, page, limit) {
  return { data: rows, meta: paginationMeta(page, limit, total) };
}

export function checkHoneypot(data) {
  if (data.website) throw httpError(400, 'BAD_REQUEST', 'Permintaan tidak dapat diproses.');
  delete data.website;
}

const targetModels = { news: prisma.berita, program: prisma.program, achievement: prisma.achievement };
export async function findPublicCommentTarget(type, id) {
  const model = targetModels[type];
  if (!model) return null;
  const where = type === 'news'
    ? { id, status: 'published', published_at: { lte: new Date() } }
    : type === 'program' ? { id, status_aktif: true } : { id };
  return model.findFirst({ where, select: { id: true } });
}

export function publicEvent(event, registeredCount = 0) {
  const remaining = Math.max(0, event.kuota - registeredCount);
  return {
    id: event.id, judul: event.judul, slug: event.slug, foto_cover: event.foto_cover,
    tanggal_mulai: event.tanggal_mulai, tanggal_selesai: event.tanggal_selesai,
    batas_daftar: event.batas_daftar, kuota: event.kuota, sisa_kuota: remaining,
    pendaftaran_dibuka: event.status_aktif && event.batas_daftar > new Date() && remaining > 0,
    ...(event.deskripsi === undefined ? {} : { deskripsi: event.deskripsi }),
  };
}

export function publicProduct(product, defaultPhone, { detail = false } = {}) {
  const phone = normalizeWhatsApp(product.no_whatsapp ?? defaultPhone ?? '');
  const productUrl = `${env.CLIENT_URL.replace(/\/+$/, '')}/produk/${product.slug}`;
  const message = encodeURIComponent(`Halo EC, saya tertarik dengan produk "${product.nama}". Link: ${productUrl}`);
  return {
    id: product.id, nama: product.nama, slug: product.slug,
    harga: product.harga === null ? null : Number(product.harga), kategori: product.kategori,
    foto_cover: product.foto_cover, status_stok: product.status_stok, unggulan: product.unggulan,
    ...(detail ? { deskripsi: product.deskripsi, galeri: product.galeri ?? [],
      link_whatsapp: phone ? `https://wa.me/${phone}?text=${message}` : null,
      link_shopee: product.status_stok === 'tersedia' ? product.link_shopee : null } : {}),
  };
}

export async function getEventSummaryRows(where, page, limit) {
  const [rows, total] = await prisma.$transaction([
    prisma.event.findMany({ where, include: { _count: { select: { pendaftar: true } } },
      orderBy: { tanggal_mulai: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.event.count({ where }),
  ]);
  return pagedResult(rows.map(({ _count, ...event }) => publicEvent(event, _count.pendaftar)), total, page, limit);
}
