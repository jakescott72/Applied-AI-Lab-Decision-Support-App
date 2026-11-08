import React, { useState, useMemo } from 'react';
import { ArrowUpDown, HelpCircle, Search, Filter, ChevronRight, BarChart3, TrendingUp, Home, ArrowRightLeft, Layers, CheckSquare, Square } from 'lucide-react';
import { DcListing, NeighborhoodStats, AuditTrailDetails } from '../types';
import { computeNeighborhoodStats, createAuditTrail, calculateMedianWithAudit } from '../utils/math';
import { NeighborhoodComparator } from './NeighborhoodComparator';

interface MarketExplorerProps {
  listings: DcListing[];
  onOpenAudit: (audit: AuditTrailDetails) => void;
  onSelectLoganCase: () => void;
}

type SortField =
  | 'neighborhood'
  | 'count'
  | 'medianPrice'
  | 'estAnnualGrossRevenue'
  | 'occupancyRate'
  | 'medianMinNights'
  | 'medianReviews'
  | 'medianAvailability';

type SortDirection = 'asc' | 'desc';
type VisualTab = 'rates' | 'revenue' | 'inventory' | 'occupancy';

export const MarketExplorer: React.FC<MarketExplorerProps> = ({
  listings,
  onOpenAudit,
  onSelectLoganCase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [minNightsFilter, setMinNightsFilter] = useState<'all' | 'short' | 'mid'>('all');
  const [occupancyFilter, setOccupancyFilter] = useState<'all' | 'high' | 'balanced' | 'selective'>('all');
  const [sortField, setSortField] = useState<SortField>('count');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [visualMetric, setVisualMetric] = useState<VisualTab>('rates');
  const [showComparator, setShowComparator] = useState<boolean>(true);

  // Selected neighborhoods for side-by-side comparator
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([
    'Logan Circle',
    'Dupont Circle',
    'Capitol Hill',
    'Georgetown',
  ]);

  // Filter listings by stay mode
  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (minNightsFilter === 'short' && l.minimum_nights > 3) return false;
      if (minNightsFilter === 'mid' && l.minimum_nights < 30) return false;
      return true;
    });
  }, [listings, minNightsFilter]);

  // Compute stats for all unique neighborhoods
  const allStatsList = useMemo(() => {
    const uniqueNeighborhoods = Array.from(new Set(filteredListings.map((l) => l.neighborhood_cleansed)));
    return uniqueNeighborhoods.map((name) => computeNeighborhoodStats(name, filteredListings));
  }, [filteredListings]);

  // Filter by search query & occupancy tier
  const filteredStats = useMemo(() => {
    return allStatsList.filter((stat) => {
      if (searchTerm.trim() && !stat.neighborhood.toLowerCase().includes(searchTerm.toLowerCase().trim())) {
        return false;
      }
      if (occupancyFilter === 'high' && !stat.occupancyTier.includes('High Demand')) {
        return false;
      }
      if (occupancyFilter === 'balanced' && !stat.occupancyTier.includes('Balanced')) {
        return false;
      }
      if (occupancyFilter === 'selective' && !stat.occupancyTier.includes('Selective')) {
        return false;
      }
      return true;
    });
  }, [allStatsList, searchTerm, occupancyFilter]);

  // Sort stats
  const sortedStats = useMemo(() => {
    return [...filteredStats].sort((a, b) => {
      let result = 0;
      if (sortField === 'neighborhood') {
        result = a.neighborhood.localeCompare(b.neighborhood);
      } else {
        result = (a[sortField] as number) - (b[sortField] as number);
      }
      return sortDirection === 'asc' ? result : -result;
    });
  }, [filteredStats, sortField, sortDirection]);

  // Citywide summary stats
  const citywidePriceAudit = useMemo(() => {
    return calculateMedianWithAudit(filteredListings.map((l) => l.price));
  }, [filteredListings]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleCompareNeighborhood = (name: string) => {
    if (selectedForCompare.includes(name)) {
      setSelectedForCompare(selectedForCompare.filter((n) => n !== name));
    } else {
      if (selectedForCompare.length >= 4) {
        setSelectedForCompare([...selectedForCompare.slice(1), name]);
      } else {
        setSelectedForCompare([...selectedForCompare, name]);
      }
    }
  };

  const handleOpenRevenueAudit = (stat: NeighborhoodStats) => {
    onOpenAudit({
      title: `${stat.neighborhood} Estimated Annual Revenue Audit`,
      metricName: 'Annual Gross Rental',
      formattedValue: `$${Math.round(stat.estAnnualGrossRevenue).toLocaleString()} / year`,
      rawValue: stat.estAnnualGrossRevenue,
      neighborhood: stat.neighborhood,
      filterDescription: `${stat.count} verified 1-Bedroom units in ${stat.neighborhood}`,
      formula: `Annual Revenue = Median Nightly Rate × Estimated Booked Nights = $${stat.medianPrice.toFixed(0)} × ${stat.estAnnualBookedNights} nights = $${Math.round(stat.estAnnualGrossRevenue).toLocaleString()}`,
      explanation: `Derived directly from empirical data: median nightly rate of $${stat.medianPrice.toFixed(0)} multiplied by ${stat.estAnnualBookedNights} estimated booked nights (calculated as 365 days minus median availability of ${stat.medianAvailability} days).`,
      stepByStep: [
        `Extracted ${stat.count} listings in ${stat.neighborhood}.`,
        `Calculated median nightly rate = $${stat.medianPrice.toFixed(0)}.`,
        `Calculated median annual availability = ${stat.medianAvailability} days/year.`,
        `Estimated booked nights = 365 - ${stat.medianAvailability} = ${stat.estAnnualBookedNights} days (${(stat.occupancyRate * 100).toFixed(0)}% occupancy).`,
        `Computed annual gross projection: $${stat.medianPrice.toFixed(0)} × ${stat.estAnnualBookedNights} = $${Math.round(stat.estAnnualGrossRevenue).toLocaleString()}.`,
      ],
      rowCount: stat.count,
      sortedNumbers: stat.rawListings.map((l) => l.price).sort((a, b) => a - b),
      middleIndices: [Math.floor(stat.count / 2)],
      listings: stat.rawListings,
    });
  };

  const handleOpenOccupancyAudit = (stat: NeighborhoodStats) => {
    onOpenAudit({
      title: `${stat.neighborhood} Occupancy Tier & Utilization Audit`,
      metricName: 'Occupancy Rate',
      formattedValue: `${(stat.occupancyRate * 100).toFixed(0)}% (${stat.occupancyTier})`,
      rawValue: stat.occupancyRate,
      neighborhood: stat.neighborhood,
      filterDescription: `Calendar availability & utilization model for ${stat.count} units`,
      formula: `Occupancy Rate = (365 - Median Availability) / 365 = (365 - ${stat.medianAvailability}) / 365 = ${(stat.occupancyRate * 100).toFixed(1)}%`,
      explanation: `Standard Inside Airbnb operational model: calendar days that are not available (365 - availability) represent booked periods. Properties exceeding 70% occupancy qualify for High Demand tier.`,
      stepByStep: [
        `Median annual availability in ${stat.neighborhood}: ${stat.medianAvailability} days.`,
        `Derived booked days: 365 - ${stat.medianAvailability} = ${stat.estAnnualBookedNights} nights.`,
        `Calculated utilization ratio: ${stat.estAnnualBookedNights} / 365 = ${(stat.occupancyRate * 100).toFixed(1)}%.`,
        `Classified into operational management tier: ${stat.occupancyTier}.`,
      ],
      rowCount: stat.count,
      sortedNumbers: stat.rawListings.map((l) => l.availability_365).sort((a, b) => a - b),
      middleIndices: [Math.floor(stat.count / 2)],
      listings: stat.rawListings,
    });
  };

  // Top focus submarkets for the visual breakdown bar chart
  const focusSubmarkets = useMemo(() => {
    const focusNames = ['Logan Circle', 'Dupont Circle', 'Capitol Hill', 'Shaw', 'Georgetown', 'Adams Morgan', 'Downtown / Penn Quarter', 'Navy Yard / Waterfront'];
    return focusNames
      .map((name) => allStatsList.find((s) => s.neighborhood === name))
      .filter((s): s is NeighborhoodStats => Boolean(s));
  }, [allStatsList]);

  const maxPriceForVisual = useMemo(() => Math.max(...focusSubmarkets.map((s) => s.medianPrice), 250), [focusSubmarkets]);
  const maxRevenueForVisual = useMemo(() => Math.max(...focusSubmarkets.map((s) => s.estAnnualGrossRevenue), 65000), [focusSubmarkets]);
  const maxCountForVisual = useMemo(() => Math.max(...focusSubmarkets.map((s) => s.count), 300), [focusSubmarkets]);

  return (
    <div className="space-y-8">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            D.C. 1-Bedroom Market Explorer & Comparator
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Live empirical benchmarks derived from {listings.length} verified 1-bedroom apartments across the District. Every metric is computed in real time from raw listing records.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowComparator(!showComparator)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 border cursor-pointer ${
              showComparator
                ? 'bg-slate-100 text-slate-900 border-slate-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{showComparator ? 'Hide Comparator' : 'Show Comparator'}</span>
          </button>
          <button
            onClick={onSelectLoganCase}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Home className="w-4 h-4 text-amber-400" />
            <span>Logan Circle Case Study</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Citywide Median Nightly Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Citywide 1-BR Median</span>
            <button
              onClick={() => {
                onOpenAudit({
                  title: 'Citywide D.C. 1-Bedroom Median Nightly Rate',
                  metricName: 'Citywide Median Nightly Rate',
                  formattedValue: `$${citywidePriceAudit.median.toFixed(2)} / night`,
                  rawValue: citywidePriceAudit.median,
                  neighborhood: 'District of Columbia (All Markets)',
                  filterDescription: `All ${filteredListings.length} verified 1-bedroom listings`,
                  formula: citywidePriceAudit.formula,
                  explanation: `Calculated from ${filteredListings.length} total active 1-bedroom units currently in memory.`,
                  stepByStep: citywidePriceAudit.stepByStep,
                  rowCount: filteredListings.length,
                  sortedNumbers: citywidePriceAudit.sorted,
                  middleIndices: citywidePriceAudit.middleIndices,
                  listings: filteredListings,
                });
              }}
              title="Where did this number come from?"
              className="text-xs text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="text-[11px] underline">Audit</span>
            </button>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              ${citywidePriceAudit.median.toFixed(0)}
              <span className="text-xs font-sans text-slate-500 font-normal ml-1">/ night</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span>{filteredListings.length} verified units</span>
              <span aria-hidden="true">·</span>
              <span>All D.C. Submarkets</span>
            </div>
          </div>
        </div>

        {/* Logan Circle Asset Metric */}
        <div className="bg-white p-4 rounded-xl border border-amber-300 ring-1 ring-amber-200/80 shadow-xs flex flex-col justify-between bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Logan Circle Focus Comp</span>
            <button
              onClick={() => {
                const lc = listings.filter((l) => l.neighborhood_cleansed === 'Logan Circle');
                onOpenAudit(createAuditTrail('Logan Circle 1-BR Median Price', 'Median Nightly Price', 'Logan Circle', lc, 'price'));
              }}
              className="text-xs text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] underline">Audit</span>
            </button>
          </div>
          <div className="mt-2">
            {(() => {
              const lcListings = filteredListings.filter((l) => l.neighborhood_cleansed === 'Logan Circle');
              const lcMedian = calculateMedianWithAudit(lcListings.map((l) => l.price)).median;
              return (
                <>
                  <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    ${lcMedian.toFixed(0)}
                    <span className="text-xs font-sans text-slate-500 font-normal ml-1">/ night</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                    <span className="font-semibold text-amber-900">{lcListings.length} Units</span>
                    <span aria-hidden="true">·</span>
                    <span>14th St NW Corridor</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Dupont Circle */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Dupont Circle Benchmark</span>
            <button
              onClick={() => {
                const dp = listings.filter((l) => l.neighborhood_cleansed === 'Dupont Circle');
                onOpenAudit(createAuditTrail('Dupont Circle 1-BR Median Price', 'Median Price', 'Dupont Circle', dp, 'price'));
              }}
              className="text-xs text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="text-[11px] underline">Audit</span>
            </button>
          </div>
          <div className="mt-2">
            {(() => {
              const dpListings = filteredListings.filter((l) => l.neighborhood_cleansed === 'Dupont Circle');
              const dpMedian = calculateMedianWithAudit(dpListings.map((l) => l.price)).median;
              return (
                <>
                  <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    ${dpMedian.toFixed(0)}
                    <span className="text-xs font-sans text-slate-500 font-normal ml-1">/ night</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {dpListings.length} Active 1-BR Comps
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Capitol Hill */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Capitol Hill Benchmark</span>
            <button
              onClick={() => {
                const ch = listings.filter((l) => l.neighborhood_cleansed === 'Capitol Hill');
                onOpenAudit(createAuditTrail('Capitol Hill 1-BR Median Price', 'Median Price', 'Capitol Hill', ch, 'price'));
              }}
              className="text-xs text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="text-[11px] underline">Audit</span>
            </button>
          </div>
          <div className="mt-2">
            {(() => {
              const chListings = filteredListings.filter((l) => l.neighborhood_cleansed === 'Capitol Hill');
              const chMedian = calculateMedianWithAudit(chListings.map((l) => l.price)).median;
              return (
                <>
                  <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    ${chMedian.toFixed(0)}
                    <span className="text-xs font-sans text-slate-500 font-normal ml-1">/ night</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {chListings.length} Active 1-BR Comps
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparator Section */}
      {showComparator && (
        <NeighborhoodComparator
          statsList={allStatsList}
          selectedNeighborhoods={selectedForCompare}
          onToggleNeighborhood={toggleCompareNeighborhood}
          onOpenAudit={onOpenAudit}
          listings={listings}
        />
      )}

      {/* Visual Breakdown of D.C. Neighborhoods (Rates, Revenue, Inventory, Occupancy) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-700" />
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Visual Market Breakdown: Key D.C. Neighborhoods
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Empirical comparisons across Logan Circle, Dupont Circle, Capitol Hill, Shaw, Georgetown, Adams Morgan, and downtown corridors.
            </p>
          </div>

          {/* Metric Selector for Visual Breakdown */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setVisualMetric('rates')}
              className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                visualMetric === 'rates'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Median Rates ($)
            </button>
            <button
              onClick={() => setVisualMetric('revenue')}
              className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                visualMetric === 'revenue'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual Revenue ($)
            </button>
            <button
              onClick={() => setVisualMetric('inventory')}
              className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                visualMetric === 'inventory'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Count (N)
            </button>
            <button
              onClick={() => setVisualMetric('occupancy')}
              className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                visualMetric === 'occupancy'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Occupancy (%)
            </button>
          </div>
        </div>

        {/* Visual Bar Display */}
        <div className="space-y-3 pt-2">
          {focusSubmarkets.map((stat) => {
            const isLogan = stat.neighborhood === 'Logan Circle';

            let barPct = 0;
            let displayVal = '';

            if (visualMetric === 'rates') {
              barPct = (stat.medianPrice / maxPriceForVisual) * 100;
              displayVal = `$${stat.medianPrice.toFixed(0)} / nt`;
            } else if (visualMetric === 'revenue') {
              barPct = (stat.estAnnualGrossRevenue / maxRevenueForVisual) * 100;
              displayVal = `$${Math.round(stat.estAnnualGrossRevenue).toLocaleString()} / yr`;
            } else if (visualMetric === 'inventory') {
              barPct = (stat.count / maxCountForVisual) * 100;
              displayVal = `${stat.count} units`;
            } else {
              barPct = stat.occupancyRate * 100;
              displayVal = `${(stat.occupancyRate * 100).toFixed(0)}% (${stat.occupancyTier.split(' ')[0]})`;
            }

            return (
              <div key={stat.neighborhood} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isLogan ? 'text-amber-950 font-bold' : 'text-slate-800'}`}>
                      {stat.neighborhood}
                    </span>
                    {isLogan && (
                      <span className="text-[10px] text-amber-900 font-bold bg-amber-100 px-1 py-0.2 rounded">
                        Target Asset
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {displayVal}
                    </span>
                    <button
                      onClick={() => {
                        if (visualMetric === 'revenue') handleOpenRevenueAudit(stat);
                        else if (visualMetric === 'occupancy') handleOpenOccupancyAudit(stat);
                        else {
                          onOpenAudit(
                            createAuditTrail(
                              `${stat.neighborhood} 1-BR Median Rate`,
                              'Median Nightly Price',
                              stat.neighborhood,
                              stat.rawListings,
                              'price'
                            )
                          );
                        }
                      }}
                      className="text-slate-400 hover:text-slate-800 p-0.5 cursor-pointer"
                      title="Audit calculation"
                    >
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Progress / Bar track */}
                <div className="h-4 bg-slate-100 rounded-md overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-300 rounded-md ${
                      isLogan
                        ? 'bg-amber-500'
                        : visualMetric === 'revenue'
                        ? 'bg-slate-800'
                        : 'bg-slate-700'
                    }`}
                    style={{ width: `${Math.max(4, Math.min(100, barPct))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar for Table */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search neighborhood (Logan Circle, Dupont, Shaw, Capitol Hill, Georgetown...)"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {/* Filter Controls: Stay Mode & Occupancy Tier */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Stay mode */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={minNightsFilter}
              onChange={(e) => setMinNightsFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Stays</option>
              <option value="short">Short-Stay (≤3 nights)</option>
              <option value="mid">Mid-Term (30+ nights)</option>
            </select>
          </div>

          {/* Occupancy tier filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Layers className="w-3.5 h-3.5" />
            <select
              value={occupancyFilter}
              onChange={(e) => setOccupancyFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Occupancy Tiers</option>
              <option value="high">High Demand (≥70%)</option>
              <option value="balanced">Balanced (55–69%)</option>
              <option value="selective">Selective (&lt;55%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Neighborhood Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold tracking-wide">
              <tr>
                <th className="py-3 px-3 w-8 text-center">Compare</th>
                <th
                  onClick={() => handleSort('neighborhood')}
                  className="py-3.5 px-3 cursor-pointer hover:text-slate-900 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Neighborhood</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('count')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Active 1-BR Count</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('medianPrice')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Median Nightly Rate</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('estAnnualGrossRevenue')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Estimated Annual Revenue</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('occupancyRate')}
                  className="py-3.5 px-3 cursor-pointer hover:text-slate-900 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Occupancy Tier</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-3 text-right">
                  <span>25th – 75th % Spread</span>
                </th>
                <th
                  onClick={() => handleSort('medianMinNights')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Median Min Stay</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('medianReviews')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Median Reviews</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">
                  <span>Action / Case</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-slate-800">
              {sortedStats.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 font-sans">
                    No neighborhoods match the specified filter or search query.
                  </td>
                </tr>
              ) : (
                sortedStats.map((stat) => {
                  const isLogan = stat.neighborhood === 'Logan Circle';
                  const isCompared = selectedForCompare.includes(stat.neighborhood);

                  return (
                    <tr
                      key={stat.neighborhood}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isLogan ? 'bg-amber-50/30' : isCompared ? 'bg-slate-50/50' : ''
                      }`}
                    >
                      {/* Compare Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleCompareNeighborhood(stat.neighborhood)}
                          title="Toggle comparison"
                          className="text-slate-400 hover:text-slate-900 cursor-pointer"
                        >
                          {isCompared ? (
                            <CheckSquare className="w-4 h-4 text-slate-900" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Neighborhood */}
                      <td className="py-3 px-3 font-sans font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className={isLogan ? 'font-bold text-amber-950' : ''}>
                            {stat.neighborhood}
                          </span>
                          {isLogan && (
                            <span className="text-[10px] text-amber-900 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                              Target Case
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Active 1-BR Count */}
                      <td className="py-3 px-3 text-right">
                        <span className="font-semibold text-slate-900">{stat.count}</span>
                        <span className="text-[11px] text-slate-400 font-sans ml-1">units</span>
                      </td>

                      {/* Median Nightly Rate */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-bold text-slate-900 text-sm">
                            ${stat.medianPrice.toFixed(0)}
                          </span>
                          <button
                            onClick={() =>
                              onOpenAudit(
                                createAuditTrail(
                                  `${stat.neighborhood} 1-BR Median Nightly Rate`,
                                  'Median Nightly Price',
                                  stat.neighborhood,
                                  stat.rawListings,
                                  'price'
                                )
                              )
                            }
                            title="Where did this number come from?"
                            className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Estimated Annual Revenue */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        <div className="flex items-center justify-end gap-1.5">
                          <span>${Math.round(stat.estAnnualGrossRevenue).toLocaleString()}</span>
                          <button
                            onClick={() => handleOpenRevenueAudit(stat)}
                            title="Where did this number come from?"
                            className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Occupancy Tier */}
                      <td className="py-3 px-3 font-sans">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-800">
                            {stat.occupancyTier}
                          </span>
                          <button
                            onClick={() => handleOpenOccupancyAudit(stat)}
                            className="p-0.5 text-slate-400 hover:text-slate-800 cursor-pointer"
                            title="Audit occupancy model"
                          >
                            <HelpCircle className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          {(stat.occupancyRate * 100).toFixed(0)}% ({stat.estAnnualBookedNights}d/yr)
                        </span>
                      </td>

                      {/* 25th - 75th Spread */}
                      <td className="py-3 px-3 text-right text-slate-600">
                        <span>${stat.p25Price.toFixed(0)}</span>
                        <span className="mx-1 text-slate-400">–</span>
                        <span>${stat.p75Price.toFixed(0)}</span>
                      </td>

                      {/* Median Min Stay */}
                      <td className="py-3 px-3 text-right text-slate-600">
                        <span>{stat.medianMinNights}d</span>
                      </td>

                      {/* Median Reviews */}
                      <td className="py-3 px-3 text-right text-slate-600">
                        <span>{stat.medianReviews}</span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        {isLogan ? (
                          <button
                            onClick={onSelectLoganCase}
                            className="px-2.5 py-1 text-xs font-semibold text-amber-950 bg-amber-200/80 hover:bg-amber-300 rounded transition-colors inline-flex items-center gap-1 cursor-pointer font-sans"
                          >
                            <span>Inspect Audit</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              onOpenAudit(
                                createAuditTrail(
                                  `${stat.neighborhood} 1-BR Full Audit`,
                                  'Median Rate',
                                  stat.neighborhood,
                                  stat.rawListings,
                                  'price'
                                )
                              )
                            }
                            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors inline-flex items-center gap-1 cursor-pointer font-sans"
                          >
                            <span>Audit Trail</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
