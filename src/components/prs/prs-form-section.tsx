import { useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, UploadCloud } from "lucide-react";
import type { PersonalRecord } from "@/lib/types";
import type { ParsePersonalRecordsOutput } from "@/ai/flows/personal-record-parser";
import { PrUploaderForm } from "@/components/prs/pr-uploader-form";
import { ManualPrForm } from "@/components/prs/manual-pr-form";
import { useToast } from "@/hooks/useToast";
import { useAddPersonalRecords } from "@/lib/firestore.service";
import { useAuth } from "@/lib/auth.service";
import { FormContainer } from "@/components/prs/form-container";
import { FORM_STATES, type FormState } from "@/lib/constants";
import { cn } from "@/lib/utils";

type PrsFormSectionProps = {
  onParse: (userId: string, data: { photoDataUri: string }) => Promise<{
    success: boolean;
    data?: ParsePersonalRecordsOutput;
    error?: string;
  }>;
};

export function PrsFormSection({ onParse }: PrsFormSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeForm, setActiveForm] = useState<FormState>(FORM_STATES.NONE);
  const addPersonalRecordsMutation = useAddPersonalRecords();

  const handleManualAdd = (newRecord: Omit<PersonalRecord, "id" | "userId">) => {
    if (!user) {
      toast({
        title: "Not Logged In",
        description: "Please sign in to add a personal record.",
        variant: "destructive",
      });
      return;
    }

    addPersonalRecordsMutation.mutate(
      { userId: user.uid, records: [newRecord] },
      {
        onSuccess: () => {
          toast({
            title: "PR Added!",
            description: `Your new record for ${newRecord.exerciseName} has been saved.`,
          });
          setActiveForm(FORM_STATES.NONE);
        },
        onError: error => {
          toast({
            title: "Save Failed",
            description: `Could not save the new record: ${error.message}`,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <>
      {activeForm === FORM_STATES.NONE && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => setActiveForm(FORM_STATES.MANUAL)}
          >
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Edit className="h-6 w-6 text-accent" />
                Log PR Manually
              </CardTitle>
              <CardDescription>
                Log a single personal record for a classifiable exercise.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card
            className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => setActiveForm(FORM_STATES.PARSE)}
          >
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <UploadCloud className="h-6 w-6 text-accent" />
                Upload Screenshot
              </CardTitle>
              <CardDescription>
                Upload an image and let AI extract your PRs. Must be a classifiable exercise,
                list available in manual PR entry tab.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      <div className={cn(activeForm === FORM_STATES.MANUAL ? "block" : "hidden")}>
        <FormContainer
          title="Add PR Manually"
          description="Log a single personal record for a classifiable exercise."
          icon={<Edit className="h-6 w-6 text-accent" />}
          onClose={() => setActiveForm(FORM_STATES.NONE)}
        >
          <ManualPrForm onAdd={handleManualAdd} isSubmitting={addPersonalRecordsMutation.isPending} />
        </FormContainer>
      </div>

      <div className={cn(activeForm === FORM_STATES.PARSE ? "block" : "hidden")}>
        <FormContainer
          title="Upload from Screenshot"
          description="Upload an image to parse multiple PRs at once."
          icon={<UploadCloud className="h-6 w-6 text-accent" />}
          onClose={() => setActiveForm(FORM_STATES.NONE)}
        >
          <PrUploaderForm onParse={onParse} />
        </FormContainer>
      </div>
    </>
  );
}
