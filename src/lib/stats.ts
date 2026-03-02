/**
 * A/B Test Statistical Significance
 *
 * Two-proportion z-test to determine if the difference between
 * variant A and variant B conversion rates is statistically significant.
 */

export interface SignificanceResult {
	significant: boolean;
	confidence: number;      // e.g. 95, 99
	pValue: number;
	zScore: number;
	lift: number;            // % improvement of winner over loser
	winnerLabel: string;     // 'A', 'B', or '—'
	sampleSizeOk: boolean;   // both variants have 30+ delivered
}

/**
 * Approximate the standard normal CDF using Abramowitz & Stegun formula 7.1.26.
 * Accurate to ~1.5e-7 for all z.
 */
function normalCdf(z: number): number {
	if (z < -8) return 0;
	if (z > 8) return 1;

	const a1 = 0.254829592;
	const a2 = -0.284496736;
	const a3 = 1.421413741;
	const a4 = -1.453152027;
	const a5 = 1.061405429;
	const p = 0.3275911;

	const sign = z < 0 ? -1 : 1;
	const x = Math.abs(z) / Math.SQRT2;
	const t = 1.0 / (1.0 + p * x);
	const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

	return 0.5 * (1.0 + sign * y);
}

/**
 * Two-proportion z-test.
 *
 * Tests H0: pA = pB vs H1: pA ≠ pB (two-tailed).
 *
 * @param successA - conversions in variant A (opens, clicks, etc.)
 * @param nA       - total delivered in variant A
 * @param successB - conversions in variant B
 * @param nB       - total delivered in variant B
 */
export function twoProportionZTest(
	successA: number,
	nA: number,
	successB: number,
	nB: number
): SignificanceResult {
	const MIN_SAMPLE = 30;

	// Not enough data
	if (nA < MIN_SAMPLE || nB < MIN_SAMPLE) {
		return {
			significant: false,
			confidence: 0,
			pValue: 1,
			zScore: 0,
			lift: 0,
			winnerLabel: '—',
			sampleSizeOk: false,
		};
	}

	const pA = successA / nA;
	const pB = successB / nB;

	// Pooled proportion
	const pPool = (successA + successB) / (nA + nB);

	// Edge case: no conversions or all conversions in both
	if (pPool === 0 || pPool === 1) {
		return {
			significant: false,
			confidence: 0,
			pValue: 1,
			zScore: 0,
			lift: 0,
			winnerLabel: pA === pB ? '—' : (pA > pB ? 'A' : 'B'),
			sampleSizeOk: true,
		};
	}

	// Standard error
	const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));

	// Z-score
	const z = (pA - pB) / se;

	// Two-tailed p-value
	const pValue = 2 * (1 - normalCdf(Math.abs(z)));

	// Confidence level
	let confidence = 0;
	if (pValue < 0.01) confidence = 99;
	else if (pValue < 0.05) confidence = 95;
	else if (pValue < 0.10) confidence = 90;

	// Lift (% improvement of winner over loser)
	const winnerLabel = pA > pB ? 'A' : pB > pA ? 'B' : '—';
	const loserRate = winnerLabel === 'A' ? pB : pA;
	const lift = loserRate > 0
		? ((Math.abs(pA - pB) / loserRate) * 100)
		: (Math.abs(pA - pB) > 0 ? 100 : 0);

	return {
		significant: pValue < 0.05,
		confidence,
		pValue,
		zScore: z,
		lift: Math.round(lift * 10) / 10,
		winnerLabel,
		sampleSizeOk: true,
	};
}
