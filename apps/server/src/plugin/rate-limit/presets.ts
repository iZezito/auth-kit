import type { RateLimitPreset } from "./types";

const minute = 60_000;

export const rateLimitPresets = {
  global: {
    rules: [
      {
        name: "global-ip",
        identity: "ip",
        algorithm: {
          algorithm: "token-bucket",
          capacity: 120,
          refillTokens: 120,
          refillIntervalMs: minute,
        },
      },
    ],
  },
  login: {
    rules: [
      {
        name: "login-ip-email",
        identity: "ip-email",
        algorithm: {
          algorithm: "sliding-window",
          limit: 5,
          windowMs: minute,
        },
      },
      {
        name: "login-ip",
        identity: "ip",
        algorithm: {
          algorithm: "sliding-window",
          limit: 30,
          windowMs: 10 * minute,
        },
      },
    ],
  },
  signup: {
    rules: [
      {
        name: "signup-ip",
        identity: "ip",
        algorithm: {
          algorithm: "fixed-window",
          limit: 3,
          windowMs: 60 * minute,
        },
      },
    ],
  },
  forgotPassword: {
    rules: [
      {
        name: "forgot-password-ip-email",
        identity: "ip-email",
        algorithm: {
          algorithm: "sliding-window",
          limit: 3,
          windowMs: 15 * minute,
        },
      },
      {
        name: "forgot-password-ip",
        identity: "ip",
        algorithm: {
          algorithm: "fixed-window",
          limit: 10,
          windowMs: 60 * minute,
        },
      },
    ],
  },
  resetPassword: {
    rules: [
      {
        name: "reset-password-ip-token",
        identity: "ip-token",
        algorithm: {
          algorithm: "sliding-window",
          limit: 5,
          windowMs: 15 * minute,
        },
      },
      {
        name: "reset-password-ip",
        identity: "ip",
        algorithm: {
          algorithm: "fixed-window",
          limit: 20,
          windowMs: 60 * minute,
        },
      },
    ],
  },
  verifyEmail: {
    rules: [
      {
        name: "verify-email-ip",
        identity: "ip",
        algorithm: {
          algorithm: "fixed-window",
          limit: 10,
          windowMs: 10 * minute,
        },
      },
    ],
  },
  oauth: {
    rules: [
      {
        name: "oauth-ip",
        identity: "ip",
        algorithm: {
          algorithm: "token-bucket",
          capacity: 10,
          refillTokens: 1,
          refillIntervalMs: minute,
        },
      },
    ],
  },
  oauthCallback: {
    rules: [
      {
        name: "oauth-callback-ip-state",
        identity: "ip-state",
        algorithm: {
          algorithm: "token-bucket",
          capacity: 10,
          refillTokens: 1,
          refillIntervalMs: minute,
        },
      },
    ],
  },
  authenticatedMutation: {
    rules: [
      {
        name: "authenticated-mutation-ip-token",
        identity: "ip-auth",
        algorithm: {
          algorithm: "token-bucket",
          capacity: 30,
          refillTokens: 30,
          refillIntervalMs: minute,
        },
      },
    ],
  },
} as const satisfies Record<string, RateLimitPreset>;

export type RateLimitPresetName = keyof typeof rateLimitPresets;
