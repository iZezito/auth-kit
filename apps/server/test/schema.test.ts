import { describe, expect, test } from "bun:test";
import { getTableName } from "drizzle-orm";
import * as schema from "@server/drizzle/migrations/schema";

describe("schema persistente", () => {
  test("expõe somente a tabela de usuários", () => {
    expect(Object.keys(schema).sort()).toEqual(["userRole", "users"]);
    expect(getTableName(schema.users)).toBe("users");
  });

  test("mantém os papéis suportados", () => {
    expect(schema.userRole.enumValues).toEqual(["DEFAULT", "ADMIN"]);
  });
});
