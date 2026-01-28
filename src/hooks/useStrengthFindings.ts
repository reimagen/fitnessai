import { useMemo } from 'react';
import type { PersonalRecord, StrengthFinding, StrengthLevel } from '@/lib/types';
import type { ImbalanceType } from '@/lib/analysis.config';
import { IMBALANCE_TYPES, IMBALANCE_CONFIG, findBestPr, toTitleCase } from '@/lib/analysis.config';
import { getStrengthLevel, getStrengthRatioStandards } from '@/lib/strength-standards';
import type { UserProfile } from '@/lib/types';
import type { ImbalanceFocus } from '@/lib/analysis.utils';

export function useStrengthFindings(
  personalRecords: PersonalRecord[] | undefined,
  userProfile: UserProfile | undefined
) {
  const clientSideFindings = useMemo<(StrengthFinding | { imbalanceType: ImbalanceType; hasData: false })[]>(() => {
    if (!personalRecords || !userProfile || !userProfile.gender) {
      return [];
    }

    const findings: (StrengthFinding | { imbalanceType: ImbalanceType; hasData: false })[] = [];
    const strengthLevelRanks: Record<string, number> = {
      'Beginner': 0,
      'Intermediate': 1,
      'Advanced': 2,
      'Elite': 3,
      'N/A': -1,
    };

    IMBALANCE_TYPES.forEach(type => {
      const config = IMBALANCE_CONFIG[type];
      const lift1 = findBestPr(personalRecords, config.lift1Options);
      const lift2 = findBestPr(personalRecords, config.lift2Options);

      if (!lift1 || !lift2) {
        findings.push({ imbalanceType: type, hasData: false });
        return;
      }

      const lift1Level = getStrengthLevel(lift1, userProfile);
      const lift2Level = getStrengthLevel(lift2, userProfile);

      const lift1WeightKg = lift1.weightUnit === 'lbs' ? lift1.weight * 0.453592 : lift1.weight;
      const lift2WeightKg = lift2.weightUnit === 'lbs' ? lift2.weight * 0.453592 : lift2.weight;

      if (lift2WeightKg === 0) {
        findings.push({ imbalanceType: type, hasData: false });
        return;
      }

      const ratio = config.ratioCalculation(lift1WeightKg, lift2WeightKg);

      const rank1 = strengthLevelRanks[lift1Level];
      const rank2 = strengthLevelRanks[lift2Level];
      const guidingLevelRank = (rank1 === -1 || rank2 === -1) ? -1 : Math.min(rank1, rank2);
      const guidingLevel =
        (Object.entries(strengthLevelRanks).find(([, rank]) => rank === guidingLevelRank)?.[0] as StrengthLevel) || 'N/A';

      const ratioStandards = getStrengthRatioStandards(
        type,
        userProfile.gender as 'Male' | 'Female',
        guidingLevel
      );

      const balancedRangeDisplay = ratioStandards
        ? `${ratioStandards.lowerBound.toFixed(2)}-${ratioStandards.upperBound.toFixed(2)}:1`
        : 'N/A';

      const targetRatioDisplay = ratioStandards ? `${ratioStandards.targetRatio.toFixed(2)}:1` : 'N/A';

      let imbalanceFocus: ImbalanceFocus = 'Balanced';
      let ratioIsUnbalanced = false;

      if (ratioStandards) {
        ratioIsUnbalanced = ratio < ratioStandards.lowerBound || ratio > ratioStandards.upperBound;
      }

      if (lift1Level !== 'N/A' && lift2Level !== 'N/A' && lift1Level !== lift2Level) {
        imbalanceFocus = 'Level Imbalance';
      } else if (ratioIsUnbalanced) {
        imbalanceFocus = 'Ratio Imbalance';
      }

      findings.push({
        imbalanceType: type,
        lift1Name: toTitleCase(lift1.exerciseName),
        lift1Weight: lift1.weight,
        lift1Unit: lift1.weightUnit,
        lift2Name: toTitleCase(lift2.exerciseName),
        lift2Weight: lift2.weight,
        lift2Unit: lift2.weightUnit,
        userRatio: `${ratio.toFixed(2)}:1`,
        targetRatio: targetRatioDisplay,
        balancedRange: balancedRangeDisplay,
        imbalanceFocus: imbalanceFocus,
        lift1Level,
        lift2Level,
      });
    });

    return findings;
  }, [personalRecords, userProfile]);

  return clientSideFindings;
}
