"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, KeyRound, Mail, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SignInPage() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, signUpWithEmail } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (isSigningUp) {
        await signUpWithEmail(email, password);
        toast({
          title: 'Account Created!',
          description: 'You have been signed up successfully. Please sign in.',
        });
        setIsSigningUp(false); // Switch back to sign-in view after successful sign-up
      } else {
        await signInWithEmail(email, password);
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
            <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">FitnessAI</h1>
            <p className="mt-2 text-lg text-muted-foreground">Your personal AI fitness companion.</p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{isSigningUp ? 'Create an Account' : 'Sign In'}</CardTitle>
            <CardDescription>
              {isSigningUp ? 'Enter your email and password to get started.' : 'Enter your credentials to access your account.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuthAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md border border-destructive bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5"/>
                    <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <LogIn className="mr-2" />}
                {isSigningUp ? 'Sign Up' : 'Sign In'}
              </Button>
            </form>

            <div className="my-4 flex items-center">
                <div className="flex-grow border-t border-muted"></div>
                <span className="mx-4 text-xs uppercase text-muted-foreground">Or continue with</span>
                <div className="flex-grow border-t border-muted"></div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : (
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                      <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 177.2 55.4l-62.1 62.1C335.5 95.6 294.8 80 248 80c-82.3 0-150.3 64.2-150.3 143.4s68 143.4 150.3 143.4c89.1 0 128.3-64.2 133.6-95.2H248v-65.7h239.5c1.4 9.3 2.5 19.1 2.5 29.5z"></path>
                  </svg>
                )}
                Sign in with Google
            </Button>

            <p className="mt-6 text-center text-sm">
                {isSigningUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                    onClick={() => {
                        setIsSigningUp(!isSigningUp);
                        setError(null);
                    }}
                    className="font-medium text-primary hover:underline"
                >
                    {isSigningUp ? 'Sign In' : 'Sign Up'}
                </button>
            </p>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
