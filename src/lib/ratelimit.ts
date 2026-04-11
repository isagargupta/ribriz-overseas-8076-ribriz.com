import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Returns null when Redis env vars are not configured (dev / missing setup).
// Routes treat null as "no rate limiting" so the app stays functional.
function makeRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const redis = makeRedis();

// 5 OTP requests per 10 minutes per email address
export const otpRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "10 m"),
      prefix: "rl:otp",
    })
  : null;

// 200 AI chat messages per hour per user
export const chatRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(200, "1 h"),
      prefix: "rl:chat",
    })
  : null;
