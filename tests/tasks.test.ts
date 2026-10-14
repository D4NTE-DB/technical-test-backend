/**
 * Tests de integración de la API de tareas (v1).
 *
 * Cada test envía peticiones HTTP reales a la app con `app.request()` (sin levantar un
 * servidor) contra una base SQLite en memoria (ver tests/setup.ts). Antes de cada test
 * se vacía la tabla, así que los tests son independientes entre sí.
 *
 * Las respuestas se validan con los mismos esquemas Zod del contrato (`TaskSchema`,
 * `TaskListSchema`): si la API devolviera un campo con otro nombre o tipo, el test falla.
 */
import { beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { createApp } from '../src/app';
import { db } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';
import { tasks } from '../src/db/schema';
import { API_V1_PREFIX } from '../src/lib/constants';
import { TaskListSchema, TaskSchema } from '../src/modules/tasks/task.schemas';

const app = createApp();
const TOKEN = process.env.API_TOKEN!;
const auth = { Authorization: `Bearer ${TOKEN}` };
const jsonAuth = { ...auth, 'Content-Type': 'application/json' };

/** Ruta base versionada de las tareas: /api/v1/tasks */
const TASKS = `${API_V1_PREFIX}/tasks`;

const req = (path: string, init: RequestInit = {}) => app.request(path, init);
const createTask = async (body: unknown) =>
  req(TASKS, { method: 'POST', headers: jsonAuth, body: JSON.stringify(body) });

beforeAll(() => runMigrations());
beforeEach(() => {
  db.delete(tasks).run();
});

/**
 * Versionado: las rutas de negocio solo existen bajo /api/v1. Protege contra que un
 * cambio en app.ts vuelva a montar las rutas sin prefijo o las duplique.
 */
describe('Versionado de la API', () => {
  // Qué verifica: /api/v1/tasks responde y la ruta antigua /tasks ya no existe (404 JSON),
  // incluso enviando un token válido.
  it('las tareas solo existen bajo /api/v1', async () => {
    expect((await req(TASKS, { headers: auth })).status).toBe(200);

    const legacy = await req('/tasks', { headers: auth });
    expect(legacy.status).toBe(404);
    expect(await legacy.json()).toMatchObject({ success: false });
  });
});

/**
 * Autenticación: el middleware Bearer debe proteger todas las rutas de tareas y dejar
 * libres las de infraestructura (requisito 2.6).
 */
describe('Autenticación', () => {
  // Qué verifica: sin cabecera Authorization la API responde 401 con el formato de error común.
  it('401 sin token', async () => {
    const res = await req(TASKS);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ success: false });
  });

  // Qué verifica: un token incorrecto o un esquema distinto de "Bearer" (p. ej. Basic)
  // también se rechazan con 401, tanto en el listado como en una ruta con id.
  it('401 con token inválido o esquema incorrecto', async () => {
    expect((await req(TASKS, { headers: { Authorization: 'Bearer wrong' } })).status).toBe(401);
    expect((await req(`${TASKS}/1`, { headers: { Authorization: `Basic ${TOKEN}` } })).status).toBe(401);
  });

  // Qué verifica: health check, especificación OpenAPI y Swagger UI son accesibles sin token,
  // para que Docker y cualquier evaluador puedan usarlos.
  it('rutas públicas no requieren token', async () => {
    expect((await req('/health')).status).toBe(200);
    expect((await req('/doc')).status).toBe(200);
    expect((await req('/ui')).status).toBe(200);
  });
});

/** Creación de tareas: código 201, contrato de respuesta y validaciones de entrada (2.3 y 2.4). */
describe('POST /api/v1/tasks', () => {
  // Qué verifica: se responde 201 con la tarea completa; el título se guarda sin espacios
  // sobrantes (trim); completed vale false por defecto; y al crearla created_at y updated_at
  // son idénticos porque ambos los fija la BD en el mismo INSERT (aún no se ha modificado).
  it('201 y devuelve la tarea con el contrato completo', async () => {
    const res = await createTask({ title: '  Comprar pan  ', description: 'Integral' });
    expect(res.status).toBe(201);
    const task = TaskSchema.parse(await res.json());
    expect(task).toMatchObject({ title: 'Comprar pan', description: 'Integral', completed: false });
    expect(task.created_at).toBe(task.updated_at);
  });

  // Qué verifica: las reglas de validación devuelven 400 indicando campo y ubicación del error:
  // título demasiado corto, cuerpo sin título, campo desconocido (cuerpo estricto) y
  // completed con un tipo distinto de booleano.
  it('400 si el título es corto, falta o hay campos desconocidos', async () => {
    const short = await createTask({ title: 'ab' });
    expect(short.status).toBe(400);
    const body = (await short.json()) as { errors: { field: string; location: string }[] };
    expect(body.errors[0]).toMatchObject({ field: 'title', location: 'body' });

    expect((await createTask({})).status).toBe(400);
    expect((await createTask({ title: 'Válido', foo: 1 })).status).toBe(400);
    expect((await createTask({ title: 'Válido', completed: 'yes' })).status).toBe(400);
  });

  // Qué verifica: si falta la cabecera Content-Type: application/json se responde 415
  // (tipo de contenido no soportado) con el formato de error común.
  it('415 sin Content-Type JSON', async () => {
    const res = await req(TASKS, { method: 'POST', headers: auth, body: '{"title":"Sin cabecera"}' });
    expect(res.status).toBe(415);
    expect(await res.json()).toMatchObject({ success: false });
  });

  // Qué verifica: un cuerpo que no es JSON válido produce 400 (no un 500).
  it('400 con JSON malformado', async () => {
    const res = await req(TASKS, { method: 'POST', headers: jsonAuth, body: '{bad json' });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false });
  });
});

/** Listado de tareas y filtro por estado (2.4). */
describe('GET /api/v1/tasks', () => {
  // Qué verifica: sin filtro se devuelven todas las tareas; con completed=true solo las
  // completadas y con completed=false solo las pendientes.
  it('lista y filtra por completed', async () => {
    await createTask({ title: 'Pendiente' });
    await createTask({ title: 'Hecha', completed: true });

    const all = TaskListSchema.parse(await (await req(TASKS, { headers: auth })).json());
    expect(all).toHaveLength(2);

    const done = TaskListSchema.parse(await (await req(`${TASKS}?completed=true`, { headers: auth })).json());
    expect(done.map((t) => t.title)).toEqual(['Hecha']);

    const pending = TaskListSchema.parse(await (await req(`${TASKS}?completed=false`, { headers: auth })).json());
    expect(pending.map((t) => t.title)).toEqual(['Pendiente']);
  });

  // Qué verifica: un valor de filtro distinto de "true"/"false" se rechaza con 400
  // en lugar de ignorarse en silencio.
  it('400 si el filtro no es booleano', async () => {
    expect((await req(`${TASKS}?completed=maybe`, { headers: auth })).status).toBe(400);
  });
});

/** Detalle de una tarea (2.4): 200, 404 y validación del parámetro de ruta. */
describe('GET /api/v1/tasks/{id}', () => {
  // Qué verifica: una tarea existente responde 200; un id inexistente, 404 con el formato
  // de error; y un id no numérico o no positivo, 400 (validación del parámetro de ruta).
  it('200 si existe, 404 si no, 400 si el id no es válido', async () => {
    const created = TaskSchema.parse(await (await createTask({ title: 'Leer libro' })).json());
    expect((await req(`${TASKS}/${created.id}`, { headers: auth })).status).toBe(200);

    const missing = await req(`${TASKS}/9999`, { headers: auth });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ success: false });

    expect((await req(`${TASKS}/abc`, { headers: auth })).status).toBe(400);
    expect((await req(`${TASKS}/0`, { headers: auth })).status).toBe(400);
  });
});

/** Actualización parcial (2.4). */
describe('PATCH /api/v1/tasks/{id}', () => {
  // Qué verifica: solo cambian los campos enviados (title se conserva), description: null
  // borra la descripción, updated_at avanza y created_at no cambia. La pausa de 5 ms
  // garantiza que el nuevo updated_at sea estrictamente posterior.
  it('actualiza parcialmente y refresca updated_at', async () => {
    const created = TaskSchema.parse(await (await createTask({ title: 'Lavar ropa', description: 'Blanca' })).json());
    await Bun.sleep(5);

    const res = await req(`${TASKS}/${created.id}`, {
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

  // Qué verifica: un cuerpo vacío ({}) es un error de validación (400) porque no hay nada
  // que actualizar, y actualizar un id inexistente devuelve 404 (no un 500).
  it('400 con body vacío, 404 si no existe', async () => {
    const created = TaskSchema.parse(await (await createTask({ title: 'Algo' })).json());
    const empty = await req(`${TASKS}/${created.id}`, { method: 'PATCH', headers: jsonAuth, body: '{}' });
    expect(empty.status).toBe(400);

    const missing = await req(`${TASKS}/9999`, { method: 'PATCH', headers: jsonAuth, body: '{"completed":true}' });
    expect(missing.status).toBe(404);
  });
});

/** Reemplazo total (2.4). */
describe('PUT /api/v1/tasks/{id}', () => {
  // Qué verifica: PUT sustituye la tarea entera (si se omite description queda en null)
  // y, a diferencia de PATCH, exige title y completed: si falta uno responde 400.
  it('reemplaza la tarea y exige los campos obligatorios', async () => {
    const created = TaskSchema.parse(await (await createTask({ title: 'Original', description: 'x' })).json());

    const res = await req(`${TASKS}/${created.id}`, {
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

    const partial = await req(`${TASKS}/${created.id}`, {
      method: 'PUT',
      headers: jsonAuth,
      body: JSON.stringify({ title: 'Sin completed' }),
    });
    expect(partial.status).toBe(400);
  });
});

/** Eliminación (2.4). */
describe('DELETE /api/v1/tasks/{id}', () => {
  // Qué verifica: eliminar responde 204 sin cuerpo, y eliminar de nuevo la misma tarea
  // responde 404, lo que confirma que realmente se borró de la BD.
  it('204 al eliminar y 404 después', async () => {
    const created = TaskSchema.parse(await (await createTask({ title: 'Borrar' })).json());
    const res = await req(`${TASKS}/${created.id}`, { method: 'DELETE', headers: auth });
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect((await req(`${TASKS}/${created.id}`, { method: 'DELETE', headers: auth })).status).toBe(404);
  });
});

/** Documentación OpenAPI (2.5 y 2.6): la especificación debe reflejar exactamente la API. */
describe('OpenAPI', () => {
  // Qué verifica: la especificación publicada en /doc incluye las rutas versionadas con sus
  // métodos, el esquema de seguridad Bearer solo en las rutas protegidas, los códigos de
  // respuesta de cada operación y los esquemas con nombre (Task, errores, bodies).
  it('documenta rutas, esquema de seguridad y respuestas', async () => {
    const spec = (await (await req('/doc')).json()) as {
      openapi: string;
      paths: Record<string, Record<string, { security?: unknown; responses: Record<string, unknown> }>>;
      components: { securitySchemes: Record<string, unknown>; schemas: Record<string, unknown> };
    };
    const byId = `${TASKS}/{id}`;

    expect(spec.openapi).toBe('3.0.3');
    expect(Object.keys(spec.paths).sort()).toEqual(['/api/v1/tasks', '/api/v1/tasks/{id}', '/health']);
    expect(Object.keys(spec.paths[byId]!).sort()).toEqual(['delete', 'get', 'patch', 'put']);
    expect(spec.components.securitySchemes).toHaveProperty('Bearer');
    expect(spec.paths[TASKS]!.get!.security).toEqual([{ Bearer: [] }]);
    expect(spec.paths['/health']!.get!.security).toBeUndefined();
    expect(Object.keys(spec.paths[byId]!.get!.responses).sort()).toEqual(['200', '400', '401', '404']);
    expect(Object.keys(spec.paths[TASKS]!.post!.responses).sort()).toEqual(['201', '400', '401', '415']);
    expect(Object.keys(spec.paths[byId]!.put!.responses).sort()).toEqual(['200', '400', '401', '404', '415']);
    for (const name of ['Task', 'CreateTask', 'PatchTask', 'PutTask', 'Error', 'ValidationError']) {
      expect(spec.components.schemas).toHaveProperty(name);
    }
  });
});