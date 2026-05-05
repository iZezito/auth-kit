import {
  pgTable,
  timestamp,
  text,
  uniqueIndex,
  foreignKey,
  serial,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const userRole = pgEnum("UserRole", ["DEFAULT", "ADMIN"]);
export type UserRole = (typeof userRole.enumValues)[number];

export const emailVerifications = pgTable(
  "email_verifications",
  {
    id: serial().primaryKey().notNull(),
    verificationToken: text().notNull(),
    expiryDate: timestamp({ precision: 3, withTimezone: true }).notNull(),
    userId: text().notNull(),
  },
  (table) => [
    uniqueIndex("email_verifications_userId_key").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("email_verifications_verificationToken_key").using(
      "btree",
      table.verificationToken.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "email_verifications_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial().primaryKey().notNull(),
    token: text().notNull(),
    expiryDate: timestamp({ precision: 3, withTimezone: true }).notNull(),
    userId: text(),
  },
  (table) => [
    uniqueIndex("password_reset_tokens_userId_key").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "password_reset_tokens_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

export const twoFactorAuthentication = pgTable(
  "two_factor_authentication",
  {
    id: serial().primaryKey().notNull(),
    code: text().notNull(),
    expiryDate: timestamp({ precision: 3, withTimezone: true }).notNull(),
    userId: text().notNull(),
  },
  (table) => [
    uniqueIndex("two_factor_authentication_userId_key").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "two_factor_authentication_userId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ],
);

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
