import { Router } from 'express';
import {
  getRecruitments,
  createRecruitment,
  getRecruitmentById,
  updateRecruitment,
  deleteRecruitment,
  getApplications,
  updateApplications,
} from '../../controllers/admin/recruitmentAdmin.controller.js';
import { registerUuidParam } from '../../controllers/admin/shared.js';

export const recruitmentAdminRouter = Router();
registerUuidParam(recruitmentAdminRouter);

recruitmentAdminRouter.get('/recruitments', getRecruitments);
recruitmentAdminRouter.post('/recruitments', createRecruitment);
recruitmentAdminRouter.get('/recruitments/:id', getRecruitmentById);
recruitmentAdminRouter.patch('/recruitments/:id', updateRecruitment);
recruitmentAdminRouter.delete('/recruitments/:id', deleteRecruitment);
recruitmentAdminRouter.get('/applications', getApplications);
recruitmentAdminRouter.patch('/applications', updateApplications);
