import { Router } from 'express';
import { getProducts, getProduct, recordProductClick } from '../controllers/product.controller.js';
import { publicWriteLimiter } from '../middlewares/rate-limit.js';

export const productRouter = Router();

productRouter.get('/products', getProducts);
productRouter.get('/products/:slug', getProduct);
productRouter.post('/products/:id/click', publicWriteLimiter, recordProductClick);
