// Precargado por bunfig.toml antes de cualquier test: BD en memoria y token conocido.
process.env.NODE_ENV = 'test';
process.env.DB_FILE_NAME = ':memory:';
process.env.API_TOKEN = 'test-token-0123456789';
