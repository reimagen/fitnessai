import { getAdminDb } from "@/lib/firebase-admin";

export async function checkFirestore(): Promise<"ok" | "degraded"> {
  try {
    await getAdminDb().collection("_health").limit(1).get();
    return "ok";
  } catch (error) {
    return "degraded";
  }
}

export async function checkAIConfig(): Promise<"ok" | "degraded"> {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? "ok" : "degraded";
}
