import { createHmac } from "node:crypto";
import { BlockList, isIP } from "node:net";
import type {
  RateLimitContext,
  RateLimitIdentityStrategy,
  RateLimitKeyResolver,
} from "./types";

const cleanIp = (value: string) => {
  let ip = value.trim().replace(/^"|"$/g, "");
  if (ip.toLowerCase() === "unknown" || ip.startsWith("_")) return "unknown";
  if (ip.startsWith("[")) ip = ip.slice(1, ip.indexOf("]"));
  else if (ip.split(":").length === 2 && ip.includes("."))
    ip = ip.split(":")[0];
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return isIP(ip) ? ip : "unknown";
};

const parseForwarded = (header: string) =>
  header
    .split(",")
    .map((entry) => entry.match(/(?:^|;)\s*for=("?[^;]+"?)/i)?.[1])
    .filter((entry): entry is string => Boolean(entry))
    .map(cleanIp)
    .filter((ip) => ip !== "unknown");

const parseTrustedProxies = (entries: string[]) => {
  const list = new BlockList();
  for (const entry of entries) {
    const [address, prefix] = entry.trim().split("/");
    const type = isIP(address);
    if (!type) throw new Error(`Invalid trusted proxy address: ${entry}`);
    if (prefix === undefined)
      list.addAddress(address, type === 4 ? "ipv4" : "ipv6");
    else {
      const size = Number(prefix);
      const maximum = type === 4 ? 32 : 128;
      if (!Number.isInteger(size) || size < 0 || size > maximum)
        throw new Error(`Invalid trusted proxy CIDR: ${entry}`);
      list.addSubnet(address, size, type === 4 ? "ipv4" : "ipv6");
    }
  }
  return (ip: string) => {
    const type = isIP(ip);
    return type > 0 && list.check(ip, type === 4 ? "ipv4" : "ipv6");
  };
};

export const createClientIpResolver = (trustedProxies: string[] = []) => {
  const isTrusted = parseTrustedProxies(trustedProxies);

  return (context: RateLimitContext) => {
    const peer = cleanIp(
      context.server?.requestIP(context.request)?.address ?? "unknown",
    );
    if (peer === "unknown" || !isTrusted(peer)) return peer;

    const forwarded = context.request.headers.get("forwarded");
    const chain = forwarded
      ? parseForwarded(forwarded)
      : (context.request.headers.get("x-forwarded-for") ?? "")
          .split(",")
          .map(cleanIp)
          .filter((ip) => ip !== "unknown");

    let client = peer;
    for (let index = chain.length - 1; index >= 0 && isTrusted(client); index--)
      client = chain[index];
    return client;
  };
};

const bodyValue = (context: RateLimitContext, field: string) => {
  if (!context.body || typeof context.body !== "object") return "missing";
  const value = (context.body as Record<string, unknown>)[field];
  return typeof value === "string" && value.length ? value : "missing";
};

const queryValue = (context: RateLimitContext, field: string) => {
  const value = context.query?.[field];
  return typeof value === "string" && value.length ? value : "missing";
};

const authToken = (context: RateLimitContext) => {
  const authorization = context.request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer "))
    return authorization.slice(7);
  const cookieToken = context.cookie?.auth?.value;
  if (typeof cookieToken === "string" && cookieToken.length) return cookieToken;
  const rawCookie = context.request.headers.get("cookie") ?? "";
  const match = rawCookie.match(/(?:^|;\s*)auth=([^;]+)/);
  if (!match?.[1]) return "missing";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "missing";
  }
};

export const resolveIdentity = async (
  identity: RateLimitIdentityStrategy | RateLimitKeyResolver,
  context: RateLimitContext,
  clientIp: string,
) => {
  if (typeof identity === "function") return identity(context, clientIp);
  if (identity === "ip") return [clientIp];
  if (identity === "ip-email")
    return [clientIp, bodyValue(context, "email").trim().toLowerCase()];
  if (identity === "ip-token")
    return [
      clientIp,
      bodyValue(context, "token") !== "missing"
        ? bodyValue(context, "token")
        : queryValue(context, "token"),
    ];
  if (identity === "ip-state") return [clientIp, queryValue(context, "state")];
  return [clientIp, authToken(context)];
};

export const hashIdentity = (secret: string, components: string[]) =>
  createHmac("sha256", secret)
    .update(JSON.stringify(components.map((value) => String(value))))
    .digest("hex");
