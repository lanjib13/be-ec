import { prisma, notFound, withPrismaErrors, schemas, validateData } from './public.helpers.js';
import { registrationController } from './registration.controller.js';

export const recruitmentController = registrationController;

export const getRecruitment = withPrismaErrors(async (_req, res) => {
  const data = await prisma.rekrutmenPeriode.findFirst({
    orderBy: { tanggal_buka: 'desc' },
    include: { posisi: { orderBy: { nama_posisi: 'asc' } } },
  });
  res.json({
    data: data ? {
      id: data.id,
      judul: data.judul,
      deskripsi: data.deskripsi,
      tanggal_buka: data.tanggal_buka,
      tanggal_tutup: data.tanggal_tutup,
      status: data.status,
      syarat_umum: data.syarat_umum,
      tahapan_seleksi: data.tahapan_seleksi,
      kontak_panitia: data.kontak_panitia,
      posisi: data.posisi,
    } : null,
  });
});

export const applyRecruitment = withPrismaErrors(recruitmentController.applyRecruitment);

export const getRecruitmentStatus = withPrismaErrors(async (req, res) => {
  const input = validateData(schemas.status, req.body);
  const applicant = await prisma.pelamarAnggota.findFirst({
    where: { kode_pendaftaran: input.code, email: input.email.toLowerCase() },
    select: {
      status_seleksi: true,
      catatan_admin: true,
      periode: { select: { judul: true, kontak_panitia: true } },
    },
  });
  if (!applicant) throw notFound('Kode pendaftaran atau email tidak cocok.');
  res.json({
    data: {
      status_seleksi: applicant.status_seleksi,
      catatan_admin: applicant.catatan_admin,
      periode_judul: applicant.periode.judul,
      kontak_panitia: applicant.periode.kontak_panitia,
    },
  });
});
