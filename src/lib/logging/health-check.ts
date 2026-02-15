import { getAdminDb } from "@/lib/firebase-admin";
import { Redis } from "@upstash/redis";
import { getActiveExercises } from "@/lib/exercise-registry.server";
import { getImbalanceConfig } from "@/lib/imbalance-config.server";
import { validateImbalanceConfigExercises } from "@/analysis/analysis.config";
import type { ImbalanceConfigValidationIssue } from "@/analysis/analysis.config";

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

export async function checkAnalysisConfig(): Promise<"ok" | "degraded"> {
  const details = await getAnalysisConfigHealthDetails();
  return details.status;
}

export type AnalysisConfigHealthDetails = {
  status: "ok" | "degraded";
  mismatchCount: number;
  sampleMismatches: ImbalanceConfigValidationIssue[];
};

export type ImbalanceConfigHealthDetails = {
  status: "ok" | "degraded";
  source: "firestore" | "fallback" | "unknown";
  version: number | null;
  validationIssueCount: number;
};

export async function getAnalysisConfigHealthDetails(): Promise<AnalysisConfigHealthDetails> {
  try {
    const exercises = await getActiveExercises();
    const issues = validateImbalanceConfigExercises(exercises);
    if (issues.length === 0) {
      return {
        status: "ok",
        mismatchCount: 0,
        sampleMismatches: [],
      };
    }

    return {
      status: "degraded",
      mismatchCount: issues.length,
      sampleMismatches: issues.slice(0, 3),
    };
  } catch {
    return {
      status: "degraded",
      mismatchCount: 0,
      sampleMismatches: [],
    };
  }
}

export async function checkImbalanceConfig(): Promise<"ok" | "degraded"> {
  const details = await getImbalanceConfigHealthDetails();
  return details.status;
}

export async function getImbalanceConfigHealthDetails(): Promise<ImbalanceConfigHealthDetails> {
  try {
    const result = await getImbalanceConfig();
    const status =
      result.source === "firestore" && result.validationIssueCount === 0 ? "ok" : "degraded";

    return {
      status,
      source: result.source,
      version: result.version,
      validationIssueCount: result.validationIssueCount,
    };
  } catch {
    return {
      status: "degraded",
      source: "unknown",
      version: null,
      validationIssueCount: 0,
    };
  }
}
