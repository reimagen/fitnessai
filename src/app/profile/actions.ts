
'use server';

import { getUserProfile as getUserProfileFromServer, updateUserProfile as updateUserProfileFromServer} from "@/lib/firestore-server";
import type { UserProfile } from "@/lib/types";

// Server Actions must be explicitly defined as async functions in this file.
// They then call the server-only logic from other files.

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!userId) {
        throw new Error("User not authenticated.");
    }
    return getUserProfileFromServer(userId);
}

export async function updateUserProfile(userId: string, data: Partial<Omit<UserProfile, 'id'>>): Promise<void> {
    if (!userId) {
        throw new Error("User not authenticated.");
    }
    await updateUserProfileFromServer(userId, data);
}
