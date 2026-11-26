import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';

export async function publishScheduledNews(prismaClient = prisma, now = new Date()) {
  const result = await prismaClient.berita.updateMany({
    where: {
      status: 'scheduled',
      jadwal_terbit: { lte: now },
    },
    data: {
      status: 'published',
      published_at: now,
    },
  });

  return result.count;
}

export function startNewsScheduler({ prismaClient = prisma, scheduler = cron } = {}) {
  const publishDueNews = async () => {
    try {
      const count = await publishScheduledNews(prismaClient);
      if (count > 0) console.info(`Published ${count} scheduled news item(s).`);
    } catch (error) {
      console.error('Scheduled news publishing failed:', error);
    }
  };

  void publishDueNews();
  const task = scheduler.schedule('* * * * *', publishDueNews);
  return () => task.stop();
}
