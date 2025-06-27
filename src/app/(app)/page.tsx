
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Target, BarChartBig } from "lucide-react";
import Link from "next/link";
import { WeeklyProgressTracker } from "@/components/home/WeeklyProgressTracker";
import { RecentHistory } from "@/components/home/RecentHistory";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-12 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">Welcome to FitnessAI</h1>
        <p className="mt-2 text-lg text-muted-foreground">Your personal AI fitness companion.</p>
      </header>

      <section>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <Link href="/history" className="group flex flex-col items-center justify-center space-y-2 rounded-lg p-4 transition-colors hover:bg-secondary">
                <Dumbbell className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">Log Workout</span>
              </Link>
              <Link href="/plan" className="group flex flex-col items-center justify-center space-y-2 rounded-lg p-4 transition-colors hover:bg-secondary">
                <Target className="h-8 w-8 text-accent transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">AI Plan</span>
              </Link>
              <Link href="/analysis" className="group flex flex-col items-center justify-center space-y-2 rounded-lg p-4 transition-colors hover:bg-secondary">
                <BarChartBig className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium text-foreground">View Analysis</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-12">
        <WeeklyProgressTracker />
        <RecentHistory />
      </section>
    </div>
  );
}
