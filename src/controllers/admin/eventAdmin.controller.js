import { prisma } from '../../lib/prisma.js';
import { httpError, notFound, parsePage, withPrismaErrors } from '../../utils/http-error.js';
import { adminHelpers } from './shared.js';
import { createCrudHandlers, resourceConfig } from './resource.controller.js';

const { responsePage, queryText, sendCsv } = adminHelpers;
export const getEventRegistrations = withPrismaErrors(async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id }, select: { id: true, judul: true } });
  if (!event) throw notFound('Event tidak ditemukan.');
  const q = queryText(req.query);
  const where = {
    event_id: event.id,
    ...(q ? { OR: ['nama', 'institusi', 'email'].map((field) => ({ [field]: { contains: q, mode: 'insensitive' } })) } : {}),
  };
  if (req.query.format === 'csv') {
    const rows = await prisma.pendaftarEvent.findMany({ where, orderBy: { created_at: 'desc' } });
    sendCsv(res, `pendaftar-${event.id}.csv`, ['id', 'nama', 'institusi', 'email', 'no_whatsapp', 'created_at'], rows.map((row) => [row.id, row.nama, row.institusi, row.email, row.no_whatsapp, row.created_at.toISOString()]));
    return;
  }
  if (req.query.format !== undefined && req.query.format !== 'json') throw httpError(422, 'VALIDATION_ERROR', 'Format ekspor tidak valid.');
  const { page, limit, skip } = parsePage(req.query, 20, 100);
  const [data, total] = await prisma.$transaction([
    prisma.pendaftarEvent.findMany({ where, orderBy: { created_at: 'desc' }, skip, take: limit }),
    prisma.pendaftarEvent.count({ where }),
  ]);
  res.json(responsePage(data, total, page, limit));
});
export const eventCrudHandlers = createCrudHandlers(resourceConfig.events);
