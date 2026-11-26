import { Router } from 'express';
import { contentRouter } from './content.routes.js';
import { eventRouter } from './event.routes.js';
import { productRouter } from './product.routes.js';
import { newsRouter } from './news.routes.js';
import { interactionRouter } from './interaction.routes.js';
import { recruitmentRouter } from './recruitment.routes.js';

export const publicRouter = Router();

publicRouter.use(
  contentRouter,
  eventRouter,
  productRouter,
  newsRouter,
  interactionRouter,
  recruitmentRouter,
);
