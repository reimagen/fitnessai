
"use client";

import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// Define the shape of the context value
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signUpWithEmail: (email:string, password:string) => Promise<void>;
  signInWithEmail: (email:string, password:string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Create the context with a default value of null
const AuthContext = createContext<AuthContextType | null>(null);

// Create the provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
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
      await signOut(auth);
  }

  const value = { user, isLoading, signUpWithEmail, signInWithEmail, signOut: signOutUser };

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
