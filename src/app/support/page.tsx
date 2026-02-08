import { FeedbackForm } from '@/components/support/FeedbackForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MessageCircle } from 'lucide-react';

export const metadata = {
  title: 'Support',
  description: 'Get help and send us feedback',
};

export default function SupportPage() {
  return (
    <div className="container mx-auto max-w-2xl space-y-8 py-8 px-4">
      <div>
        <h1 className="text-3xl font-bold mb-2">Support &amp; Feedback</h1>
        <p className="text-muted-foreground">
          We&apos;re here to help. Send us your feedback or reach out with questions.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Email Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Email Us</CardTitle>
            </div>
            <CardDescription>
              For urgent issues or general inquiries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="mailto:support@fitnessai.app"
              className="text-primary hover:underline font-semibold break-all"
            >
              support@fitnessai.app
            </a>
            <p className="text-sm text-muted-foreground mt-3">
              We aim to respond to all emails within 24 hours.
            </p>
          </CardContent>
        </Card>

        {/* FAQ Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Common Questions</CardTitle>
            </div>
            <CardDescription>
              Find answers to frequently asked questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="/help"
              className="text-primary hover:underline font-semibold"
            >
              Visit our Help & FAQ →
            </a>
            <p className="text-sm text-muted-foreground mt-3">
              Check out our FAQ for quick answers about using FitnessAI.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Form */}
      <FeedbackForm />

      {/* Additional Help */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Before You Go...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>Screenshot parsing issues?</strong> Check that your gym app screenshot is clear and shows the exercise name, sets, reps, and weight.
          </p>
          <p>
            <strong>AI analysis not loading?</strong> Try refreshing the page or check back in a few moments. Sometimes our service is busy!
          </p>
          <p>
            <strong>Other questions?</strong> Visit our{' '}
            <a href="/help" className="text-primary hover:underline font-semibold">
              Help & FAQ page
            </a>
            {' '}or email us at{' '}
            <a
              href="mailto:support@fitnessai.app"
              className="text-primary hover:underline font-semibold"
            >
              support@fitnessai.app
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
