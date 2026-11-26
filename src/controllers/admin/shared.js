import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { assertUuid, conflict, httpError, notFound, paginationMeta, parsePage, normalizeWhatsApp, slugify } from '../../utils/http-error.js';
import { partialSchema, schemas, validateData } from '../../utils/validation.js';
import { sanitizeRichText } from '../../services/rich-text.service.js';
import { z } from 'zod';

export function registerUuidParam(router) {
  router.param('id', (req, _res, next, id) => {
    try {
      assertUuid(id);
      next();
    } catch (error) {
      next(error);
    }
  });
  return router;
}

function responsePage(data, total, page, limit) {
  return { data, meta: paginationMeta(page, limit, total) };
}

function queryText(query) {
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  if (q.length > 100) throw httpError(422, 'VALIDATION_ERROR', 'Maksimum 100 karakter.', [{ field: 'q', message: 'Maksimum 100 karakter.' }]);
  return q;
}

function escapeCsv(value) {
  const text = value === null || value === undefined ? '' : String(value);
  const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function sendCsv(res, filename, headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsv).join(','));
  res.type('text/csv; charset=utf-8');
  res.attachment(filename);
  res.send(`\uFEFF${lines.join('\r\n')}`);
}

function authorOrNull(req) {
  return req.user?.id ?? null;
}

function dbInput(resource, input, req) {
  const data = { ...input };
  if (resource === 'statistik' && data.urutan === undefined) data.urutan = 0;
  if (resource === 'program') data.slug ??= slugify(data.nama);
  if (resource === 'events') data.slug ??= slugify(data.judul);
  if (resource === 'products') {
    data.slug ??= slugify(data.nama);
    if (data.no_whatsapp !== undefined) data.no_whatsapp = normalizeWhatsApp(data.no_whatsapp);
  }
  if (resource === 'news') {
    data.slug ??= slugify(data.judul);
    if (data.status === 'scheduled' && (!data.jadwal_terbit || data.jadwal_terbit <= new Date())) {
      throw httpError(422, 'VALIDATION_ERROR', 'Berita terjadwal wajib memiliki waktu terbit di masa depan.', [
        { field: 'jadwal_terbit', message: 'Masukkan waktu terbit di masa depan.' },
      ]);
    }
    if (data.konten !== undefined) data.konten = sanitizeRichText(data.konten);
    if (data.status === 'published' && req.method === 'POST') data.published_at = new Date();
    if (req.method === 'POST') data.penulis_id = authorOrNull(req);
  }
  if (resource === 'events') {
    if (data.batas_daftar && data.tanggal_selesai && data.batas_daftar > data.tanggal_selesai) {
      throw httpError(422, 'VALIDATION_ERROR', 'Batas pendaftaran tidak boleh melewati waktu selesai event.', [
        { field: 'batas_daftar', message: 'Pilih waktu sebelum event selesai.' },
      ]);
    }
  }
  return data;
}

function parseAdminFilters(query, filters) {
  const where = {};
  for (const [key, type] of Object.entries(filters)) {
    const value = query[key];
    if (value === undefined) continue;
    if (type === 'boolean') {
      if (value !== 'true' && value !== 'false') throw httpError(422, 'VALIDATION_ERROR', `${key} harus true atau false.`);
      where[key] = value === 'true';
    } else if (type.startsWith('enum:')) {
      const options = type.slice(5).split(',');
      if (!options.includes(value)) throw httpError(422, 'VALIDATION_ERROR', `${key} tidak valid.`);
      where[key] = value;
    } else {
      where[key] = value;
    }
  }
  return where;
}

function attachSearch(where, q, fields) {
  if (!q) return where;
  return {
    ...where,
    OR: fields.map((field) => ({ [field]: { contains: q, mode: 'insensitive' } })),
  };
}


export const adminHelpers = {
  responsePage,
  queryText,
  escapeCsv,
  sendCsv,
  authorOrNull,
  dbInput,
  parseAdminFilters,
  attachSearch,
  registerUuidParam,
};
