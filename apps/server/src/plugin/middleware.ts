import { Elysia } from "elysia";
import { jwtService } from "./jwt";
import { bearer } from "@elysiajs/bearer";
import { type UserRole } from "@/drizzle/migrations/schema";
import type { AuthContext } from "@/modules/auth/model";
import { ForbiddenError, UnauthorizedError } from "@/error";

export const authGuard = new Elysia({ name: "auth-guard" })
  .use(jwtService)
  .use(bearer())
  .derive({ as: "scoped" }, async ({ bearer, jwt, cookie }) => {
    const token = cookie.auth?.value || bearer;

    if (!token) {
      throw new UnauthorizedError("Authentication token not provided!");
    }

    const payload = await jwt.verify(token);

    if (!payload) {
      throw new UnauthorizedError("The token provided is invalid or expired!");
    }

    return {
      user: { id: payload.id, role: payload.role } as AuthContext,
    };
  })
  .macro({
    requireRole: (role: UserRole) => ({
      async resolve({ user }) {
        if (!user) {
          throw new UnauthorizedError(
            "You must be authenticated to access this route",
          );
        }

        if (user.role !== role) {
          throw new ForbiddenError("You do not have access to this feature");
        }
      },
    }),
  });
