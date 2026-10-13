import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const onError: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    // Incluye NotFoundError, JSON malformado (400) y cualquier error HTTP intencional.
    return c.json({ success: false as const, message: err.message || 'Error' }, err.status);
  }
  console.error('Unhandled error:', err);
  return c.json({ success: false as const, message: 'Error interno del servidor' }, 500);
};

export const notFound: NotFoundHandler = (c) =>
  c.json({ success: false as const, message: `Ruta ${c.req.method} ${c.req.path} no encontrada` }, 404);
