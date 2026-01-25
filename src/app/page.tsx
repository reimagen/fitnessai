
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Target, BarChartBig, Award, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUserProfile } from "@/lib/auth-server";
import { HomeDashboard } from "@/components/home/HomeDashboard";

function getGreeting(userName?: string): string {
  const hour = new Date().getHours();
  let greeting: string;

  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17 && hour < 21) {
    greeting = "Good evening";
  } else {
    greeting = "Welcome";
  }

  if (userName) {
    return `${greeting}, ${userName}`;
  }
  return `${greeting} to FitnessAI`;
}

export default async function HomePage() {
  const { data: profile, notFound: profileNotFound } = await getCurrentUserProfile();

  if (profileNotFound) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <header className="mb-12">
            <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">Welcome to FitnessAI!</h1>
            <p className="mt-2 text-lg text-muted-foreground">Let's get your profile set up to personalize your experience.</p>
        </header>
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
      <header className="mb-12 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">{getGreeting(profile?.name)}</h1>
        <p className="mt-2 text-lg text-muted-foreground">Your personal AI fitness companion.</p>
      </header>

      <section>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <Link href="/history" className="group flex flex-col items-center justify-center space-y-2 rounded-lg p-4 transition-colors hover:bg-secondary" aria-label="Log a new workout">
                <Dumbbell className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">Log Workout</span>
              </Link>
              <Link href="/prs" className="group flex flex-col items-center justify-center space-y-2 rounded-lg p-4 transition-colors hover:bg-secondary" aria-label="Log personal records and achievements">
                <Award className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">Log PRs</span>
              </Link>
              <Link href="/plan" className="group flex flex-col items-center justify-center space-y-2 rounded-lg p-4 transition-colors hover:bg-secondary" aria-label="Get an AI-generated workout plan">
                <Target className="h-8 w-8 text-accent transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">Get AI Plan</span>
              </Link>
              <Link href="/analysis" className="group flex flex-col items-center justify-center space-y-2 rounded-lg p-4 transition-colors hover:bg-secondary" aria-label="View detailed fitness analysis and insights">
                <BarChartBig className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">View Analysis</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="mt-12">
        <HomeDashboard initialProfile={profile} />
      </div>
    </div>
  );
}
