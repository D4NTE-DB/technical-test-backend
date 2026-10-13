import { createApp } from './app';
import { env } from './config/env';
import { sqlite } from './db/client';
import { runMigrations } from './db/migrate';

runMigrations();

const app = createApp();
const server = Bun.serve({ port: env.PORT, fetch: app.fetch });

console.log(`🚀 To-Do API escuchando en http://localhost:${server.port}`);
console.log(`📘 Swagger UI:   http://localhost:${server.port}/ui`);
console.log(`📄 OpenAPI JSON: http://localhost:${server.port}/doc`);

function shutdown(signal: string) {
  console.log(`\n${signal} recibido, cerrando…`);
  server.stop();
  sqlite.close();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
