import React from 'react';
import { Building2, UploadCloud, RefreshCw, Database } from 'lucide-react';

interface HeaderProps {
  activeTab: 'explorer' | 'logan-case' | 'data-inspector' | 'importer';
  setActiveTab: (tab: 'explorer' | 'logan-case' | 'data-inspector' | 'importer') => void;
  totalListingsCount: number;
  onResetData: () => void;
  isCustomData: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalListingsCount,
  onResetData,
  isCustomData,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Zone 1: Single Brand wordmark element */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold tracking-tight">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap block">
                District STR Advisory
              </span>
              <span className="text-xs text-slate-500 font-medium block -mt-0.5">
                Washington D.C. · Airbnb Pricing & Yield Auditing
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Clean text with hover states) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('explorer')}
              className={`transition-colors whitespace-nowrap pb-1 pt-1 ${
                activeTab === 'explorer'
                  ? 'text-slate-950 font-semibold border-b-2 border-slate-900'
                  : 'hover:text-slate-950'
              }`}
            >
              Market Explorer
            </button>
            <button
              onClick={() => setActiveTab('logan-case')}
              className={`transition-colors whitespace-nowrap pb-1 pt-1 flex items-center gap-1.5 ${
                activeTab === 'logan-case'
                  ? 'text-slate-950 font-semibold border-b-2 border-slate-900'
                  : 'hover:text-slate-950'
              }`}
            >
              Logan Circle Case Audit
            </button>
            <button
              onClick={() => setActiveTab('data-inspector')}
              className={`transition-colors whitespace-nowrap pb-1 pt-1 ${
                activeTab === 'data-inspector'
                  ? 'text-slate-950 font-semibold border-b-2 border-slate-900'
                  : 'hover:text-slate-950'
              }`}
            >
              Dataset Inspector
            </button>
            <button
              onClick={() => setActiveTab('importer')}
              className={`transition-colors whitespace-nowrap pb-1 pt-1 flex items-center gap-1.5 ${
                activeTab === 'importer'
                  ? 'text-slate-950 font-semibold border-b-2 border-slate-900'
                  : 'hover:text-slate-950'
              }`}
            >
              <UploadCloud className="w-4 h-4 text-slate-400" />
              Import CSV
            </button>
          </nav>

          {/* Zone 3: Primary Action & Data Health */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-md font-mono tabular-nums">
              <Database className="w-3.5 h-3.5 text-slate-600" />
              <span>{totalListingsCount} D.C. 1-BR Comps</span>
            </div>

            {isCustomData && (
              <button
                onClick={onResetData}
                title="Restore default D.C. sample dataset"
                className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Default</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('logan-case')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
            >
              View Logan Circle Audit
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
