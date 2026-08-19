import { Elysia, t } from "elysia";
import { authSchema, google, type GoogleIdTokenClaims } from "./model";
import { AuthService } from "./service";
import { jwtService } from "@server/plugin/jwt";
import * as arctic from "arctic";
import { redis, redisKeys, redisTtl } from "@server/lib/redis";
import { authGuard } from "@server/plugin/middleware";
import { db } from "@server/lib/db";
import { users } from "@server/drizzle/migrations/schema";

export const authController = new Elysia({ prefix: "/auth" })
  .use(jwtService)
  .post(
    "/login",
    async ({ status, body, jwt, cookie }) => {
      const user = await AuthService.login(body);

      if (!user.emailVerified) {
        return status(403, {
          message: "Email not validated, check your inbox!",
        });
      }

      if (user.twoFactorAuthenticationEnabled) {
        if (!body.codeOTP) {
          await AuthService.send2FACode(user);
          return status(202, { message: "Authentication Code sent to email." });
        }
        const isCodeValid = await AuthService.validate2FACode(
          user.id,
          body.codeOTP,
        );
        if (!isCodeValid) {
          return status(400, { message: "Invalid or expired 2FA code." });
        }
      }

      const token = await jwt.sign({ id: user.id, role: user.role });

      cookie.auth.set({
        value: token,
        httpOnly: true,
        secure: Bun.env.NODE_ENV === "production",
        sameSite: Bun.env.NODE_ENV === "production" ? "none" : "strict",
        path: "/",
        maxAge: 60 * 60 * 48,
      });
      const { password, ...rest } = user;
      await redis.setex(
        redisKeys.user(user.id),
        redisTtl.userCache,
        JSON.stringify(rest),
      );

      return { token };
    },
    {
      body: authSchema,
      response: {
        200: t.Object({ token: t.String() }),
        202: t.Object({ message: t.String() }),
        400: t.Object({ message: t.String() }),
        403: t.Object({ message: t.String() }),
      },
    },
  )
  .decorate(
    "pkceStore",
    new Map<string, { state: string; codeVerifier: string }>(),
  )
  .get("/oauth/google", async ({ redirect, pkceStore }) => {
    const state = arctic.generateState();
    const codeVerifier = arctic.generateCodeVerifier();
    const scopes = ["openid", "profile", "email"];

    const url = google.createAuthorizationURL(state, codeVerifier, scopes);
    url.searchParams.set("access_type", "offline");
    pkceStore.set(state, { state, codeVerifier });

    return redirect(url.toString());
  })
  .get(
    "/oauth/google/callback",
    async ({
      query: { code, state },
      status,
      jwt,
      pkceStore,
      redirect,
      cookie,
    }) => {
      const sessionData = pkceStore.get(state);
      if (!sessionData) {
        return status(400, { error: "Invalid state" });
      }
      pkceStore.delete(state);

      try {
        const tokens = await google.validateAuthorizationCode(
          code,
          sessionData.codeVerifier,
        );

        const idToken = tokens.idToken();
        const claims = arctic.decodeIdToken(idToken) as GoogleIdTokenClaims;

        let [userEntity] = await db
          .insert(users)
          .values({
            password: "ttttttttttttt",
            oauth2Provider: "google",
            email: claims.email,
            name: claims.name,
          })
          .onConflictDoUpdate({
            target: [users.email],
            set: {
              name: claims.name,
            },
          })
          .returning();

        const token = await jwt.sign({
          id: userEntity.id,
          role: userEntity.role,
        });

        cookie.auth.set({
          value: token,
          httpOnly: true,
          secure: Bun.env.NODE_ENV === "production",
          sameSite: Bun.env.NODE_ENV === "production" ? "none" : "strict",
          path: "/",
          maxAge: 60 * 60 * 48,
        });

        const { password, ...rest } = userEntity;
        await redis.setex(
          redisKeys.user(userEntity.id),
          redisTtl.userCache,
          JSON.stringify(rest),
        );

        return redirect(`${Bun.env.CLIENT_URL}/profile`);
      } catch (e) {
        if (e instanceof arctic.OAuth2RequestError) {
          return status(400, { error: "Invalid authorization code" });
        }
        if (e instanceof arctic.ArcticFetchError) {
          return status(500, { error: "Fetch error" });
        }
        return status(500, { error: "Unexpected error" });
      }
    },
    {
      query: t.Object({
        code: t.String(),
        state: t.String(),
      }),
    },
  )
  .use(authGuard)
  .post(
    "/logout",
    async ({ cookie, user }) => {
      await redis.del(redisKeys.user(user.id));
      cookie.auth.remove();

      return { message: "Logout successful" };
    },
    {
      response: t.Object({
        message: t.String(),
      }),
    },
  );
