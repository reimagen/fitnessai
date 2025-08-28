
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth.service";
import { LogOut, Send } from "lucide-react";
import Link from "next/link";

// IMPORTANT: Replace this with the actual URL of your Google Form or Typeform.
const ACCESS_REQUEST_FORM_URL = "https://forms.gle/Xk89AEvt1qCC2wCEA";

export default function PendingAccessPage() {
  const { signOut, user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
            <header className="mb-8">
                <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">FitnessAI</h1>
                <p className="mt-2 text-lg text-muted-foreground">Your personal AI fitness companion.</p>
            </header>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Access Pending</CardTitle>
                    <CardDescription>
                        Thank you for your interest! Access to this application is currently limited to whitelisted users.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        If you believe you should have access or would like to request it, please fill out our access request form. Your account <span className="font-semibold text-primary">{user?.email}</span> is ready and will be enabled upon approval.
                    </p>
                    <Link href={ACCESS_REQUEST_FORM_URL} target="_blank" passHref>
                        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                            <Send className="mr-2" />
                            Request Access
                        </Button>
                    </Link>
                     <Button variant="outline" className="w-full" onClick={signOut}>
                        <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
