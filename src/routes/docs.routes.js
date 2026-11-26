import { readFileSync } from 'node:fs';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

const openApiUrl = new URL('../../../openapi.yaml', import.meta.url);
const openApiSpec = parse(readFileSync(openApiUrl, 'utf8'));

export const docsRouter = Router();

docsRouter.use(swaggerUi.serve);
docsRouter.get('/', swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'EC API Documentation',
  swaggerOptions: {
    displayRequestDuration: true,
    tryItOutEnabled: true,
  },
}));
