import Redis from "ioredis";
import { createRateLimitPlugin } from "./plugin";
import { rateLimitPresets } from "./presets";
import type { RateLimitRedis } from "./types";

const enabled =
  Bun.env.RATE_LIMIT_ENABLED !== "false" && Bun.env.NODE_ENV !== "test";
const secret = Bun.env.RATE_LIMIT_KEY_SECRET || Bun.env.JWT_SECRET;

if (!secret) throw new Error("RATE_LIMIT_KEY_SECRET or JWT_SECRET is required");

const rateLimitRedis = new Redis(
  Bun.env.REDIS_URL || "redis://localhost:6379",
  {
    lazyConnect: !enabled,
    commandTimeout: 100,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  },
);

rateLimitRedis.on("error", () => undefined);

const log = (event: string, details: Record<string, unknown>) =>
  console.warn(JSON.stringify({ event, ...details }));

export const rateLimitPlugin = createRateLimitPlugin({
  redis: rateLimitRedis as unknown as RateLimitRedis,
  presets: rateLimitPresets,
  enabled,
  prefix: Bun.env.RATE_LIMIT_PREFIX || "auth-kit:rate-limit:v1",
  secret,
  trustedProxies: (Bun.env.RATE_LIMIT_TRUSTED_PROXIES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  includeLegacyHeaders: true,
  onLimited: (decision) =>
    log("rate_limit.exceeded", {
      rule: decision.rule,
      identity: decision.identityHash.slice(0, 12),
      retryAfterMs: decision.retryAfterMs,
    }),
  onBypass: (decision, error) =>
    log("rate_limit.bypass", {
      rule: decision.rule,
      reason: decision.bypassed,
      error: error instanceof Error ? error.message : undefined,
    }),
});

export { createRateLimitPlugin } from "./plugin";
export { RateLimiterService } from "./service";
export { rateLimitPresets } from "./presets";
export type { RateLimitPresetName } from "./presets";
export type * from "./types";
