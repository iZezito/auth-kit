Bun.env.NODE_ENV = "test";
Bun.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
Bun.env.CLIENT_URL = "http://localhost:5173";
Bun.env.REDIS_URL = "redis://localhost:6379";
Bun.env.DATABASE_URL =
  "postgres://postgres:postgres@localhost:5432/auth_kit_test";
Bun.env.GOOGLE_CLIENT_ID = "google-client-id";
Bun.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
