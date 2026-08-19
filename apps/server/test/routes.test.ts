import { beforeEach, describe, expect, mock, test } from "bun:test";
import { t } from "elysia";

const userSave = mock(async () => undefined);
const userValidateEmail = mock(async () => true);
const userFindByEmail = mock(async () => undefined as any);
const userCreatePasswordResetToken = mock(async () => "reset-token");
const userConsumePasswordResetToken = mock(async () => null as string | null);
const userUpdatePassword = mock(async () => undefined);
const userFindById = mock(async () => undefined as any);
const userUpdate = mock(async () => undefined as any);

const UserService = {
  save: userSave,
  validateEmail: userValidateEmail,
  findByEmail: userFindByEmail,
  createPasswordResetToken: userCreatePasswordResetToken,
  consumePasswordResetToken: userConsumePasswordResetToken,
  updatePassword: userUpdatePassword,
  findById: userFindById,
  update: userUpdate,
};

mock.module("@server/modules/user/service", () => ({ UserService }));

const authLogin = mock(async () => undefined as any);
const authSend2FACode = mock(async () => undefined);
const authValidate2FACode = mock(async () => false);

const AuthService = {
  login: authLogin,
  send2FACode: authSend2FACode,
  validate2FACode: authValidate2FACode,
};

mock.module("@server/modules/auth/service", () => ({ AuthService }));

const googleCreateAuthorizationURL = mock(
  (state: string, _codeVerifier: string, _scopes: string[]) =>
    new URL(
      `https://accounts.google.com/o/oauth2/v2/auth?state=${state}&code_challenge=challenge`,
    ),
);
const googleValidateAuthorizationCode = mock(async () => ({
  idToken: () => "google-id-token",
}));

mock.module("@server/modules/auth/model", () => ({
  authSchema: t.Object({
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 6 }),
    codeOTP: t.Optional(t.String()),
  }),
  google: {
    createAuthorizationURL: googleCreateAuthorizationURL,
    validateAuthorizationCode: googleValidateAuthorizationCode,
  },
}));

class OAuth2RequestError extends Error {}
class ArcticFetchError extends Error {}
const decodeIdToken = mock(() => ({
  email: "google@example.com",
  name: "Google User",
}));

mock.module("arctic", () => ({
  generateState: () => "test-state",
  generateCodeVerifier: () => "test-code-verifier",
  decodeIdToken,
  OAuth2RequestError,
  ArcticFetchError,
}));

const redisSetex = mock(
  async (_key: string, _ttl: number, _value: string) => "OK",
);
const redisDel = mock(async (_key: string) => 1);
const redisKeys = {
  user: (userId: string) => `user:${userId}`,
  emailVerification: (token: string) => `auth:email-verification:${token}`,
  passwordReset: (token: string) => `auth:password-reset:${token}`,
  passwordResetByUser: (userId: string) => `auth:password-reset:user:${userId}`,
  twoFactor: (userId: string) => `auth:two-factor:${userId}`,
};
const redisTtl = {
  userCache: 900,
  emailVerification: 86_400,
  passwordReset: 3_600,
  twoFactor: 7_200,
};

mock.module("@server/lib/redis", () => ({
  redis: { setex: redisSetex, del: redisDel },
  redisKeys,
  redisTtl,
}));

const sendMail = mock(async () => ({ messageId: "mail-id" }));
mock.module("@server/lib/mail", () => ({ sendMail }));
mock.module("@server/emails/render", () => ({
  renderVerifyEmail: (url: string) => `verify:${url}`,
  renderResetPasswordEmail: (url: string) => `reset:${url}`,
  renderOtpEmail: (code: string) => `otp:${code}`,
}));

let oauthUserResult: any;
const oauthReturning = mock(async () => [oauthUserResult]);
const oauthOnConflictDoUpdate = mock(() => ({ returning: oauthReturning }));
const oauthValues = mock(() => ({
  onConflictDoUpdate: oauthOnConflictDoUpdate,
}));
const dbInsert = mock(() => ({ values: oauthValues }));

mock.module("@server/lib/db", () => ({
  db: { insert: dbInsert },
}));

const { createApp } = await import("@server/app");
const { BadCredentialsError } = await import("@server/error");

type StoredUser = {
  id: string;
  name: string;
  email: string;
  role: "DEFAULT" | "ADMIN";
  password: string;
  oauth2Provider: string | null;
  emailVerified: boolean;
  twoFactorAuthenticationEnabled: boolean;
};

const storedUser: StoredUser = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  role: "DEFAULT",
  password: "bcrypt-hash",
  oauth2Provider: null,
  emailVerified: true,
  twoFactorAuthenticationEnabled: false,
};
const publicUser = (({ password, ...user }) => user)(storedUser);

let app: ReturnType<typeof createApp>;

const jsonRequest = (
  path: string,
  method: string,
  body?: unknown,
  token?: string,
) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

const login = async (overrides: Partial<typeof storedUser> = {}) => {
  authLogin.mockResolvedValueOnce({ ...storedUser, ...overrides });
  const response = await jsonRequest("/auth/login", "POST", {
    email: storedUser.email,
    password: "secret-password",
  });
  const body = (await response.json()) as { token: string };
  return { response, token: body.token };
};

beforeEach(() => {
  app = createApp();

  for (const fn of [
    userSave,
    userValidateEmail,
    userFindByEmail,
    userCreatePasswordResetToken,
    userConsumePasswordResetToken,
    userUpdatePassword,
    userFindById,
    userUpdate,
    authLogin,
    authSend2FACode,
    authValidate2FACode,
    redisSetex,
    redisDel,
    sendMail,
    googleCreateAuthorizationURL,
    googleValidateAuthorizationCode,
    decodeIdToken,
    dbInsert,
    oauthValues,
    oauthOnConflictDoUpdate,
    oauthReturning,
  ]) {
    fn.mockReset();
  }

  userSave.mockResolvedValue(undefined);
  userValidateEmail.mockResolvedValue(true);
  userFindByEmail.mockResolvedValue(undefined);
  userCreatePasswordResetToken.mockResolvedValue("reset-token");
  userConsumePasswordResetToken.mockResolvedValue(null);
  userUpdatePassword.mockResolvedValue(undefined);
  userFindById.mockResolvedValue(publicUser);
  userUpdate.mockResolvedValue(publicUser);
  authLogin.mockResolvedValue(storedUser);
  authSend2FACode.mockResolvedValue(undefined);
  authValidate2FACode.mockResolvedValue(false);
  redisSetex.mockResolvedValue("OK");
  redisDel.mockResolvedValue(1);
  sendMail.mockResolvedValue({ messageId: "mail-id" });
  googleCreateAuthorizationURL.mockImplementation(
    (state: string, _codeVerifier: string, _scopes: string[]) =>
      new URL(
        `https://accounts.google.com/o/oauth2/v2/auth?state=${state}&code_challenge=challenge`,
      ),
  );
  googleValidateAuthorizationCode.mockResolvedValue({
    idToken: () => "google-id-token",
  });
  decodeIdToken.mockReturnValue({
    email: "google@example.com",
    name: "Google User",
  });
  oauthUserResult = {
    ...storedUser,
    email: "google@example.com",
    name: "Google User",
    oauth2Provider: "google",
  };
  oauthReturning.mockImplementation(async () => [oauthUserResult]);
  oauthOnConflictDoUpdate.mockImplementation(() => ({
    returning: oauthReturning,
  }));
  oauthValues.mockImplementation(() => ({
    onConflictDoUpdate: oauthOnConflictDoUpdate,
  }));
  dbInsert.mockImplementation(() => ({ values: oauthValues }));
});

describe("rotas públicas de usuário", () => {
  test("cria usuário válido", async () => {
    const response = await jsonRequest("/users", "POST", {
      name: "New User",
      email: "new@example.com",
      password: "secret-password",
    });

    expect(response.status).toBe(201);
    expect(userSave).toHaveBeenCalledTimes(1);
  });

  test("rejeita cadastro com e-mail e senha inválidos", async () => {
    const response = await jsonRequest("/users", "POST", {
      name: "Invalid",
      email: "not-an-email",
      password: "123",
    });

    expect(response.status).toBe(422);
    expect(userSave).not.toHaveBeenCalled();
  });

  test.each([
    [true, "Email verified successfully!"],
    [false, "Invalid or expired verification token."],
  ])("responde verificação de e-mail (%p)", async (valid, message) => {
    userValidateEmail.mockResolvedValueOnce(valid);

    const response = await app.handle(
      new Request("http://localhost/users/email-verification?token=token"),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(message);
  });

  test("não revela se o e-mail de recuperação existe", async () => {
    const response = await jsonRequest("/users/forgot-password", "POST", {
      email: "missing@example.com",
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("If an account");
    expect(userCreatePasswordResetToken).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  test("envia recuperação somente para usuário existente", async () => {
    userFindByEmail.mockResolvedValueOnce(storedUser);

    const response = await jsonRequest("/users/forgot-password", "POST", {
      email: storedUser.email,
    });

    expect(response.status).toBe(200);
    expect(userCreatePasswordResetToken).toHaveBeenCalledWith(storedUser.id);
    expect(sendMail).toHaveBeenCalledWith(
      storedUser.email,
      "Password Reset",
      "reset:http://localhost:5173/reset-password?token=reset-token",
    );
  });

  test("retorna 410 para reset inválido ou expirado", async () => {
    const response = await jsonRequest("/users/password-reset", "PUT", {
      token: "expired-token",
      newPassword: "new-password",
    });

    expect(response.status).toBe(410);
    expect(await response.text()).toBe("Token invalid or expired.");
    expect(userUpdatePassword).not.toHaveBeenCalled();
  });

  test("altera senha com token válido", async () => {
    userConsumePasswordResetToken.mockResolvedValueOnce(storedUser.id);

    const response = await jsonRequest("/users/password-reset", "PUT", {
      token: "valid-token",
      newPassword: "new-password",
    });

    expect(response.status).toBe(200);
    expect(userUpdatePassword).toHaveBeenCalledWith(
      storedUser.id,
      "new-password",
    );
  });
});

describe("login e sessão", () => {
  test("converte credenciais inválidas em HTTP 401", async () => {
    authLogin.mockRejectedValueOnce(new BadCredentialsError());

    const response = await jsonRequest("/auth/login", "POST", {
      email: storedUser.email,
      password: "wrong-password",
    });
    const body = (await response.json()) as { code: number; message: string };

    expect(response.status).toBe(401);
    expect(body.code).toBe(401);
    expect(body.message).toContain("Invalid credentials");
  });

  test("rejeita login de e-mail não verificado", async () => {
    authLogin.mockResolvedValueOnce({ ...storedUser, emailVerified: false });

    const response = await jsonRequest("/auth/login", "POST", {
      email: storedUser.email,
      password: "secret-password",
    });

    expect(response.status).toBe(403);
  });

  test("solicita 2FA quando o código não foi enviado", async () => {
    authLogin.mockResolvedValueOnce({
      ...storedUser,
      twoFactorAuthenticationEnabled: true,
    });

    const response = await jsonRequest("/auth/login", "POST", {
      email: storedUser.email,
      password: "secret-password",
    });

    expect(response.status).toBe(202);
    expect(authSend2FACode).toHaveBeenCalledTimes(1);
  });

  test("rejeita código 2FA inválido", async () => {
    authLogin.mockResolvedValueOnce({
      ...storedUser,
      twoFactorAuthenticationEnabled: true,
    });

    const response = await jsonRequest("/auth/login", "POST", {
      email: storedUser.email,
      password: "secret-password",
      codeOTP: "000000",
    });

    expect(response.status).toBe(400);
  });

  test("cria JWT, cookie seguro e cache sem senha", async () => {
    const { response, token } = await login();
    const cachedUser = JSON.parse(
      redisSetex.mock.calls[0]?.[2] as unknown as string,
    );

    expect(response.status).toBe(200);
    expect(token).toBeString();
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=Strict");
    expect(redisSetex).toHaveBeenCalledWith(
      redisKeys.user(storedUser.id),
      redisTtl.userCache,
      expect.any(String),
    );
    expect(cachedUser).not.toHaveProperty("password");
  });

  test("encerra sessão autenticada", async () => {
    const { token } = await login();

    const response = await jsonRequest(
      "/auth/logout",
      "POST",
      undefined,
      token,
    );

    expect(response.status).toBe(200);
    expect(redisDel).toHaveBeenCalledWith(redisKeys.user(storedUser.id));
  });
});

describe("autorização de usuário", () => {
  test("bloqueia rota protegida sem token", async () => {
    const response = await app.handle(new Request("http://localhost/users"));

    expect(response.status).toBe(401);
  });

  test("bloqueia JWT inválido", async () => {
    const response = await jsonRequest(
      "/users",
      "GET",
      undefined,
      "invalid-jwt",
    );

    expect(response.status).toBe(401);
  });

  test("permite consultar o próprio perfil", async () => {
    const { token } = await login();

    const response = await jsonRequest("/users", "GET", undefined, token);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(publicUser);
  });

  test("bloqueia consulta por id para usuário comum", async () => {
    const { token } = await login();

    const response = await jsonRequest(
      `/users/${storedUser.id}`,
      "GET",
      undefined,
      token,
    );

    expect(response.status).toBe(403);
  });

  test("permite consulta por id para administrador", async () => {
    const { token } = await login({ role: "ADMIN" });

    const response = await jsonRequest(
      `/users/${storedUser.id}`,
      "GET",
      undefined,
      token,
    );

    expect(response.status).toBe(200);
    expect(userFindById).toHaveBeenCalledWith(storedUser.id);
  });

  test("impede atualização do perfil de outro usuário", async () => {
    const { token } = await login();

    const response = await jsonRequest(
      "/users/another-user",
      "PUT",
      { name: "Hacker" },
      token,
    );

    expect(response.status).toBe(403);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  test("atualiza o próprio perfil sem expor senha", async () => {
    const { token } = await login();

    const response = await jsonRequest(
      `/users/${storedUser.id}`,
      "PUT",
      { name: "Updated" },
      token,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).not.toHaveProperty("password");
    expect(userUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("OAuth Google", () => {
  test("inicia autorização com state e PKCE", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/oauth/google"),
    );
    const location = response.headers.get("location");

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(location).toContain("accounts.google.com");
    expect(location).toContain("state=");
    expect(location).toContain("code_challenge=");
  });

  test("rejeita callback com state desconhecido", async () => {
    const response = await app.handle(
      new Request(
        "http://localhost/auth/oauth/google/callback?code=code&state=invalid",
      ),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid state" });
  });

  test("conclui callback, cria sessão e consome o state", async () => {
    await app.handle(new Request("http://localhost/auth/oauth/google"));

    const response = await app.handle(
      new Request(
        "http://localhost/auth/oauth/google/callback?code=code&state=test-state",
      ),
    );

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get("location")).toBe(
      "http://localhost:5173/profile",
    );
    expect(googleValidateAuthorizationCode).toHaveBeenCalledWith(
      "code",
      "test-code-verifier",
    );
    expect(oauthValues).toHaveBeenCalledWith({
      password: "ttttttttttttt",
      oauth2Provider: "google",
      email: "google@example.com",
      name: "Google User",
    });
    expect(redisSetex).toHaveBeenCalledWith(
      redisKeys.user(oauthUserResult.id),
      redisTtl.userCache,
      expect.not.stringContaining("password"),
    );

    const reusedState = await app.handle(
      new Request(
        "http://localhost/auth/oauth/google/callback?code=code&state=test-state",
      ),
    );
    expect(reusedState.status).toBe(400);
  });

  test.each([
    [new OAuth2RequestError("invalid code"), 400, "Invalid authorization code"],
    [new ArcticFetchError("network"), 500, "Fetch error"],
    [new Error("unknown"), 500, "Unexpected error"],
  ])(
    "mapeia falha do provedor OAuth (%#)",
    async (error, expectedStatus, expectedMessage) => {
      await app.handle(new Request("http://localhost/auth/oauth/google"));
      googleValidateAuthorizationCode.mockRejectedValueOnce(error);

      const response = await app.handle(
        new Request(
          "http://localhost/auth/oauth/google/callback?code=code&state=test-state",
        ),
      );

      expect(response.status).toBe(expectedStatus);
      expect(await response.json()).toEqual({ error: expectedMessage });
    },
  );
});
