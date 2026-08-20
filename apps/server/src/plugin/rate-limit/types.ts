export type RateLimitIdentityStrategy =
  | "ip"
  | "ip-email"
  | "ip-token"
  | "ip-auth"
  | "ip-state";

export type RateLimitContext = {
  request: Request;
  body?: unknown;
  query?: Record<string, unknown>;
  cookie?: Record<string, { value?: unknown } | undefined>;
  server?: {
    requestIP(request: Request): { address: string } | null;
  } | null;
};

export type RateLimitKeyResolver = (
  context: RateLimitContext,
  clientIp: string,
) => string[] | Promise<string[]>;

export type TokenBucketConfig = {
  algorithm: "token-bucket";
  capacity: number;
  refillTokens: number;
  refillIntervalMs: number;
};

export type SlidingWindowConfig = {
  algorithm: "sliding-window";
  limit: number;
  windowMs: number;
};

export type FixedWindowConfig = {
  algorithm: "fixed-window";
  limit: number;
  windowMs: number;
};

export type RateLimitAlgorithmConfig =
  | TokenBucketConfig
  | SlidingWindowConfig
  | FixedWindowConfig;

export type RateLimitRule = {
  name: string;
  algorithm: RateLimitAlgorithmConfig;
  identity: RateLimitIdentityStrategy | RateLimitKeyResolver;
  cost?: number | ((context: RateLimitContext) => number | Promise<number>);
};

export type RateLimitPreset = {
  rules: RateLimitRule[];
};

export type RouteRateLimitConfig =
  | false
  | string
  | {
      preset?: string;
      rules?: RateLimitRule[];
      mode?: "replace" | "stack";
    };

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAfterMs: number;
  retryAfterMs: number;
  rule: string;
  identityHash: string;
  bypassed?: "disabled" | "redis-error" | "circuit-open";
};

export type RateLimitRedis = {
  eval(
    script: string,
    numberOfKeys: number,
    ...args: Array<string | number>
  ): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  set(
    key: string,
    value: string,
    mode: "PX",
    durationMs: number,
  ): Promise<unknown>;
};

export type RateLimitPluginOptions = {
  redis: RateLimitRedis;
  presets: Record<string, RateLimitPreset>;
  enabled?: boolean;
  prefix?: string;
  secret: string;
  trustedProxies?: string[];
  commandTimeoutMs?: number;
  circuitBreaker?: {
    failureThreshold?: number;
    cooldownMs?: number;
  };
  includeLegacyHeaders?: boolean;
  onDecision?: (decision: RateLimitDecision) => void;
  onLimited?: (decision: RateLimitDecision) => void;
  onBypass?: (decision: RateLimitDecision, error?: unknown) => void;
};

export type RateLimitInspection = {
  blocked: boolean;
  remaining: number;
  resetAfterMs: number;
};
