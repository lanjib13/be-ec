export function httpError(status, code, message, details) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (details) error.details = details;
  return error;
}

export function notFound(message = 'Data tidak ditemukan.') {
  return httpError(404, 'NOT_FOUND', message);
}

export function conflict(message, code = 'CONFLICT') {
  return httpError(409, code, message);
}

export function assertUuid(value, field = 'id') {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw httpError(422, 'VALIDATION_ERROR', 'Input tidak valid.', [
      { field, message: 'Harus berupa UUID yang valid.' },
    ]);
  }
}

export function parsePage(query, defaultLimit = 10, maxLimit = 100) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? defaultLimit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    throw httpError(422, 'VALIDATION_ERROR', 'Parameter paginasi tidak valid.', [
      { field: 'page/limit', message: `page minimal 1 dan limit 1-${maxLimit}.` },
    ]);
  }
  return { page, limit, skip: (page - 1) * limit };
}

export function paginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    total_pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export function mapPrismaError(error) {
  if (error?.code === 'P2002') return conflict('Nilai tersebut sudah digunakan.');
  if (error?.code === 'P2025') return notFound();
  if (error?.code === 'P2003' || error?.code === 'P2014') {
    return conflict('Data masih digunakan atau relasi tidak valid.');
  }
  return error;
}

export function withPrismaErrors(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(mapPrismaError(error));
    }
  };
}

export function normalizeWhatsApp(value) {
  if (!value) return value;
  return value.startsWith('+') ? value.slice(1) : value.startsWith('0') ? `62${value.slice(1)}` : value;
}

export function slugify(value) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) throw httpError(422, 'VALIDATION_ERROR', 'Nama tidak menghasilkan slug yang valid.');
  return slug;
}
