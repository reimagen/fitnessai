
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth.service";
import { LogOut, Send } from "lucide-react";
import Link from "next/link";

// Form for non-whitelist attempted signups
const ACCESS_REQUEST_FORM_URL = "https://forms.fillout.com/t/3TWB1xQnJLus";

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
                    <CardTitle className="font-headline text-2xl">Access Restricted</CardTitle>
                    <CardDescription>
                        Thank you for your interest! Access to this application is currently limited to approved users.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        To request access, please fill out the form below. If your request is approved, your account for <span className="font-semibold text-primary">{user?.email}</span> will be enabled.
                    </p>
                    <div className="space-y-6">
                        <Link href={ACCESS_REQUEST_FORM_URL} target="_blank" passHref>
                            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                                <Send className="mr-2" />
                                Request Access
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
