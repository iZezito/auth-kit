import {
  pgTable,
  text,
  uniqueIndex,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const userRole = pgEnum("UserRole", ["DEFAULT", "ADMIN"]);
export type UserRole = (typeof userRole.enumValues)[number];

export const users = pgTable(
  "users",
  {
    id: text()
      .$defaultFn(() => createId())
      .primaryKey()
      .notNull(),
    name: text().notNull(),
    email: text().notNull(),
    role: userRole().default("DEFAULT").notNull(),
    password: text().notNull(),
    oauth2Provider: text(),
    emailVerified: boolean().default(false),
    twoFactorAuthenticationEnabled: boolean().default(false),
  },
  (table) => [
    uniqueIndex("users_email_key").using(
      "btree",
      table.email.asc().nullsLast().op("text_ops"),
    ),
  ],
);
