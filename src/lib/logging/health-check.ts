import { getAdminDb } from "@/lib/firebase-admin";
import { Redis } from "@upstash/redis";

export async function checkFirestore(): Promise<"ok" | "degraded"> {
  try {
    await getAdminDb().collection("_health").limit(1).get();
    return "ok";
  } catch {
    return "degraded";
  }
}

export async function checkAIConfig(): Promise<"ok" | "degraded"> {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? "ok" : "degraded";
}

export async function checkRedis(): Promise<"ok" | "degraded"> {
  // Redis is optional - health check passes if env vars are missing
  // (rate limiting falls back to in-memory)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return "ok";
  }

  try {
    const redis = Redis.fromEnv();
    await redis.ping();
    return "ok";
  } catch {
    return "degraded";
  }
}
