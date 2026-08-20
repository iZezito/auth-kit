import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { SQL } from "bun";
import { DrizzleQueryError } from "drizzle-orm";
import { authController } from "@server/modules/auth";
import { userController } from "@server/modules/user";
import { CustomError } from "@server/error";
import { rateLimitPlugin } from "@server/plugin/rate-limit";

export const createApp = () =>
  new Elysia()
    .use(
      cors({
        origin: Bun.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposeHeaders: [
          "RateLimit-Limit",
          "RateLimit-Remaining",
          "RateLimit-Reset",
          "Retry-After",
          "X-RateLimit-Limit",
          "X-RateLimit-Remaining",
          "X-RateLimit-Reset",
        ],
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
    .use(rateLimitPlugin)
    .guard({ rateLimit: "global" }, (app) =>
      app.use(userController).use(authController),
    );

export type App = ReturnType<typeof createApp>;
