export const TOKEN_BUCKET_SCRIPT = `
local blockedTtl = redis.call('PTTL', KEYS[2])
if blockedTtl > 0 then
  return {0, 0, 0, blockedTtl, blockedTtl, 1}
end

local time = redis.call('TIME')
local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
local capacity = tonumber(ARGV[1])
local refillTokens = tonumber(ARGV[2])
local refillInterval = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local refillPerMs = refillTokens / refillInterval
local values = redis.call('HMGET', KEYS[1], 'tokens', 'timestamp')
local tokens = tonumber(values[1]) or capacity
local timestamp = tonumber(values[2]) or now

tokens = math.min(capacity, tokens + math.max(0, now - timestamp) * refillPerMs)
local allowed = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'timestamp', now)
redis.call('PEXPIRE', KEYS[1], math.ceil((capacity / refillPerMs) * 2))

local remaining = math.max(0, math.floor(tokens))
local reset = math.ceil((capacity - tokens) / refillPerMs)
local retry = 0
if allowed == 0 then retry = math.ceil((cost - tokens) / refillPerMs) end
return {allowed, capacity, remaining, reset, retry, 0}
`;

export const SLIDING_WINDOW_SCRIPT = `
local blockedTtl = redis.call('PTTL', KEYS[2])
if blockedTtl > 0 then
  return {0, 0, 0, blockedTtl, blockedTtl, 1}
end

local time = redis.call('TIME')
local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])
local requestId = ARGV[4]

redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - window)
local count = redis.call('ZCARD', KEYS[1])
local allowed = 0
if count + cost <= limit then
  for i = 1, cost do
    redis.call('ZADD', KEYS[1], now, requestId .. ':' .. i)
  end
  count = count + cost
  allowed = 1
end
redis.call('PEXPIRE', KEYS[1], window * 2)

local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
local reset = window
if oldest[2] then reset = math.max(0, tonumber(oldest[2]) + window - now) end
local retry = 0
if allowed == 0 then retry = reset end
return {allowed, limit, math.max(0, limit - count), reset, retry, 0}
`;

export const FIXED_WINDOW_SCRIPT = `
local blockedTtl = redis.call('PTTL', KEYS[2])
if blockedTtl > 0 then
  return {0, 0, 0, blockedTtl, blockedTtl, 1}
end

local time = redis.call('TIME')
local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])
local bucket = math.floor(now / window)
local values = redis.call('HMGET', KEYS[1], 'bucket', 'count')
local storedBucket = tonumber(values[1])
local count = tonumber(values[2]) or 0

if storedBucket ~= bucket then count = 0 end
local allowed = 0
if count + cost <= limit then
  count = count + cost
  allowed = 1
end

local reset = ((bucket + 1) * window) - now
redis.call('HSET', KEYS[1], 'bucket', bucket, 'count', count)
redis.call('PEXPIRE', KEYS[1], reset + window)
local retry = 0
if allowed == 0 then retry = reset end
return {allowed, limit, math.max(0, limit - count), reset, retry, 0}
`;

export const INSPECT_SCRIPT = `
local blockedTtl = redis.call('PTTL', KEYS[2])
local time = redis.call('TIME')
local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
local algorithm = ARGV[1]

if algorithm == 'token-bucket' then
  local capacity = tonumber(ARGV[2])
  local refillPerMs = tonumber(ARGV[3]) / tonumber(ARGV[4])
  local values = redis.call('HMGET', KEYS[1], 'tokens', 'timestamp')
  local tokens = tonumber(values[1]) or capacity
  local timestamp = tonumber(values[2]) or now
  tokens = math.min(capacity, tokens + math.max(0, now - timestamp) * refillPerMs)
  return {blockedTtl > 0 and 1 or 0, math.floor(tokens), math.ceil((capacity - tokens) / refillPerMs)}
end

if algorithm == 'sliding-window' then
  local limit = tonumber(ARGV[2])
  local window = tonumber(ARGV[3])
  redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - window)
  local count = redis.call('ZCARD', KEYS[1])
  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  local reset = 0
  if oldest[2] then reset = math.max(0, tonumber(oldest[2]) + window - now) end
  return {blockedTtl > 0 and 1 or 0, math.max(0, limit - count), reset}
end

local limit = tonumber(ARGV[2])
local window = tonumber(ARGV[3])
local bucket = math.floor(now / window)
local values = redis.call('HMGET', KEYS[1], 'bucket', 'count')
local count = 0
if tonumber(values[1]) == bucket then count = tonumber(values[2]) or 0 end
return {blockedTtl > 0 and 1 or 0, math.max(0, limit - count), ((bucket + 1) * window) - now}
`;
