import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { httpError, notFound, parsePage, withPrismaErrors } from '../../utils/http-error.js';
import { adminHelpers } from './shared.js';

const { responsePage, queryText, authorOrNull } = adminHelpers;
const targetModels = {
  news: prisma.berita,
  program: prisma.program,
  achievement: prisma.achievement,
};
export const getPartnerships = withPrismaErrors(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, 20, 100);
  const q = queryText(req.query);
  const status = req.query.status;
  if (status !== undefined && !['baru', 'dihubungi', 'selesai'].includes(status)) throw httpError(422, 'VALIDATION_ERROR', 'Status partnership tidak valid.');
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { OR: ['nama', 'institusi', 'email'].map((field) => ({ [field]: { contains: q, mode: 'insensitive' } })) } : {}),
  };
  const [data, total] = await prisma.$transaction([
    prisma.pengajuanPartnership.findMany({ where, orderBy: { created_at: 'desc' }, skip, take: limit }),
    prisma.pengajuanPartnership.count({ where }),
  ]);
  res.json(responsePage(data, total, page, limit));
});

export const updatePartnerships = withPrismaErrors(async (req, res) => {
  const validation = z.object({
    ids: z.array(z.uuid()).min(1).max(200),
    status: z.enum(['baru', 'dihubungi', 'selesai']),
  }).safeParse(req.body);
  if (!validation.success) throw httpError(422, 'VALIDATION_ERROR', 'Data perubahan partnership tidak valid.');
  const found = await prisma.pengajuanPartnership.count({ where: { id: { in: validation.data.ids } } });
  if (found !== validation.data.ids.length) throw notFound('Satu atau lebih pengajuan tidak ditemukan.');
  const result = await prisma.pengajuanPartnership.updateMany({
    where: { id: { in: validation.data.ids } },
    data: { status: validation.data.status },
  });
  res.json({ data: { updated: result.count } });
});

export const getModerationComments = withPrismaErrors(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, 20, 100);
  if (req.query.status !== undefined && !['pending', 'approved', 'hidden'].includes(req.query.status)) {
    throw httpError(422, 'VALIDATION_ERROR', 'Status komentar tidak valid.');
  }
  if (req.query.target_type !== undefined && !['news', 'program', 'achievement'].includes(req.query.target_type)) {
    throw httpError(422, 'VALIDATION_ERROR', 'Tipe target komentar tidak valid.');
  }
  const where = {
    ...(req.query.status ? { status: req.query.status } : {}),
    ...(req.query.target_type ? { target_tipe: req.query.target_type } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.komentar.findMany({ where, orderBy: { created_at: 'desc' }, skip, take: limit }),
    prisma.komentar.count({ where }),
  ]);
  const titles = await Promise.all(rows.map(async (row) => {
    const model = targetModels[row.target_tipe];
    const content = model ? await model.findUnique({ where: { id: row.target_id }, select: { judul: true, nama: true } }) : null;
    return content?.judul ?? content?.nama ?? null;
  }));
  res.json(responsePage(rows.map(({ target_tipe, ...row }, index) => ({
    ...row,
    target_type: target_tipe,
    target_judul: titles[index],
  })), total, page, limit));
});

export const updateComments = withPrismaErrors(async (req, res) => {
  const validation = z.object({
    ids: z.array(z.uuid()).min(1).max(200),
    status: z.enum(['pending', 'approved', 'hidden']),
  }).safeParse(req.body);
  if (!validation.success) throw httpError(422, 'VALIDATION_ERROR', 'Data moderasi komentar tidak valid.');
  const found = await prisma.komentar.count({ where: { id: { in: validation.data.ids } } });
  if (found !== validation.data.ids.length) throw notFound('Satu atau lebih komentar tidak ditemukan.');
  const result = await prisma.komentar.updateMany({
    where: { id: { in: validation.data.ids } },
    data: {
      status: validation.data.status,
      approved_by: validation.data.status === 'approved' ? authorOrNull(req) : null,
    },
  });
  res.json({ data: { updated: result.count } });
});

export const deleteComments = withPrismaErrors(async (req, res) => {
  const rawIds = typeof req.query.ids === 'string' ? req.query.ids.split(',') : [];
  const validation = z.array(z.uuid()).min(1).max(200).safeParse(rawIds);
  if (!validation.success) throw httpError(422, 'VALIDATION_ERROR', 'Daftar ID komentar tidak valid.');
  const found = await prisma.komentar.count({ where: { id: { in: validation.data } } });
  if (found !== validation.data.length) throw notFound('Satu atau lebih komentar tidak ditemukan.');
  const result = await prisma.komentar.deleteMany({ where: { id: { in: validation.data } } });
  res.json({ data: { deleted: result.count } });
});
