import React from 'react';
import { HelpCircle, ArrowRightLeft, TrendingUp, Calendar, DollarSign, Building } from 'lucide-react';
import { NeighborhoodStats, AuditTrailDetails, DcListing } from '../types';
import { createAuditTrail } from '../utils/math';

interface NeighborhoodComparatorProps {
  statsList: NeighborhoodStats[];
  selectedNeighborhoods: string[];
  onToggleNeighborhood: (name: string) => void;
  onOpenAudit: (audit: AuditTrailDetails) => void;
  listings: DcListing[];
}

export const NeighborhoodComparator: React.FC<NeighborhoodComparatorProps> = ({
  statsList,
  selectedNeighborhoods,
  onToggleNeighborhood,
  onOpenAudit,
  listings,
}) => {
  const selectedStats = statsList.filter((s) => selectedNeighborhoods.includes(s.neighborhood));

  const handleOpenRevenueAudit = (stat: NeighborhoodStats) => {
    onOpenAudit({
      title: `${stat.neighborhood} Estimated Annual Revenue Audit`,
      metricName: 'Estimated Annual Gross Revenue',
      formattedValue: `$${Math.round(stat.estAnnualGrossRevenue).toLocaleString()} / year`,
      rawValue: stat.estAnnualGrossRevenue,
      neighborhood: stat.neighborhood,
      filterDescription: `${stat.count} verified 1-Bedroom units in ${stat.neighborhood}`,
      formula: `Annual Revenue = Median Nightly Rate × Estimated Booked Nights = $${stat.medianPrice.toFixed(0)} × ${stat.estAnnualBookedNights} nights = $${Math.round(stat.estAnnualGrossRevenue).toLocaleString()}`,
      explanation: `Calculated by multiplying the median nightly rate ($${stat.medianPrice.toFixed(0)}) by the estimated booked days (${stat.estAnnualBookedNights} nights, derived from 365 minus median availability of ${stat.medianAvailability} days).`,
      stepByStep: [
        `Computed median nightly price for 1-BRs in ${stat.neighborhood}: $${stat.medianPrice.toFixed(0)}.`,
        `Extracted median calendar availability: ${stat.medianAvailability} days available per year.`,
        `Estimated booked days: 365 - ${stat.medianAvailability} = ${stat.estAnnualBookedNights} booked nights (${(stat.occupancyRate * 100).toFixed(0)}% occupancy).`,
        `Calculated annual gross projection: $${stat.medianPrice.toFixed(0)} × ${stat.estAnnualBookedNights} = $${Math.round(stat.estAnnualGrossRevenue).toLocaleString()}.`,
      ],
      rowCount: stat.count,
      sortedNumbers: stat.rawListings.map((l) => l.price).sort((a, b) => a - b),
      middleIndices: [Math.floor(stat.count / 2)],
      listings: stat.rawListings,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Comparator Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-slate-700" />
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              D.C. Submarket Comparator
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Select neighborhoods to compare side-by-side on pricing power, liquidity, and annual gross yield.
          </p>
        </div>

        {/* Selected Counter & Quick Reset */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">
            {selectedNeighborhoods.length} Selected for Compare
          </span>
        </div>
      </div>

      {/* Neighborhood Selector Chips (interactive button controls) */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
          Toggle Markets to Compare:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {statsList.slice(0, 10).map((stat) => {
            const isSelected = selectedNeighborhoods.includes(stat.neighborhood);
            return (
              <button
                key={stat.neighborhood}
                onClick={() => onToggleNeighborhood(stat.neighborhood)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{stat.neighborhood}</span>
                <span className={`text-[10px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  (${stat.medianPrice.toFixed(0)})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      {selectedStats.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          Select at least one neighborhood above to view empirical side-by-side comparison.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {selectedStats.map((stat) => {
            const isLogan = stat.neighborhood === 'Logan Circle';

            return (
              <div
                key={stat.neighborhood}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isLogan
                    ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-200/80 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200'
                }`}
              >
                <div>
                  {/* Title & Tag */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        {stat.neighborhood}
                      </h3>
                      <span className="text-xs text-slate-500 font-mono block mt-0.5">
                        {stat.count} Verified 1-BR Units
                      </span>
                    </div>
                    {isLogan && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded">
                        Target Case
                      </span>
                    )}
                  </div>

                  {/* Core Metrics List */}
                  <div className="mt-4 space-y-3 pt-3 border-t border-slate-200">
                    {/* Median Nightly Rate */}
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Median Nightly Rate</span>
                        <button
                          onClick={() =>
                            onOpenAudit(
                              createAuditTrail(
                                `${stat.neighborhood} Median Nightly Rate`,
                                'Median Price',
                                stat.neighborhood,
                                stat.rawListings,
                                'price'
                              )
                            )
                          }
                          className="text-slate-400 hover:text-slate-900 p-0.5 cursor-pointer"
                          title="Audit Median Nightly Rate"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                        ${stat.medianPrice.toFixed(0)}
                        <span className="text-xs font-sans text-slate-500 font-normal ml-1">/ night</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono block">
                        IQR: ${stat.p25Price.toFixed(0)} – ${stat.p75Price.toFixed(0)}
                      </span>
                    </div>

                    {/* Estimated Annual Revenue */}
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Est. Annual Revenue</span>
                        <button
                          onClick={() => handleOpenRevenueAudit(stat)}
                          className="text-slate-400 hover:text-slate-900 p-0.5 cursor-pointer"
                          title="Audit Annual Revenue formula"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                        ${Math.round(stat.estAnnualGrossRevenue).toLocaleString()}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono block">
                        ${stat.medianPrice.toFixed(0)} × {stat.estAnnualBookedNights} booked nights
                      </span>
                    </div>

                    {/* Occupancy Tier */}
                    <div>
                      <span className="text-slate-500 text-xs block">Occupancy Tier</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-semibold text-slate-800">
                          {stat.occupancyTier}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                        {(stat.occupancyRate * 100).toFixed(0)}% estimated utilization ({stat.estAnnualBookedNights} nights/yr)
                      </span>
                    </div>

                    {/* Median Min Nights & Reviews */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Min Stay</span>
                        <span className="font-mono font-medium text-slate-800">
                          {stat.medianMinNights} night{stat.medianMinNights > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Review Velocity</span>
                        <span className="font-mono font-medium text-slate-800">
                          {stat.medianReviews} reviews
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Remove Button */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => onToggleNeighborhood(stat.neighborhood)}
                    className="text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Remove from comparison
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
