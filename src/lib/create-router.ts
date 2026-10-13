import { OpenAPIHono } from '@hono/zod-openapi';

const LOCATION = { json: 'body', form: 'body', query: 'query', param: 'path', header: 'header' } as const;

/**
 * Fábrica de routers OpenAPIHono con un `defaultHook` común: cualquier fallo de
 * validación Zod devuelve 400 con la forma de `ValidationErrorSchema`.
 * Usar SIEMPRE esta fábrica (el hook es por instancia, no se hereda entre routers).
 */
export function createRouter() {
  return new OpenAPIHono({
    defaultHook: (result, c) => {
      if (result.success) return undefined;

      const location = LOCATION[result.target as keyof typeof LOCATION] ?? 'body';
      return c.json(
        {
          success: false as const,
          message: 'Error de validación',
          errors: result.error.issues.map((issue) => ({
            location,
            field: issue.path.join('.') || '(root)',
            message: issue.message,
          })),
        },
        400,
      );
    },
  });
}
