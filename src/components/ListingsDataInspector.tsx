import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Download, Filter, HelpCircle } from 'lucide-react';
import { DcListing, AuditTrailDetails } from '../types';
import { createAuditTrail } from '../utils/math';

interface ListingsDataInspectorProps {
  listings: DcListing[];
  onOpenAudit: (audit: AuditTrailDetails) => void;
}

export const ListingsDataInspector: React.FC<ListingsDataInspectorProps> = ({
  listings,
  onOpenAudit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');
  const [sortCol, setSortCol] = useState<'id' | 'neighborhood_cleansed' | 'price' | 'minimum_nights' | 'number_of_reviews' | 'availability_365'>('price');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const neighborhoods = useMemo(() => {
    return Array.from(new Set(listings.map((l) => l.neighborhood_cleansed))).sort();
  }, [listings]);

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (selectedNeighborhood !== 'all' && l.neighborhood_cleansed !== selectedNeighborhood) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesNeighborhood = l.neighborhood_cleansed.toLowerCase().includes(query);
        const matchesId = String(l.id).toLowerCase().includes(query);
        const matchesType = (l.property_type || '').toLowerCase().includes(query);
        if (!matchesNeighborhood && !matchesId && !matchesType) return false;
      }
      return true;
    });
  }, [listings, selectedNeighborhood, searchTerm]);

  const sortedListings = useMemo(() => {
    return [...filteredListings].sort((a, b) => {
      let res = 0;
      if (sortCol === 'neighborhood_cleansed') {
        res = a.neighborhood_cleansed.localeCompare(b.neighborhood_cleansed);
      } else if (sortCol === 'id') {
        res = String(a.id).localeCompare(String(b.id));
      } else {
        res = (a[sortCol] as number) - (b[sortCol] as number);
      }
      return sortAsc ? res : -res;
    });
  }, [filteredListings, sortCol, sortAsc]);

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(col === 'neighborhood_cleansed' ? true : false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['id', 'neighborhood_cleansed', 'price', 'minimum_nights', 'number_of_reviews', 'availability_365', 'property_type'];
    const rows = sortedListings.map((l) => [
      l.id,
      `"${l.neighborhood_cleansed}"`,
      l.price,
      l.minimum_nights,
      l.number_of_reviews,
      l.availability_365,
      `"${l.property_type || '1-BR'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dc_airbnb_listings_export_${selectedNeighborhood.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            D.C. 1-Bedroom Dataset Inspector
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Raw observation records with personal identifiers stripped. Shows row-level prices, stay limits, and annual availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Table CSV ({sortedListings.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID or neighborhood..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 text-slate-900"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Neighborhood:</span>
          </div>
          <select
            value={selectedNeighborhood}
            onChange={(e) => setSelectedNeighborhood(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Neighborhoods ({listings.length})</option>
            {neighborhoods.map((n) => {
              const count = listings.filter((l) => l.neighborhood_cleansed === n).length;
              return (
                <option key={n} value={n}>
                  {n} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Listing ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('neighborhood_cleansed')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Neighborhood</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('price')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Nightly Price</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('minimum_nights')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Min Nights</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('number_of_reviews')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Reviews Count</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('availability_365')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Avail 365</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-center">Audit Cohort</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-slate-800">
              {sortedListings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                    No listings match the selected filters.
                  </td>
                </tr>
              ) : (
                sortedListings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                      {listing.id}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                      {listing.neighborhood_cleansed}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 text-sm">
                      ${listing.price}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {listing.minimum_nights} nights
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {listing.number_of_reviews}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {listing.availability_365} days
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-500">
                      {listing.property_type || '1-Bedroom'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => {
                          const cohort = listings.filter((l) => l.neighborhood_cleansed === listing.neighborhood_cleansed);
                          onOpenAudit(
                            createAuditTrail(
                              `${listing.neighborhood_cleansed} 1-BR Pricing Cohort`,
                              'Median Nightly Rate',
                              listing.neighborhood_cleansed,
                              cohort,
                              'price'
                            )
                          );
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Audit this neighborhood cohort"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
