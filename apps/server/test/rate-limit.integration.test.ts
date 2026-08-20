import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import Redis from "ioredis";
import { RateLimiterService } from "@server/plugin/rate-limit/service";
import type {
  RateLimitRedis,
  RateLimitRule,
} from "@server/plugin/rate-limit/types";

const runIntegration = Bun.env.RATE_LIMIT_INTEGRATION === "true";
const integrationTest = runIntegration ? test : test.skip;
const redis = new Redis(Bun.env.REDIS_URL || "redis://localhost:6379", {
  lazyConnect: !runIntegration,
  maxRetriesPerRequest: 1,
});
redis.on("error", () => undefined);

const rules: RateLimitRule[] = [
  {
    name: "integration-token-bucket",
    identity: "ip",
    algorithm: {
      algorithm: "token-bucket",
      capacity: 5,
      refillTokens: 5,
      refillIntervalMs: 60_000,
    },
  },
  {
    name: "integration-sliding-window",
    identity: "ip",
    algorithm: { algorithm: "sliding-window", limit: 5, windowMs: 60_000 },
  },
  {
    name: "integration-fixed-window",
    identity: "ip",
    algorithm: { algorithm: "fixed-window", limit: 5, windowMs: 60_000 },
  },
];

const service = new RateLimiterService({
  redis: redis as unknown as RateLimitRedis,
  enabled: true,
  secret: "rate-limit-integration-secret-with-32-characters",
  prefix: `auth-kit:rate-limit:integration:${randomUUID()}`,
  presets: { integration: { rules } },
  commandTimeoutMs: 1_000,
});

afterAll(async () => {
  if (runIntegration) await redis.quit();
});

describe("rate limiter com Redis real", () => {
  for (const rule of rules) {
    integrationTest(
      `${rule.algorithm.algorithm} mantém o limite sob concorrência`,
      async () => {
        const identity = [randomUUID()];
        const decisions = await Promise.all(
          Array.from({ length: 10 }, () => service.consume(rule, identity)),
        );

        expect(decisions.filter((decision) => decision.allowed)).toHaveLength(
          5,
        );
        expect(decisions.filter((decision) => !decision.allowed)).toHaveLength(
          5,
        );
        expect((await service.inspect(rule, identity)).remaining).toBe(0);
        await service.reset(rule, identity);
      },
    );
  }
});
