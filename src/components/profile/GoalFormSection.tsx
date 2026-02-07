import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, PlusCircle, Star, Trash2 } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format as formatDate } from "date-fns";
import type { FieldArrayWithId, UseFormReturn } from "react-hook-form";
import type { GoalsFormValues } from "@/components/profile/goal-helpers";
import { AchievedGoalsSection } from "@/components/profile/AchievedGoalsSection";

export type AchieveGoalState = {
  index: number;
  date: string;
};

type GoalFormSectionProps = {
  form: UseFormReturn<GoalsFormValues>;
  fields: FieldArrayWithId<GoalsFormValues, "goals", "id">[];
  isEditing: boolean;
  isMobile: boolean;
  onSubmit: (values: GoalsFormValues) => void;
  onAddNewGoal: () => void;
  onCancel: () => void;
  onSetPrimary: (index: number) => void;
  onRemove: (index: number) => void;
  onStartAchieve: (index: number) => void;
  achieveGoalState: AchieveGoalState | null;
  onAchieveDateChange: (date: string) => void;
  onConfirmAchievement: () => void;
  onCloseAchieveDialog: () => void;
  onUnachieve: (index: number) => void;
};

export function GoalFormSection({
  form,
  fields,
  isEditing,
  isMobile,
  onSubmit,
  onAddNewGoal,
  onCancel,
  onSetPrimary,
  onRemove,
  onStartAchieve,
  achieveGoalState,
  onAchieveDateChange,
  onConfirmAchievement,
  onCloseAchieveDialog,
  onUnachieve,
}: GoalFormSectionProps) {
  const allFields = fields.map((field, index) => ({ field, index }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {allFields.length > 0 ? (
          allFields.map(({ field, index }) => {
            const isCurrentGoalPrimary = form.watch(`goals.${index}.isPrimary`);
            const isAchieved = form.watch(`goals.${index}.achieved`);

            if (isEditing) {
              // In edit mode, we show active goals for editing
              if (!isAchieved) {
                return (
                  <Card key={field.id} className="p-4 border rounded-2xl shadow-sm bg-secondary/30 relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`goals.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Goal Description</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Build muscle, Lose 5 lbs, Run 5km" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`goals.${index}.targetDate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between mt-4 gap-4">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <Button
                          type="button"
                          variant={isCurrentGoalPrimary ? "default" : "outline"}
                          size="sm"
                          onClick={() => onSetPrimary(index)}
                          disabled={isCurrentGoalPrimary}
                          className={cn("whitespace-nowrap", isCurrentGoalPrimary && "disabled:opacity-100")}
                        >
                          {isCurrentGoalPrimary ? (
                            <>
                              <Star className="mr-2 h-4 w-4 fill-current" /> Primary Goal
                            </>
                          ) : (
                            "Set as Primary"
                          )}
                        </Button>

                        <Dialog onOpenChange={(open) => !open && onCloseAchieveDialog()}>
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => onStartAchieve(index)}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" /> Mark as Achieved
                            </Button>
                          </DialogTrigger>
                          {achieveGoalState?.index === index && (
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Congratulations!</DialogTitle>
                                <DialogDescription>
                                  When did you achieve the goal: &quot;{form.getValues(`goals.${index}.description`)}&quot;?
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <Label htmlFor="achieved-date">Date Achieved</Label>
                                <Input
                                  id="achieved-date"
                                  type="date"
                                  value={achieveGoalState.date}
                                  onChange={(e) => onAchieveDateChange(e.target.value)}
                                />
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button type="button" variant="outline" onClick={onCloseAchieveDialog}>
                                    Cancel
                                  </Button>
                                </DialogClose>
                                <Button type="button" onClick={onConfirmAchievement}>Save Achievement</Button>
                              </DialogFooter>
                            </DialogContent>
                          )}
                        </Dialog>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(index)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Remove Goal
                      </Button>
                    </div>
                  </Card>
                );
              }
            } else {
              // Display mode for active goals
              if (!field.achieved) {
                return (
                  <Card key={field.id} className="p-4 border rounded-2xl shadow-sm bg-secondary/30 transition-all hover:-translate-y-0.5 hover:bg-secondary/50 hover:shadow-md hover:shadow-primary/10">
                    <div className="text-sm">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-primary">
                          {field.isPrimary && <Star className="inline-block h-4 w-4 mr-2 fill-amber-400 text-amber-500" />} {field.description}
                        </p>
                      </div>
                      <p className="text-muted-foreground mt-1">
                        Target: {field.targetDate ? formatDate(new Date(field.targetDate.replace(/-/g, "/")), "MMMM d, yyyy") : "Not set"}
                      </p>
                    </div>
                  </Card>
                );
              }
            }
            return null;
          })
        ) : (
          <p className="text-sm text-center text-muted-foreground py-4">No active goals set. Add a new goal to get started!</p>
        )}

        <AchievedGoalsSection fields={fields} isEditing={isEditing} onUnachieve={onUnachieve} onRemove={onRemove} />

        <div className="pt-4 flex justify-start items-center">
          <Button
            type="button"
            variant="outline"
            onClick={onAddNewGoal}
            className="border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Goal
          </Button>
        </div>

        {isEditing && isMobile && (
          <div className="pt-6">
            <div className="flex w-full gap-2">
              <Button variant="outline" onClick={onCancel} className="w-full">
                Cancel
              </Button>
              <Button onClick={form.handleSubmit(onSubmit)} className="w-full">
                Save
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
