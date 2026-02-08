import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export const metadata = {
  title: "Help & FAQ",
  description: "Frequently asked questions about FitnessAI",
};

const faqs = [
  {
    category: "Getting Started",
    items: [
      {
        q: "How do I create my profile?",
        a: "After signing up, go to the Profile page and fill in your basic information (age, gender, height, weight, experience level). This helps us personalize your fitness recommendations.",
      },
      {
        q: "How do I log my first workout?",
        a: "Go to the History page and click 'Log Workout Manually' to enter exercises, sets, reps, and weight. Or upload a screenshot from your gym app for automatic parsing.",
      },
    ],
  },
  {
    category: "Workout Logging",
    items: [
      {
        q: "Can I upload a screenshot of my workout?",
        a: "Yes! Go to History and click 'Upload Screenshot'. Our AI will automatically extract exercises, sets, reps, and weight from your gym app screenshots.",
      },
      {
        q: "Why didn't my screenshot parse correctly?",
        a: "Make sure your screenshot clearly shows: exercise name, number of sets, reps per set, and weight. Blurry or partially visible text may cause parsing issues. Try again with a clearer screenshot.",
      },
      {
        q: "Can I edit a workout after logging it?",
        a: "Yes, click the edit icon next to any workout to update it.",
      },
    ],
  },
  {
    category: "Analysis & Plans",
    items: [
      {
        q: "What does e1RM mean?",
        a: "e1RM stands for 'estimated 1 Repetition Maximum' - it's an estimate of the maximum weight you can lift for a single rep based on your actual performance.",
      },
      {
        q: "How is my strength level calculated?",
        a: "Strength levels are based on your e1RM compared to standards for your body weight, age, and gender. Body-weight exercises use ratios from strengthlevel.com.",
      },
      {
        q: "Why is my analysis taking a while?",
        a: "AI analysis can take a few seconds. If it's taking longer than expected, check your internet connection and try refreshing the page.",
      },
      {
        q: "Can I generate multiple plans?",
        a: "Yes! You can generate a new plan anytime from the Plan page. Each plan is based on your latest workout data and strength levels.",
      },
    ],
  },
  {
    category: "Personal Records",
    items: [
      {
        q: "How do I add a personal record?",
        a: "Go to Milestones and either manually enter a PR or upload a screenshot from your workout app. Our AI will extract the exercise and weight.",
      },
      {
        q: "Can I edit or delete PRs?",
        a: "Yes, click the edit icon to update a PR's weight or date. Click the delete icon to remove it.",
      },
      {
        q: "What happens if I clear all records?",
        a: "Clearing all PRs will permanently delete them. You can re-enter them manually or upload screenshots again. A confirmation dialog will appear before deletion.",
      },
    ],
  },
  {
    category: "Troubleshooting",
    items: [
      {
        q: "I'm getting an error message. What should I do?",
        a: "Read the error message carefully - it usually tells you what went wrong. Try refreshing the page or checking your internet connection. If the problem persists, visit the Support page to contact us.",
      },
      {
        q: "The app won't load. Help!",
        a: "Try: 1) Refresh the page, 2) Clear your browser cache, 3) Try a different browser, 4) Check your internet connection. If it still doesn't work, email support@fitnessai.app",
      },
      {
        q: "I forgot my password. How do I reset it?",
        a: "On the sign-in page, click the password reset link. Enter your email and follow the instructions sent to your inbox.",
      },
      {
        q: "How is my data stored and is it secure?",
        a: "Your data is stored securely in Google Firebase with industry-standard encryption. We never share your data with third parties.",
      },
    ],
  },
  {
    category: "Account",
    items: [
      {
        q: "Can I delete my account?",
        a: "Yes, email support@fitnessai.app with a request to delete your account. All your data will be permanently removed.",
      },
      {
        q: "How do I update my email?",
        a: "Go to Profile and update your email address. You may need to verify the new email.",
      },
      {
        q: "Is my workout data private?",
        a: "Yes, only you can see your workout data. We don't share it with other users or third parties.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="container mx-auto max-w-3xl space-y-8 py-8 px-4">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <HelpCircle className="h-8 w-8" />
          Help & FAQ
        </h1>
        <p className="text-muted-foreground">
          Find answers to common questions about FitnessAI
        </p>
      </div>

      {faqs.map((section) => (
        <Card key={section.category}>
          <CardHeader>
            <CardTitle className="text-lg">{section.category}</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {section.items.map((item, idx) => (
                <AccordionItem key={idx} value={`${section.category}-${idx}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <span className="text-left font-medium">{item.q}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Still need help?</CardTitle>
          <CardDescription>
            Can't find what you're looking for? We're here to help.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Visit our{" "}
            <a href="/support" className="text-primary hover:underline font-semibold">
              Support & Feedback page
            </a>{" "}
            to send us a message or email{" "}
            <a
              href="mailto:support@fitnessai.app"
              className="text-primary hover:underline font-semibold"
            >
              support@fitnessai.app
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
