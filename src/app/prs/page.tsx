
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Award, Trophy, UploadCloud, Trash2, Flag, CheckCircle, Loader2, Edit, UserPlus } from "lucide-react";
import type { PersonalRecord } from "@/lib/types";
import { PrUploaderForm } from "@/components/prs/pr-uploader-form";
import { ManualPrForm } from "@/components/prs/manual-pr-form";
import { parsePersonalRecordsAction } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { usePersonalRecords, useUserProfile, useAddPersonalRecords, useUpdatePersonalRecord, useClearAllPersonalRecords } from "@/lib/firestore.service";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAuth } from "@/lib/auth.service";
import Link from "next/link";
import { FormContainer } from "@/components/prs/form-container";
import { PrCategorySection } from "@/components/prs/pr-category-section";
import { usePrEdit } from "@/hooks/use-pr-edit";
import { CATEGORY_ORDER, FORM_STATES, type FormState } from "@/lib/constants";
import { getBestRecords, groupRecordsByCategory } from "./pr-utils";

export default function MilestonesPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [activeForm, setActiveForm] = useState<FormState>(FORM_STATES.NONE);
  const { editState, isEditing, startEdit, cancelEdit, updateWeight, updateDate } = usePrEdit();

  const { data: profileResult, isLoading: isLoadingProfile, isError: isErrorProfile } = useUserProfile();
  const userProfile = profileResult?.data;

  // Enable PR fetching only if the profile has loaded and exists.
  const { data: allRecords, isLoading: isLoadingPrs, isError: isErrorPrs } = usePersonalRecords(!isLoadingProfile && !!userProfile);

  const addPersonalRecordsMutation = useAddPersonalRecords();
  const updateRecordMutation = useUpdatePersonalRecord();
  const clearAllRecordsMutation = useClearAllPersonalRecords();

  const bestRecords = useMemo(() => getBestRecords(allRecords || []), [allRecords]);
  const groupedRecords = useMemo(() => groupRecordsByCategory(bestRecords), [bestRecords]);
  const completedGoals = useMemo(() => userProfile?.fitnessGoals?.filter(g => g.achieved) || [], [userProfile]);
  
  const handleManualAdd = (newRecord: Omit<PersonalRecord, 'id' | 'userId'>) => {
    addPersonalRecordsMutation.mutate({ userId: user!.uid, records: [newRecord] }, {
        onSuccess: () => {
            toast({
                title: "PR Added!",
                description: `Your new record for ${newRecord.exerciseName} has been saved.`,
            });
            setActiveForm(FORM_STATES.NONE);
        },
        onError: (error) => {
            toast({
                title: "Save Failed",
                description: `Could not save the new record: ${error.message}`,
                variant: "destructive"
            });
        }
    });
  };

  const performClearRecords = async () => {
    if (!allRecords || allRecords.length === 0) return;
    clearAllRecordsMutation.mutate(user!.uid, {
        onSuccess: () => {
            toast({
                title: "Records Cleared",
                description: "All personal records have been removed.",
                variant: "destructive",
            });
        },
        onError: (error) => {
            toast({
                title: "Clear Failed",
                description: `Could not clear records: ${error.message}`,
                variant: "destructive"
            });
        }
    });
  };
  
  const handleEditClick = (record: PersonalRecord) => {
    startEdit(record);
  };

  const handleSaveEdit = (recordId: string) => {
    const weight = editState.weight;
    if (isNaN(weight) || weight <= 0) {
        toast({ title: 'Invalid Weight', description: 'Please enter a valid positive number for weight.', variant: 'destructive' });
        return;
    }
    
    // Create a Date object in the client's local timezone.
    const date = new Date(editState.date.replace(/-/g, '/'));
    if (isNaN(date.getTime())) {
        toast({ title: 'Invalid Date', description: 'Please enter a valid date.', variant: 'destructive' });
        return;
    }
    // Normalize to the start of the day to ensure consistency.
    const normalizedDate = startOfDay(date);

    // Pass the full, timezone-aware Date object to the server.
    updateRecordMutation.mutate(
        { userId: user!.uid, id: recordId, data: { weight, date: normalizedDate } },
        {
            onSuccess: () => {
                toast({ title: 'PR Updated!', description: 'Your personal record has been successfully updated.' });
                cancelEdit();
            },
            onError: (error) => {
                toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
            },
        }
    );
  };

  const isLoading = isLoadingProfile || isLoadingPrs;
  const isError = isErrorProfile || isErrorPrs;

  if (isLoadingProfile) {
      return (
          <div className="container mx-auto px-4 py-8 flex justify-center items-center h-full">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
      );
  }

  if (isErrorProfile) {
      return (
          <div className="container mx-auto px-4 py-8">
              <ErrorState message="Could not load your profile data. Please try again later." />
          </div>
      );
  }

  if (profileResult?.notFound) {
      return (
        <div className="container mx-auto px-4 py-8 text-center">
            <header className="mb-12">
                <h1 className="font-headline text-4xl font-bold text-primary md:text-5xl">Track Your Milestones</h1>
                <p className="mt-2 text-lg text-muted-foreground">Create a profile to start logging personal records and achievements.</p>
            </header>
            <Card className="shadow-lg max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="font-headline">Create Your Profile First</CardTitle>
                    <CardDescription>
                        Your profile is needed to calculate strength levels and save your milestones.
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
    <div className="container mx-auto px-4 py-8 space-y-8">
      <header className="mb-4">
        <h1 className="font-headline text-3xl font-bold text-primary flex items-center">
          <Award className="mr-3 h-8 w-8" /> Milestones & Achievements
        </h1>
        <p className="text-muted-foreground">Log your best lifts and completed goals, with strength level classifications.</p>
      </header>

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
                Upload an image and let AI extract your PRs. Must be a classifiable exercise, list available in manual PR entry tab.
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
          <PrUploaderForm onParse={parsePersonalRecordsAction} />
        </FormContainer>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary"/>
            Personal Records
          </CardTitle>
          <CardDescription>
            Your top recorded lift (1RM) for each exercise. Levels are classified based on your personal stats. 
            Body-weight based levels use ratios from strengthlevel.com. 
            Otherwise, level calculations are based on your skeletal muscle mass.
          </CardDescription>
          {allRecords && allRecords.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full mt-4"
                onClick={performClearRecords}
                disabled={clearAllRecordsMutation.isPending}
              >
                {clearAllRecordsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Clear All Records
              </Button>
            )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <ErrorState message="Could not load your personal records. Please try again." />
          ) : bestRecords.length > 0 ? (
            <div className="space-y-8">
              {CATEGORY_ORDER.map(category =>
                groupedRecords[category] && groupedRecords[category].length > 0 ? (
                  <PrCategorySection
                    key={category}
                    category={category}
                    records={groupedRecords[category]}
                    userProfile={userProfile}
                    isEditing={isEditing}
                    editedWeight={editState.weight}
                    editedDate={editState.date}
                    onEditClick={handleEditClick}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={cancelEdit}
                    onWeightChange={updateWeight}
                    onDateChange={updateDate}
                    isUpdating={updateRecordMutation.isPending}
                  />
                ) : null
              )}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-40 text-center">
                <Trophy className="h-16 w-16 text-primary/30 mb-4" />
                <p className="text-muted-foreground">
                    No personal records logged yet. Add a PR or upload a screenshot to get started!
                </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Flag className="h-6 w-6 text-primary"/>
            Completed Goals
          </CardTitle>
          <CardDescription>
            All the goals you&apos;ve set and conquered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedGoals.length > 0 ? (
             <div className="space-y-3">
                {completedGoals.map(goal => (
                    <div key={goal.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                        <div className="flex flex-col">
                            <p className="font-semibold text-primary">{goal.description}</p>
                            <p className="text-xs text-muted-foreground">Target: {format(goal.targetDate, "MMM d, yyyy")}</p>
                            {goal.dateAchieved && <p className="text-xs text-muted-foreground">Achieved on: {format(goal.dateAchieved, "MMM d, yyyy")}</p>}
                        </div>
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5"/>
                            <span className="text-sm font-bold">Done!</span>
                        </div>
                    </div>
                ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-40 text-center">
                <Flag className="h-16 w-16 text-primary/30 mb-4" />
                <p className="text-muted-foreground">
                    No completed goals yet. Set and achieve goals on your profile!
                </p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
 
