
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Target, BarChartBig, Award, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUserProfile } from "@/lib/auth-server";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { LapsedGoalBanner } from "@/components/home/LapsedGoalBanner";
import { Suspense } from "react";
import { HeroHeader } from "@/components/layout/HeroHeader";

export default async function HomePage() {
  const { data: profile, notFound: profileNotFound } = await getCurrentUserProfile();

  if (profileNotFound) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <HeroHeader
          className="mb-12"
          align="center"
          size="lg"
          title="Welcome to FitnessAI!"
          subtitle="Let&apos;s get your profile set up to personalize your experience."
        />
        <Card className="shadow-lg max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="font-headline">Create Your Profile</CardTitle>
                <CardDescription>
                    Your profile helps the AI create workout plans and track your progress accurately.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Link href="/profile" passHref>
                    <Button className="w-full">
                        <UserPlus className="mr-2" />
                        Go to Profile Setup
                    </Button>
                </Link>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <HeroHeader
        className="mb-12"
        align="center"
        size="lg"
        title={profile?.name ? `Welcome, ${profile.name}` : "Welcome to FitnessAI"}
        subtitle="Continue your fitness journey."
      />

      <div className="mb-8">
        <LapsedGoalBanner />
      </div>

      <section>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <Link
                href="/history"
                className="group flex flex-col items-center justify-center space-y-2 rounded-2xl border border-transparent p-4 transition-all hover:-translate-y-0.5 hover:border-border/70 hover:bg-secondary/60 hover:shadow-md hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Log a new workout"
              >
                <Dumbbell className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">Log Workout</span>
              </Link>
              <Link
                href="/prs"
                className="group flex flex-col items-center justify-center space-y-2 rounded-2xl border border-transparent p-4 transition-all hover:-translate-y-0.5 hover:border-border/70 hover:bg-secondary/60 hover:shadow-md hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Log personal records and achievements"
              >
                <Award className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">Log PRs</span>
              </Link>
              <Link
                href="/plan"
                className="group flex flex-col items-center justify-center space-y-2 rounded-2xl border border-transparent p-4 transition-all hover:-translate-y-0.5 hover:border-border/70 hover:bg-secondary/60 hover:shadow-md hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Get an AI-generated workout plan"
              >
                <Target className="h-8 w-8 text-accent transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">Get AI Plan</span>
              </Link>
              <Link
                href="/analysis"
                className="group flex flex-col items-center justify-center space-y-2 rounded-2xl border border-transparent p-4 transition-all hover:-translate-y-0.5 hover:border-border/70 hover:bg-secondary/60 hover:shadow-md hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="View detailed fitness analysis and insights"
              >
                <BarChartBig className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">View Analysis</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <Suspense fallback={
        <div className="mt-12 space-y-12">
          <div className="h-48 w-full bg-muted rounded-lg animate-pulse shadow-lg" />
          <div className="h-64 w-full bg-muted rounded-lg animate-pulse shadow-lg" />
          <div className="h-64 w-full bg-muted rounded-lg animate-pulse shadow-lg" />
        </div>
      }>
        <div className="mt-12">
          <HomeDashboard initialProfile={profile} />
        </div>
      </Suspense>
    </div>
  );
}
