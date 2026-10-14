import { createRoute } from '@hono/zod-openapi';
import { errorResponses, IdParamSchema } from '../../lib/common.schemas';
import {
  CreateTaskSchema,
  ListTasksQuerySchema,
  PatchTaskSchema,
  PutTaskSchema,
  TaskListSchema,
  TaskSchema,
} from './task.schemas';

const tags = ['Tasks'];
const security = [{ Bearer: [] }];
const json = <T>(schema: T) => ({ 'application/json': { schema } });

export const listTasks = createRoute({
  method: 'get',
  path: '/',
  tags,
  security,
  summary: 'Listar tareas',
  description: 'Devuelve todas las tareas ordenadas de la más reciente a la más antigua. Filtro opcional `completed`.',
  request: { query: ListTasksQuerySchema },
  responses: {
    200: { content: json(TaskListSchema), description: 'Listado de tareas' },
    400: errorResponses.validation,
    401: errorResponses.unauthorized,
  },
});

export const getTask = createRoute({
  method: 'get',
  path: '/{id}',
  tags,
  security,
  summary: 'Obtener una tarea por ID',
  description: 'Devuelve el detalle de la tarea o 404 si no existe.',
  request: { params: IdParamSchema },
  responses: {
    200: { content: json(TaskSchema), description: 'Detalle de la tarea' },
    400: errorResponses.validation,
    401: errorResponses.unauthorized,
    404: errorResponses.notFound,
  },
});

export const createTask = createRoute({
  method: 'post',
  path: '/',
  tags,
  security,
  summary: 'Crear una tarea',
  description: '`title` es obligatorio (3–120 caracteres). `description` y `completed` son opcionales.',
  request: {
    body: { content: json(CreateTaskSchema), required: true, description: 'Datos de la nueva tarea' },
  },
  responses: {
    201: { content: json(TaskSchema), description: 'Tarea creada' },
    400: errorResponses.validation,
    401: errorResponses.unauthorized,
    415: errorResponses.unsupportedMediaType,
  },
});

export const patchTask = createRoute({
  method: 'patch',
  path: '/{id}',
  tags,
  security,
  summary: 'Actualizar parcialmente una tarea',
  description: 'Envía solo los campos a modificar (al menos uno). `description: null` borra la descripción.',
  request: {
    params: IdParamSchema,
    body: { content: json(PatchTaskSchema), required: true, description: 'Campos a modificar' },
  },
  responses: {
    200: { content: json(TaskSchema), description: 'Tarea actualizada' },
    400: errorResponses.validation,
    401: errorResponses.unauthorized,
    404: errorResponses.notFound,
    415: errorResponses.unsupportedMediaType,
  },
});

export const putTask = createRoute({
  method: 'put',
  path: '/{id}',
  tags,
  security,
  summary: 'Reemplazar una tarea',
  description: 'Actualización total: `title` y `completed` son obligatorios; si se omite `description` queda en null.',
  request: {
    params: IdParamSchema,
    body: { content: json(PutTaskSchema), required: true, description: 'Representación completa de la tarea' },
  },
  responses: {
    200: { content: json(TaskSchema), description: 'Tarea reemplazada' },
    400: errorResponses.validation,
    401: errorResponses.unauthorized,
    404: errorResponses.notFound,
    415: errorResponses.unsupportedMediaType,
  },
});

export const deleteTask = createRoute({
  method: 'delete',
  path: '/{id}',
  tags,
  security,
  summary: 'Eliminar una tarea',
  description: 'Elimina la tarea. Responde 204 sin cuerpo.',
  request: { params: IdParamSchema },
  responses: {
    204: { description: 'Tarea eliminada' },
    400: errorResponses.validation,
    401: errorResponses.unauthorized,
    404: errorResponses.notFound,
  },
});
