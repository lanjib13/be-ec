import { Router } from 'express';
import { getNews, getNewsArticle } from '../controllers/news.controller.js';

export const newsRouter = Router();

newsRouter.get('/news', getNews);
newsRouter.get('/news/:slug', getNewsArticle);
