import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { checkProfileCompletion } from "@/lib/profile-completion";

type ProfileCompletionNoticeProps = {
  profile: UserProfile;
};

export function ProfileCompletionNotice({ profile }: ProfileCompletionNoticeProps) {
  const status = checkProfileCompletion(profile);

  if (status.isCoreComplete) {
    return null;
  }

  return (
    <Card className="shadow-lg border-primary bg-primary/5">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Info className="h-6 w-6 text-primary" />
          Complete Your Profile
        </CardTitle>
        <CardDescription>
          Fill in the required fields below to unlock all app features like workout planning and analysis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-semibold text-primary mb-2">Required Information:</p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 list-disc list-inside text-sm text-muted-foreground">
          {status.missingCoreFields.map(field => <li key={field}>{field}</li>)}
        </ul>
      </CardContent>
    </Card>
  );
}
