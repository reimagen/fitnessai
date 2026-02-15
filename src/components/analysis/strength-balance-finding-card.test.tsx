import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/utils';
import type { StrengthFinding, StrengthImbalanceOutput } from '@/lib/types';
import { StrengthBalanceFindingCard } from './StrengthBalanceFindingCard';

const ratioFinding: StrengthFinding = {
  imbalanceType: 'Horizontal Push vs. Pull',
  lift1Name: 'Machine Chest Press',
  lift1Weight: 200,
  lift1Unit: 'lbs',
  lift1SessionCount: 2,
  lift2Name: 'Seated Row',
  lift2Weight: 100,
  lift2Unit: 'lbs',
  lift2SessionCount: 2,
  userRatio: '1.35:1',
  targetRatio: '1.00:1',
  balancedRange: '0.90-1.10:1',
  imbalanceFocus: 'Ratio Imbalance',
  lift1Level: 'Advanced',
  lift2Level: 'Intermediate',
};

const balancedFinding: StrengthFinding = {
  ...ratioFinding,
  userRatio: '1.00:1',
  imbalanceFocus: 'Balanced',
  lift1Level: 'Intermediate',
  lift2Level: 'Intermediate',
};

const aiFinding: StrengthImbalanceOutput['findings'][number] = {
  imbalanceType: 'Horizontal Push vs. Pull',
  lift1Name: 'Machine Chest Press',
  lift1Weight: 200,
  lift1Unit: 'lbs',
  lift2Name: 'Seated Row',
  lift2Weight: 100,
  lift2Unit: 'lbs',
  userRatio: '1.35:1',
  targetRatio: '1.00:1',
  balancedRange: '0.90-1.10:1',
  imbalanceFocus: 'Ratio Imbalance',
  insight: 'Insight text',
  recommendation: 'Recommendation text',
};

describe('StrengthBalanceFindingCard', () => {
  it('renders no-data state', () => {
    render(
      <StrengthBalanceFindingCard
        type="Horizontal Push vs. Pull"
        finding={{ imbalanceType: 'Horizontal Push vs. Pull', hasData: false }}
        aiFinding={undefined}
        isAnalyzing={false}
      />
    );

    expect(screen.getByText('No Data')).toBeInTheDocument();
    expect(screen.getByText('Log workouts to analyze')).toBeInTheDocument();
  });

  it('renders missing lift names when provided in no-data state', () => {
    render(
      <StrengthBalanceFindingCard
        type="Horizontal Push vs. Pull"
        finding={{
          imbalanceType: 'Horizontal Push vs. Pull',
          hasData: false,
          missingLifts: ['Leg Extension'],
        }}
        aiFinding={undefined}
        isAnalyzing={false}
      />
    );

    expect(screen.getByText('Missing: Leg Extension')).toBeInTheDocument();
  });

  it('renders multiple missing lifts in no-data state', () => {
    render(
      <StrengthBalanceFindingCard
        type="Horizontal Push vs. Pull"
        finding={{
          imbalanceType: 'Horizontal Push vs. Pull',
          hasData: false,
          missingLifts: ['missing-canonical-id', 'Seated Row'],
        }}
        aiFinding={undefined}
        isAnalyzing={false}
      />
    );

    expect(screen.getByText('Missing: missing-canonical-id, Seated Row')).toBeInTheDocument();
  });

  it('renders imbalance CTA when no AI finding exists', () => {
    render(
      <StrengthBalanceFindingCard
        type="Horizontal Push vs. Pull"
        finding={ratioFinding}
        aiFinding={undefined}
        isAnalyzing={false}
      />
    );

    expect(screen.getByText('Ratio Imbalance')).toBeInTheDocument();
    expect(
      screen.getByText('This appears imbalanced. Click "Get AI Insights" for analysis.')
    ).toBeInTheDocument();
    expect(screen.getByText('High Risk')).toBeInTheDocument();
  });

  it('renders AI insight and recommendation when aiFinding exists', () => {
    render(
      <StrengthBalanceFindingCard
        type="Horizontal Push vs. Pull"
        finding={ratioFinding}
        aiFinding={aiFinding}
        isAnalyzing={false}
      />
    );

    expect(screen.getByText('Insight')).toBeInTheDocument();
    expect(screen.getByText('Recommendation')).toBeInTheDocument();
    expect(screen.getByText('Insight text')).toBeInTheDocument();
    expect(screen.getByText('Recommendation text')).toBeInTheDocument();
  });

  it('renders balanced next-focus guidance when no AI finding exists', () => {
    render(
      <StrengthBalanceFindingCard
        type="Horizontal Push vs. Pull"
        finding={balancedFinding}
        aiFinding={undefined}
        isAnalyzing={false}
      />
    );

    expect(screen.getByText('Balanced')).toBeInTheDocument();
    expect(screen.getByText('Next Focus')).toBeInTheDocument();
    expect(screen.getByText(/Focus on progressive overload/)).toBeInTheDocument();
    expect(screen.queryByText('High Risk')).not.toBeInTheDocument();
  });

  it('renders non-empty fallback for balanced N/A levels', () => {
    render(
      <StrengthBalanceFindingCard
        type="Horizontal Push vs. Pull"
        finding={{ ...balancedFinding, lift1Level: 'N/A', lift2Level: 'N/A' }}
        aiFinding={undefined}
        isAnalyzing={false}
      />
    );

    expect(
      screen.getByText(
        'Your lifts are well-balanced. Keep training consistently and logging workouts to maintain this balance.'
      )
    ).toBeInTheDocument();
  });
});
