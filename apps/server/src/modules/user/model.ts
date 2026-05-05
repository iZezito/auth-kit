import { t } from "elysia";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-typebox";
import { users } from "@/drizzle/migrations/schema";

const _createUser = createInsertSchema(users, {
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 6 }),
});

export const createUser = t.Omit(_createUser, ["role"]);

export const _selectUser = createSelectSchema(users);

export const selectUser = t.Omit(_selectUser, ["password"]);

export const updateUser = createUpdateSchema(users);

export type UserCreate = typeof createUser.static;
export type UserUpdate = typeof updateUser.static;
export type User = typeof selectUser.static;
export type UserPlain = typeof _selectUser.static;
