import type { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';

export function configureOpenAPI(app: OpenAPIHono) {
  app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
    type: 'http',
    scheme: 'bearer',
    description: 'Token definido en la variable de entorno API_TOKEN. Pulsa "Authorize" y pégalo (sin el prefijo "Bearer").',
  });

  app.doc('/doc', {
    openapi: '3.0.3',
    info: {
      title: 'To-Do List API',
      version: '1.0.0',
      description:
        'API REST para gestionar tareas. Bun + Hono + SQLite (Drizzle ORM). ' +
        'Versión 1: las rutas de negocio se exponen bajo `/api/v1` y requieren `Authorization: Bearer <token>`. ' +
        '`/health`, `/doc` y `/ui` son públicas y no se versionan.',
    },
    // URL relativa: Swagger UI usa el mismo origen desde donde se sirve (localhost, Docker o ngrok).
    servers: [{ url: '/', description: 'Servidor actual' }],
    tags: [
      { name: 'Tasks', description: 'CRUD de tareas' },
      { name: 'Health', description: 'Estado del servicio' },
    ],
  });

  app.get('/ui', swaggerUI({ url: '/doc', persistAuthorization: true }));
}
