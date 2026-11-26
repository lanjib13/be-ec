import { prisma, notFound, parsePage, publicEvent, getEventSummaryRows, withPrismaErrors } from './public.helpers.js';
import { registrationController } from './registration.controller.js';

export const eventController = registrationController;

export const getEvents = withPrismaErrors(async (req, res) => {
  const { page, limit } = parsePage(req.query);
  res.json(await getEventSummaryRows({ status_aktif: true }, page, limit));
});

export const getEvent = withPrismaErrors(async (req, res) => {
  const event = await prisma.event.findFirst({
    where: { slug: req.params.slug, status_aktif: true },
    include: { _count: { select: { pendaftar: true } } },
  });
  if (!event) throw notFound('Event tidak ditemukan.');
  const { _count, ...item } = event;
  res.json({ data: publicEvent(item, _count.pendaftar) });
});

export const registerEvent = withPrismaErrors(eventController.registerEvent);
