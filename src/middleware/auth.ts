import { timingSafeEqual } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import { env } from '../config/env';

const expected = Buffer.from(env.API_TOKEN);

function isValidToken(candidate: string): boolean {
  const received = Buffer.from(candidate);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Exige `Authorization: Bearer <API_TOKEN>`. Cualquier otro caso → 401 JSON. */
export const bearerAuth = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token || !isValidToken(token)) {
    c.header('WWW-Authenticate', 'Bearer realm="todo-api"');
    return c.json({ success: false as const, message: 'No autorizado: token ausente o inválido' }, 401);
  }

  return next();
});
