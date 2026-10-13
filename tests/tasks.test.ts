import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { createApp } from '../src/app';
import { db } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';
import { tasks } from '../src/db/schema';
import { TaskListSchema, TaskSchema } from '../src/modules/tasks/task.schemas';

const app = createApp();
const TOKEN = process.env.API_TOKEN!;
const auth = { Authorization: `Bearer ${TOKEN}` };
const jsonAuth = { ...auth, 'Content-Type': 'application/json' };

const req = (path: string, init: RequestInit = {}) => app.request(path, init);
const createTask = async (body: unknown) =>
  req('/tasks', { method: 'POST', headers: jsonAuth, body: JSON.stringify(body) });

beforeAll(() => runMigrations());
beforeEach(() => {
  db.delete(tasks).run();
});

describe('Auth', () => {
  it('401 sin token', async () => {
    const res = await req('/tasks');
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ success: false });
  });

  it('401 con token inválido o esquema incorrecto', async () => {
    expect((await req('/tasks', { headers: { Authorization: 'Bearer wrong' } })).status).toBe(401);
    expect((await req('/tasks/1', { headers: { Authorization: `Basic ${TOKEN}` } })).status).toBe(401);
  });

  it('rutas públicas no requieren token', async () => {
    expect((await req('/health')).status).toBe(200);
    expect((await req('/doc')).status).toBe(200);
    expect((await req('/ui')).status).toBe(200);
  });
});

describe('POST /tasks', () => {
  it('201 y devuelve la tarea con el contrato completo', async () => {
    const res = await createTask({ title: '  Comprar pan  ', description: 'Integral' });
    expect(res.status).toBe(201);
    const task = TaskSchema.parse(await res.json());
    expect(task).toMatchObject({ title: 'Comprar pan', description: 'Integral', completed: false });
    expect(task.created_at).toBe(task.updated_at);
  });

  it('400 si el título es corto, falta o hay campos desconocidos', async () => {
    const short = await createTask({ title: 'ab' });
    expect(short.status).toBe(400);
    const body = (await short.json()) as { errors: { field: string; location: string }[] };
    expect(body.errors[0]).toMatchObject({ field: 'title', location: 'body' });

    expect((await createTask({})).status).toBe(400);
    expect((await createTask({ title: 'Válido', foo: 1 })).status).toBe(400);
    expect((await createTask({ title: 'Válido', completed: 'yes' })).status).toBe(400);
  });

  it('400 con JSON malformado', async () => {
    const res = await req('/tasks', { method: 'POST', headers: jsonAuth, body: '{bad json' });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false });
  });
});

describe('GET /tasks', () => {
  it('lista y filtra por completed', async () => {
    await createTask({ title: 'Pendiente' });
    await createTask({ title: 'Hecha', completed: true });

    const all = TaskListSchema.parse(await (await req('/tasks', { headers: auth })).json());
    expect(all).toHaveLength(2);

    const done = TaskListSchema.parse(await (await req('/tasks?completed=true', { headers: auth })).json());
    expect(done.map((t) => t.title)).toEqual(['Hecha']);

    const pending = TaskListSchema.parse(await (await req('/tasks?completed=false', { headers: auth })).json());
    expect(pending.map((t) => t.title)).toEqual(['Pendiente']);
  });

  it('400 si el filtro no es booleano', async () => {
    expect((await req('/tasks?completed=maybe', { headers: auth })).status).toBe(400);
  });
});

describe('GET /tasks/{id}', () => {
  it('200 si existe, 404 si no, 400 si el id no es válido', async () => {
    const created = TaskSchema.parse(await (await createTask({ title: 'Leer libro' })).json());
    expect((await req(`/tasks/${created.id}`, { headers: auth })).status).toBe(200);

    const missing = await req('/tasks/9999', { headers: auth });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ success: false });

    expect((await req('/tasks/abc', { headers: auth })).status).toBe(400);
    expect((await req('/tasks/0', { headers: auth })).status).toBe(400);
  });
});

describe('PATCH /tasks/{id}', () => {
  it('actualiza parcialmente y refresca updated_at', async () => {
    const created = TaskSchema.parse(await (await createTask({ title: 'Lavar ropa', description: 'Blanca' })).json());
    await Bun.sleep(5);

    const res = await req(`/tasks/${created.id}`, {
      method: 'PATCH',
      headers: jsonAuth,
      body: JSON.stringify({ completed: true, description: null }),
    });
    expect(res.status).toBe(200);
    const updated = TaskSchema.parse(await res.json());
    expect(updated).toMatchObject({ title: 'Lavar ropa', completed: true, description: null });
    expect(updated.updated_at > created.updated_at).toBe(true);
    expect(updated.created_at).toBe(created.created_at);
  });

  it('400 con body vacío, 404 si no existe', async () => {
    const created = TaskSchema.parse(await (await createTask({ title: 'Algo' })).json());
    const empty = await req(`/tasks/${created.id}`, { method: 'PATCH', headers: jsonAuth, body: '{}' });
    expect(empty.status).toBe(400);

    const missing = await req('/tasks/9999', { method: 'PATCH', headers: jsonAuth, body: '{"completed":true}' });
    expect(missing.status).toBe(404);
  });
});

describe('PUT /tasks/{id}', () => {
  it('reemplaza la tarea y exige los campos obligatorios', async () => {
    const created = TaskSchema.parse(await (await createTask({ title: 'Original', description: 'x' })).json());

    const res = await req(`/tasks/${created.id}`, {
      method: 'PUT',
      headers: jsonAuth,
      body: JSON.stringify({ title: 'Reemplazada', completed: true }),
    });
    expect(res.status).toBe(200);
    expect(TaskSchema.parse(await res.json())).toMatchObject({
      title: 'Reemplazada',
      description: null,
      completed: true,
    });

    const partial = await req(`/tasks/${created.id}`, {
      method: 'PUT',
      headers: jsonAuth,
      body: JSON.stringify({ title: 'Sin completed' }),
    });
    expect(partial.status).toBe(400);
  });
});

describe('DELETE /tasks/{id}', () => {
  it('204 al eliminar y 404 después', async () => {
    const created = TaskSchema.parse(await (await createTask({ title: 'Borrar' })).json());
    const res = await req(`/tasks/${created.id}`, { method: 'DELETE', headers: auth });
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect((await req(`/tasks/${created.id}`, { method: 'DELETE', headers: auth })).status).toBe(404);
  });
});

describe('OpenAPI', () => {
  it('documenta rutas, esquema de seguridad y respuestas', async () => {
    const spec = (await (await req('/doc')).json()) as {
      openapi: string;
      paths: Record<string, Record<string, { security?: unknown; responses: Record<string, unknown> }>>;
      components: { securitySchemes: Record<string, unknown>; schemas: Record<string, unknown> };
    };
    expect(spec.openapi).toBe('3.0.3');
    expect(Object.keys(spec.paths).sort()).toEqual(['/health', '/tasks', '/tasks/{id}']);
    expect(Object.keys(spec.paths['/tasks/{id}']!).sort()).toEqual(['delete', 'get', 'patch', 'put']);
    expect(spec.components.securitySchemes).toHaveProperty('Bearer');
    expect(spec.paths['/tasks']!.get!.security).toEqual([{ Bearer: [] }]);
    expect(spec.paths['/health']!.get!.security).toBeUndefined();
    expect(Object.keys(spec.paths['/tasks/{id}']!.get!.responses).sort()).toEqual(['200', '400', '401', '404']);
    for (const name of ['Task', 'CreateTask', 'PatchTask', 'PutTask', 'Error', 'ValidationError']) {
      expect(spec.components.schemas).toHaveProperty(name);
    }
  });
});
