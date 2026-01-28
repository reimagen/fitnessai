import { format } from "date-fns";
import { getUserProfile } from "@/lib/firestore-server";

export async function checkRateLimit(
  userId: string,
  limitType: "prParses",
  maxCount: number
): Promise<{ allowed: boolean; error?: string }> {
  if (!userId) {
    return { allowed: false, error: "User not authenticated." };
  }

  const userProfile = await getUserProfile(userId);
  const today = format(new Date(), "yyyy-MM-dd");
  const usage = userProfile?.aiUsage?.[limitType];

  if (usage && usage.date === today && usage.count >= maxCount) {
    return { allowed: false, error: `You have reached your daily limit of ${maxCount} parses.` };
  }

  return { allowed: true };
}
