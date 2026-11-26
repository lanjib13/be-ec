import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { assertUuid, conflict, httpError, notFound, parsePage, withPrismaErrors } from '../../utils/http-error.js';
import { partialSchema, schemas, validateData } from '../../utils/validation.js';
import { adminHelpers } from './shared.js';

const { responsePage, queryText, escapeCsv, sendCsv } = adminHelpers;
const recruitmentUpdateSchema = partialSchema(schemas.recruitment);

async function ensureSingleActiveRecruitment(tx, status, excludeId) {
  if (!['akan_dibuka', 'dibuka', 'pengumuman'].includes(status)) return;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(142892, 1)`;
  const active = await tx.rekrutmenPeriode.findFirst({
    where: { status: { in: ['akan_dibuka', 'dibuka', 'pengumuman'] }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (active) throw conflict('Periode rekrutmen aktif lainnya masih ada.');
}

export const getRecruitments = withPrismaErrors(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, 20, 100);
  const q = queryText(req.query);
  const where = q ? { OR: [{ judul: { contains: q, mode: 'insensitive' } }, { deskripsi: { contains: q, mode: 'insensitive' } }] } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.rekrutmenPeriode.findMany({
      where,
      include: { posisi: true, _count: { select: { pelamar: true } } },
      orderBy: { tanggal_buka: 'desc' },
      skip,
      take: limit,
    }),
    prisma.rekrutmenPeriode.count({ where }),
  ]);
  res.json(responsePage(rows.map(({ _count, ...row }) => ({ ...row, jumlah_pelamar: _count.pelamar })), total, page, limit));
});

export const createRecruitment = withPrismaErrors(async (req, res) => {
  const input = validateData(schemas.recruitment, req.body);
  const { posisi, ...data } = input;
  const created = await prisma.$transaction(async (tx) => {
    await ensureSingleActiveRecruitment(tx, data.status, null);
    return tx.rekrutmenPeriode.create({
      data: {
        ...data,
        syarat_umum: data.syarat_umum,
        tahapan_seleksi: data.tahapan_seleksi,
        kontak_panitia: data.kontak_panitia,
        posisi: { create: posisi.map(({ id, ...position }) => position) },
      },
      include: { posisi: true, _count: { select: { pelamar: true } } },
    });
  }, { isolationLevel: 'Serializable' });
  const { _count, ...row } = created;
  res.status(201).json({ data: { ...row, jumlah_pelamar: _count.pelamar } });
});

export const getRecruitmentById = withPrismaErrors(async (req, res) => {
  const data = await prisma.rekrutmenPeriode.findUnique({
    where: { id: req.params.id },
    include: { posisi: true, _count: { select: { pelamar: true } } },
  });
  if (!data) throw notFound();
  const { _count, ...row } = data;
  res.json({ data: { ...row, jumlah_pelamar: _count.pelamar } });
});

export const updateRecruitment = withPrismaErrors(async (req, res) => {
  const input = validateData(recruitmentUpdateSchema, req.body);
  const { posisi, ...fields } = input;
  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.rekrutmenPeriode.findUnique({
      where: { id: req.params.id },
      include: { posisi: { include: { _count: { select: { pelamar_pilihan_1: true, pelamar_pilihan_2: true } } } } },
    });
    if (!current) throw notFound();
    await ensureSingleActiveRecruitment(tx, fields.status ?? current.status, current.id);
    if (posisi) {
      const suppliedIds = posisi.map((item) => item.id).filter(Boolean);
      if (new Set(suppliedIds).size !== suppliedIds.length || suppliedIds.some((id) => !current.posisi.some((position) => position.id === id))) {
        throw httpError(422, 'VALIDATION_ERROR', 'Daftar posisi mengandung ID duplikat atau bukan milik periode ini.');
      }
      const removed = current.posisi.filter((position) => !suppliedIds.includes(position.id));
      if (removed.some((position) => position._count.pelamar_pilihan_1 || position._count.pelamar_pilihan_2)) {
        throw conflict('Posisi yang sudah dipilih pelamar tidak dapat dihapus; ubah statusnya menjadi tutup.');
      }
      for (const position of removed) await tx.rekrutmenPosisi.delete({ where: { id: position.id } });
      for (const position of posisi) {
        const { id, ...values } = position;
        if (id) await tx.rekrutmenPosisi.update({ where: { id }, data: values });
        else await tx.rekrutmenPosisi.create({ data: { ...values, periode_id: current.id } });
      }
    }
    return tx.rekrutmenPeriode.update({
      where: { id: current.id },
      data: fields,
      include: { posisi: true, _count: { select: { pelamar: true } } },
    });
  }, { isolationLevel: 'Serializable' });
  const { _count, ...row } = updated;
  res.json({ data: { ...row, jumlah_pelamar: _count.pelamar } });
});

export const deleteRecruitment = withPrismaErrors(async (req, res) => {
  await prisma.rekrutmenPeriode.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export const getApplications = withPrismaErrors(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, 20, 100);
  const q = queryText(req.query);
  if (req.query.status_seleksi !== undefined && !['terkirim', 'seleksi_berkas', 'wawancara', 'diterima', 'tidak_lolos'].includes(req.query.status_seleksi)) {
    throw httpError(422, 'VALIDATION_ERROR', 'Status seleksi tidak valid.');
  }
  if (req.query.periode_id !== undefined) assertUuid(req.query.periode_id, 'periode_id');
  if (req.query.posisi_id !== undefined) assertUuid(req.query.posisi_id, 'posisi_id');
  const where = {
    ...(req.query.periode_id ? { periode_id: req.query.periode_id } : {}),
    ...(req.query.status_seleksi ? { status_seleksi: req.query.status_seleksi } : {}),
    ...(req.query.posisi_id ? { OR: [{ posisi_pilihan_1_id: req.query.posisi_id }, { posisi_pilihan_2_id: req.query.posisi_id }] } : {}),
    ...(q ? { AND: [{ OR: ['nama_lengkap', 'email', 'institusi'].map((field) => ({ [field]: { contains: q, mode: 'insensitive' } })) }] } : {}),
  };
  const include = { posisi_1: { select: { id: true, nama_posisi: true } }, posisi_2: { select: { id: true, nama_posisi: true } } };
  if (req.query.format === 'csv') {
    const rows = await prisma.pelamarAnggota.findMany({ where, include, orderBy: { created_at: 'desc' } });
    sendCsv(
      res,
      'pelamar-anggota.csv',
      ['id', 'kode_pendaftaran', 'nama_lengkap', 'institusi', 'jurusan_prodi', 'angkatan_semester', 'email', 'no_whatsapp', 'status_seleksi', 'catatan_admin', 'created_at'],
      rows.map((row) => [row.id, row.kode_pendaftaran, row.nama_lengkap, row.institusi, row.jurusan_prodi, row.angkatan_semester, row.email, row.no_whatsapp, row.status_seleksi, row.catatan_admin, row.created_at.toISOString()]),
    );
    return;
  }
  if (req.query.format !== undefined && req.query.format !== 'json') throw httpError(422, 'VALIDATION_ERROR', 'Format ekspor tidak valid.');
  const [rows, total] = await prisma.$transaction([
    prisma.pelamarAnggota.findMany({ where, include, orderBy: { created_at: 'desc' }, skip, take: limit }),
    prisma.pelamarAnggota.count({ where }),
  ]);
  res.json(responsePage(rows.map(({ posisi_1, posisi_2, ...row }) => ({
    ...row,
    posisi_pilihan_1: posisi_1,
    posisi_pilihan_2: posisi_2,
  })), total, page, limit));
});

export const updateApplications = withPrismaErrors(async (req, res) => {
  const validation = z.object({
    ids: z.array(z.uuid()).min(1).max(200),
    status_seleksi: z.enum(['terkirim', 'seleksi_berkas', 'wawancara', 'diterima', 'tidak_lolos']).optional(),
    catatan_admin: z.string().nullable().optional(),
  }).refine((value) => value.status_seleksi !== undefined || value.catatan_admin !== undefined).safeParse(req.body);
  if (!validation.success) throw httpError(422, 'VALIDATION_ERROR', 'Data perubahan pelamar tidak valid.');
  const { ids, ...data } = validation.data;
  const found = await prisma.pelamarAnggota.count({ where: { id: { in: ids } } });
  if (found !== ids.length) throw notFound('Satu atau lebih pelamar tidak ditemukan.');
  const result = await prisma.pelamarAnggota.updateMany({ where: { id: { in: ids } }, data });
  res.json({ data: { updated: result.count } });
});
