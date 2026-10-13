import { HTTPException } from 'hono/http-exception';

export class NotFoundError extends HTTPException {
  constructor(message = 'Recurso no encontrado') {
    super(404, { message });
  }
}
