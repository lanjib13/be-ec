import { Router } from 'express';
import {
  getPartnerships,
  updatePartnerships,
  getModerationComments,
  updateComments,
  deleteComments,
} from '../../controllers/admin/moderation.controller.js';

export const moderationRouter = Router();

moderationRouter.get('/partnerships', getPartnerships);
moderationRouter.patch('/partnerships', updatePartnerships);
moderationRouter.get('/comments', getModerationComments);
moderationRouter.patch('/comments', updateComments);
moderationRouter.delete('/comments', deleteComments);
