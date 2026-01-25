
"use client";

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

// Define the shape of the context value
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signUpWithEmail: (email:string, password:string) => Promise<void>;
  signInWithEmail: (email:string, password:string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

// Create the context with a default value of null
const AuthContext = createContext<AuthContextType | null>(null);

// Create the provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastSessionUid = useRef<string | null>(null);

  useEffect(() => {
    const ensureSessionCookie = async (currentUser: User) => {
      try {
        const idToken = await currentUser.getIdToken();
        await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
      } catch (error) {
        console.error('Failed to set session cookie:', error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
      if (currentUser && lastSessionUid.current !== currentUser.uid) {
        lastSessionUid.current = currentUser.uid;
        void ensureSessionCookie(currentUser);
      }
      if (!currentUser) {
        lastSessionUid.current = null;
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);
  
  const signUpWithEmail = async (email:string, password:string) => {
      await createUserWithEmailAndPassword(auth, email, password);
  }
  
  const signInWithEmail = async (email:string, password:string) => {
      await signInWithEmailAndPassword(auth, email, password);
  }
  
  const signOutUser = async () => {
      await fetch('/api/session', { method: 'DELETE' });
      await signOut(auth);
  }
  
  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const value: AuthContextType = { user, isLoading, signUpWithEmail, signInWithEmail, signOut: signOutUser, sendPasswordReset };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Create a custom hook for using the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
