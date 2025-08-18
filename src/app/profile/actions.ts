
'use server';

import { getUserProfile as queryProfile, updateUserProfile as mutateProfile } from "@/lib/firestore-server";
import type { UserProfile } from "@/lib/types";

export async function getUserProfile(): Promise<UserProfile | null> {
    return queryProfile();
}

export async function updateUserProfile(data: Partial<Omit<UserProfile, 'id'>>): Promise<void> {
    return mutateProfile(data);
}
