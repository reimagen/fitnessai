import { Badge } from "@/components/ui/badge";
import type { StrengthLevel } from "@/lib/types";

type StrengthLevelBadgeProps = {
  level: StrengthLevel;
};

const levelToBadgeVariant = (level: StrengthLevel) => {
  switch (level) {
    case "Beginner":
      return "destructive";
    case "Intermediate":
      return "secondary";
    case "Advanced":
      return "accent";
    case "Elite":
      return "default";
    default:
      return "outline";
  }
};

export function StrengthLevelBadge({ level }: StrengthLevelBadgeProps) {
  if (level === "N/A") return null;
  return <Badge variant={levelToBadgeVariant(level)}>{level}</Badge>;
}
