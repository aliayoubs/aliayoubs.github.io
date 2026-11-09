/** TON 618: Adaptive, exploratory indicator index. Not a needs prevalence or allocation priority. */
import type { Factor, FactorId } from './aidEvidenceFormula.ts';

export type AdaptiveEvidenceStatus = 'unavailable' | 'single-indicator' | 'partial' | 'complete';
export type AdaptiveContribution = {id: FactorId; label: string; originalWeight: number; adjustedWeight: number; score: number};
export type AdaptiveEvidence = {
  status: AdaptiveEvidenceStatus;
  observedScore: number | null;
  observedWeight: number;
  missing: FactorId[];
  completeScore: number | null;
  used: AdaptiveContribution[];
  unavailableCount: number;
};

/**
 * Compute Σ(wᵢ sᵢ)/Σ(wᵢ) over the AVAILABLE indicators only.
 * A true recorded zero is valid; missing/invalid factors are excluded, never replaced by zero.
 * The score is exploratory; scores based on different subsets must not be ranked against each other.
 */
export function adaptiveFactorAssessment(factors: readonly Factor[]): AdaptiveEvidence {
  const available = factors.filter(f => f.score !== null && Number.isFinite(f.score) &&
    (f.score as number) >= 0 && (f.score as number) <= 1 && Number.isFinite(f.weight) && f.weight > 0);
  const observedWeight = available.reduce((sum, f) => sum + f.weight, 0);
  const used = observedWeight > 0 ? available.map(f => ({
    id: f.id, label: f.label, originalWeight: f.weight,
    adjustedWeight: f.weight / observedWeight, score: f.score as number,
  })) : [];
  const observedScore = used.length ? used.reduce((sum, f) => sum + f.adjustedWeight * f.score, 0) : null;
  const missing = factors.filter(f => !available.includes(f)).map(f => f.id);
  const status: AdaptiveEvidenceStatus = !used.length ? 'unavailable'
    : used.length === 1 ? 'single-indicator'
    : missing.length ? 'partial' : 'complete';
  return {
    status, observedScore, observedWeight, missing, used, unavailableCount: missing.length,
    completeScore: status === 'complete' ? observedScore : null,
  };
}
