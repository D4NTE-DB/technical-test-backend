import { createRoute, z } from '@hono/zod-openapi';
import { createRouter } from '../../lib/create-router';

const HealthSchema = z
  .object({
    status: z.literal('ok'),
    uptime: z.number().openapi({ example: 12.34, description: 'Segundos desde el arranque' }),
    timestamp: z.iso.datetime().openapi({ example: '2026-10-13T20:00:00.000Z' }),
  })
  .openapi('Health');

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Health check',
  description: 'Endpoint público para comprobar que el servicio está vivo (usado por Docker HEALTHCHECK).',
  responses: {
    200: { content: { 'application/json': { schema: HealthSchema } }, description: 'Servicio operativo' },
  },
});

const healthRouter = createRouter().openapi(healthRoute, (c) =>
  c.json({ status: 'ok' as const, uptime: process.uptime(), timestamp: new Date().toISOString() }, 200),
);

export default healthRouter;
