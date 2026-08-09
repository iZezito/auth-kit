import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "@/drizzle/migrations/schema";

export const db = drizzle(Bun.env.DATABASE_URL!, {
  schema,
});

export type Database = typeof db;
