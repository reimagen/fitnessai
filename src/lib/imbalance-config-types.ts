import { z } from 'zod';
import type { ImbalanceType } from '@/analysis/analysis.config';

const IMBALANCE_TYPE_VALUES = [
  'Horizontal Push vs. Pull',
  'Vertical Push vs. Pull',
  'Hamstring vs. Quad',
  'Adductor vs. Abductor',
] as const;

export type ImbalancePairConfig = {
  imbalanceType: ImbalanceType;
  lift1CanonicalId: string;
  lift2CanonicalId: string;
  displayNameOverride?: string;
  isActive?: boolean;
};

export type ImbalanceConfigDocument = {
  version: number;
  updatedAt: unknown;
  updatedBy: string;
  pairs: ImbalancePairConfig[];
};

export type ImbalanceConfigLoadResult = {
  pairs: ImbalancePairConfig[];
  source: 'firestore' | 'fallback';
  version: number | null;
  validationIssueCount: number;
};

export const ImbalancePairConfigSchema = z.object({
  imbalanceType: z.enum(IMBALANCE_TYPE_VALUES),
  lift1CanonicalId: z.string().min(1),
  lift2CanonicalId: z.string().min(1),
  displayNameOverride: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

const TimestampLikeSchema = z.object({
  toDate: z.function().returns(z.date()),
});

export const ImbalanceConfigDocumentSchema = z.object({
  version: z.number().int().nonnegative(),
  // Firestore Timestamp in admin SDK shape; allow Date/string for resilience.
  updatedAt: z.union([z.date(), z.string(), TimestampLikeSchema]).optional(),
  updatedBy: z.string().min(1),
  pairs: z.array(ImbalancePairConfigSchema).min(1),
});
