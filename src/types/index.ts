export interface DcListing {
  id: string | number;
  neighborhood_cleansed: string;
  raw_neighborhood?: string;
  price: number;
  minimum_nights: number;
  number_of_reviews: number;
  availability_365: number;
  property_type?: string;
}

export type OccupancyTier = 'High Demand (≥70%)' | 'Balanced (55–69%)' | 'Selective (<55%)';

export interface NeighborhoodStats {
  neighborhood: string;
  count: number;
  medianPrice: number;
  meanPrice: number;
  p25Price: number;
  p75Price: number;
  iqrPrice: number;
  minPrice: number;
  maxPrice: number;
  medianMinNights: number;
  medianReviews: number;
  medianAvailability: number;
  estAnnualBookedNights: number;
  occupancyRate: number;
  occupancyTier: OccupancyTier;
  estAnnualGrossRevenue: number;
  rawListings: DcListing[];
}

export interface AuditTrailDetails {
  title: string;
  metricName: string;
  formattedValue: string;
  rawValue: number;
  neighborhood: string;
  filterDescription: string;
  formula: string;
  explanation: string;
  stepByStep: string[];
  rowCount: number;
  sortedNumbers: number[];
  middleIndices: number[];
  listings: DcListing[];
}
