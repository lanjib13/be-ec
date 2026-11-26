import { Router } from 'express';
import { parseUpload, uploadFile } from '../controllers/admin/upload.controller.js';

export const uploadRouter = Router();

uploadRouter.post('/upload', parseUpload, uploadFile);
