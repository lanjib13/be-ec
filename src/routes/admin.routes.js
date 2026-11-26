import { Router } from 'express';
import { requireAdmin } from '../middlewares/require-admin.js';
import { login } from '../controllers/admin/auth.controller.js';
import { adminLoginLimiter } from '../middlewares/rate-limit.js';
import { dashboardRouter } from './admin/dashboard.routes.js';
import { productAdminRouter } from './admin/product.routes.js';
import { eventAdminRouter } from './admin/event.routes.js';
import { recruitmentAdminRouter } from './admin/recruitment.routes.js';
import { moderationRouter } from './admin/moderation.routes.js';
import { resourceRouter } from './admin/resource.routes.js';
import { uploadRouter } from './upload.routes.js';

export const adminRouter = Router();
const protectedAdminRouter = Router();

adminRouter.post('/login', adminLoginLimiter, login);

protectedAdminRouter.use(requireAdmin);
protectedAdminRouter.use(
  dashboardRouter,
  productAdminRouter,
  eventAdminRouter,
  recruitmentAdminRouter,
  moderationRouter,
  resourceRouter,
  uploadRouter,
);
adminRouter.use(protectedAdminRouter);
