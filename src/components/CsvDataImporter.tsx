import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { DcListing } from '../types';

interface CsvDataImporterProps {
  onImportListings: (listings: DcListing[]) => void;
  onResetDefault: () => void;
  currentCount: number;
}

export const CsvDataImporter: React.FC<CsvDataImporterProps> = ({
  onImportListings,
  onResetDefault,
  currentCount,
}) => {
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sampleCsvSnippet = `neighborhood_cleansed,price,minimum_nights,number_of_reviews,availability_365
Logan Circle,175,2,82,120
Logan Circle,185,2,89,105
Logan Circle,165,2,76,95
Dupont Circle,170,3,35,160
Capitol Hill,150,2,89,95
Shaw,160,2,64,130`;

  const parseCsv = (text: string): DcListing[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error('CSV must contain a header row and at least one data row.');
    }

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));

    const colIndexNeighborhood = header.indexOf('neighborhood_cleansed');
    const colIndexPrice = header.indexOf('price');
    const colIndexMinNights = header.indexOf('minimum_nights');
    const colIndexReviews = header.indexOf('number_of_reviews');
    const colIndexAvail = header.indexOf('availability_365');

    if (
      colIndexNeighborhood === -1 ||
      colIndexPrice === -1 ||
      colIndexMinNights === -1 ||
      colIndexReviews === -1 ||
      colIndexAvail === -1
    ) {
      throw new Error(
        'Missing required columns. Your CSV header must include: neighborhood_cleansed, price, minimum_nights, number_of_reviews, availability_365'
      );
    }

    const parsed: DcListing[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV comma splitting safely
      const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      if (parts.length < header.length) continue;

      const rawNeighborhood = parts[colIndexNeighborhood];
      const rawPrice = parts[colIndexPrice].replace(/[^0-9.]/g, '');
      const rawMinNights = parts[colIndexMinNights].replace(/[^0-9.]/g, '');
      const rawReviews = parts[colIndexReviews].replace(/[^0-9.]/g, '');
      const rawAvail = parts[colIndexAvail].replace(/[^0-9.]/g, '');

      const price = parseFloat(rawPrice);
      const minNights = parseInt(rawMinNights, 10) || 1;
      const reviews = parseInt(rawReviews, 10) || 0;
      const avail = parseInt(rawAvail, 10) || 0;

      if (!rawNeighborhood || isNaN(price) || price <= 0) continue;

      parsed.push({
        id: `IMP-${i}`,
        neighborhood_cleansed: rawNeighborhood,
        price,
        minimum_nights: minNights,
        number_of_reviews: reviews,
        availability_365: avail,
        property_type: '1-BR Imported Unit',
      });
    }

    if (parsed.length === 0) {
      throw new Error('No valid listing rows could be parsed. Check column values.');
    }

    return parsed;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setCsvText(text);
        const parsed = parseCsv(text);
        onImportListings(parsed);
        setSuccessMessage(`Successfully imported ${parsed.length} verified listings from "${file.name}"!`);
      } catch (err: any) {
        setError(err.message || 'Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const handleManualParse = () => {
    setError(null);
    setSuccessMessage(null);

    try {
      if (!csvText.trim()) {
        throw new Error('Please paste CSV text or select a file.');
      }
      const parsed = parseCsv(csvText);
      onImportListings(parsed);
      setSuccessMessage(`Successfully imported ${parsed.length} listings into live memory!`);
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV text.');
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + sampleCsvSnippet;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'dc_airbnb_sample_schema.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Import Custom D.C. Airbnb Dataset
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Upload or paste a raw CSV with columns <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded text-xs">neighborhood_cleansed, price, minimum_nights, number_of_reviews, availability_365</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Schema</span>
            </button>
            <button
              onClick={onResetDefault}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Default Data</span>
            </button>
          </div>
        </div>

        {/* Current Dataset Status */}
        <div className="py-4 flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-4 rounded-lg mt-4 border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Active Working Dataset:</span>
            <span className="font-mono text-slate-800">{currentCount} listings in memory</span>
          </div>
          <span className="text-slate-500">Live dynamic calculations active</span>
        </div>

        {/* Upload Zone */}
        <div className="mt-6 space-y-4">
          <label className="block border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50">
            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <span className="text-sm font-semibold text-slate-800 block">
              Click to select a CSV file or drag & drop here
            </span>
            <span className="text-xs text-slate-500 block mt-1">
              Supports standard Inside Airbnb and Open Data D.C. formatted CSVs
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <div className="text-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
            — Or Paste CSV Text Directly —
          </div>

          <div>
            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={sampleCsvSnippet}
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 text-slate-900"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleManualParse}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Parse & Update Application Dataset
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Import Error</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Import Success</span>
                <span>{successMessage}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
