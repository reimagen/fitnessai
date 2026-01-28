
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, KeyRound, Mail, LogIn, Send } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export default function SignInPage() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, sendPasswordReset } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (isSigningUp) {
        await signUpWithEmail(email, password);
        router.push('/');
      } else {
        await signInWithEmail(email, password);
        router.push('/');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address to reset your password.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your inbox for instructions to reset your password.",
      });
      setIsResettingPassword(false); // Go back to the sign-in form
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isResettingPassword) {
    return (
       <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <header className="mb-8 text-center">
              <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">FitnessAI</h1>
              <p className="mt-2 text-lg text-muted-foreground">Your personal AI fitness companion.</p>
          </header>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Reset Your Password</CardTitle>
              <CardDescription>
                Enter your email address and we&apos;ll send you a link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordReset} className="space-y-4">
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

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-md border border-destructive bg-destructive/10 text-destructive text-sm">
                      <AlertTriangle className="h-4 w-4 mt-0.5"/>
                      <span>{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Send className="mr-2" />}
                  Send Reset Email
                </Button>
              </form>
              <p className="mt-6 text-center text-sm">
                  Remember your password?{' '}
                  <button
                      onClick={() => setIsResettingPassword(false)}
                      className="font-medium text-primary hover:underline"
                  >
                      Back to Sign In
                  </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                        type="button"
                        onClick={() => {
                            setIsResettingPassword(true);
                            setError(null);
                        }}
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        Forgot Password?
                    </button>
                </div>
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
