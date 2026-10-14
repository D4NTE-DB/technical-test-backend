# ✅ To-Do List API — Bun + Hono + SQLite

API REST para gestionar tareas (To-Do List) construida con **Bun**, **Hono** y **SQLite** (Drizzle ORM), con validación estricta mediante **Zod**, contrato **OpenAPI 3** generado desde el código, **Swagger UI** interactivo y autenticación por **token Bearer**.

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Bun 1.4 |
| Framework HTTP | Hono 4 + `@hono/zod-openapi` |
| Validación / contrato | Zod 4 → OpenAPI 3.0.3 |
| Persistencia | SQLite (`bun:sqlite`) + Drizzle ORM (migraciones con drizzle-kit) |
| Documentación | Swagger UI en `/ui`, especificación JSON en `/doc` |
| Tests | `bun test` (BD en memoria) |

## Requisitos previos

- **Opción A (sin Docker):** [Bun](https://bun.sh) ≥ 1.4
  - Windows (PowerShell): `powershell -c "irm bun.sh/install.ps1 | iex"`
  - macOS / Linux: `curl -fsSL https://bun.sh/install | bash`
- **Opción B (con Docker):** Docker Desktop / Docker Engine con Compose v2.

## Configuración (ambas opciones)

```bash
# macOS / Linux
cp .env.example .env
```

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env
```

Edita `.env` y define un `API_TOKEN` propio (mínimo 16 caracteres).

| Variable | Por defecto | Descripción |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |
| `PORT` | `3000` | Puerto HTTP (en Docker: puerto publicado en el host) |
| `DB_FILE_NAME` | `data/sqlite.db` | Ruta del archivo SQLite (se crea solo) |
| `API_TOKEN` | — (obligatorio) | Token Bearer exigido en `/api/v1/tasks` |
| `NGROK_AUTHTOKEN` | — | Solo para el túnel ngrok en Docker |

> Si `API_TOKEN` falta o es demasiado corto, el servidor no arranca y muestra el error.

## Opción A — Ejecutar sin Docker

```bash
bun install
bun run dev      # desarrollo con hot reload
# o
bun run start    # modo normal
```

Las migraciones se aplican automáticamente al iniciar; el archivo `data/sqlite.db` se crea si no existe.

## Opción B — Ejecutar con Docker

```bash
docker compose up --build -d     # construir y levantar
docker compose ps                # esperar estado "healthy"
docker compose logs -f api       # ver logs
docker compose down              # detener (los datos persisten en el volumen todo-data)
docker compose down -v           # detener y BORRAR los datos
```

Ejecutar los tests dentro de Docker (sin instalar Bun): `docker build --target test .`

## Documentación interactiva

| Recurso | URL |
|---|---|
| Swagger UI | http://localhost:3000/ui |
| OpenAPI JSON | http://localhost:3000/doc |
| Health check | http://localhost:3000/health |

Para probar desde Swagger UI: pulsa **Authorize**, pega el valor de `API_TOKEN` (sin escribir "Bearer") y confirma. La autorización se recuerda al recargar.

## Endpoints

La API está versionada: las rutas de negocio viven bajo **`/api/v1`** (base: `http://localhost:3000/api/v1`). Las rutas de infraestructura (`/health`, `/doc`, `/ui`) no se versionan. Una futura versión incompatible se publicaría en paralelo como `/api/v2`, sin romper a los clientes de v1.

Todas las rutas `/api/v1/tasks` requieren `Authorization: Bearer <API_TOKEN>`.

| Método | Ruta | Descripción | Éxito | Errores |
|---|---|---|---|---|
| GET | `/api/v1/tasks?completed=true\|false` | Listar (filtro opcional) | 200 | 400, 401 |
| GET | `/api/v1/tasks/{id}` | Obtener por ID | 200 | 400, 401, 404 |
| POST | `/api/v1/tasks` | Crear | 201 | 400, 401, 415 |
| PATCH | `/api/v1/tasks/{id}` | Actualización parcial | 200 | 400, 401, 404, 415 |
| PUT | `/api/v1/tasks/{id}` | Reemplazo total | 200 | 400, 401, 404, 415 |
| DELETE | `/api/v1/tasks/{id}` | Eliminar | 204 (sin cuerpo) | 400, 401, 404 |
| GET | `/health` | Estado del servicio (público) | 200 | — |

Reglas de validación: `title` obligatorio, 3–120 caracteres (se recortan espacios); `description` opcional, máx. 1000 caracteres (`null` la borra en PATCH/PUT); `completed` booleano; los cuerpos no admiten campos desconocidos; PATCH exige al menos un campo; `id` debe ser entero positivo.

Formato de error:

```json
{ "success": false, "message": "Tarea con id 99 no encontrada" }
```

```json
{
  "success": false,
  "message": "Error de validación",
  "errors": [{ "location": "body", "field": "title", "message": "El título debe tener al menos 3 caracteres" }]
}
```

## Ejemplos con curl

```bash
TOKEN=change-me-super-secret-token   # el valor de tu .env

curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Comprar víveres","description":"Leche y pan"}'

curl "http://localhost:3000/api/v1/tasks?completed=false" -H "Authorization: Bearer $TOKEN"

curl -X PATCH http://localhost:3000/api/v1/tasks/1 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"completed":true}'

curl -X DELETE http://localhost:3000/api/v1/tasks/1 -H "Authorization: Bearer $TOKEN" -i
```

PowerShell:

```powershell
$h = @{ Authorization = "Bearer change-me-super-secret-token" }
Invoke-RestMethod -Method Post http://localhost:3000/api/v1/tasks -Headers $h -ContentType 'application/json' -Body '{"title":"Comprar víveres"}'
Invoke-RestMethod "http://localhost:3000/api/v1/tasks?completed=false" -Headers $h
```

## Tests y verificación

```bash
bun run typecheck   # TypeScript estricto
bun test            # 16 tests de integración (SQLite en memoria); cada test explica en español qué verifica
bun run check       # ambos
```

## Exponer públicamente con ngrok (opcional)

- **Sin Docker:** `ngrok config add-authtoken <TU_TOKEN>` y luego `ngrok http 3000`.
- **Con Docker:** define `NGROK_AUTHTOKEN` en `.env` y ejecuta `docker compose --profile tunnel up --build -d`. La URL pública aparece en http://localhost:4040 o con `docker compose logs ngrok`.

Abre `https://<subdominio>.ngrok-free.app/ui`. Con cuentas gratuitas ngrok muestra primero una página de aviso: pulsa **Visit Site** una vez y Swagger UI funcionará normalmente (la especificación usa URLs relativas).

## Estructura del proyecto

```
src/
├── index.ts                 # Arranque: migraciones + Bun.serve + apagado limpio
├── app.ts                   # Composición de la app (middlewares, routers, docs, errores)
├── config/env.ts            # Variables de entorno validadas con Zod
├── db/                      # Conexión, esquema Drizzle y runner de migraciones
├── lib/                     # Prefijo de versión, fábrica de routers, esquemas comunes, OpenAPI, errores
├── middleware/              # Autenticación Bearer y manejo global de errores
└── modules/
    ├── health/              # GET /health
    └── tasks/
        ├── task.routes.ts       # Definición de rutas (contrato OpenAPI)
        ├── task.schemas.ts      # Esquemas de validación Zod
        ├── task.handlers.ts     # Adaptadores HTTP
        ├── task.service.ts      # Lógica de negocio
        ├── task.repository.ts   # Acceso a datos (Drizzle)
        └── index.ts             # Router del módulo
drizzle/                     # Migraciones SQL generadas (versionadas)
tests/                       # Tests de integración
```

## Decisiones técnicas

- **Versionado por URL (`/api/v1`):** el prefijo se define una sola vez en `src/lib/constants.ts`; permite publicar una v2 incompatible en paralelo sin romper a los clientes existentes.
- **Contrato como código:** los esquemas Zod son la única fuente de verdad para validar peticiones, tipar respuestas y generar la especificación OpenAPI.
- **Drizzle ORM + migraciones versionadas:** el esquema TypeScript genera el SQL de `drizzle/`, que se aplica automáticamente en cada arranque (idempotente). Todas las consultas son parametrizadas.
- **PATCH con lista blanca explícita:** solo se copian los campos enviados (`title`, `description`, `completed`) y se aplican en una única sentencia `UPDATE … RETURNING`, que es atómica, refresca `updated_at` y devuelve la fila tal como quedó en la base de datos.
- **Timestamps ISO-8601 UTC** (`2026-10-13T20:00:00.000Z`); `updated_at` se actualiza automáticamente en cada modificación.
- **Nombres de campo del enunciado** (`created_at`, `updated_at`) usados tal cual en el contrato.
- **Errores homogéneos:** validación (400), no autorizado (401), no encontrado (404), tipo de contenido (415) y error interno (500) comparten la forma `{ success: false, message }`.
- **Seguridad:** comparación de token en tiempo constante, cabeceras seguras (`secureHeaders`), contenedor sin privilegios de root.

## Scripts

| Script | Acción |
|---|---|
| `bun run dev` | Servidor con hot reload |
| `bun run start` | Servidor |
| `bun run typecheck` | Comprobación de tipos |
| `bun test` | Tests |
| `bun run check` | Typecheck + tests |
| `bun run db:generate --name <nombre>` | Generar migración tras cambiar `src/db/schema.ts` |
| `bun run db:studio` | Explorador visual de la BD (Drizzle Studio) |
