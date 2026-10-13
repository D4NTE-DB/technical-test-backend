import { NotFoundError } from '../../lib/errors';
import { taskRepository, type TaskFilter } from './task.repository';
import type { CreateTaskInput, PatchTaskInput, PutTaskInput, Task } from './task.schemas';

const notFound = (id: number) => new NotFoundError(`Tarea con id ${id} no encontrada`);

/** Lógica de negocio. No conoce HTTP salvo por los errores de dominio que lanza. */
export const taskService = {
  list(filter: TaskFilter): Task[] {
    return taskRepository.findAll(filter);
  },

  getById(id: number): Task {
    const task = taskRepository.findById(id);
    if (!task) throw notFound(id);
    return task;
  },

  create(input: CreateTaskInput): Task {
    return taskRepository.create({
      title: input.title,
      description: input.description ?? null,
      completed: input.completed ?? false,
    });
  },

  patch(id: number, input: PatchTaskInput): Task {
    const task = taskRepository.update(id, input);
    if (!task) throw notFound(id);
    return task;
  },

  replace(id: number, input: PutTaskInput): Task {
    const task = taskRepository.update(id, {
      title: input.title,
      description: input.description ?? null,
      completed: input.completed,
    });
    if (!task) throw notFound(id);
    return task;
  },

  remove(id: number): void {
    if (!taskRepository.delete(id)) throw notFound(id);
  },
};
