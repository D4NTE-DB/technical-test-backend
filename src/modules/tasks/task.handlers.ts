import type { RouteHandler } from '@hono/zod-openapi';
import type * as routes from './task.routes';
import { taskService } from './task.service';

export const listTasks: RouteHandler<typeof routes.listTasks> = (c) => {
  const { completed } = c.req.valid('query');
  const filter = completed === undefined ? {} : { completed: completed === 'true' };
  return c.json(taskService.list(filter), 200);
};

export const getTask: RouteHandler<typeof routes.getTask> = (c) => {
  const { id } = c.req.valid('param');
  return c.json(taskService.getById(id), 200);
};

export const createTask: RouteHandler<typeof routes.createTask> = (c) => {
  const body = c.req.valid('json');
  return c.json(taskService.create(body), 201);
};

export const patchTask: RouteHandler<typeof routes.patchTask> = (c) => {
  const { id } = c.req.valid('param');
  return c.json(taskService.patch(id, c.req.valid('json')), 200);
};

export const putTask: RouteHandler<typeof routes.putTask> = (c) => {
  const { id } = c.req.valid('param');
  return c.json(taskService.replace(id, c.req.valid('json')), 200);
};

export const deleteTask: RouteHandler<typeof routes.deleteTask> = (c) => {
  const { id } = c.req.valid('param');
  taskService.remove(id);
  return c.body(null, 204);
};
