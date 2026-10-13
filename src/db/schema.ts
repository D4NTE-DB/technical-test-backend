import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** ISO-8601 UTC con milisegundos, p. ej. 2026-10-13T20:00:00.000Z */
const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const tasks = sqliteTable(
  'tasks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    description: text('description'),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
    // Las claves TS usan snake_case a propósito: el contrato de la API expone
    // exactamente los nombres de campo del enunciado (created_at / updated_at).
    created_at: text('created_at').notNull().default(nowIso),
    updated_at: text('updated_at')
      .notNull()
      .default(nowIso)
      .$onUpdateFn(() => new Date().toISOString()),
  },
  (table) => [index('tasks_completed_idx').on(table.completed)],
);

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
