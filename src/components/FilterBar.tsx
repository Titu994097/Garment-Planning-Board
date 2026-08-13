import React from 'react';
import { 
  Filter, 
  Search, 
  XCircle, 
  Calendar, 
  LayoutGrid, 
  Cpu, 
  GitCommit, 
  FileText, 
  Code2, 
  Sparkles,
  RefreshCcw
} from 'lucide-react';
import { Buyer, ProductionLine, StageType } from '../types';

export type ViewTab = 'board' | 'capacity' | 'wip_flow' | 'dpr' | 'source_code' | 'ai_advisor';

interface FilterBarProps {
  buyers: Buyer[];
  lines: ProductionLine[];
  selectedBuyerId: string;
  onSelectBuyer: (id: string) => void;
  selectedLineId: string;
  onSelectLine: (id: string) => void;
  selectedStage: string;
  onSelectStage: (stage: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  startDate: string;
  onStartDateChange: (d: string) => void;
  endDate: string;
  onEndDateChange: (d: string) => void;
  onResetFilters: () => void;
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  buyers,
  lines,
  selectedBuyerId,
  onSelectBuyer,
  selectedLineId,
  onSelectLine,
  selectedStage,
  onSelectStage,
  searchQuery,
  onSearchChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onResetFilters,
  activeTab,
  onTabChange
}) => {
  const isFiltered = selectedBuyerId !== 'all' || selectedLineId !== 'all' || selectedStage !== 'all' || searchQuery !== '' || startDate !== '' || endDate !== '';

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* TOP LEVEL NAVIGATION TABS */}
        <div className="flex items-center justify-between border-b border-slate-200 pt-3 overflow-x-auto gap-2">
          <nav className="flex space-x-2 sm:space-x-4 min-w-max pb-0" aria-label="Views">
            
            <button
              id="tabPlanningBoard"
              onClick={() => onTabChange('board')}
              className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-medium text-xs sm:text-sm transition-all rounded-t-lg ${
                activeTab === 'board'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Planning Board (Gantt & Kanban)</span>
            </button>

            <button
              id="tabCapacityCalc"
              onClick={() => onTabChange('capacity')}
              className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-medium text-xs sm:text-sm transition-all rounded-t-lg ${
                activeTab === 'capacity'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Cpu className="w-4 h-4 text-emerald-600" />
              <span>Line Capacity & Loading</span>
            </button>

            <button
              id="tabWipFlow"
              onClick={() => onTabChange('wip_flow')}
              className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-medium text-xs sm:text-sm transition-all rounded-t-lg ${
                activeTab === 'wip_flow'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <GitCommit className="w-4 h-4 text-indigo-600" />
              <span>WIP Flow & Math Invariant</span>
            </button>

            <button
              id="tabDprReport"
              onClick={() => onTabChange('dpr')}
              className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-medium text-xs sm:text-sm transition-all rounded-t-lg ${
                activeTab === 'dpr'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Daily Production Report (DPR)</span>
            </button>

            <button
              id="tabSourceCode"
              onClick={() => onTabChange('source_code')}
              className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-medium text-xs sm:text-sm transition-all rounded-t-lg ${
                activeTab === 'source_code'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Code2 className="w-4 h-4 text-slate-700" />
              <span>PHP / MySQL Architecture</span>
            </button>

            <button
              id="tabAiAdvisor"
              onClick={() => onTabChange('ai_advisor')}
              className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-medium text-xs sm:text-sm transition-all rounded-t-lg ${
                activeTab === 'ai_advisor'
                  ? 'border-purple-600 text-purple-600 bg-purple-50/50 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-purple-900 hover:border-purple-300'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>AI Floor Copilot</span>
            </button>

          </nav>
        </div>

        {/* DYNAMIC FILTER CONTROLS */}
        <div className="py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-3 items-center">
            
            {/* Search Input */}
            <div className="lg:col-span-3 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="inputFilterSearch"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search PO#, Style, Fabric, Buyer..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              {searchQuery && (
                <button 
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Buyer Select */}
            <div className="lg:col-span-2">
              <select
                id="selectFilterBuyer"
                value={selectedBuyerId}
                onChange={(e) => onSelectBuyer(e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
              >
                <option value="all">All Buyers (Zara, H&M, Next, C&A, Uniqlo)</option>
                {buyers.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Line Select */}
            <div className="lg:col-span-2">
              <select
                id="selectFilterLine"
                value={selectedLineId}
                onChange={(e) => onSelectLine(e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
              >
                <option value="all">All Production Lines (01 - 08)</option>
                {lines.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.lineCode} - {l.name} ({l.operatorCount} ops)
                  </option>
                ))}
              </select>
            </div>

            {/* Stage Select */}
            <div className="lg:col-span-2">
              <select
                id="selectFilterStage"
                value={selectedStage}
                onChange={(e) => onSelectStage(e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
              >
                <option value="all">All 6 Stages</option>
                <option value="order_planned">1. Order Planned</option>
                <option value="fabric_inhouse">2. Fabric In-House</option>
                <option value="cutting">3. Cutting Stage</option>
                <option value="sewing">4. Sewing Assembly</option>
                <option value="finishing">5. Finishing & Quality</option>
                <option value="packing_shipped">6. Packed & Shipped</option>
              </select>
            </div>

            {/* Delivery Date Start */}
            <div className="lg:col-span-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                id="inputFilterDateStart"
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="w-full py-1 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Filter by delivery window start"
              />
            </div>

            {/* Reset Filter Button */}
            <div className="lg:col-span-1 flex justify-end">
              {isFiltered ? (
                <button
                  id="btnResetFilters"
                  onClick={onResetFilters}
                  className="w-full py-1.5 px-2 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors"
                  title="Clear all filters"
                >
                  <RefreshCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              ) : (
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-mono py-1.5 w-full">
                  <Filter className="w-3 h-3" />
                  <span>Filters</span>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
