import { createHmac } from 'node:crypto';
import { prisma, env, assertUuid, httpError, notFound, parsePage, pagedResult, withPrismaErrors, schemas, validateData, normalizeWhatsApp, validationError, conflictError, checkHoneypot, findPublicCommentTarget } from './public.helpers.js';

export const createPartnership = withPrismaErrors(async (req, res) => {
  const input = validateData(schemas.partnership, req.body);
  checkHoneypot(input);
  const data = await prisma.pengajuanPartnership.create({
    data: { ...input, email: input.email.toLowerCase(), no_whatsapp: normalizeWhatsApp(input.no_whatsapp) },
    select: { id: true, status: true },
  });
  res.status(201).json({ data });
});

export const getRating = withPrismaErrors(async (_req, res) => {
  const result = await prisma.ratingHero.aggregate({ _avg: { skor: true }, _count: { _all: true } });
  res.json({ data: { rata_rata: result._avg.skor ?? 0, jumlah: result._count._all } });
});

export const submitRating = withPrismaErrors(async (req, res) => {
  const input = validateData(schemas.rating, req.body);
  checkHoneypot(input);
  if (!env.VOTER_HASH_SALT) throw httpError(503, 'SERVICE_NOT_CONFIGURED', 'Layanan rating belum dikonfigurasi.');
  const cookie = req.get('cookie')?.match(/(?:^|;\s*)ec_device=([^;]+)/)?.[1] ?? '';
  const deviceHash = createHmac('sha256', env.VOTER_HASH_SALT)
    .update(`${req.ip}|${req.get('user-agent') ?? ''}|${cookie}`)
    .digest('hex');
  try {
    await prisma.ratingHero.create({ data: { skor: input.skor, perangkat_hash: deviceHash } });
  } catch (error) {
    if (error.code === 'P2002') throw conflictError('Perangkat ini sudah memberikan rating.', 'DUPLICATE_RATING');
    throw error;
  }
  const result = await prisma.ratingHero.aggregate({ _avg: { skor: true }, _count: { _all: true } });
  res.status(201).json({ data: { rata_rata: result._avg.skor ?? 0, jumlah: result._count._all } });
});

export const getComments = withPrismaErrors(async (req, res) => {
  const target_type = req.query.target_type;
  const target_id = req.query.target_id;
  if (!['news', 'program', 'achievement'].includes(target_type) || typeof target_id !== 'string') {
    throw validationError('target_type dan target_id wajib valid.');
  }
  assertUuid(target_id, 'target_id');
  if (!await findPublicCommentTarget(target_type, target_id)) {
    throw notFound('Konten yang dikomentari tidak ditemukan.');
  }
  const { page, limit, skip } = parsePage(req.query);
  const where = { target_tipe: target_type, target_id, status: 'approved' };
  const [data, total] = await prisma.$transaction([
    prisma.komentar.findMany({
      where,
      select: { id: true, target_tipe: true, target_id: true, nama_pengirim: true, isi_komentar: true, created_at: true },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.komentar.count({ where }),
  ]);
  res.json(pagedResult(data.map((item) => ({ ...item, target_type: item.target_tipe, target_tipe: undefined })), total, page, limit));
});

export const createComment = withPrismaErrors(async (req, res) => {
  const input = validateData(schemas.comment, req.body);
  checkHoneypot(input);
  const target = await findPublicCommentTarget(input.target_type, input.target_id);
  if (!target) throw notFound('Konten yang dikomentari tidak ditemukan.');
  const data = await prisma.komentar.create({
    data: {
      target_tipe: input.target_type,
      target_id: input.target_id,
      nama_pengirim: input.nama_pengirim,
      email_pengirim: input.email_pengirim?.toLowerCase(),
      isi_komentar: input.isi_komentar,
      status: 'pending',
    },
    select: { id: true, status: true },
  });
  res.status(202).json({ data });
});
