import { useMemo, useState } from "react";
import type { Exercise, WorkoutLog } from "@/lib/types";
import type { ParseWorkoutScreenshotOutput } from "@/ai/flows/screenshot-workout-parser";
import { useAddWorkoutLog, useDeleteWorkoutLog, useUpdateWorkoutLog, useUserProfile, useWorkouts } from "@/lib/firestore.service";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/lib/auth.service";
import { addMonths } from "date-fns/addMonths";
import { subMonths } from "date-fns/subMonths";
import { isSameMonth } from "date-fns/isSameMonth";
import { buildParsedExercises, buildWorkoutLogPayload, findExistingLogForDate, getParsedTargetDate, mergeParsedExercises } from "@/components/history/history-helpers";

type ActiveForm = "manual" | "parse" | "none";

export function useHistoryPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeForm, setActiveForm] = useState<ActiveForm>("none");

  const {
    data: profileResult,
    isLoading: isLoadingProfile,
    isError: isErrorProfile,
  } = useUserProfile();
  const userProfile = profileResult?.data;
  const isProfileNotFound = profileResult?.notFound === true;

  const {
    data: workoutLogs,
    isLoading: isLoadingWorkouts,
    isError: isErrorWorkouts,
  } = useWorkouts(currentMonth, !isLoadingProfile && !isProfileNotFound);

  const addWorkoutMutation = useAddWorkoutLog();
  const updateWorkoutMutation = useUpdateWorkoutLog();
  const deleteWorkoutMutation = useDeleteWorkoutLog();

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const isCurrentMonthInView = useMemo(() => isSameMonth(currentMonth, new Date()), [currentMonth]);

  const handleManualLogSubmit = (data: Omit<WorkoutLog, "id" | "userId">) => {
    if (!user) return;
    const finalData = buildWorkoutLogPayload(data, userProfile, workoutLogs);

    if (editingLogId) {
      updateWorkoutMutation.mutate(
        { userId: user.uid, id: editingLogId, data: finalData },
        {
          onSuccess: () => {
            toast({ title: "Log Updated!", description: "Your workout has been successfully updated." });
            setEditingLogId(null);
            setActiveForm("none");
          },
          onError: (error) => {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
          },
        },
      );
    } else {
      // Check if a log already exists for this date and merge if so
      const existingLog = findExistingLogForDate(workoutLogs, data.date);

      if (existingLog) {
        const { updatedLog, addedCount } = mergeParsedExercises(existingLog, finalData.exercises);
        updateWorkoutMutation.mutate(
          { userId: user.uid, id: existingLog.id, data: updatedLog },
          {
            onSuccess: () => {
              toast({ title: "Log Updated", description: `Added ${addedCount} exercise(s) to your existing workout.` });
              setActiveForm("none");
            },
            onError: (error) => {
              toast({ title: "Update Failed", description: error.message, variant: "destructive" });
            },
          },
        );
      } else {
        addWorkoutMutation.mutate(
          { userId: user.uid, data: finalData },
          {
            onSuccess: () => {
              toast({ title: "Workout Logged!", description: "Your new workout session has been saved." });
              setActiveForm("none");
            },
            onError: (error) => {
              toast({ title: "Save Failed", description: error.message, variant: "destructive" });
            },
          },
        );
      }
    }
  };

  const handleParsedData = (parsedData: ParseWorkoutScreenshotOutput) => {
    if (!user) return;
    const workoutDate = parsedData.workoutDate;
    if (!workoutDate) {
      toast({
        title: "Parsing Error",
        description: "A date was not provided for the parsed log. Cannot save.",
        variant: "destructive",
      });
      return;
    }

    const targetDate = getParsedTargetDate(workoutDate);
    const existingLog = findExistingLogForDate(workoutLogs, targetDate);
    const parsedExercises: Exercise[] = buildParsedExercises(parsedData);

    if (existingLog) {
      const { updatedLog, addedCount } = mergeParsedExercises(existingLog, parsedExercises);
      const finalData = buildWorkoutLogPayload(updatedLog, userProfile, workoutLogs);
      updateWorkoutMutation.mutate(
        { userId: user.uid, id: existingLog.id, data: finalData },
        {
          onSuccess: () => {
            toast({ title: "Log Updated", description: `Merged parsed data, adding ${addedCount} new exercise(s).` });
            setActiveForm("none");
          },
          onError: (error) => {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
          },
        },
      );
    } else {
      const newLog: Omit<WorkoutLog, "id" | "userId"> = {
        date: targetDate,
        exercises: parsedExercises,
      };
      const finalData = buildWorkoutLogPayload(newLog, userProfile, workoutLogs);
      addWorkoutMutation.mutate(
        { userId: user.uid, data: finalData },
        {
          onSuccess: () => {
            toast({ title: "Log Created", description: "Successfully created a new log from the screenshot." });
            setActiveForm("none");
          },
          onError: (error) => {
            toast({ title: "Save Failed", description: error.message, variant: "destructive" });
          },
        },
      );
    }
  };

  const handleDeleteLog = (logId: string) => {
    if (!user) return;
    deleteWorkoutMutation.mutate(
      { userId: user.uid, logId },
      {
        onSuccess: () => {
          toast({ title: "Log Deleted", description: "The workout log has been removed.", variant: "destructive" });
        },
        onError: (error) => {
          toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  const handleEditLog = (logId: string) => {
    if (!workoutLogs) return;
    const logToEdit = workoutLogs.find((log) => log.id === logId);
    if (logToEdit) {
      setEditingLogId(logId);
      setActiveForm("manual");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast({ title: "Error", description: "Could not find log to edit.", variant: "destructive" });
    }
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setActiveForm("none");
  };

  const handleTabChange = (value: "manual" | "parse") => {
    setEditingLogId(null);
    setActiveForm(value);
  };

  const logBeingEdited = editingLogId ? workoutLogs?.find((log) => log.id === editingLogId) : undefined;

  return {
    activeForm,
    editingLogId,
    currentMonth,
    isCurrentMonthInView,
    userProfile,
    isProfileNotFound,
    workoutLogs,
    logBeingEdited,
    isLoadingProfile,
    isErrorProfile,
    isLoadingWorkouts,
    isErrorWorkouts,
    addWorkoutMutation,
    updateWorkoutMutation,
    deleteWorkoutMutation,
    goToPreviousMonth,
    goToNextMonth,
    handleManualLogSubmit,
    handleParsedData,
    handleDeleteLog,
    handleEditLog,
    handleCancelEdit,
    handleTabChange,
    setActiveForm,
  };
}
