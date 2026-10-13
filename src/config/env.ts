import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DB_FILE_NAME: z.string().min(1).default('data/sqlite.db'),
  API_TOKEN: z.string().min(16, 'API_TOKEN debe tener al menos 16 caracteres'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
