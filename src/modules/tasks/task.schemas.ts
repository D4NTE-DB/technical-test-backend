import { z } from '@hono/zod-openapi';

// ─── Reglas de campo reutilizables ────────────────────────────────────────────
const titleField = z
  .string({ error: 'El título es obligatorio y debe ser texto' })
  .trim()
  .min(3, 'El título debe tener al menos 3 caracteres')
  .max(120, 'El título debe tener como máximo 120 caracteres');

const descriptionField = z
  .string({ error: 'La descripción debe ser texto' })
  .trim()
  .max(1000, 'La descripción debe tener como máximo 1000 caracteres');

const completedField = z.boolean({ error: 'completed debe ser booleano (true/false)' });

// ─── Respuesta ────────────────────────────────────────────────────────────────
export const TaskSchema = z
  .object({
    id: z.number().int().positive().openapi({ example: 1 }),
    title: z.string().openapi({ example: 'Comprar víveres' }),
    description: z.string().nullable().openapi({ example: 'Leche, huevos y pan' }),
    completed: z.boolean().openapi({ example: false }),
    created_at: z.iso.datetime().openapi({ example: '2026-10-13T20:00:00.000Z' }),
    updated_at: z.iso.datetime().openapi({ example: '2026-10-13T20:00:00.000Z' }),
  })
  .openapi('Task');

export const TaskListSchema = z.array(TaskSchema).openapi('TaskList');

// ─── Query ────────────────────────────────────────────────────────────────────
export const ListTasksQuerySchema = z.object({
  completed: z
    .enum(['true', 'false'], { error: "completed debe ser 'true' o 'false'" })
    .optional()
    .openapi({
      param: { name: 'completed', in: 'query', required: false },
      description: 'Filtra por estado. Omitir para obtener todas las tareas.',
      example: 'false',
    }),
});

// ─── Bodies ───────────────────────────────────────────────────────────────────
export const CreateTaskSchema = z
  .strictObject({
    title: titleField,
    description: descriptionField.optional(),
    completed: completedField.optional(),
  })
  .openapi('CreateTask', {
    example: { title: 'Comprar víveres', description: 'Leche, huevos y pan' },
  });

/** PATCH: actualización parcial. Al menos un campo. `description: null` la borra. */
export const PatchTaskSchema = z
  .strictObject({
    title: titleField.optional(),
    description: descriptionField.nullable().optional(),
    completed: completedField.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar',
  })
  .openapi('PatchTask', { example: { completed: true } });

/** PUT: reemplazo total. title y completed obligatorios; description omitida → null. */
export const PutTaskSchema = z
  .strictObject({
    title: titleField,
    description: descriptionField.nullable().optional(),
    completed: completedField,
  })
  .openapi('PutTask', {
    example: { title: 'Comprar víveres y snacks', description: null, completed: false },
  });

export type Task = z.infer<typeof TaskSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type PatchTaskInput = z.infer<typeof PatchTaskSchema>;
export type PutTaskInput = z.infer<typeof PutTaskSchema>;
