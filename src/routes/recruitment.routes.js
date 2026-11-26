import { Router } from 'express';
import { getRecruitment, applyRecruitment, getRecruitmentStatus } from '../controllers/recruitment.controller.js';
import { publicWriteLimiter, recruitmentStatusLimiter } from '../middlewares/rate-limit.js';

export const recruitmentRouter = Router();

recruitmentRouter.get('/recruitment', getRecruitment);
recruitmentRouter.post('/recruitment/apply', publicWriteLimiter, applyRecruitment);
recruitmentRouter.post('/recruitment/status', recruitmentStatusLimiter, getRecruitmentStatus);
