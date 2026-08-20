import { randomUUID } from "node:crypto";
import { hashIdentity } from "./identity";
import {
  FIXED_WINDOW_SCRIPT,
  INSPECT_SCRIPT,
  SLIDING_WINDOW_SCRIPT,
  TOKEN_BUCKET_SCRIPT,
} from "./scripts";
import type {
  RateLimitDecision,
  RateLimitInspection,
  RateLimitPluginOptions,
  RateLimitRule,
} from "./types";

const positiveInteger = (value: number, label: string) => {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`${label} must be a positive integer`);
};

export const validateRule = (rule: RateLimitRule) => {
  if (!rule.name.trim())
    throw new Error("Rate limit rule name cannot be empty");
  const config = rule.algorithm;
  if (config.algorithm === "token-bucket") {
    positiveInteger(config.capacity, `${rule.name}.capacity`);
    positiveInteger(config.refillTokens, `${rule.name}.refillTokens`);
    positiveInteger(config.refillIntervalMs, `${rule.name}.refillIntervalMs`);
  } else {
    positiveInteger(config.limit, `${rule.name}.limit`);
    positiveInteger(config.windowMs, `${rule.name}.windowMs`);
  }
};

const ruleLimit = (rule: RateLimitRule) =>
  rule.algorithm.algorithm === "token-bucket"
    ? rule.algorithm.capacity
    : rule.algorithm.limit;

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Rate limit Redis command timed out")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export class RateLimiterService {
  private readonly prefix: string;
  private readonly timeoutMs: number;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;

  constructor(private readonly options: RateLimitPluginOptions) {
    if (!options.secret.trim())
      throw new Error("Rate limit secret is required");
    this.prefix = options.prefix ?? "auth-kit:rate-limit:v1";
    this.timeoutMs = options.commandTimeoutMs ?? 100;
    this.failureThreshold = options.circuitBreaker?.failureThreshold ?? 3;
    this.cooldownMs = options.circuitBreaker?.cooldownMs ?? 5_000;
    positiveInteger(this.timeoutMs, "commandTimeoutMs");
    positiveInteger(this.failureThreshold, "circuitBreaker.failureThreshold");
    positiveInteger(this.cooldownMs, "circuitBreaker.cooldownMs");

    const names = new Set<string>();
    for (const preset of Object.values(options.presets)) {
      if (!preset.rules.length)
        throw new Error("Rate limit preset cannot be empty");
      for (const rule of preset.rules) {
        validateRule(rule);
        if (names.has(rule.name))
          throw new Error(`Duplicate rate limit rule name: ${rule.name}`);
        names.add(rule.name);
      }
    }
  }

  identityHash(components: string[]) {
    return hashIdentity(this.options.secret, components);
  }

  private keys(rule: RateLimitRule, identityHash: string) {
    const slot = `{${identityHash}}`;
    return {
      counter: `${this.prefix}:${slot}:${rule.name}`,
      block: `${this.prefix}:${slot}:block`,
    };
  }

  private bypass(
    rule: RateLimitRule,
    identityHash: string,
    reason: RateLimitDecision["bypassed"],
  ): RateLimitDecision {
    return {
      allowed: true,
      limit: ruleLimit(rule),
      remaining: ruleLimit(rule),
      resetAfterMs: 0,
      retryAfterMs: 0,
      rule: rule.name,
      identityHash,
      bypassed: reason,
    };
  }

  async consume(
    rule: RateLimitRule,
    components: string[],
    cost = 1,
  ): Promise<RateLimitDecision> {
    positiveInteger(cost, `${rule.name}.cost`);
    const identityHash = this.identityHash(components);
    if (this.options.enabled === false)
      return this.bypass(rule, identityHash, "disabled");
    if (Date.now() < this.circuitOpenUntil)
      return this.bypass(rule, identityHash, "circuit-open");

    const { counter, block } = this.keys(rule, identityHash);
    const config = rule.algorithm;
    let command: Promise<unknown>;

    if (config.algorithm === "token-bucket")
      command = this.options.redis.eval(
        TOKEN_BUCKET_SCRIPT,
        2,
        counter,
        block,
        config.capacity,
        config.refillTokens,
        config.refillIntervalMs,
        cost,
      );
    else if (config.algorithm === "sliding-window")
      command = this.options.redis.eval(
        SLIDING_WINDOW_SCRIPT,
        2,
        counter,
        block,
        config.limit,
        config.windowMs,
        cost,
        randomUUID(),
      );
    else
      command = this.options.redis.eval(
        FIXED_WINDOW_SCRIPT,
        2,
        counter,
        block,
        config.limit,
        config.windowMs,
        cost,
      );

    try {
      const raw = await withTimeout(command, this.timeoutMs);
      if (!Array.isArray(raw) || raw.length < 5)
        throw new Error("Invalid response from rate limit Redis script");
      this.consecutiveFailures = 0;
      this.circuitOpenUntil = 0;
      const blocked = Number(raw[5] ?? 0) === 1;
      return {
        allowed: Number(raw[0]) === 1,
        limit: blocked ? ruleLimit(rule) : Number(raw[1]),
        remaining: Number(raw[2]),
        resetAfterMs: Math.max(0, Number(raw[3])),
        retryAfterMs: Math.max(0, Number(raw[4])),
        rule: rule.name,
        identityHash,
      };
    } catch (error) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.failureThreshold)
        this.circuitOpenUntil = Date.now() + this.cooldownMs;
      const decision = this.bypass(rule, identityHash, "redis-error");
      this.options.onBypass?.(decision, error);
      return decision;
    }
  }

  async inspect(
    rule: RateLimitRule,
    components: string[],
  ): Promise<RateLimitInspection> {
    const identityHash = this.identityHash(components);
    const { counter, block } = this.keys(rule, identityHash);
    const config = rule.algorithm;
    const args: Array<string | number> = [config.algorithm];
    if (config.algorithm === "token-bucket")
      args.push(config.capacity, config.refillTokens, config.refillIntervalMs);
    else args.push(config.limit, config.windowMs);
    const raw = await withTimeout(
      this.options.redis.eval(INSPECT_SCRIPT, 2, counter, block, ...args),
      this.timeoutMs,
    );
    if (!Array.isArray(raw) || raw.length < 3)
      throw new Error("Invalid rate limit inspection response");
    return {
      blocked: Number(raw[0]) === 1,
      remaining: Number(raw[1]),
      resetAfterMs: Math.max(0, Number(raw[2])),
    };
  }

  async reset(rule: RateLimitRule, components: string[]) {
    const identityHash = this.identityHash(components);
    return this.options.redis.del(this.keys(rule, identityHash).counter);
  }

  async block(components: string[], durationMs: number) {
    positiveInteger(durationMs, "block.durationMs");
    const identityHash = this.identityHash(components);
    const key = `${this.prefix}:{${identityHash}}:block`;
    await this.options.redis.set(key, "1", "PX", durationMs);
  }

  async unblock(components: string[]) {
    const identityHash = this.identityHash(components);
    return this.options.redis.del(`${this.prefix}:{${identityHash}}:block`);
  }
}
