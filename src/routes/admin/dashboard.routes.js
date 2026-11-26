import { Router } from 'express';
import { getDashboard } from '../../controllers/admin/dashboard.controller.js';

export const dashboardRouter = Router();
dashboardRouter.get('/dashboard', getDashboard);
