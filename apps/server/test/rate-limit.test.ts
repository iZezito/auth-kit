import { describe, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";
import {
  createClientIpResolver,
  hashIdentity,
} from "@server/plugin/rate-limit/identity";
import { createRateLimitPlugin } from "@server/plugin/rate-limit/plugin";
import { RateLimiterService } from "@server/plugin/rate-limit/service";
import {
  FIXED_WINDOW_SCRIPT,
  SLIDING_WINDOW_SCRIPT,
  TOKEN_BUCKET_SCRIPT,
} from "@server/plugin/rate-limit/scripts";
import type {
  RateLimitPluginOptions,
  RateLimitRedis,
  RateLimitRule,
} from "@server/plugin/rate-limit/types";

const globalRule: RateLimitRule = {
  name: "test-global",
  identity: "ip",
  algorithm: {
    algorithm: "token-bucket",
    capacity: 10,
    refillTokens: 10,
    refillIntervalMs: 60_000,
  },
};

const strictRule: RateLimitRule = {
  name: "test-strict",
  identity: "ip-email",
  algorithm: {
    algorithm: "sliding-window",
    limit: 2,
    windowMs: 60_000,
  },
};

const createRedis = (responses: unknown[] = [[1, 10, 9, 1_000, 0, 0]]) => {
  const evalMock = mock(
    async (..._args: Array<string | number>) =>
      responses.shift() ?? [1, 10, 9, 1_000, 0, 0],
  );
  const delMock = mock(async () => 1);
  const setMock = mock(async () => "OK");
  return {
    client: { eval: evalMock, del: delMock, set: setMock } as RateLimitRedis,
    evalMock,
    delMock,
    setMock,
  };
};

const options = (redis: RateLimitRedis): RateLimitPluginOptions => ({
  redis,
  enabled: true,
  secret: "rate-limit-test-secret-with-32-characters",
  presets: {
    global: { rules: [globalRule] },
    strict: { rules: [strictRule] },
  },
  commandTimeoutMs: 100,
});

describe("identidade do rate limiter", () => {
  test("ignora forwarded headers enviados por um peer não confiável", () => {
    const resolveIp = createClientIpResolver(["10.0.0.0/8"]);
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "198.51.100.10" },
    });

    expect(
      resolveIp({
        request,
        server: { requestIP: () => ({ address: "203.0.113.5" }) },
      }),
    ).toBe("203.0.113.5");
  });

  test("percorre da direita para a esquerda apenas entre proxies confiáveis", () => {
    const resolveIp = createClientIpResolver(["10.0.0.0/8"]);
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "198.51.100.10, 10.0.0.2" },
    });

    expect(
      resolveIp({
        request,
        server: { requestIP: () => ({ address: "10.0.0.3" }) },
      }),
    ).toBe("198.51.100.10");
  });

  test("não inclui dados sensíveis no hash", () => {
    const digest = hashIdentity("secret", [
      "198.51.100.10",
      "user@example.com",
    ]);

    expect(digest).toHaveLength(64);
    expect(digest).not.toContain("198.51.100.10");
    expect(digest).not.toContain("user@example.com");
  });
});

describe("serviço de rate limiting", () => {
  test.each([
    [globalRule, TOKEN_BUCKET_SCRIPT],
    [strictRule, SLIDING_WINDOW_SCRIPT],
    [
      {
        ...strictRule,
        name: "fixed",
        algorithm: { algorithm: "fixed-window", limit: 3, windowMs: 1_000 },
      } as RateLimitRule,
      FIXED_WINDOW_SCRIPT,
    ],
  ])("executa o script atômico de cada algoritmo", async (rule, script) => {
    const redis = createRedis();
    const service = new RateLimiterService(options(redis.client));

    const decision = await service.consume(rule, ["identity"]);

    expect(decision.allowed).toBe(true);
    expect(redis.evalMock).toHaveBeenCalledTimes(1);
    expect(redis.evalMock.mock.calls[0]?.[0]).toBe(script);
  });

  test("abre o circuito e mantém fail-open após falhas consecutivas", async () => {
    const evalMock = mock(async () => {
      throw new Error("redis unavailable");
    });
    const client = {
      eval: evalMock,
      del: mock(async () => 0),
      set: mock(async () => "OK"),
    } as RateLimitRedis;
    const service = new RateLimiterService({
      ...options(client),
      circuitBreaker: { failureThreshold: 2, cooldownMs: 5_000 },
    });

    expect((await service.consume(globalRule, ["a"])).bypassed).toBe(
      "redis-error",
    );
    expect((await service.consume(globalRule, ["a"])).bypassed).toBe(
      "redis-error",
    );
    expect((await service.consume(globalRule, ["a"])).bypassed).toBe(
      "circuit-open",
    );
    expect(evalMock).toHaveBeenCalledTimes(2);
  });

  test("administra reset e bloqueio sem usar a identidade em texto puro", async () => {
    const redis = createRedis();
    const service = new RateLimiterService(options(redis.client));

    await service.reset(globalRule, ["user@example.com"]);
    await service.block(["user@example.com"], 30_000);
    await service.unblock(["user@example.com"]);

    const serializedCalls = JSON.stringify([
      redis.delMock.mock.calls,
      redis.setMock.mock.calls,
    ]);
    expect(serializedCalls).not.toContain("user@example.com");
    expect(redis.setMock).toHaveBeenCalledTimes(1);
    expect(redis.delMock).toHaveBeenCalledTimes(2);
  });
});

describe("macro Elysia", () => {
  test("override substitui o global e retorna ApiError com headers", async () => {
    const redis = createRedis([[0, 2, 0, 5_000, 5_000, 0]]);
    const plugin = createRateLimitPlugin(options(redis.client));
    const app = new Elysia()
      .use(plugin)
      .guard({ rateLimit: "global" }, (guarded) =>
        guarded.post("/login", () => ({ ok: true }), {
          rateLimit: "strict",
        }),
      );

    const response = await app.handle(
      new Request("http://localhost/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toMatchObject({
      message: "Too many requests. Please try again later.",
      code: 429,
    });
    expect(Date.parse(body.timestamp)).not.toBeNaN();
    expect(response.headers.get("ratelimit-limit")).toBe("2");
    expect(response.headers.get("ratelimit-remaining")).toBe("0");
    expect(response.headers.get("retry-after")).toBe("5");
    expect(response.headers.get("x-ratelimit-limit")).toBe("2");
    expect(redis.evalMock).toHaveBeenCalledTimes(1);
    expect(String(redis.evalMock.mock.calls[0]?.[2])).toContain("test-strict");
  });

  test("stack executa o preset global e o override", async () => {
    const redis = createRedis([
      [1, 10, 9, 1_000, 0, 0],
      [1, 2, 1, 10_000, 0, 0],
    ]);
    const plugin = createRateLimitPlugin(options(redis.client));
    const app = new Elysia()
      .use(plugin)
      .guard({ rateLimit: "global" }, (guarded) =>
        guarded.get("/stack", () => "ok", {
          rateLimit: { preset: "strict", mode: "stack" },
        }),
      );

    const response = await app.handle(new Request("http://localhost/stack"));

    expect(response.status).toBe(200);
    expect(redis.evalMock).toHaveBeenCalledTimes(2);
    expect(response.headers.get("ratelimit-limit")).toBe("2");
  });

  test("false desativa o preset global para uma rota", async () => {
    const redis = createRedis();
    const plugin = createRateLimitPlugin(options(redis.client));
    const app = new Elysia()
      .use(plugin)
      .guard({ rateLimit: "global" }, (guarded) =>
        guarded.get("/health", () => "ok", { rateLimit: false }),
      );

    const response = await app.handle(new Request("http://localhost/health"));

    expect(response.status).toBe(200);
    expect(redis.evalMock).not.toHaveBeenCalled();
  });
});
