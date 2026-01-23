import type { StrengthLevel } from '@/lib/types';
import { BadgeProps } from '@/components/ui/badge';

export type ImbalanceFocus = 'Balanced' | 'Level Imbalance' | 'Ratio Imbalance';

export const focusBadgeProps = (focus: ImbalanceFocus): { variant: BadgeProps['variant'], text: string } => {
    switch (focus) {
        case 'Level Imbalance': return { variant: 'default', text: 'Level Imbalance' };
        case 'Ratio Imbalance': return { variant: 'destructive', text: 'Ratio Imbalance' };
        case 'Balanced': return { variant: 'secondary', text: 'Balanced' };
        default: return { variant: 'secondary', text: 'Balanced' };
    }
};

export const strengthLevelRanks: Record<StrengthLevel, number> = {
  'Beginner': 0, 'Intermediate': 1, 'Advanced': 2, 'Elite': 3, 'N/A': -1,
};