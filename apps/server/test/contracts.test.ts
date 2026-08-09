import { afterAll, describe, expect, test } from "bun:test";
import {
  BadCredentialsError,
  CustomError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/error";
import { redis, redisKeys, redisTtl } from "@/lib/redis";
import {
  renderOtpEmail,
  renderResetPasswordEmail,
  renderVerifyEmail,
} from "@/emails/render";

afterAll(() => redis.disconnect());

describe("erros da aplicação", () => {
  test.each([
    [new CustomError("internal"), 500, "internal"],
    [new UnauthorizedError("unauthorized"), 401, "unauthorized"],
    [new ForbiddenError("forbidden"), 403, "forbidden"],
    [new NotFoundError("missing"), 404, "missing"],
  ])("%# expõe status e mensagem", (error, status, message) => {
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(status);
    expect(error.message).toBe(message);
  });

  test("BadCredentialsError usa mensagem segura por padrão", () => {
    const error = new BadCredentialsError();

    expect(error.status).toBe(401);
    expect(error.message).toContain("Invalid credentials");
    expect(error.message).not.toContain("password is wrong");
  });

  test("BadCredentialsError aceita mensagem customizada", () => {
    expect(new BadCredentialsError("custom").message).toBe("custom");
  });
});

describe("contratos do Redis", () => {
  test("gera chaves isoladas por finalidade", () => {
    expect(redisKeys.user("u1")).toBe("user:u1");
    expect(redisKeys.emailVerification("token")).toBe(
      "auth:email-verification:token",
    );
    expect(redisKeys.passwordReset("token")).toBe("auth:password-reset:token");
    expect(redisKeys.passwordResetByUser("u1")).toBe(
      "auth:password-reset:user:u1",
    );
    expect(redisKeys.twoFactor("u1")).toBe("auth:two-factor:u1");
  });

  test("mantém os TTLs esperados em segundos", () => {
    expect(redisTtl.userCache).toBe(900);
    expect(redisTtl.emailVerification).toBe(86_400);
    expect(redisTtl.passwordReset).toBe(3_600);
    expect(redisTtl.twoFactor).toBe(7_200);
  });
});

describe("templates de e-mail", () => {
  test("renderiza o código e a validade do 2FA", () => {
    const html = renderOtpEmail("123456");

    expect(html).toContain("123456");
    expect(html).toContain("valid for 2 hours");
  });

  test("renderiza o link e a validade da redefinição de senha", () => {
    const url = "https://client.test/reset-password?token=reset-token";
    const html = renderResetPasswordEmail(url);

    expect(html).toContain(url);
    expect(html).toContain("expire in 1 hour");
  });

  test("renderiza o link de verificação de e-mail", () => {
    const url = "https://client.test/verify?token=verification-token";

    expect(renderVerifyEmail(url)).toContain(url);
  });
});
