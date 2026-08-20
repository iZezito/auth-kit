import { Elysia, t } from "elysia";
import { createClientIpResolver, resolveIdentity } from "./identity";
import { RateLimiterService, validateRule } from "./service";
import type {
  RateLimitContext,
  RateLimitDecision,
  RateLimitPluginOptions,
  RateLimitRule,
  RouteRateLimitConfig,
} from "./types";

const rateLimitErrorSchema = t.Object({
  message: t.String(),
  code: t.Literal(429),
  timestamp: t.String({ format: "date-time" }),
});

const stateKey = Symbol("rate-limit-state");

type InternalContext = RateLimitContext & {
  set: { headers: Record<string, string | number> };
  status: (code: 429, body: unknown) => unknown;
  [stateKey]?: {
    configs: RouteRateLimitConfig[];
    processed: boolean;
  };
};

const rulesFor = (
  config: Exclude<RouteRateLimitConfig, false>,
  options: RateLimitPluginOptions,
) => {
  if (typeof config === "string") {
    const preset = options.presets[config];
    if (!preset) throw new Error(`Unknown rate limit preset: ${config}`);
    return preset.rules;
  }
  const rules =
    config.rules ??
    (config.preset ? options.presets[config.preset]?.rules : undefined);
  if (!rules)
    throw new Error(`Unknown rate limit preset: ${config.preset ?? "missing"}`);
  return rules;
};

const selectRules = (
  configs: RouteRateLimitConfig[],
  options: RateLimitPluginOptions,
) => {
  const globalConfig = configs.find((config) => config === "global");
  const override = [...configs].reverse().find((config) => config !== "global");
  if (override === false) return [];
  if (!override) return globalConfig ? rulesFor(globalConfig, options) : [];
  const overrideRules = rulesFor(override, options);
  if (typeof override === "object" && override.mode === "stack" && globalConfig)
    return [...rulesFor(globalConfig, options), ...overrideRules];
  return overrideRules;
};

const limitingDecision = (decisions: RateLimitDecision[]) =>
  decisions.reduce((selected, current) => {
    if (!current.allowed) return current;
    if (!selected.allowed) return selected;
    return current.remaining / current.limit <
      selected.remaining / selected.limit
      ? current
      : selected;
  });

const setHeaders = (
  context: InternalContext,
  decision: RateLimitDecision,
  legacy: boolean,
) => {
  const resetSeconds = Math.max(0, Math.ceil(decision.resetAfterMs / 1_000));
  context.set.headers["RateLimit-Limit"] = String(decision.limit);
  context.set.headers["RateLimit-Remaining"] = String(decision.remaining);
  context.set.headers["RateLimit-Reset"] = String(resetSeconds);
  if (legacy) {
    context.set.headers["X-RateLimit-Limit"] = String(decision.limit);
    context.set.headers["X-RateLimit-Remaining"] = String(decision.remaining);
    context.set.headers["X-RateLimit-Reset"] = String(
      Math.ceil((Date.now() + decision.resetAfterMs) / 1_000),
    );
  }
  if (!decision.allowed)
    context.set.headers["Retry-After"] = String(
      Math.max(1, Math.ceil(decision.retryAfterMs / 1_000)),
    );
};

export const createRateLimitPlugin = (options: RateLimitPluginOptions) => {
  const service = new RateLimiterService(options);
  const getClientIp = createClientIpResolver(options.trustedProxies);

  for (const preset of Object.values(options.presets))
    for (const rule of preset.rules) validateRule(rule);

  const enforce = async (rawContext: unknown) => {
    if (options.enabled === false) return;
    const context = rawContext as InternalContext;
    const state = context[stateKey];
    if (!state || state.processed) return;
    state.processed = true;
    const rules = selectRules(state.configs, options);
    if (!rules.length) return;

    const clientIp = getClientIp(context);
    const decisions: RateLimitDecision[] = [];
    for (const rule of rules) {
      const components = await resolveIdentity(
        rule.identity,
        context,
        clientIp,
      );
      const cost =
        typeof rule.cost === "function"
          ? await rule.cost(context)
          : (rule.cost ?? 1);
      const decision = await service.consume(rule, components, cost);
      options.onDecision?.(decision);
      if (decision.bypassed) {
        if (decision.bypassed === "circuit-open") options.onBypass?.(decision);
        continue;
      }
      decisions.push(decision);
      if (!decision.allowed) {
        options.onLimited?.(decision);
        setHeaders(context, decision, options.includeLegacyHeaders !== false);
        context.set.headers["Cache-Control"] = "no-store";
        return context.status(429, {
          message: "Too many requests. Please try again later.",
          code: 429,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (decisions.length)
      setHeaders(
        context,
        limitingDecision(decisions),
        options.includeLegacyHeaders !== false,
      );
  };

  const plugin = new Elysia({ name: "custom-rate-limit", seed: options.prefix })
    .decorate("rateLimiter", service)
    .macro({
      rateLimit: (config: RouteRateLimitConfig) => {
        if (config && typeof config === "object" && config.rules)
          for (const rule of config.rules) validateRule(rule);
        if (typeof config === "string" && !options.presets[config])
          throw new Error(`Unknown rate limit preset: ${config}`);
        if (
          config &&
          typeof config === "object" &&
          config.preset &&
          !options.presets[config.preset]
        )
          throw new Error(`Unknown rate limit preset: ${config.preset}`);

        return {
          transform(rawContext: unknown) {
            const context = rawContext as InternalContext;
            const state = (context[stateKey] ??= {
              configs: [],
              processed: false,
            });
            state.configs.push(config);
          },
          beforeHandle: enforce,
          response: { 429: rateLimitErrorSchema },
        };
      },
    });

  return Object.assign(plugin, { rateLimiter: service });
};

export type { RateLimitRule };
