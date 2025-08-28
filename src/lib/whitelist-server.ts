
'use server';

import { adminDb } from './firebase-admin';

/**
 * Checks if a given email exists in the 'whitelist' collection in Firestore.
 * This is a server-only function and ensures that the check is secure.
 *
 * @param email The email address to check.
 * @returns A promise that resolves to `true` if the email is whitelisted, and `false` otherwise.
 */
export async function isEmailWhitelisted(email: string): Promise<boolean> {
  if (!email) {
    return false;
  }

  try {
    const whitelistCollection = adminDb.collection('whitelist');
    const docRef = whitelistCollection.doc(email.toLowerCase()); // Use lowercase email as document ID for consistency
    const docSnap = await docRef.get();

    return docSnap.exists;
  } catch (error) {
    console.error("Error checking whitelist:", error);
    // In case of a database error, default to false for security.
    return false;
  }
}
