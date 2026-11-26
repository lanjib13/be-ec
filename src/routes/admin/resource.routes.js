import { Router } from 'express';
import { createCrudHandlers, resourceConfig, getSettings, updateSettings } from '../../controllers/admin/resource.controller.js';
import { registerUuidParam } from '../../controllers/admin/shared.js';

export const resourceRouter = Router();
registerUuidParam(resourceRouter);

for (const [path, config] of Object.entries(resourceConfig)) {
  if (path === 'products' || path === 'events') continue;
  const handlers = createCrudHandlers(config);
  const route = `/${path}`;
  resourceRouter.get(route, handlers.list);
  resourceRouter.post(route, handlers.create);
  resourceRouter.get(`${route}/:id`, handlers.getById);
  resourceRouter.patch(`${route}/:id`, handlers.update);
  resourceRouter.delete(`${route}/:id`, handlers.delete);
}

resourceRouter.get('/settings', getSettings);
resourceRouter.put('/settings', updateSettings);
