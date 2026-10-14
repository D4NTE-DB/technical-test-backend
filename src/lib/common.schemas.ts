import { z } from '@hono/zod-openapi';

export const ErrorSchema = z
  .object({
    success: z.literal(false),
    message: z.string().openapi({ example: 'Tarea con id 99 no encontrada' }),
  })
  .openapi('Error');

export const ValidationErrorSchema = z
  .object({
    success: z.literal(false),
    message: z.string().openapi({ example: 'Error de validación' }),
    errors: z.array(
      z.object({
        location: z.enum(['body', 'query', 'path', 'header']).openapi({ example: 'body' }),
        field: z.string().openapi({ example: 'title' }),
        message: z.string().openapi({ example: 'El título debe tener al menos 3 caracteres' }),
      }),
    ),
  })
  .openapi('ValidationError');

export const IdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({
      param: { name: 'id', in: 'path', required: true },
      description: 'Identificador numérico de la tarea',
      example: 1,
    }),
});

/** Respuestas de error reutilizables para las definiciones de ruta. */
export const errorResponses = {
  validation: {
    content: { 'application/json': { schema: ValidationErrorSchema } },
    description: 'Error de validación en body, query o parámetros de ruta',
  },
  unauthorized: {
    content: { 'application/json': { schema: ErrorSchema } },
    description: 'Token ausente o inválido',
  },
  notFound: {
    content: { 'application/json': { schema: ErrorSchema } },
    description: 'La tarea no existe',
  },
  unsupportedMediaType: {
    content: { 'application/json': { schema: ErrorSchema } },
    description: 'El cuerpo debe enviarse con Content-Type: application/json',
  },
  internal: {
    content: { 'application/json': { schema: ErrorSchema } },
    description: 'Error interno del servidor',
  },
} as const;
