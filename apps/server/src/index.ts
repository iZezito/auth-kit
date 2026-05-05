import { Elysia } from "elysia";
import { userController } from "@/modules/user";
import cors from "@elysiajs/cors";
import { authController } from "@/modules/auth";
import { CustomError } from "./error";
import { SQL } from "bun";
import { openapi } from "@elysiajs/openapi";
import { DrizzleQueryError } from "drizzle-orm";

const app = new Elysia()
  .use(
    cors({
      origin: Bun.env.CLIENT_URL! || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  )
  .onError(({ error }) => {
    if (error instanceof DrizzleQueryError) {
      if (error.cause instanceof SQL.PostgresError) {
        return {
          message: error.cause.message || error.message,
          code: 400,
          timestamp: new Date().toISOString(),
        };
      }
    }

    if (error instanceof CustomError) {
      return {
        message: error.message,
        code: error.status,
        timestamp: new Date().toISOString(),
      };
    }
  })
  .use(openapi())
  .use(userController)
  .use(authController)
  .listen(Bun.env.PORT ?? 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
