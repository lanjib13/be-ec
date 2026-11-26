import { Router } from 'express';
import { eventCrudHandlers, getEventRegistrations } from '../../controllers/admin/eventAdmin.controller.js';
import { registerUuidParam } from '../../controllers/admin/shared.js';

export const eventAdminRouter = Router();
registerUuidParam(eventAdminRouter);

eventAdminRouter.get('/events/:id/registrations', getEventRegistrations);
eventAdminRouter.get('/events', eventCrudHandlers.list);
eventAdminRouter.post('/events', eventCrudHandlers.create);
eventAdminRouter.get('/events/:id', eventCrudHandlers.getById);
eventAdminRouter.patch('/events/:id', eventCrudHandlers.update);
eventAdminRouter.delete('/events/:id', eventCrudHandlers.delete);
