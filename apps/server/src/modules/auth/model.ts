import { t, type Static } from "elysia";
import { Google } from "arctic";

export const authSchema = t.Object({
  email: t.String({
    format: "email",
  }),
  password: t.String({
    minLength: 6,
  }),
  codeOTP: t.Optional(t.String()),
});

export type AuthContext = {
  id: string;
  role: string;
};

export type AuthBody = Static<typeof authSchema>;

export const google = new Google(
  Bun.env.GOOGLE_CLIENT_ID!,
  Bun.env.GOOGLE_CLIENT_SECRET!,
  "http://localhost:3000/auth/oauth/google/callback"
);

export type GoogleIdTokenClaims = {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
};
