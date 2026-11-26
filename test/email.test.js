import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DATABASE_URL ??= '******127.0.0.1:5432/ec_dev';
process.env.DIRECT_URL ??= '******127.0.0.1:5432/ec_dev';

const { createEmailService } = await import('../src/services/email.service.js');

test('email service reports an explicit not-configured status', async () => {
  const warnings = [];
  const service = createEmailService({
    config: { EMAIL_SMTP_HOST: '', EMAIL_FROM: 'entrepreneurs.club@unu-jogja.ac.id' },
    logger: { warn: (message) => warnings.push(message) },
  });

  assert.deepEqual(await service.sendEventRegistration({
    to: 'participant@example.com',
    event: { judul: 'EC Forum', tanggal_mulai: new Date(), tanggal_selesai: new Date() },
    registration: { nama: 'Peserta' },
  }), { status: 'not_configured' });
  assert.equal(warnings.length, 1);
});

test('email service sends recruitment confirmation through configured SMTP', async () => {
  let transportOptions;
  let message;
  const service = createEmailService({
    config: {
      EMAIL_SMTP_HOST: 'mail.campus.example',
      EMAIL_SMTP_PORT: 587,
      EMAIL_SMTP_SECURE: false,
      EMAIL_SMTP_USER: 'entrepreneurs.club@unu-jogja.ac.id',
      EMAIL_SMTP_PASS: 'test-password',
      EMAIL_FROM: 'entrepreneurs.club@unu-jogja.ac.id',
    },
    transporterFactory(options) {
      transportOptions = options;
      return { async sendMail(mail) { message = mail; } };
    },
    logger: { error() {} },
  });

  const result = await service.sendRecruitmentApplication({
    to: 'applicant@example.com',
    application: {
      nama_lengkap: 'Andi',
      kode_pendaftaran: 'EC-R-7K2M9Q',
      periode_judul: 'Open Recruitment',
      tahapan_seleksi: [{ nama: 'Wawancara', tanggal: '2026-11-20' }],
      kontak_panitia: { email: 'panitia@example.com' },
    },
  });

  assert.deepEqual(result, { status: 'sent' });
  assert.equal(transportOptions.host, 'mail.campus.example');
  assert.equal(transportOptions.auth.user, 'entrepreneurs.club@unu-jogja.ac.id');
  assert.equal(message.from, 'entrepreneurs.club@unu-jogja.ac.id');
  assert.equal(message.to, 'applicant@example.com');
  assert.match(message.text, /EC-R-7K2M9Q/);
  assert.match(message.text, /Wawancara - 2026-11-20/);
});

test('email delivery failures are logged and surfaced in the delivery status', async () => {
  const loggedErrors = [];
  const service = createEmailService({
    config: {
      EMAIL_SMTP_HOST: 'mail.campus.example',
      EMAIL_SMTP_PORT: 587,
      EMAIL_SMTP_SECURE: false,
      EMAIL_FROM: 'entrepreneurs.club@unu-jogja.ac.id',
    },
    transporterFactory: () => ({ async sendMail() { throw new Error('SMTP unavailable'); } }),
    logger: { error: (...args) => loggedErrors.push(args) },
  });

  const result = await service.sendEventRegistration({
    to: 'participant@example.com',
    event: { judul: 'EC Forum', tanggal_mulai: new Date(), tanggal_selesai: new Date() },
    registration: { nama: 'Peserta' },
  });

  assert.deepEqual(result, { status: 'failed' });
  assert.equal(loggedErrors[0][1].message, 'SMTP unavailable');
});
