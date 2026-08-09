import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { SQL } from "bun";
import { DrizzleQueryError } from "drizzle-orm";
import { authController } from "@/modules/auth";
import { userController } from "@/modules/user";
import { CustomError } from "@/error";

export const createApp = () =>
  new Elysia()
    .use(
      cors({
        origin: Bun.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
      }),
    )
    .onError(({ error, status }) => {
      if (error instanceof DrizzleQueryError) {
        if (error.cause instanceof SQL.PostgresError) {
          return status(400, {
            message: error.cause.message || error.message,
            code: 400,
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (error instanceof CustomError) {
        return status(error.status, {
          message: error.message,
          code: error.status,
          timestamp: new Date().toISOString(),
        });
      }
    })
    .use(openapi())
    .use(userController)
    .use(authController);

export type App = ReturnType<typeof createApp>;
