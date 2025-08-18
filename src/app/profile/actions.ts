'use server';

// Directly export the server functions. This allows Next.js's static analysis
// to correctly bundle the server-side logic into the client-callable action.
export { getUserProfile, updateUserProfile } from "@/lib/firestore-server";
