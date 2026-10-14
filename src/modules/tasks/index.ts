import { createRouter } from '../../lib/create-router';
import { bearerAuth } from '../../middleware/auth';
import * as handlers from './task.handlers';
import * as routes from './task.routes';

const tasksRouter = createRouter();

// Todas las rutas de /api/v1/tasks requieren token (registrar ANTES de las rutas).
tasksRouter.use('*', bearerAuth);

tasksRouter
  .openapi(routes.listTasks, handlers.listTasks)
  .openapi(routes.getTask, handlers.getTask)
  .openapi(routes.createTask, handlers.createTask)
  .openapi(routes.patchTask, handlers.patchTask)
  .openapi(routes.putTask, handlers.putTask)
  .openapi(routes.deleteTask, handlers.deleteTask);

export default tasksRouter;
