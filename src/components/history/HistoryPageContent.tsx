"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { parseWorkoutScreenshotAction } from "../../app/history/actions";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/shared/ErrorState";
import { HistoryFormSelector } from "@/components/history/HistoryFormSelector";
import { HistoryManualLogCard } from "@/components/history/HistoryManualLogCard";
import { HistoryParserCard } from "@/components/history/HistoryParserCard";
import { HistoryWorkoutsCard } from "@/components/history/HistoryWorkoutsCard";
import { useHistoryPage } from "@/components/history/useHistoryPage";
import { HeroHeader } from "@/components/layout/HeroHeader";

export function HistoryPageContent() {
  const {
    activeForm,
    editingLogId,
    isCurrentMonthInView,
    isProfileNotFound,
    workoutLogs,
    logBeingEdited,
    isLoadingProfile,
    isErrorProfile,
    isLoadingWorkouts,
    isErrorWorkouts,
    addWorkoutMutation,
    updateWorkoutMutation,
    goToPreviousMonth,
    goToNextMonth,
    handleManualLogSubmit,
    handleParsedData,
    handleDeleteLog,
    handleEditLog,
    handleCancelEdit,
    handleTabChange,
    setActiveForm,
    userProfile,
  } = useHistoryPage();

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-full">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isProfileNotFound) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <HeroHeader
          className="mb-12"
          align="center"
          size="lg"
          title="Log Your History"
          subtitle="Create a profile to save your workout logs and track your performance over time."
        />
        <Card className="shadow-lg max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="font-headline">Create Your Profile First</CardTitle>
            <CardDescription>Your profile is needed to save your workout history.</CardDescription>
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

  if (isErrorProfile) {
    return <ErrorState message="Could not load your user profile. Please try refreshing." />;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <HeroHeader
        className="mb-8"
        title="Workout History"
        subtitle="Log your sessions and review exercise lists."
      />

      {activeForm === "none" && <HistoryFormSelector onSelect={handleTabChange} />}

      <div className={cn(activeForm === "manual" ? "block" : "hidden")}>
        <HistoryManualLogCard
          isOpen={activeForm === "manual"}
          editingLogId={editingLogId}
          logBeingEdited={logBeingEdited}
          isSubmitting={addWorkoutMutation.isPending || updateWorkoutMutation.isPending}
          onClose={() => setActiveForm("none")}
          onSubmitLog={handleManualLogSubmit}
          onCancelEdit={handleCancelEdit}
          workoutLogs={workoutLogs || []}
          userProfile={userProfile ?? undefined}
        />
      </div>

      <div className={cn(activeForm === "parse" ? "block" : "hidden")}>
        <HistoryParserCard
          isOpen={activeForm === "parse"}
          onClose={() => setActiveForm("none")}
          onParse={parseWorkoutScreenshotAction}
          onParsedData={handleParsedData}
        />
      </div>

      <HistoryWorkoutsCard
        isLoading={isLoadingWorkouts}
        isError={isErrorWorkouts}
        workoutLogs={workoutLogs || []}
        isCurrentMonthInView={isCurrentMonthInView}
        onEdit={handleEditLog}
        onDelete={handleDeleteLog}
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
      />
    </div>
  );
}
