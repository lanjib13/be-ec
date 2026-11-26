import { Router } from 'express';
import { createPartnership, getRating, submitRating, getComments, createComment } from '../controllers/interaction.controller.js';
import { publicWriteLimiter } from '../middlewares/rate-limit.js';

export const interactionRouter = Router();

interactionRouter.post('/partnerships', publicWriteLimiter, createPartnership);
interactionRouter.get('/rating', getRating);
interactionRouter.post('/rating', publicWriteLimiter, submitRating);
interactionRouter.get('/comments', getComments);
interactionRouter.post('/comments', publicWriteLimiter, createComment);
