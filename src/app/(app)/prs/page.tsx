
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Award } from "lucide-react";

export default function PRsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-primary flex items-center">
          <Award className="mr-3 h-8 w-8" /> Personal Records
        </h1>
        <p className="text-muted-foreground">Track your best lifts and achievements here!</p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Your PRs</CardTitle>
          <CardDescription>
            This is where your personal records will be displayed. Feature coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <Award className="h-24 w-24 text-primary/50 mb-4" />
          <p className="text-muted-foreground">No PRs logged yet. Stay tuned for this feature!</p>
        </CardContent>
      </Card>
    </div>
  );
}
