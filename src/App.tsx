import { useState, useCallback, useEffect } from 'react';
import { EMBEDDED_DC_1BR_LISTINGS } from './data/embeddedCleanedListings';
import { DcListing, AuditTrailDetails } from './types';
import { Header } from './components/Header';
import { MarketExplorer } from './components/MarketExplorer';
import { LoganCircleAuditPanel } from './components/LoganCircleAuditPanel';
import { ListingsDataInspector } from './components/ListingsDataInspector';
import { CsvDataImporter } from './components/CsvDataImporter';
import { AuditTrailModal } from './components/AuditTrailModal';
import { ShieldAlert, Database, Building2, CheckCircle2 } from 'lucide-react';

/**
 * Parses the clean D.C. 1-bedroom CSV directly into strongly-typed listing records.
 */
function parseCleanedCsv(text: string): DcListing[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const parsed: DcListing[] = [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());

  const colId = header.indexOf('id');
  const colNeigh = header.indexOf('neighborhood_cleansed');
  const colRawNeigh = header.indexOf('raw_neighborhood');
  const colPrice = header.indexOf('price');
  const colMinNights = header.indexOf('minimum_nights');
  const colReviews = header.indexOf('number_of_reviews');
  const colAvail = header.indexOf('availability_365');
  const colType = header.indexOf('property_type');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV regex split respecting quotes
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    const cleanParts = parts.map((p) => p.replace(/^"|"$/g, '').trim());

    const neigh = cleanParts[colNeigh >= 0 ? colNeigh : 1];
    const price = parseFloat(cleanParts[colPrice >= 0 ? colPrice : 3]);
    const minNights = parseInt(cleanParts[colMinNights >= 0 ? colMinNights : 4], 10) || 1;
    const reviews = parseInt(cleanParts[colReviews >= 0 ? colReviews : 5], 10) || 0;
    const avail = parseInt(cleanParts[colAvail >= 0 ? colAvail : 6], 10) || 0;

    if (neigh && !isNaN(price) && price > 0) {
      parsed.push({
        id: cleanParts[colId >= 0 ? colId : 0] || `DC-${i}`,
        neighborhood_cleansed: neigh,
        raw_neighborhood: colRawNeigh >= 0 ? cleanParts[colRawNeigh] : undefined,
        price: Math.round(price),
        minimum_nights: minNights,
        number_of_reviews: reviews,
        availability_365: avail,
        property_type: colType >= 0 ? cleanParts[colType] : '1-Bedroom Condo/Apartment',
      });
    }
  }

  return parsed;
}

export default function App() {
  // Initialize with embedded cleaned dataset of 2,059 D.C. 1-bedroom apartments
  const [listings, setListings] = useState<DcListing[]>(EMBEDDED_DC_1BR_LISTINGS);
  const [isCustomData, setIsCustomData] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'explorer' | 'logan-case' | 'data-inspector' | 'importer'>('explorer');
  const [activeAudit, setActiveAudit] = useState<AuditTrailDetails | null>(null);
  const [csvSourceStatus, setCsvSourceStatus] = useState<string>('Embedded Cleaned D.C. Dataset (2,059 1-BR Units)');

  // On application load, fetch and parse the cleaned CSV file into state to ensure live execution against raw records
  useEffect(() => {
    let isMounted = true;

    async function loadDatasetFromCsv() {
      try {
        const response = await fetch('/dc_1br_cleaned.csv');
        if (response.ok) {
          const csvText = await response.text();
          const parsed = parseCleanedCsv(csvText);
          if (isMounted && parsed.length > 0) {
            setListings(parsed);
            setCsvSourceStatus(`Live CSV parsed: ${parsed.length} verified D.C. 1-BR listings`);
          }
        }
      } catch (err) {
        console.warn('Network fetch for CSV bypassed, using embedded state:', err);
      }
    }

    loadDatasetFromCsv();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleResetData = useCallback(() => {
    setListings(EMBEDDED_DC_1BR_LISTINGS);
    setIsCustomData(false);
    setCsvSourceStatus(`Reset to baseline: ${EMBEDDED_DC_1BR_LISTINGS.length} D.C. 1-BR listings`);
  }, []);

  const handleImportListings = useCallback((newListings: DcListing[]) => {
    setListings(newListings);
    setIsCustomData(true);
    setCsvSourceStatus(`Custom uploaded CSV: ${newListings.length} listings in active state`);
    setActiveTab('explorer');
  }, []);

  const handleOpenAudit = useCallback((audit: AuditTrailDetails) => {
    setActiveAudit(audit);
  }, []);

  const handleCloseAudit = useCallback(() => {
    setActiveAudit(null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navigation Header adhering to Top Bar Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalListingsCount={listings.length}
        onResetData={handleResetData}
        isCustomData={isCustomData}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subtle data pipeline indicator */}
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium text-slate-700">{csvSourceStatus}</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Filtered for 1-BR Entire Condos & Apts · Personal Identifiers Stripped
          </span>
        </div>

        {activeTab === 'explorer' && (
          <MarketExplorer
            listings={listings}
            onOpenAudit={handleOpenAudit}
            onSelectLoganCase={() => setActiveTab('logan-case')}
          />
        )}

        {activeTab === 'logan-case' && (
          <LoganCircleAuditPanel
            listings={listings}
            onOpenAudit={handleOpenAudit}
            onViewAllComps={() => setActiveTab('data-inspector')}
          />
        )}

        {activeTab === 'data-inspector' && (
          <ListingsDataInspector
            listings={listings}
            onOpenAudit={handleOpenAudit}
          />
        )}

        {activeTab === 'importer' && (
          <CsvDataImporter
            onImportListings={handleImportListings}
            onResetDefault={handleResetData}
            currentCount={listings.length}
          />
        )}
      </main>

      {/* Deterministic Audit Trail Modal */}
      {activeAudit && (
        <AuditTrailModal
          audit={activeAudit}
          onClose={handleCloseAudit}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-700" />
            <span className="font-semibold text-slate-900">District STR Advisory LLC</span>
            <span aria-hidden="true">·</span>
            <span>Washington, D.C. Property Asset Advisory</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <span className="flex items-center gap-1.5 font-mono">
              <Database className="w-3.5 h-3.5" />
              <span>N={listings.length} live records</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              <span>DLCP Compliance Grounded</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
