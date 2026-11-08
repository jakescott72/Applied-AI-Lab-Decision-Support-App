import { DcListing, NeighborhoodStats, AuditTrailDetails } from '../types';

/**
 * Computes exact mathematical median with audit trail metadata.
 */
export function calculateMedianWithAudit(values: number[]): {
  median: number;
  sorted: number[];
  middleIndices: number[];
  formula: string;
  stepByStep: string[];
} {
  if (!values || values.length === 0) {
    return {
      median: 0,
      sorted: [],
      middleIndices: [],
      formula: 'No data points available',
      stepByStep: ['Empty dataset: 0 rows.'],
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  if (n % 2 === 1) {
    const midIdx = Math.floor(n / 2);
    const median = sorted[midIdx];
    return {
      median,
      sorted,
      middleIndices: [midIdx],
      formula: `Median = Sorted[(N - 1) / 2] = Sorted[(${n} - 1) / 2] = Sorted[${midIdx}] = $${median.toFixed(2)}`,
      stepByStep: [
        `Identified ${n} total data points for the selected cohort.`,
        `Sorted values in ascending order from lowest ($${sorted[0]}) to highest ($${sorted[n - 1]}).`,
        `Since sample size N = ${n} is an odd number, the median is the exact middle element at index ${(n - 1) / 2}.`,
        `Selected element index ${midIdx} which equals $${median.toFixed(2)}.`,
      ],
    };
  } else {
    const idx1 = n / 2 - 1;
    const idx2 = n / 2;
    const val1 = sorted[idx1];
    const val2 = sorted[idx2];
    const median = (val1 + val2) / 2;
    return {
      median,
      sorted,
      middleIndices: [idx1, idx2],
      formula: `Median = (Sorted[N/2 - 1] + Sorted[N/2]) / 2 = ($${val1} + $${val2}) / 2 = $${median.toFixed(2)}`,
      stepByStep: [
        `Identified ${n} total data points for the selected cohort.`,
        `Sorted values in ascending order from lowest ($${sorted[0]}) to highest ($${sorted[n - 1]}).`,
        `Since sample size N = ${n} is an even number, the median is the arithmetic mean of the two central numbers at indices ${idx1} and ${idx2}.`,
        `Calculated average: ($${val1} + $${val2}) / 2 = $${median.toFixed(2)}.`,
      ],
    };
  }
}

/**
 * Calculates a specific percentile (0-100) using linear interpolation.
 */
export function calculatePercentile(values: number[], p: number): number {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];

  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Generates an AuditTrailDetails object for any metric.
 */
export function createAuditTrail(
  title: string,
  metricName: string,
  neighborhood: string,
  listings: DcListing[],
  metricKey: 'price' | 'minimum_nights' | 'number_of_reviews' | 'availability_365',
  unitPrefix = '$',
  unitSuffix = ''
): AuditTrailDetails {
  const values = listings.map((l) => l[metricKey]);
  const audit = calculateMedianWithAudit(values);

  return {
    title,
    metricName,
    formattedValue: `${unitPrefix}${audit.median.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${unitSuffix}`,
    rawValue: audit.median,
    neighborhood,
    filterDescription: `All 1-Bedroom properties in ${neighborhood}`,
    formula: audit.formula,
    explanation: `Calculated dynamically from ${listings.length} verified listings in ${neighborhood}. The median represents the exact 50th percentile threshold, insulating our client recommendations from extreme luxury penthouse outliers or distressed crash pricing.`,
    stepByStep: audit.stepByStep,
    rowCount: listings.length,
    sortedNumbers: audit.sorted,
    middleIndices: audit.middleIndices,
    listings,
  };
}

/**
 * Aggregates statistics for a given neighborhood's listings.
 */
export function computeNeighborhoodStats(neighborhood: string, listings: DcListing[]): NeighborhoodStats {
  const filtered = listings.filter((l) => l.neighborhood_cleansed === neighborhood);
  const prices = filtered.map((l) => l.price);
  const minNights = filtered.map((l) => l.minimum_nights);
  const reviews = filtered.map((l) => l.number_of_reviews);
  const availabilities = filtered.map((l) => l.availability_365);

  const priceAudit = calculateMedianWithAudit(prices);
  const minNightsAudit = calculateMedianWithAudit(minNights);
  const reviewsAudit = calculateMedianWithAudit(reviews);
  const availAudit = calculateMedianWithAudit(availabilities);

  const sumPrices = prices.reduce((acc, curr) => acc + curr, 0);
  const meanPrice = prices.length > 0 ? sumPrices / prices.length : 0;
  const p25Price = calculatePercentile(prices, 25);
  const p75Price = calculatePercentile(prices, 75);
  const iqrPrice = p75Price - p25Price;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  // Estimated annual booked nights: Using standard short-term rental market model
  // Days booked ≈ 365 - availability_365 (constrained between 45 and 330 nights)
  const medianAvail = availAudit.median;
  const estimatedBookedNights = Math.max(45, Math.min(330, Math.round(365 - medianAvail)));
  const occupancyRate = estimatedBookedNights / 365;

  let occupancyTier: import('../types').OccupancyTier;
  if (occupancyRate >= 0.70) {
    occupancyTier = 'High Demand (≥70%)';
  } else if (occupancyRate >= 0.55) {
    occupancyTier = 'Balanced (55–69%)';
  } else {
    occupancyTier = 'Selective (<55%)';
  }

  const estAnnualGrossRevenue = priceAudit.median * estimatedBookedNights;

  return {
    neighborhood,
    count: filtered.length,
    medianPrice: priceAudit.median,
    meanPrice,
    p25Price,
    p75Price,
    iqrPrice,
    minPrice,
    maxPrice,
    medianMinNights: minNightsAudit.median,
    medianReviews: reviewsAudit.median,
    medianAvailability: availAudit.median,
    estAnnualBookedNights: estimatedBookedNights,
    occupancyRate,
    occupancyTier,
    estAnnualGrossRevenue,
    rawListings: filtered,
  };
}

