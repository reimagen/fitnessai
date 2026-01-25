
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from './firebase-admin';
import { UserProfile } from './types';
import { userProfileConverter } from './firestore-server';


export async function getAuthenticatedUser(): Promise<{ id: string; email: string | undefined; } | null> {
  const sessionCookie = (await cookies()).get('__session')?.value || '';

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return {
      id: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error('Error verifying session cookie:', error);
    return null;
  }
}

export async function getCurrentUserProfile(): Promise<{ data: UserProfile | null, notFound: boolean }> {
    const user = await getAuthenticatedUser();
    if (!user) {
        return { data: null, notFound: true };
    }

    const profileDocRef = adminDb.collection('users').doc(user.id).withConverter(userProfileConverter);
    const docSnap = await profileDocRef.get();

    if (!docSnap.exists) {
        // We have an authenticated user, but no profile document yet.
        return { data: null, notFound: true };
    }
    
    // We have a user and a profile
    return { data: docSnap.data() as UserProfile, notFound: false };
}
