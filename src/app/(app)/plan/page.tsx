import { RecommendationForm } from "@/components/plan/recommendation-form";
import { getWorkoutRecommendationAction } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlanPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-primary">AI Workout Planner</h1>
        <p className="text-muted-foreground">
          Let our AI craft a personalized workout plan tailored to your goals and needs.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Tell Us About Yourself</CardTitle>
          <CardDescription>
            The more information you provide, the better our AI can tailor your plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecommendationForm onRecommendation={getWorkoutRecommendationAction} />
        </CardContent>
      </Card>

      <Card className="mt-8 bg-secondary/50 shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>1. Input Your Data:</strong> Fill in your fitness goals, workout history, and personal statistics.</p>
          <p><strong>2. AI Analysis:</strong> Our intelligent system processes your information to understand your unique profile.</p>
          <p><strong>3. Personalized Plan:</strong> Receive a custom workout recommendation designed to help you achieve your objectives efficiently.</p>
        </CardContent>
      </Card>
    </div>
  );
}
