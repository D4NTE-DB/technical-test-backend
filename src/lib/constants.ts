/**
 * Prefijo de la versión 1 de la API. Las rutas de negocio viven bajo este prefijo;
 * las rutas de infraestructura (/health, /doc, /ui) no se versionan.
 * Una futura v2 se montaría en paralelo (/api/v2) sin romper a los clientes de v1.
 */
export const API_V1_PREFIX = '/api/v1';
