import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DATABASE_URL ??= '******127.0.0.1:5432/ec_dev';
process.env.DIRECT_URL ??= '******127.0.0.1:5432/ec_dev';

const { publishScheduledNews, startNewsScheduler } = await import('../src/jobs/scheduler.job.js');

test('scheduled news publishes only entries whose schedule is due', async () => {
  const now = new Date('2026-11-14T12:00:00.000Z');
  let query;
  const prismaClient = {
    berita: {
      async updateMany(args) {
        query = args;
        return { count: 2 };
      },
    },
  };

  assert.equal(await publishScheduledNews(prismaClient, now), 2);
  assert.deepEqual(query, {
    where: { status: 'scheduled', jadwal_terbit: { lte: now } },
    data: { status: 'published', published_at: now },
  });
});

test('news scheduler runs immediately, then registers its one-minute job', async () => {
  const calls = [];
  let registeredExpression;
  let stopped = false;
  const prismaClient = {
    berita: {
      async updateMany() {
        calls.push('publish');
        return { count: 0 };
      },
    },
  };
  const scheduler = {
    schedule(expression) {
      registeredExpression = expression;
      return { stop() { stopped = true; } };
    },
  };
  const originalInfo = console.info;
  console.info = () => {};

  try {
    const stop = startNewsScheduler({ prismaClient, scheduler });
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(calls, ['publish']);
    assert.equal(registeredExpression, '* * * * *');
    stop();
    assert.equal(stopped, true);
  } finally {
    console.info = originalInfo;
  }
});
