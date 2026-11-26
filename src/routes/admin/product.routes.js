import { Router } from 'express';
import { getProductStats, productCrudHandlers } from '../../controllers/admin/productAdmin.controller.js';
import { registerUuidParam } from '../../controllers/admin/shared.js';

export const productAdminRouter = Router();
registerUuidParam(productAdminRouter);

productAdminRouter.get('/products/stats', getProductStats);
productAdminRouter.get('/products', productCrudHandlers.list);
productAdminRouter.post('/products', productCrudHandlers.create);
productAdminRouter.get('/products/:id', productCrudHandlers.getById);
productAdminRouter.patch('/products/:id', productCrudHandlers.update);
productAdminRouter.delete('/products/:id', productCrudHandlers.delete);
