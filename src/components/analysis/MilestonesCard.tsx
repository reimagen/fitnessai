
"use client";

import { Award, Trophy, Flag, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import type { PersonalRecord, FitnessGoal } from '@/lib/types';
import React from 'react';
import { timeRangeDisplayNames } from '@/lib/analysis-constants';
import { toTitleCase } from '@/lib/analysis.config';

interface MilestonesCardProps {
  isLoading: boolean;
  isError: boolean;
  newPrsData: PersonalRecord[];
  achievedGoalsData: (FitnessGoal & { id: string; dateAchieved: Date; })[];
  timeRange: string;
}

export function MilestonesCard({ isLoading, isError, newPrsData, achievedGoalsData, timeRange }: MilestonesCardProps) {
  if (isLoading) {
    return (
      <Card className="shadow-lg lg:col-span-3 h-96 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (isError) {
    return null; // Error handled by parent component's general error state
  }

  return (
    <Card className="shadow-lg lg:col-span-3">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Award className="h-6 w-6 text-accent" /> New Milestones
        </CardTitle>
        <CardDescription>Achievements {timeRangeDisplayNames[timeRange]}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="prs" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Trophy className="mr-2 h-4 w-4" /> PRs
            </TabsTrigger>
            <TabsTrigger value="goals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Flag className="mr-2 h-4 w-4" /> Goals
            </TabsTrigger>
          </TabsList>
          <TabsContent value="prs">
            {newPrsData.length > 0 ? (
              <div className="h-[240px] w-full overflow-y-auto pr-2 space-y-3 mt-4">
                {newPrsData.map(pr => (
                  <div key={pr.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                    <div className="flex flex-col">
                      <p className="font-semibold text-primary">{toTitleCase(pr.exerciseName)}</p>
                      <p className="text-xs text-muted-foreground">{format(pr.date, "MMMM d, yyyy")}</p>
                    </div>
                    <p className="font-bold text-lg text-accent">{pr.weight} <span className="text-sm font-medium text-muted-foreground">{pr.weightUnit}</span></p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[240px] flex flex-col items-center justify-center text-center">
                <Trophy className="h-12 w-12 text-primary/30 mb-4" />
                <p className="text-muted-foreground">No new PRs for this period.</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="goals">
            {achievedGoalsData.length > 0 ? (
              <div className="h-[240px] w-full overflow-y-auto pr-2 space-y-3 mt-4">
                {achievedGoalsData.map(goal => (
                  <div key={goal.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                    <div className="flex flex-col">
                      <p className="font-semibold text-primary">{goal.description}</p>
                      {goal.dateAchieved && <p className="text-xs text-muted-foreground">Achieved on: {format(goal.dateAchieved, "MMMM d, yyyy")}</p>}
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[240px] flex flex-col items-center justify-center text-center">
                <Flag className="h-12 w-12 text-primary/30 mb-4" />
                <p className="text-muted-foreground">No goals achieved this period.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
