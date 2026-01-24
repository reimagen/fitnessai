import type { StrengthLevel } from '@/lib/types';
import type { ImbalanceFocus } from '@/lib/analysis.utils';

export const getLevelBadgeVariant = (level: StrengthLevel | null): 'secondary' | 'default' | 'destructive' | 'outline' => {
  if (!level) return 'outline';
  switch (level) {
    case 'Beginner':
      return 'destructive';
    case 'Intermediate':
      return 'secondary';
    case 'Advanced':
      return 'default';
    case 'Elite':
      return 'default';
    default:
      return 'outline';
  }
};

export const getTrendBadgeVariant = (trend: number | null): 'default' | 'destructive' | 'secondary' => {
  if (trend === null) return 'secondary';
  if (trend > 1) return 'default';
  if (trend < -1) return 'destructive';
  return 'secondary';
};

export const focusBadgeProps = (focus: ImbalanceFocus): { variant: 'secondary' | 'default' | 'destructive'; text: string } => {
  switch (focus) {
    case 'Level Imbalance':
      return { variant: 'default', text: 'Level Imbalance' };
    case 'Ratio Imbalance':
      return { variant: 'destructive', text: 'Ratio Imbalance' };
    case 'Balanced':
      return { variant: 'secondary', text: 'Balanced' };
    default:
      return { variant: 'secondary', text: 'Balanced' };
  }
};
