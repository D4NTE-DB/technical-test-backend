import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { env } from './config/env';
import { createRouter } from './lib/create-router';
import { configureOpenAPI } from './lib/openapi';
import { notFound, onError } from './middleware/error-handler';
import healthRouter from './modules/health';
import tasksRouter from './modules/tasks';

export function createApp() {
  const app = createRouter();

  if (env.NODE_ENV !== 'test') app.use('*', logger());
  app.use('*', cors());
  app.use('*', secureHeaders());

  app.get('/', (c) => c.redirect('/ui'));
  app.route('/', healthRouter);
  app.route('/tasks', tasksRouter);

  configureOpenAPI(app);

  app.onError(onError);
  app.notFound(notFound);

  return app;
}

export type App = ReturnType<typeof createApp>;
