import { randomInt } from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { emailService } from '../services/email.service.js';
import { httpError, notFound, normalizeWhatsApp, conflict } from '../utils/http-error.js';
import { schemas, validateData } from '../utils/validation.js';

function rejectHoneypot(data) {
  if (data.website) throw httpError(400, 'BAD_REQUEST', 'Permintaan tidak dapat diproses.');
  delete data.website;
}

export function createRegistrationController({ prismaClient = prisma, mailer = emailService } = {}) {
  async function registerEvent(req, res) {
    const input = validateData(schemas.eventRegistration, req.body);
    rejectHoneypot(input);
    const eventId = req.params.id;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)) {
      throw httpError(422, 'VALIDATION_ERROR', 'ID event tidak valid.', [{ field: 'id', message: 'Harus berupa UUID yang valid.' }]);
    }

    const email = input.email.toLowerCase();
    const result = await prismaClient.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId}::uuid FOR UPDATE`;
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) throw notFound('Event tidak ditemukan.');
      if (!event.status_aktif || event.batas_daftar <= new Date()) {
        throw conflict('Pendaftaran event sudah ditutup.', 'REGISTRATION_CLOSED');
      }

      const [existing, count] = await Promise.all([
        tx.pendaftarEvent.findUnique({ where: { event_id_email: { event_id: eventId, email } } }),
        tx.pendaftarEvent.count({ where: { event_id: eventId } }),
      ]);
      if (existing) throw conflict('Email sudah terdaftar untuk event ini.', 'DUPLICATE_REGISTRATION');
      if (count >= event.kuota) throw conflict('Kuota event sudah penuh.', 'QUOTA_FULL');

      const registration = await tx.pendaftarEvent.create({
        data: { event_id: eventId, ...input, email, no_whatsapp: normalizeWhatsApp(input.no_whatsapp) },
      });
      return { registration, event };
    });

    const { status: emailStatus } = await mailer.sendEventRegistration({
      to: email,
      event: result.event,
      registration: result.registration,
    });
    res.status(201).json({
      data: {
        registration_id: result.registration.id,
        event_judul: result.event.judul,
        tanggal_mulai: result.event.tanggal_mulai,
        email,
        email_konfirmasi: emailStatus,
      },
    });
  }

  async function applyRecruitment(req, res) {
    const input = validateData(schemas.apply, req.body);
    rejectHoneypot(input);
    const email = input.email.toLowerCase();
    const result = await prismaClient.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM rekrutmen_periode WHERE id = ${input.periode_id}::uuid FOR UPDATE`;
      const periode = await tx.rekrutmenPeriode.findUnique({ where: { id: input.periode_id } });
      if (!periode) throw notFound('Periode rekrutmen tidak ditemukan.');
      if (periode.status !== 'dibuka' || periode.tanggal_buka > new Date() || periode.tanggal_tutup <= new Date()) {
        throw conflict('Pendaftaran rekrutmen sudah ditutup.', 'REGISTRATION_CLOSED');
      }

      const positionIds = [input.posisi_pilihan_1_id, input.posisi_pilihan_2_id].filter(Boolean);
      const positions = await tx.rekrutmenPosisi.findMany({
        where: { id: { in: positionIds }, periode_id: input.periode_id },
      });
      if (positions.length !== positionIds.length || positions.some((position) => !position.status_buka)) {
        throw conflict('Posisi tidak tersedia untuk pendaftaran.', 'POSITION_CLOSED');
      }

      const duplicate = await tx.pelamarAnggota.findUnique({
        where: { periode_id_email: { periode_id: input.periode_id, email } },
        select: { id: true },
      });
      if (duplicate) throw conflict('Email sudah digunakan untuk periode ini.', 'DUPLICATE_APPLICATION');

      for (const position of positions) {
        if (position.kuota === null) continue;
        const count = await tx.pelamarAnggota.count({
          where: {
            periode_id: input.periode_id,
            OR: [{ posisi_pilihan_1_id: position.id }, { posisi_pilihan_2_id: position.id }],
          },
        });
        if (count >= position.kuota) {
          throw conflict(`Kuota posisi ${position.nama_posisi} sudah penuh.`, 'POSITION_CLOSED');
        }
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = `EC-R-${Array.from({ length: 6 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[randomInt(36)]).join('')}`;
        try {
          await tx.pelamarAnggota.create({
            data: {
              ...input,
              email,
              no_whatsapp: normalizeWhatsApp(input.no_whatsapp),
              kode_pendaftaran: code,
              posisi_pilihan_2_id: input.posisi_pilihan_2_id ?? null,
            },
          });
          return { kode_pendaftaran: code, periode, email };
        } catch (error) {
          if (error.code === 'P2002' && error.meta?.target?.includes('kode_pendaftaran')) continue;
          if (error.code === 'P2002') throw conflict('Email sudah digunakan untuk periode ini.', 'DUPLICATE_APPLICATION');
          throw error;
        }
      }
      throw httpError(500, 'CODE_GENERATION_FAILED', 'Kode pendaftaran tidak dapat dibuat.');
    }, { isolationLevel: 'Serializable' });

    const { status: emailStatus } = await mailer.sendRecruitmentApplication({
      to: email,
      application: {
        nama_lengkap: input.nama_lengkap,
        kode_pendaftaran: result.kode_pendaftaran,
        periode_judul: result.periode.judul,
        tahapan_seleksi: result.periode.tahapan_seleksi,
        kontak_panitia: result.periode.kontak_panitia,
      },
    });
    res.status(201).json({
      data: {
        kode_pendaftaran: result.kode_pendaftaran,
        periode_judul: result.periode.judul,
        email,
        email_konfirmasi: emailStatus,
      },
    });
  }

  return { registerEvent, applyRecruitment };
}

export const registrationController = createRegistrationController();
