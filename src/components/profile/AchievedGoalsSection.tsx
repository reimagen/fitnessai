import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, Trash2, Undo2 } from "lucide-react";
import { format as formatDate } from "date-fns";
import type { FieldArrayWithId } from "react-hook-form";
import type { GoalsFormValues } from "@/components/profile/goal-helpers";

type AchievedGoalsSectionProps = {
  fields: FieldArrayWithId<GoalsFormValues, "goals", "id">[];
  isEditing: boolean;
  onUnachieve: (index: number) => void;
  onRemove: (index: number) => void;
};

export function AchievedGoalsSection({ fields, isEditing, onUnachieve, onRemove }: AchievedGoalsSectionProps) {
  const achievedCount = fields.filter(field => field.achieved).length;

  if (achievedCount === 0) {
    return null;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="achieved-goals" className="border rounded-md px-4 bg-secondary/30">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-semibold">
              View {achievedCount} Completed Goal{achievedCount > 1 ? "s" : ""}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2">
          <div className="space-y-3">
            {fields.map((field, index) => {
              if (!field.achieved) return null;
              return (
                <div key={field.id} className="flex items-center justify-between p-3 rounded-md bg-background/50 border">
                  <div className="flex flex-col">
                    <p className="font-medium text-foreground">{field.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Target: {field.targetDate ? formatDate(new Date(field.targetDate.replace(/-/g, "/")), "MMMM d, yyyy") : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Achieved on: {field.dateAchieved ? formatDate(new Date(field.dateAchieved.replace(/-/g, "/")), "MMMM d, yyyy") : "N/A"}
                    </p>
                  </div>
                  {isEditing && (
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onUnachieve(index)}
                              className="text-muted-foreground hover:bg-secondary h-8 w-8"
                              aria-label={`Un-achieve goal: ${field.description}`}
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Move to Active Goals</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onRemove(index)}
                              className="text-destructive hover:bg-destructive/10 h-8 w-8"
                              aria-label={`Remove goal: ${field.description}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Goal Permanently</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
