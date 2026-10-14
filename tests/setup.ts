// Precargado por bunfig.toml antes de cualquier test.
// Fija un entorno aislado: modo test, base SQLite en memoria (no toca data/sqlite.db)
// y un token conocido, independiente de lo que haya en el .env local.
process.env.NODE_ENV = 'test';
process.env.DB_FILE_NAME = ':memory:';
process.env.API_TOKEN = 'test-token-0123456789';
