import { join } from 'node:path';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { db } from './client';

const MIGRATIONS_FOLDER = join(import.meta.dir, '..', '..', 'drizzle');

/** Aplica las migraciones pendientes de ./drizzle. Idempotente: se ejecuta en cada arranque. */
export function runMigrations(): void {
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
