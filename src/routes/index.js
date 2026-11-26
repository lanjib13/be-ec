import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { publicRouter } from './public.routes.js';
import { adminRouter } from './admin.routes.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(publicRouter);
apiRouter.use('/admin', adminRouter);
