'use server';

import { getUserProfile as getUserProfileFromServer, updateUserProfile as updateUserProfileFromServer} from "@/lib/firestore-server";
import type { UserProfile } from "@/lib/types";

// Server Actions must be explicitly defined as async functions in this file.
// They then call the server-only logic from other files.

export async function getUserProfile(): Promise<UserProfile | null> {
    return getUserProfileFromServer();
}

export async function updateUserProfile(data: Partial<Omit<UserProfile, 'id'>>): Promise<void> {
    await updateUserProfileFromServer(data);
}
