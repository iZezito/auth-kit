import { Elysia, t } from "elysia";

export const paramModel = new Elysia({ name: "params-model" }).model({
  "params-id": t.Object({
    id: t.String(),
  }),
});
