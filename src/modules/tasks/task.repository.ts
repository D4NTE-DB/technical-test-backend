import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { tasks, type NewTaskRow, type TaskRow } from '../../db/schema';

export type TaskFilter = { completed?: boolean };
export type TaskChanges = Partial<Pick<NewTaskRow, 'title' | 'description' | 'completed'>>;

/** Capa de acceso a datos: solo consultas Drizzle (parametrizadas), sin reglas de negocio. */
export const taskRepository = {
  findAll(filter: TaskFilter = {}): TaskRow[] {
    return db
      .select()
      .from(tasks)
      .where(filter.completed === undefined ? undefined : eq(tasks.completed, filter.completed))
      .orderBy(desc(tasks.created_at), desc(tasks.id))
      .all();
  },

  findById(id: number): TaskRow | undefined {
    return db.select().from(tasks).where(eq(tasks.id, id)).get();
  },

  create(data: Pick<NewTaskRow, 'title' | 'description' | 'completed'>): TaskRow {
    return db.insert(tasks).values(data).returning().get();
  },

  update(id: number, changes: TaskChanges): TaskRow | undefined {
    return db.update(tasks).set(changes).where(eq(tasks.id, id)).returning().get();
  },

  delete(id: number): boolean {
    const deleted = db.delete(tasks).where(eq(tasks.id, id)).returning({ id: tasks.id }).all();
    return deleted.length > 0;
  },
};
