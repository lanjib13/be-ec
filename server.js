import { createApp } from './src/app.js';
import { env } from './src/config/env.js';
import { prisma } from './src/config/prisma.js';
import { startNewsScheduler } from './src/jobs/scheduler.job.js';

const app = createApp();
const stopNewsScheduler = startNewsScheduler();
const server = app.listen(env.PORT, () => {
  console.info(`EC API listening on port ${env.PORT}`);
});

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.info(`${signal} received; shutting down`);
  stopNewsScheduler();

  server.close(async (error) => {
    if (error) {
      console.error('HTTP server shutdown failed', error);
      process.exitCode = 1;
    }

    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('Database disconnect failed', disconnectError);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
