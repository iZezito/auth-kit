import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/migrations/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: Bun.env.DATABASE_URL!,
  },
});
