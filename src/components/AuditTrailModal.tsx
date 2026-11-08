import React, { useState } from 'react';
import { X, Calculator, HelpCircle, Check, Copy, ArrowUpDown, FileSpreadsheet } from 'lucide-react';
import { AuditTrailDetails } from '../types';

interface AuditTrailModalProps {
  audit: AuditTrailDetails | null;
  onClose: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({ audit, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>('asc');

  if (!audit) return null;

  const handleCopyFormula = () => {
    navigator.clipboard.writeText(`${audit.formula} | Derived from N=${audit.rowCount} rows in ${audit.neighborhood}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCsv = () => {
    const headers = ['id', 'neighborhood_cleansed', 'price', 'minimum_nights', 'number_of_reviews', 'availability_365'];
    const rows = audit.listings.map((l) => [
      l.id,
      `"${l.neighborhood_cleansed}"`,
      l.price,
      l.minimum_nights,
      l.number_of_reviews,
      l.availability_365,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${audit.neighborhood.toLowerCase().replace(/\s+/g, '_')}_audit_comps.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sortedListings = [...audit.listings].sort((a, b) =>
    tableSortOrder === 'asc' ? a.price - b.price : b.price - a.price
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <Calculator className="w-3.5 h-3.5 text-amber-600" />
              <span>Deterministic Audit Trail · Zero Hallucination Guarantee</span>
            </div>
            <h2 id="audit-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
              {audit.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span>Cohort: {audit.filterDescription}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-medium text-slate-700">{audit.rowCount} Verified Rows</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-6">
          {/* Result Highlight Box */}
          <div className="p-4 bg-slate-900 text-white rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
                Derived Value for {audit.metricName}
              </span>
              <div className="text-3xl font-bold font-mono tracking-tight text-white mt-0.5 tabular-nums">
                {audit.formattedValue}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyFormula}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Formula'}</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Comps CSV</span>
              </button>
            </div>
          </div>

          {/* Mathematical Formula Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Exact Mathematical Formula Applied
            </h3>
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-amber-950 font-mono text-sm break-all font-medium">
              {audit.formula}
            </div>
          </div>

          {/* Step-by-Step Mathematical Explanation */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Calculation Walkthrough
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2.5">
              {audit.stepByStep.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs text-slate-700 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-mono font-semibold flex items-center justify-center shrink-0 text-[11px]">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Array of Sorted Values */}
          {audit.sortedNumbers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Ascending Sequence Array ({audit.sortedNumbers.length} data points)
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Gold = Median Index {audit.middleIndices.join(', ')}
                </span>
              </div>
              <div className="p-3 bg-slate-100 rounded-lg max-h-36 overflow-y-auto border border-slate-200">
                <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                  {audit.sortedNumbers.map((val, idx) => {
                    const isMiddle = audit.middleIndices.includes(idx);
                    return (
                      <span
                        key={idx}
                        title={`Index [${idx}]: $${val}`}
                        className={`px-2 py-0.5 rounded text-[11px] tabular-nums transition-colors ${
                          isMiddle
                            ? 'bg-amber-400 text-slate-950 font-bold ring-2 ring-amber-500'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        ${val}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Raw Underlying Data Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Underlying Row-Level Comps ({audit.listings.length} rows)
              </h3>
              <button
                onClick={() => setTableSortOrder(tableSortOrder === 'asc' ? 'desc' : 'asc')}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium cursor-pointer"
              >
                <ArrowUpDown className="w-3 h-3" />
                Sort Price {tableSortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Listing ID</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-right">Min Nights</th>
                      <th className="py-2 px-3 text-right">Reviews</th>
                      <th className="py-2 px-3 text-right">Avail 365</th>
                      <th className="py-2 px-3">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                    {sortedListings.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-sans text-slate-700">{l.id}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">${l.price}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{l.minimum_nights}d</td>
                        <td className="py-2 px-3 text-right text-slate-600">{l.number_of_reviews}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{l.availability_365}d</td>
                        <td className="py-2 px-3 font-sans text-slate-500">{l.property_type || '1-BR Unit'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>District STR Advisory Empirical Verification Standard</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close Audit Memo
          </button>
        </div>
      </div>
    </div>
  );
};
