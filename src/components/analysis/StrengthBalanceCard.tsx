import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Lightbulb, Scale } from 'lucide-react';
import { format } from 'date-fns/format';
import React from 'react';
import type { PersonalRecord, StrengthFinding, StrengthImbalanceOutput, UserProfile, StrengthLevel, StrengthImbalanceInput } from '@/lib/types';
import type { ImbalanceType } from '@/lib/analysis.config';
import { useAnalyzeStrength } from '@/lib/firestore.service';
import { useToast } from '@/hooks/use-toast';
import { IMBALANCE_CONFIG, IMBALANCE_TYPES, findBestPr, toTitleCase } from '@/lib/analysis.config';
import { getStrengthLevel, getStrengthRatioStandards } from '@/lib/strength-standards';
import { focusBadgeProps, strengthLevelRanks, type ImbalanceFocus } from '@/lib/analysis.utils';

interface StrengthBalanceCardProps {
  isLoading: boolean;
  isError: boolean;
  userProfile: UserProfile | undefined;
  personalRecords: PersonalRecord[] | undefined;
  strengthAnalysis: { result: StrengthImbalanceOutput; generatedDate: Date } | undefined;
}

const StrengthBalanceCard: React.FC<StrengthBalanceCardProps> = ({
  isLoading,
  isError,
  userProfile,
  personalRecords,
  strengthAnalysis,
}) => {
  const { toast } = useToast();
  const analyzeStrengthMutation = useAnalyzeStrength();

  const clientSideFindings = React.useMemo<(StrengthFinding | { imbalanceType: ImbalanceType; hasData: false })[]>(() => {
    if (!personalRecords || !userProfile || !userProfile.gender) {
      return [];
    }
    const findings: (StrengthFinding | { imbalanceType: ImbalanceType; hasData: false })[] = [];


    IMBALANCE_TYPES.forEach(type => {
        const config = IMBALANCE_CONFIG[type];
        const lift1 = findBestPr(personalRecords, config.lift1Options);
        const lift2 = findBestPr(personalRecords, config.lift2Options);

        if (!lift1 || !lift2) {
             findings.push({ imbalanceType: type, hasData: false });
             return;
        };

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
        const guidingLevel: StrengthLevel = Object.keys(strengthLevelRanks).find(key => strengthLevelRanks[key as StrengthLevel] === guidingLevelRank) as StrengthLevel || 'N/A';
        
        const ratioStandards = getStrengthRatioStandards(type, userProfile.gender as 'Male' | 'Female', guidingLevel);
        
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

  const handleAnalyzeStrength = () => {
    if (!userProfile) {
        toast({ title: "Profile Not Loaded", description: "Your user profile is not available. Please try again.", variant: "destructive" });
        return;
    }
    const validFindings = clientSideFindings.filter(f => !('hasData' in f)) as StrengthFinding[];

    const analysisInput: StrengthImbalanceInput = {
        clientSideFindings: validFindings.map(f => ({
            ...f,
            targetRatio: f.targetRatio,
        })),
        userProfile: {
            age: userProfile.age,
            gender: userProfile.gender,
            weightValue: userProfile.weightValue,
            weightUnit: userProfile.weightUnit,
            skeletalMuscleMassValue: userProfile.skeletalMuscleMassValue,
            skeletalMuscleMassUnit: userProfile.skeletalMuscleMassUnit,
            fitnessGoals: (userProfile.fitnessGoals || [])
              .filter(g => !g.achieved)
              .map(g => ({
                description: g.description,
                isPrimary: g.isPrimary || false,
              })),
        }
    };

    analyzeStrengthMutation.mutate(analysisInput);
  };



  const analysisToRender = strengthAnalysis?.result;
  const generatedDate = strengthAnalysis?.generatedDate;

  return (
    <Card className="shadow-lg lg:col-span-6">
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-grow">
            <CardTitle className="font-headline flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" />Strength Balance Analysis
            </CardTitle>
            <CardDescription className="mt-2">
              Applying a balanced approach to strength training protects you from injury. Uses your PRs for analysis.
              {generatedDate && (
                <span className="block text-xs mt-1 text-muted-foreground/80">
                  Last analysis on: {format(generatedDate, "MMMM d, yyyy 'at' h:mm a")}
                </span>
              )}
            </CardDescription>
          </div>
          <Button onClick={handleAnalyzeStrength} disabled={analyzeStrengthMutation.isPending || isLoading || clientSideFindings.length === 0} className="flex-shrink-0 w-full md:w-auto">
            {analyzeStrengthMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4" />}
            {strengthAnalysis ? "Re-analyze Insights" : "Get AI Insights"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {isLoading ? ( // Use the isLoading prop passed from the parent
            <div className="text-center text-muted-foreground p-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto"/>
            </div>
        ) : (
            <div className="w-full space-y-4">
                {analysisToRender?.summary && analysisToRender.findings.length > 0 && (
                    <p className="text-center text-muted-foreground italic text-sm">{analysisToRender.summary}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {IMBALANCE_TYPES.map((type, index) => {
                        const finding = clientSideFindings.find(f => f.imbalanceType === type);
                        if (!finding) return null;

                        if ('hasData' in finding && !finding.hasData) {
                            const config = IMBALANCE_CONFIG[type];
                            const requirements = `Requires: ${config.lift1Options.map(toTitleCase).join('/')} & ${config.lift2Options.map(toTitleCase).join('/')}`;
                            return (
                                <Card key={index} className="p-4 bg-secondary/50 flex flex-col">
                                    <CardTitle className="text-base flex items-center justify-between">{type} <Badge variant="secondary">No Data</Badge></CardTitle>
                                    <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground my-4">
                                        <Scale className="h-8 w-8 text-muted-foreground/50 mb-2"/>
                                        <p className="text-sm font-semibold">Log PRs to analyze</p>
                                        <p className="text-xs mt-1">{requirements}</p>
                                    </div>
                                </Card>
                            );
                        }
                        
                        const dataFinding = finding as StrengthFinding;
                        const aiFinding = analysisToRender ? analysisToRender.findings.find(f => f.imbalanceType === dataFinding.imbalanceType) : undefined;
                        const badgeProps = focusBadgeProps(dataFinding.imbalanceFocus);
                        
                        return (
                            <Card key={index} className="p-4 bg-secondary/50 flex flex-col">
                                <CardTitle className="text-base">{dataFinding.imbalanceType}</CardTitle>
                                <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 pb-4">
                                    <p>{dataFinding.lift1Name}: <span className="font-bold text-foreground">{dataFinding.lift1Weight} {dataFinding.lift1Unit}</span></p>
                                    <p>{dataFinding.lift2Name}: <span className="font-bold text-foreground">{dataFinding.lift2Weight} {dataFinding.lift2Unit}</span></p>
                                    <p>Level: <span className="font-medium text-foreground capitalize">{dataFinding.lift1Level !== 'N/A' ? dataFinding.lift1Level : 'N/A'}</span></p>
                                    <p>Level: <span className="font-medium text-foreground capitalize">{dataFinding.lift2Level !== 'N/A' ? dataFinding.lift2Level : 'N/A'}</span></p>
                                    <p>Your Ratio: <span className="font-bold text-foreground">{dataFinding.userRatio}</span></p>
                                    <p>Balanced Range: <span className="font-bold text-foreground">{dataFinding.balancedRange}</span></p>
                                </div>
                                
                                <div className="pt-4 mt-auto border-t flex flex-col flex-grow">
                                    <div className="flex-grow">
                                        {analyzeStrengthMutation.isPending ? (
                                            <div className="flex items-center justify-center text-muted-foreground text-sm">
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating AI insight...
                                            </div>
                                        ) : aiFinding ? (
                                        <div className="space-y-3">
                                                <div className="mb-4">
                                                    <Badge variant={badgeProps.variant}>{badgeProps.text}</Badge>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />Insight</p>
                                                    <p className="text-xs text-muted-foreground mt-1">{aiFinding.insight}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-accent" />Recommendation</p>
                                                    <p className="text-xs text-muted-foreground mt-1">{aiFinding.recommendation}</p>
                                                </div>
                                        </div>
                                        ) : dataFinding.imbalanceFocus !== 'Balanced' ? (
                                            <div>
                                                <div className="mb-4">
                                                    <Badge variant={badgeProps.variant}>{badgeProps.text}</Badge>
                                                </div>
                                                <p className="text-center text-muted-foreground text-xs">This appears imbalanced. Click "Get AI Insights" for analysis.</p>
                                            </div>
                                        ) : (() => {
                                              const currentLevel = dataFinding.lift1Level;
                                              if (currentLevel === 'N/A' || currentLevel === 'Elite') {
                                                  return null;
                                              }
                                              return (
                                                  <div>
                                                      <div className="mb-4">
                                                          <Badge variant={badgeProps.variant}>{badgeProps.text}</Badge>
                                                      </div>
                                                      {(() => {
                                                          let nextLevel: string | null = null;
                                                          if (currentLevel === 'Beginner') nextLevel = 'Intermediate';
                                                          else if (currentLevel === 'Intermediate') nextLevel = 'Advanced';
                                                          else if (currentLevel === 'Advanced') nextLevel = 'Elite';

                                                          if (nextLevel) {
                                                              return (
                                                                  <>
                                                                      <p className="text-sm font-semibold flex items-center gap-2">Next Focus</p>
                                                                      <p className="text-xs text-muted-foreground mt-1">
                                                                          Your lifts are well-balanced. Focus on progressive overload to advance both lifts towards the <span className="font-bold text-foreground">{currentLevel}</span> to <span className="font-bold text-foreground">{nextLevel}</span>.
                                                                      </p>
                                                                  </>
                                                              );
                                                          }
                                                          return null;
                                                      })()}
                                                  </div>
                                              );
                                          })()
                                        }
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StrengthBalanceCard;
