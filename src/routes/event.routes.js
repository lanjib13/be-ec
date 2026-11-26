import { Router } from 'express';
import { getEvents, getEvent, registerEvent } from '../controllers/event.controller.js';
import { publicWriteLimiter } from '../middlewares/rate-limit.js';

export const eventRouter = Router();

eventRouter.get('/events', getEvents);
eventRouter.get('/events/:slug', getEvent);
eventRouter.post('/events/:id/register', publicWriteLimiter, registerEvent);
