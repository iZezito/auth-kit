import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "@/drizzle/migrations/schema";
import * as relations from "@/drizzle/migrations/relations";

export const db = drizzle(Bun.env.DATABASE_URL!, {
  schema: { ...schema, ...relations },
});

export type Database = typeof db;
