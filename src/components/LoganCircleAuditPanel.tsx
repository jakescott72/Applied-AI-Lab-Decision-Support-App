import React, { useState, useMemo } from 'react';
import { HelpCircle, DollarSign, Calendar, ShieldCheck, ChevronRight, CheckCircle2, TrendingUp, Sliders, ArrowUpRight } from 'lucide-react';
import { DcListing, AuditTrailDetails } from '../types';
import { calculateMedianWithAudit, calculatePercentile, createAuditTrail } from '../utils/math';

interface LoganCircleAuditPanelProps {
  listings: DcListing[];
  onOpenAudit: (audit: AuditTrailDetails) => void;
  onViewAllComps: () => void;
}

export const LoganCircleAuditPanel: React.FC<LoganCircleAuditPanelProps> = ({
  listings,
  onOpenAudit,
  onViewAllComps,
}) => {
  // Extract strictly Logan Circle 1-BR comps
  const loganComps = useMemo(() => {
    return listings.filter((l) => l.neighborhood_cleansed === 'Logan Circle');
  }, [listings]);

  const prices = useMemo(() => loganComps.map((l) => l.price), [loganComps]);

  // Dynamic statistics strictly calculated
  const priceAudit = useMemo(() => calculateMedianWithAudit(prices), [prices]);
  const p25Price = useMemo(() => Math.round(calculatePercentile(prices, 25)), [prices]);
  const medianPrice = useMemo(() => Math.round(priceAudit.median), [priceAudit]);
  const p75Price = useMemo(() => Math.round(calculatePercentile(prices, 75)), [prices]);
  const minPrice = useMemo(() => (prices.length > 0 ? Math.min(...prices) : 0), [prices]);
  const maxPrice = useMemo(() => (prices.length > 0 ? Math.max(...prices) : 0), [prices]);

  // High-velocity cohort: units with <= 3 min nights and >= 40 reviews
  const highVelocityComps = useMemo(() => {
    return loganComps.filter((l) => l.minimum_nights <= 3 && l.number_of_reviews >= 40);
  }, [loganComps]);

  const highVelocityPriceAudit = useMemo(() => {
    return calculateMedianWithAudit(highVelocityComps.map((l) => l.price));
  }, [highVelocityComps]);

  // Default booked nights derived from Logan Circle median availability: 365 - medianAvailability
  const defaultBookedNights = useMemo(() => {
    const availAudit = calculateMedianWithAudit(loganComps.map((l) => l.availability_365));
    return Math.max(90, Math.min(300, Math.round(365 - availAudit.median)));
  }, [loganComps]);

  // Interactive Revenue Scenario State
  const [selectedStrategy, setSelectedStrategy] = useState<'conservative' | 'target' | 'premium' | 'highVelocity'>('target');
  const [customPrice, setCustomPrice] = useState<number>(medianPrice);
  const [bookedNights, setBookedNights] = useState<number>(defaultBookedNights || 220);
  const [managementFeePct, setManagementFeePct] = useState<number>(15);

  const activeNightlyRate = useMemo(() => {
    switch (selectedStrategy) {
      case 'conservative':
        return p25Price;
      case 'target':
        return medianPrice;
      case 'premium':
        return p75Price;
      case 'highVelocity':
        return Math.round(highVelocityPriceAudit.median);
      default:
        return customPrice;
    }
  }, [selectedStrategy, p25Price, medianPrice, p75Price, highVelocityPriceAudit, customPrice]);

  const projectedAnnualGross = activeNightlyRate * bookedNights;
  const advisoryFeeAmount = projectedAnnualGross * (managementFeePct / 100);
  const netHostPayout = projectedAnnualGross - advisoryFeeAmount;
  const avgMonthlyCashflow = netHostPayout / 12;

  // Handlers for Audit Trail triggers
  const handleOpenMedianAudit = () => {
    onOpenAudit(
      createAuditTrail(
        'Logan Circle 1-BR Recommended Target Nightly Price',
        'Median Nightly Price',
        'Logan Circle',
        loganComps,
        'price'
      )
    );
  };

  const handleOpenP25Audit = () => {
    const sorted = [...prices].sort((a, b) => a - b);
    onOpenAudit({
      title: 'Logan Circle Conservative (25th Percentile) Rate Audit',
      metricName: '25th Percentile Rate',
      formattedValue: `$${p25Price.toFixed(2)} / night`,
      rawValue: p25Price,
      neighborhood: 'Logan Circle',
      filterDescription: 'All 1-Bedroom properties in Logan Circle',
      formula: `p25 = Interp(Sorted, 0.25 * (${sorted.length} - 1)) = $${p25Price.toFixed(2)}`,
      explanation: `Calculated from ${loganComps.length} Logan Circle 1-BR units. The 25th percentile represents the lower quartile boundary, providing a defensive pricing strategy that guarantees top-of-search conversion during shoulder seasons without triggering a margin collapse.`,
      stepByStep: [
        `Extracted ${prices.length} price observations for 1-BR apartments in Logan Circle.`,
        `Sorted list: lowest ($${sorted[0]}) to highest ($${sorted[sorted.length - 1]}).`,
        `Determined rank index: 25% of ${sorted.length - 1} data elements = ${(0.25 * (sorted.length - 1)).toFixed(2)}.`,
        `Interpolated exact 25th percentile price = $${p25Price.toFixed(2)}.`,
      ],
      rowCount: loganComps.length,
      sortedNumbers: sorted,
      middleIndices: [Math.floor(0.25 * sorted.length)],
      listings: loganComps,
    });
  };

  const handleOpenP75Audit = () => {
    const sorted = [...prices].sort((a, b) => a - b);
    onOpenAudit({
      title: 'Logan Circle Premium (75th Percentile) Rate Audit',
      metricName: '75th Percentile Rate',
      formattedValue: `$${p75Price.toFixed(2)} / night`,
      rawValue: p75Price,
      neighborhood: 'Logan Circle',
      filterDescription: 'All 1-Bedroom properties in Logan Circle',
      formula: `p75 = Interp(Sorted, 0.75 * (${sorted.length} - 1)) = $${p75Price.toFixed(2)}`,
      explanation: `Calculated from ${loganComps.length} Logan Circle 1-BR units. The 75th percentile marks upper-tier properties with premium architectural finishes, rooftop access, or prime 14th Street proximity. Recommended for cherry blossom season, legislative peaks, and high-demand weekends.`,
      stepByStep: [
        `Extracted ${prices.length} price observations for 1-BR apartments in Logan Circle.`,
        `Sorted list: lowest ($${sorted[0]}) to highest ($${sorted[sorted.length - 1]}).`,
        `Computed 75th percentile rank: 75% of ${sorted.length - 1} = ${(0.75 * (sorted.length - 1)).toFixed(2)}.`,
        `Derived premium rate benchmark = $${p75Price.toFixed(2)}.`,
      ],
      rowCount: loganComps.length,
      sortedNumbers: sorted,
      middleIndices: [Math.floor(0.75 * sorted.length)],
      listings: loganComps,
    });
  };

  const handleOpenHighVelocityAudit = () => {
    onOpenAudit({
      title: 'Logan Circle High-Velocity Cohort Rate Audit',
      metricName: 'High-Velocity Median Rate',
      formattedValue: `$${highVelocityPriceAudit.median.toFixed(2)} / night`,
      rawValue: highVelocityPriceAudit.median,
      neighborhood: 'Logan Circle',
      filterDescription: 'Logan Circle 1-BRs with Min Nights ≤ 3 and Reviews ≥ 40',
      formula: highVelocityPriceAudit.formula,
      explanation: `Filtered for seasoned top performers in Logan Circle. This cohort has proven liquidity (${highVelocityComps.length} units with at least 40 reviews and short minimum stay requirements). Their pricing proves what travelers actively book at high volumes.`,
      stepByStep: highVelocityPriceAudit.stepByStep,
      rowCount: highVelocityComps.length,
      sortedNumbers: highVelocityPriceAudit.sorted,
      middleIndices: highVelocityPriceAudit.middleIndices,
      listings: highVelocityComps,
    });
  };

  return (
    <div className="space-y-8">
      {/* Client Property Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
              <span>Client Advisory Dossier · Case Study 01</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              1-Bedroom Modern Condo · Logan Circle
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Empirical pricing strategy memo prepared for private host client. Recommendations are calibrated strictly against {loganComps.length} active 1-bedroom comps in Logan Circle from the D.C. short-term rental dataset.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleOpenMedianAudit}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>Audit Data Provenance</span>
            </button>
            <button
              onClick={onViewAllComps}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>View Raw Logan Comps ({loganComps.length})</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Quick Spec Bar */}
        <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Submarket Cohort</span>
            <span className="font-semibold text-slate-900 text-sm">Logan Circle NW</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Asset Topology</span>
            <span className="font-semibold text-slate-900 text-sm">1-Bedroom / 1-Bath</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Total Cleaned Comps</span>
            <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
              N = {loganComps.length} Units
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Market Price Range</span>
            <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
              ${minPrice} – ${maxPrice}
            </span>
          </div>
        </div>
      </div>

      {/* Recommended Pricing Tiers (Core Data-Driven Requirement) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Empirical Pricing Tiers
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Based strictly on the Logan Circle 1-bedroom distribution. Select a strategy to simulate annual returns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Conservative Tier (25th Percentile) */}
          <div
            onClick={() => setSelectedStrategy('conservative')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              selectedStrategy === 'conservative'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900'
                : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                  selectedStrategy === 'conservative' ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  Conservative (p25)
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenP25Audit();
                  }}
                  title="Where did this number come from?"
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    selectedStrategy === 'conservative'
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-2xl font-bold font-mono mt-2 tabular-nums">
                ${p25Price}
                <span className={`text-xs font-sans font-normal ml-1 ${
                  selectedStrategy === 'conservative' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  / night
                </span>
              </div>

              <p className={`text-xs mt-2 leading-relaxed ${
                selectedStrategy === 'conservative' ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Lower quartile baseline. Prioritizes maximum occupancy rate and fast initial review accumulation.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/20 text-[11px] flex items-center justify-between">
              <span className={selectedStrategy === 'conservative' ? 'text-slate-400' : 'text-slate-500'}>
                25th Percentile
              </span>
              {selectedStrategy === 'conservative' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
          </div>

          {/* Recommended Baseline Target (Median - Primary Anchor) */}
          <div
            onClick={() => setSelectedStrategy('target')}
            className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
              selectedStrategy === 'target'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900'
                : 'bg-white text-slate-900 border-amber-300 ring-1 ring-amber-200/80 shadow-xs'
            }`}
          >
            {/* Recommended Tag */}
            <div className="absolute -top-2.5 left-4 bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded shadow-xs">
              Recommended Target
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  selectedStrategy === 'target' ? 'text-amber-300' : 'text-amber-900'
                }`}>
                  Market Median
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenMedianAudit();
                  }}
                  title="Where did this number come from?"
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    selectedStrategy === 'target'
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-2xl font-bold font-mono mt-2 tabular-nums">
                ${medianPrice}
                <span className={`text-xs font-sans font-normal ml-1 ${
                  selectedStrategy === 'target' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  / night
                </span>
              </div>

              <p className={`text-xs mt-2 leading-relaxed ${
                selectedStrategy === 'target' ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Exact 50th percentile anchor. Optimal revenue balancing nightly yield with regular guest demand.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/20 text-[11px] flex items-center justify-between">
              <span className={selectedStrategy === 'target' ? 'text-amber-300' : 'text-amber-800 font-medium'}>
                Median Comp Anchor
              </span>
              {selectedStrategy === 'target' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
          </div>

          {/* Premium Tier (75th Percentile) */}
          <div
            onClick={() => setSelectedStrategy('premium')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              selectedStrategy === 'premium'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900'
                : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                  selectedStrategy === 'premium' ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  Premium (p75)
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenP75Audit();
                  }}
                  title="Where did this number come from?"
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    selectedStrategy === 'premium'
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-2xl font-bold font-mono mt-2 tabular-nums">
                ${p75Price}
                <span className={`text-xs font-sans font-normal ml-1 ${
                  selectedStrategy === 'premium' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  / night
                </span>
              </div>

              <p className={`text-xs mt-2 leading-relaxed ${
                selectedStrategy === 'premium' ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Upper quartile. Calibrated for peak weekends, Cherry Blossom weeks, and high-spec architectural units.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/20 text-[11px] flex items-center justify-between">
              <span className={selectedStrategy === 'premium' ? 'text-slate-400' : 'text-slate-500'}>
                75th Percentile
              </span>
              {selectedStrategy === 'premium' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
          </div>

          {/* High-Velocity Comp Cohort */}
          <div
            onClick={() => setSelectedStrategy('highVelocity')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              selectedStrategy === 'highVelocity'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900'
                : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                  selectedStrategy === 'highVelocity' ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  Proven High-Liquidity
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenHighVelocityAudit();
                  }}
                  title="Where did this number come from?"
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    selectedStrategy === 'highVelocity'
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-2xl font-bold font-mono mt-2 tabular-nums">
                ${Math.round(highVelocityPriceAudit.median)}
                <span className={`text-xs font-sans font-normal ml-1 ${
                  selectedStrategy === 'highVelocity' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  / night
                </span>
              </div>

              <p className={`text-xs mt-2 leading-relaxed ${
                selectedStrategy === 'highVelocity' ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Median among {highVelocityComps.length} top-reviewed units (≥40 reviews, ≤3 nights min stay).
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/20 text-[11px] flex items-center justify-between">
              <span className={selectedStrategy === 'highVelocity' ? 'text-slate-400' : 'text-slate-500'}>
                Top Performer Cohort
              </span>
              {selectedStrategy === 'highVelocity' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Yield Simulator & Pro Forma Model */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-700" />
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Host Pro Forma Cash Flow Simulator
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict mathematical derivation: Projected Gross = Active Nightly Rate × Annual Booked Nights.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg font-mono">
            <span>Model Rate:</span>
            <span className="font-bold text-slate-900 text-sm">${activeNightlyRate} / night</span>
          </div>
        </div>

        {/* Inputs & Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slider 1: Annual Booked Nights */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Annual Booked Nights</span>
              <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                {bookedNights} nights ({((bookedNights / 365) * 100).toFixed(0)}% occupancy)
              </span>
            </div>
            <input
              type="range"
              min="60"
              max="320"
              step="5"
              value={bookedNights}
              onChange={(e) => setBookedNights(Number(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>60d (Conservative)</span>
              <span>220d (Logan Median: ~{defaultBookedNights}d)</span>
              <span>320d (High Volume)</span>
            </div>
          </div>

          {/* Slider 2: Property Management Advisory Fee */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">District Advisory Management Fee</span>
              <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                {managementFeePct}% ({advisoryFeeAmount > 0 ? `$${Math.round(advisoryFeeAmount).toLocaleString()}` : '$0'})
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={managementFeePct}
              onChange={(e) => setManagementFeePct(Number(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>0% (Self-Managed)</span>
              <span>15% (Full-Service Advisory)</span>
              <span>25% (Turnkey Luxury)</span>
            </div>
          </div>
        </div>

        {/* Pro Forma Results Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          {/* Gross Revenue */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Projected Annual Gross</span>
              <button
                onClick={() => {
                  onOpenAudit({
                    title: 'Projected Annual Gross Revenue Model',
                    metricName: 'Annual Gross Rental',
                    formattedValue: `$${Math.round(projectedAnnualGross).toLocaleString()}`,
                    rawValue: projectedAnnualGross,
                    neighborhood: 'Logan Circle',
                    filterDescription: `Logan Circle Comp Rate ($${activeNightlyRate}) × ${bookedNights} Booked Nights`,
                    formula: `Gross = Rate × Nights = $${activeNightlyRate} × ${bookedNights} = $${Math.round(projectedAnnualGross).toLocaleString()}`,
                    explanation: 'Derived from multiplying the selected empirical nightly price tier by the forecasted annual booked night volume.',
                    stepByStep: [
                      `Selected nightly rate tier: $${activeNightlyRate} (based on ${selectedStrategy} strategy).`,
                      `Forecasted occupancy volume: ${bookedNights} nights per calendar year (${((bookedNights / 365) * 100).toFixed(1)}%).`,
                      `Computed multiplication: $${activeNightlyRate} × ${bookedNights} = $${Math.round(projectedAnnualGross).toLocaleString()}.`,
                    ],
                    rowCount: loganComps.length,
                    sortedNumbers: prices.sort((a, b) => a - b),
                    middleIndices: priceAudit.middleIndices,
                    listings: loganComps,
                  });
                }}
                className="text-slate-400 hover:text-slate-900 p-1 cursor-pointer"
                title="Audit Gross Revenue formula"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              ${Math.round(projectedAnnualGross).toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
              ${activeNightlyRate}/nt × {bookedNights} nights
            </span>
          </div>

          {/* Net Host Payout */}
          <div className="p-4 bg-slate-900 text-white rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">Estimated Net Host Payout</span>
              <button
                onClick={() => {
                  onOpenAudit({
                    title: 'Net Host Cash Payout Model',
                    metricName: 'Net Host Payout',
                    formattedValue: `$${Math.round(netHostPayout).toLocaleString()}`,
                    rawValue: netHostPayout,
                    neighborhood: 'Logan Circle',
                    filterDescription: `Gross ($${Math.round(projectedAnnualGross)}) - Management Fee (${managementFeePct}%)`,
                    formula: `Net = Gross - Fee = $${Math.round(projectedAnnualGross).toLocaleString()} - $${Math.round(advisoryFeeAmount).toLocaleString()} = $${Math.round(netHostPayout).toLocaleString()}`,
                    explanation: 'Net distribution directly paid to property owner after deducting District STR management and listing optimization fees.',
                    stepByStep: [
                      `Gross booking revenue: $${Math.round(projectedAnnualGross).toLocaleString()}`,
                      `Advisory fee deducted: ${managementFeePct}% = $${Math.round(advisoryFeeAmount).toLocaleString()}`,
                      `Net host owner proceeds = $${Math.round(netHostPayout).toLocaleString()}`,
                    ],
                    rowCount: loganComps.length,
                    sortedNumbers: prices.sort((a, b) => a - b),
                    middleIndices: priceAudit.middleIndices,
                    listings: loganComps,
                  });
                }}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
                title="Audit Net Payout formula"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
              ${Math.round(netHostPayout).toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 font-sans block mt-0.5">
              After {managementFeePct}% advisory management
            </span>
          </div>

          {/* Average Monthly Cashflow */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Average Monthly Cashflow</span>
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              ${Math.round(avgMonthlyCashflow).toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
              Net annual earnings divided by 12 months
            </span>
          </div>
        </div>
      </div>

      {/* Logan Circle Comps Spread Visualizer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Logan Circle 1-Bedroom Comps Distribution ({loganComps.length} units)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every point represents a real 1-bedroom unit in Logan Circle. Note the strong cluster between ${p25Price} and ${p75Price}.
            </p>
          </div>
          <button
            onClick={onViewAllComps}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
          >
            <span>View Data Table</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Visual Spread Bar */}
        <div className="pt-2">
          <div className="relative h-12 bg-slate-100 rounded-lg border border-slate-200 flex items-center px-4 overflow-hidden">
            {/* 25th - 75th Highlight Band */}
            <div
              className="absolute top-0 bottom-0 bg-amber-200/50 border-x border-amber-300"
              style={{
                left: `${Math.max(0, Math.min(100, ((p25Price - minPrice) / (maxPrice - minPrice || 1)) * 100))}%`,
                width: `${Math.max(5, Math.min(100, ((p75Price - p25Price) / (maxPrice - minPrice || 1)) * 100))}%`,
              }}
              title={`Interquartile Range: $${p25Price} - $${p75Price}`}
            />

            {/* Individual Listing Dots */}
            {loganComps.map((comp) => {
              const leftPct = ((comp.price - minPrice) / (maxPrice - minPrice || 1)) * 100;
              const isMedian = comp.price === medianPrice;
              return (
                <div
                  key={comp.id}
                  className={`absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 transition-transform hover:scale-150 cursor-pointer ${
                    isMedian
                      ? 'bg-amber-600 ring-2 ring-white z-20 scale-125'
                      : 'bg-slate-700/80 z-10'
                  }`}
                  style={{ left: `${leftPct}%` }}
                  title={`${comp.id}: $${comp.price}/nt (${comp.property_type || '1-BR'})`}
                />
              );
            })}

            {/* Target Line Marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-slate-950 z-30"
              style={{
                left: `${((medianPrice - minPrice) / (maxPrice - minPrice || 1)) * 100}%`,
              }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500 font-mono mt-2 tabular-nums">
            <span>Min: ${minPrice}</span>
            <span className="text-amber-800 font-semibold font-sans">
              IQR Core: ${p25Price} – ${p75Price}
            </span>
            <span className="text-slate-900 font-bold font-sans">
              Median Target: ${medianPrice}
            </span>
            <span>Max: ${maxPrice}</span>
          </div>
        </div>
      </div>

      {/* D.C. Regulatory & Governance Briefing */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            District of Columbia Short-Term Rental Compliance Standards
          </h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Under the <strong>D.C. Short-Term Rental Regulation Act</strong> (administered by the Department of Licensing and Consumer Protection / DLCP), short-term rentals in Logan Circle are subject to specific licensing rules:
        </p>
        <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
          <li><strong>Primary Residence Rule:</strong> The host must own or lease the property as their primary domicile (or hold an approved Vacation Rental endorsement).</li>
          <li><strong>90-Day Unhosted Cap:</strong> Vacation Rentals without host present on-site are capped at 90 cumulative nights per calendar year unless granted an official hardship waiver.</li>
          <li><strong>Tax Withholding:</strong> D.C. 14.95% sales tax on transient accommodations is collected and remitted automatically through Airbnb.</li>
        </ul>
      </div>
    </div>
  );
};
