import { format } from "date-fns";
import { getUserProfile } from "@/lib/firestore-server";
import { getRateLimit, getFeatureName, type RateLimitFeature } from "@/lib/rate-limit-config";

export const DAILY_LIMIT_REACHED_PREFIX = "DAILY_LIMIT_REACHED:";

export async function checkRateLimit(
  userId: string,
  feature: RateLimitFeature
): Promise<{ allowed: boolean; error?: string }> {
  if (!userId) {
    return { allowed: false, error: "User not authenticated." };
  }

  const userProfile = await getUserProfile(userId);
  const today = format(new Date(), "yyyy-MM-dd");
  const usage = userProfile?.aiUsage?.[feature];
  const limit = getRateLimit(feature);

  if (usage && usage.date === today && usage.count >= limit) {
    const featureName = getFeatureName(feature);
    return {
      allowed: false,
      error: `${DAILY_LIMIT_REACHED_PREFIX} You have reached your daily limit of ${limit} ${featureName}.`,
    };
  }

  return { allowed: true };
}
