import Redis from "ioredis";

export const redis = new Redis(Bun.env.REDIS_URL || "redis://localhost:6379", {
  lazyConnect: Bun.env.NODE_ENV === "test",
});

export const redisKeys = {
  user: (userId: string) => `user:${userId}`,
  emailVerification: (token: string) => `auth:email-verification:${token}`,
  passwordReset: (token: string) => `auth:password-reset:${token}`,
  passwordResetByUser: (userId: string) => `auth:password-reset:user:${userId}`,
  twoFactor: (userId: string) => `auth:two-factor:${userId}`,
} as const;

export const redisTtl = {
  userCache: 60 * 15,
  emailVerification: 60 * 60 * 24,
  passwordReset: 60 * 60,
  twoFactor: 60 * 60 * 2,
} as const;
