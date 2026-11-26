import { Router } from 'express';
import { getHome, getAbout, getPrograms, getProgram, getAchievements, getPartners, getSocial } from '../controllers/content.controller.js';

export const contentRouter = Router();

contentRouter.get('/home', getHome);
contentRouter.get('/about', getAbout);
contentRouter.get('/programs', getPrograms);
contentRouter.get('/programs/:slug', getProgram);
contentRouter.get('/achievements', getAchievements);
contentRouter.get('/partners', getPartners);
contentRouter.get('/social', getSocial);
