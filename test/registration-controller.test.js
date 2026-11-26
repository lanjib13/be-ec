import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DATABASE_URL ??= '******127.0.0.1:5432/ec_dev';
process.env.DIRECT_URL ??= '******127.0.0.1:5432/ec_dev';

const { createRegistrationController } = await import('../src/controllers/registration.controller.js');

test('event registration commits before sending confirmation and exposes delivery status', async () => {
  const eventId = 'c8a47a0a-5d52-4c80-a94d-aec63a266a53';
  const event = {
    id: eventId,
    judul: 'EC Forum',
    tanggal_mulai: new Date('2026-12-01T10:00:00.000Z'),
    tanggal_selesai: new Date('2026-12-01T12:00:00.000Z'),
    batas_daftar: new Date('2026-11-30T00:00:00.000Z'),
    kuota: 10,
    status_aktif: true,
  };
  let transactionOpen = false;
  let savedRegistration;
  const prismaClient = {
    async $transaction(callback) {
      transactionOpen = true;
      try {
        return await callback({
          async $queryRaw() {},
          event: { async findUnique() { return event; } },
          pendaftarEvent: {
            async findUnique() { return null; },
            async count() { return 0; },
            async create({ data }) {
              savedRegistration = { id: 'registration-id', ...data };
              return savedRegistration;
            },
          },
        });
      } finally {
        transactionOpen = false;
      }
    },
  };
  const mailer = {
    async sendEventRegistration() {
      assert.equal(transactionOpen, false);
      return { status: 'sent' };
    },
  };
  let response;
  const res = {
    status(status) {
      response = { status };
      return this;
    },
    json(body) {
      response.body = body;
    },
  };
  const controller = createRegistrationController({ prismaClient, mailer });

  await controller.registerEvent({
    params: { id: eventId },
    body: {
      nama: 'Budi Santoso',
      institusi: 'Universitas',
      email: 'BUDI@example.com',
      no_whatsapp: '081234567890',
    },
  }, res);

  assert.equal(savedRegistration.email, 'budi@example.com');
  assert.equal(savedRegistration.no_whatsapp, '6281234567890');
  assert.equal(response.status, 201);
  assert.equal(response.body.data.email_konfirmasi, 'sent');
});
