
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Target, BarChartBig, Camera, FilePenLine } from "lucide-react"; // Added Camera, FilePenLine
import Link from "next/link";
import Image from "next/image";
import { WeeklyProgressTracker } from "@/components/home/WeeklyProgressTracker";
import { RecentHistory } from "@/components/home/RecentHistory";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-12 text-center">
        <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">Welcome to FitnessAI</h1>
        <p className="mt-2 text-lg text-muted-foreground">Your personal AI fitness companion.</p>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Dumbbell className="h-6 w-6 text-primary" />
              Log Your Workout
            </CardTitle>
            <CardDescription>Keep track of your exercises, sets, reps, and weights.</CardDescription>
          </CardHeader>
          <CardContent>
            <Image src="https://placehold.co/600x400.png" alt="Workout logging" width={600} height={400} className="rounded-md object-cover" data-ai-hint="fitness workout" />
          </CardContent>
          <CardFooter className="flex gap-4">
            <Button asChild className="flex-1">
              <Link href="/history?tab=screenshot">
                <Camera className="mr-2 h-4 w-4" />
                Screenshot
              </Link>
            </Button>
            <Button asChild className="flex-1" variant="outline">
              <Link href="/history?tab=log">
                <FilePenLine className="mr-2 h-4 w-4" />
                Manual
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Target className="h-6 w-6 text-accent" />
              AI Workout Plan
            </CardTitle>
            <CardDescription>Get personalized workout routines from our AI.</CardDescription>
          </CardHeader>
          <CardContent>
             <Image src="https://placehold.co/600x400.png" alt="AI workout plan" width={600} height={400} className="rounded-md object-cover" data-ai-hint="artificial intelligence fitness" />
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full border-accent text-accent hover:bg-accent/10 hover:text-accent">
              <Link href="/plan">Get Plan</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
               <BarChartBig className="h-6 w-6 text-primary" />
              Track Your Progress
            </CardTitle>
            <CardDescription>Visualize your gains and stay motivated.</CardDescription>
          </CardHeader>
          <CardContent>
            <Image src="https://placehold.co/600x400.png" alt="Progress tracking" width={600} height={400} className="rounded-md object-cover" data-ai-hint="chart graph" />
          </CardContent>
           <CardFooter>
            <Button asChild className="w-full bg-primary hover:bg-primary/90">
              <Link href="/analysis">View Analysis</Link>
            </Button>
          </CardFooter>
        </Card>
      </section>

      <section className="mt-12">
        <WeeklyProgressTracker />
        <RecentHistory />
      </section>
    </div>
  );
}
