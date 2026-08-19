import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

const redisKeys = {
  user: (userId: string) => `user:${userId}`,
  emailVerification: (token: string) => `auth:email-verification:${token}`,
  passwordReset: (token: string) => `auth:password-reset:${token}`,
  passwordResetByUser: (userId: string) => `auth:password-reset:user:${userId}`,
  twoFactor: (userId: string) => `auth:two-factor:${userId}`,
} as const;

const redisTtl = {
  userCache: 900,
  emailVerification: 86_400,
  passwordReset: 3_600,
  twoFactor: 7_200,
} as const;

let redisValues = new Map<string, string>();
let redisGetDelValues = new Map<string, string>();
let redisEvalResult: unknown = 0;

const redisGet = mock(async (key: string) => redisValues.get(key) ?? null);
const redisSetex = mock(async () => "OK");
const redisDel = mock(async () => 1);
const redisGetdel = mock(async (key: string) => {
  const value = redisGetDelValues.get(key) ?? null;
  redisGetDelValues.delete(key);
  return value;
});
const redisEval = mock(async () => redisEvalResult);

const transaction = {
  del: mock(() => transaction),
  setex: mock(() => transaction),
  exec: mock(async () => []),
};
const redisMulti = mock(() => transaction);

mock.module("@server/lib/redis", () => ({
  redis: {
    get: redisGet,
    setex: redisSetex,
    del: redisDel,
    getdel: redisGetdel,
    eval: redisEval,
    multi: redisMulti,
  },
  redisKeys,
  redisTtl,
}));

let queryUser: any;
let insertRows: any[] = [];
let insertError: unknown;
let selectRows: any[] = [];
let updateRows: any[] = [];
let insertedValues: any;
let updatedValues: any;

const findFirst = mock(async () => queryUser);
const insertReturning = mock(async () => {
  if (insertError) throw insertError;
  return insertRows;
});
const insertValues = mock((values: unknown) => {
  insertedValues = values;
  return { returning: insertReturning };
});
const insert = mock(() => ({ values: insertValues }));
const selectWhere = mock(async () => selectRows);
const selectFrom = mock(() => ({ where: selectWhere }));
const select = mock(() => ({ from: selectFrom }));
const updateReturning = mock(async () => updateRows);
const updateWhere = mock(() => ({ returning: updateReturning }));
const updateSet = mock((values: unknown) => {
  updatedValues = values;
  return { where: updateWhere };
});
const update = mock(() => ({ set: updateSet }));

mock.module("@server/lib/db", () => ({
  db: {
    query: { users: { findFirst } },
    insert,
    select,
    update,
  },
}));

const sendMail = mock(async () => ({ messageId: "mail-id" }));
mock.module("@server/lib/mail", () => ({ sendMail }));
mock.module("@server/emails/render", () => ({
  renderVerifyEmail: (url: string) => `verify:${url}`,
  renderResetPasswordEmail: (url: string) => `reset:${url}`,
  renderOtpEmail: (code: string) => `otp:${code}`,
}));

const { AuthService } = await import("@server/modules/auth/service");
const { UserService } = await import("@server/modules/user/service");
const { BadCredentialsError, NotFoundError } = await import("@server/error");

const baseUser = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  role: "DEFAULT" as const,
  password: "stored-hash",
  oauth2Provider: null,
  emailVerified: true,
  twoFactorAuthenticationEnabled: false,
};

let validPasswordHash: string;

beforeAll(async () => {
  validPasswordHash = await Bun.password.hash("correct-password", {
    algorithm: "bcrypt",
    cost: 4,
  });
});

beforeEach(() => {
  queryUser = undefined;
  insertRows = [];
  insertError = undefined;
  selectRows = [];
  updateRows = [];
  insertedValues = undefined;
  updatedValues = undefined;
  redisValues = new Map();
  redisGetDelValues = new Map();
  redisEvalResult = 0;

  for (const fn of [
    findFirst,
    insertReturning,
    insertValues,
    insert,
    selectWhere,
    selectFrom,
    select,
    updateReturning,
    updateWhere,
    updateSet,
    update,
    redisGet,
    redisSetex,
    redisDel,
    redisGetdel,
    redisEval,
    redisMulti,
    transaction.del,
    transaction.setex,
    transaction.exec,
    sendMail,
  ]) {
    fn.mockClear();
  }
});

describe("AuthService", () => {
  test("rejeita login quando o usuário não existe", async () => {
    queryUser = undefined;

    expect(
      AuthService.login({ email: "missing@example.com", password: "secret" }),
    ).rejects.toBeInstanceOf(BadCredentialsError);
  });

  test("rejeita login com senha incorreta", async () => {
    queryUser = { ...baseUser, password: validPasswordHash };

    expect(
      AuthService.login({
        email: baseUser.email,
        password: "wrong-password",
      }),
    ).rejects.toBeInstanceOf(BadCredentialsError);
  });

  test("retorna o usuário com credenciais válidas", async () => {
    queryUser = { ...baseUser, password: validPasswordHash };

    const user = await AuthService.login({
      email: baseUser.email,
      password: "correct-password",
    });

    expect(user.id).toBe(baseUser.id);
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  test("salva e envia um código 2FA de seis dígitos", async () => {
    const random = spyOn(Math, "random").mockReturnValue(0);

    await AuthService.send2FACode(baseUser);

    expect(redisSetex).toHaveBeenCalledWith(
      redisKeys.twoFactor(baseUser.id),
      redisTtl.twoFactor,
      "100000",
    );
    expect(sendMail).toHaveBeenCalledWith(
      baseUser.email,
      "Two-Factor Authentication Code",
      "otp:100000",
    );
    random.mockRestore();
  });

  test.each([
    [1, true],
    [0, false],
  ])("interpreta o resultado atômico do 2FA (%p)", async (result, expected) => {
    redisEvalResult = result;

    expect(await AuthService.validate2FACode(baseUser.id, "123456")).toBe(
      expected,
    );
    expect(redisEval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("DEL", KEYS[1])'),
      1,
      redisKeys.twoFactor(baseUser.id),
      "123456",
    );
  });
});

describe("UserService", () => {
  test("cria usuário com senha bcrypt e envia verificação", async () => {
    insertRows = [baseUser];
    const token = spyOn(
      UserService,
      "createVerificationEmailToken",
    ).mockResolvedValue("verification-token");

    const result = await UserService.save({
      name: baseUser.name,
      email: baseUser.email,
      password: "plain-password",
    } as any);

    expect(result).toEqual(baseUser);
    expect(insertedValues.emailVerified).toBe(false);
    expect(insertedValues.password).not.toBe("plain-password");
    expect(
      await Bun.password.verify("plain-password", insertedValues.password),
    ).toBe(true);
    expect(sendMail).toHaveBeenCalledWith(
      baseUser.email,
      "Account Verify",
      "verify:http://localhost:5173/validate-email?token=verification-token",
    );
    token.mockRestore();
  });

  test("retorna null para e-mail duplicado", async () => {
    insertError = { cause: { errno: "23505" } };

    expect(
      await UserService.save({
        name: "Duplicate",
        email: baseUser.email,
        password: "plain-password",
      } as any),
    ).toBeNull();
  });

  test("propaga erros de inserção que não são duplicidade", async () => {
    const failure = new Error("database unavailable");
    insertError = failure;

    expect(
      UserService.save({
        name: "Failure",
        email: "failure@example.com",
        password: "plain-password",
      } as any),
    ).rejects.toBe(failure);
  });

  test("atualiza senha com bcrypt e invalida cache", async () => {
    await UserService.updatePassword(baseUser.id, "new-password");

    expect(
      await Bun.password.verify("new-password", updatedValues.password),
    ).toBe(true);
    expect(redisDel).toHaveBeenCalledWith(redisKeys.user(baseUser.id));
  });

  test("retorna usuário diretamente do cache", async () => {
    const publicUser = { ...baseUser, password: undefined };
    redisValues.set(redisKeys.user(baseUser.id), JSON.stringify(publicUser));

    expect(await UserService.findById(baseUser.id)).toMatchObject({
      id: baseUser.id,
      email: baseUser.email,
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  test("restaura datas de assinatura armazenadas no cache", () => {
    const cached = JSON.stringify({
      ...baseUser,
      subscription: {
        expiresAt: "2030-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
        startedAt: "2026-01-02T00:00:00.000Z",
      },
    });

    const parsed = UserService.parseCachedUser(cached) as any;

    expect(parsed.subscription.expiresAt).toBeInstanceOf(Date);
    expect(parsed.subscription.createdAt).toBeInstanceOf(Date);
    expect(parsed.subscription.updatedAt).toBeInstanceOf(Date);
    expect(parsed.subscription.startedAt).toBeInstanceOf(Date);
  });

  test("consulta e preenche cache quando houver cache miss", async () => {
    queryUser = { ...baseUser };
    delete queryUser.password;

    const result = await UserService.findById(baseUser.id);

    expect(result.id).toBe(baseUser.id);
    expect(redisSetex).toHaveBeenCalledWith(
      redisKeys.user(baseUser.id),
      redisTtl.userCache,
      JSON.stringify(queryUser),
    );
  });

  test("lança NotFoundError quando usuário não existe", async () => {
    queryUser = undefined;

    expect(UserService.findById("missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  test("atualiza perfil sem devolver o hash da senha", async () => {
    selectRows = [baseUser];
    updateRows = [{ ...baseUser, name: "Updated" }];

    const result = await UserService.update(
      { name: "Updated", twoFactorAuthenticationEnabled: true } as any,
      baseUser.id,
    );

    expect(updatedValues).toEqual({
      name: "Updated",
      twoFactorAuthenticationEnabled: true,
    });
    expect(result).not.toHaveProperty("password");
    expect(redisDel).toHaveBeenCalledWith(redisKeys.user(baseUser.id));
  });

  test("não atualiza perfil inexistente", async () => {
    selectRows = [];

    expect(
      UserService.update({ name: "Nobody" } as any, "missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("cria token de verificação com TTL de 24 horas", async () => {
    const token = await UserService.createVerificationEmailToken(baseUser.id);

    expect(token).toBeString();
    expect(redisSetex).toHaveBeenCalledWith(
      redisKeys.emailVerification(token),
      redisTtl.emailVerification,
      baseUser.id,
    );
  });

  test("cria primeiro token de reset sem remoção anterior", async () => {
    const token = await UserService.createPasswordResetToken(baseUser.id);

    expect(transaction.del).not.toHaveBeenCalled();
    expect(transaction.setex).toHaveBeenCalledWith(
      redisKeys.passwordReset(token),
      redisTtl.passwordReset,
      baseUser.id,
    );
    expect(transaction.setex).toHaveBeenCalledWith(
      redisKeys.passwordResetByUser(baseUser.id),
      redisTtl.passwordReset,
      token,
    );
    expect(transaction.exec).toHaveBeenCalledTimes(1);
  });

  test("remove token de reset anterior durante rotação", async () => {
    redisValues.set(redisKeys.passwordResetByUser(baseUser.id), "old-token");

    await UserService.createPasswordResetToken(baseUser.id);

    expect(transaction.del).toHaveBeenCalledWith(
      redisKeys.passwordReset("old-token"),
    );
  });

  test("busca usuário por e-mail", async () => {
    selectRows = [baseUser];

    expect(await UserService.findByEmail(baseUser.email)).toEqual(baseUser);
  });

  test("retorna undefined ao buscar e-mail inexistente", async () => {
    selectRows = [];

    expect(
      await UserService.findByEmail("missing@example.com"),
    ).toBeUndefined();
  });

  test("rejeita token de verificação ausente ou expirado", async () => {
    expect(await UserService.validateEmail("invalid-token")).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  test("verifica somente o usuário associado e invalida cache", async () => {
    redisGetDelValues.set(
      redisKeys.emailVerification("valid-token"),
      baseUser.id,
    );
    updateRows = [{ id: baseUser.id }];

    expect(await UserService.validateEmail("valid-token")).toBe(true);
    expect(updatedValues).toEqual({ emailVerified: true });
    expect(redisDel).toHaveBeenCalledWith(redisKeys.user(baseUser.id));
  });

  test("retorna false quando o usuário do token não existe", async () => {
    redisGetDelValues.set(
      redisKeys.emailVerification("orphan-token"),
      "missing",
    );
    updateRows = [];

    expect(await UserService.validateEmail("orphan-token")).toBe(false);
  });

  test("rejeita reset ausente ou expirado", async () => {
    expect(
      await UserService.consumePasswordResetToken("missing-token"),
    ).toBeNull();
  });

  test("rejeita reset que não é mais o token ativo", async () => {
    redisGetDelValues.set(redisKeys.passwordReset("old-token"), baseUser.id);
    redisValues.set(redisKeys.passwordResetByUser(baseUser.id), "new-token");

    expect(await UserService.consumePasswordResetToken("old-token")).toBeNull();
    expect(redisDel).not.toHaveBeenCalled();
  });

  test("consome reset ativo e remove o índice do usuário", async () => {
    redisGetDelValues.set(redisKeys.passwordReset("active-token"), baseUser.id);
    redisValues.set(redisKeys.passwordResetByUser(baseUser.id), "active-token");

    expect(await UserService.consumePasswordResetToken("active-token")).toBe(
      baseUser.id,
    );
    expect(redisDel).toHaveBeenCalledWith(
      redisKeys.passwordResetByUser(baseUser.id),
    );
  });
});
