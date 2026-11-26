import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

function formatJakartaDate(value) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(value);
}

function recruitmentTimeline(phases) {
  if (!Array.isArray(phases) || phases.length === 0) return 'Informasi tahapan seleksi akan diumumkan oleh panitia.';
  return phases.map((phase, index) => {
    const date = phase.tanggal ? ` - ${phase.tanggal}` : '';
    const note = phase.keterangan ? `\n  ${phase.keterangan}` : '';
    return `${index + 1}. ${phase.nama ?? 'Tahapan seleksi'}${date}${note}`;
  }).join('\n');
}

function contactDetails(contact) {
  const details = [];
  if (contact?.whatsapp) details.push(`WhatsApp: ${contact.whatsapp}`);
  if (contact?.email) details.push(`Email: ${contact.email}`);
  return details.length ? details.join('\n') : 'Silakan hubungi panitia melalui kanal resmi EC.';
}

export function createEmailService({
  config = env,
  transporterFactory = (options) => nodemailer.createTransport(options),
  logger = console,
} = {}) {
  let transporter;

  async function send({ to, subject, text }) {
    if (!config.EMAIL_SMTP_HOST) {
      logger.warn('Confirmation email was not sent: SMTP is not configured.');
      return { status: 'not_configured' };
    }

    try {
      transporter ??= transporterFactory({
        host: config.EMAIL_SMTP_HOST,
        port: config.EMAIL_SMTP_PORT,
        secure: config.EMAIL_SMTP_SECURE,
        ...(config.EMAIL_SMTP_USER ? {
          auth: {
            user: config.EMAIL_SMTP_USER,
            pass: config.EMAIL_SMTP_PASS,
          },
        } : {}),
      });
      await transporter.sendMail({
        from: config.EMAIL_FROM,
        to,
        subject,
        text,
      });
      return { status: 'sent' };
    } catch (error) {
      logger.error('Confirmation email delivery failed:', error);
      return { status: 'failed' };
    }
  }

  return {
    sendEventRegistration({ to, event, registration }) {
      return send({
        to,
        subject: `Konfirmasi pendaftaran: ${event.judul}`,
        text: [
          `Halo ${registration.nama},`,
          '',
          `Pendaftaran Anda untuk event "${event.judul}" telah diterima.`,
          `Tanggal mulai: ${formatJakartaDate(event.tanggal_mulai)}`,
          `Tanggal selesai: ${formatJakartaDate(event.tanggal_selesai)}`,
          '',
          'Simpan email ini sebagai konfirmasi pendaftaran. Informasi lanjutan akan disampaikan melalui kanal resmi EC.',
        ].join('\n'),
      });
    },
    sendRecruitmentApplication({ to, application }) {
      return send({
        to,
        subject: `Konfirmasi lamaran: ${application.periode_judul}`,
        text: [
          `Halo ${application.nama_lengkap},`,
          '',
          `Lamaran Anda untuk ${application.periode_judul} telah diterima.`,
          `Kode pendaftaran: ${application.kode_pendaftaran}`,
          '',
          'Tahapan seleksi:',
          recruitmentTimeline(application.tahapan_seleksi),
          '',
          'Kontak panitia:',
          contactDetails(application.kontak_panitia),
        ].join('\n'),
      });
    },
  };
}

export const emailService = createEmailService();
