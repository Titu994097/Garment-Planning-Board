import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  Plus, 
  Sparkles, 
  RotateCcw,
  Activity,
  CheckCircle2
} from 'lucide-react';

interface HeaderProps {
  csrfToken: string;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onManualRefresh: () => void;
  onOpenNewOrder: () => void;
  onOpenAiCopilot: () => void;
  onResetData: () => void;
  activeOrderCount: number;
  totalPcs: number;
}

export const Header: React.FC<HeaderProps> = ({
  csrfToken,
  autoRefresh,
  onToggleAutoRefresh,
  onManualRefresh,
  onOpenNewOrder,
  onOpenAiCopilot,
  onResetData,
  activeOrderCount,
  totalPcs
}) => {
  const [timeString, setTimeString] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(30);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' ' +
        now.toLocaleTimeString('en-US', { hour12: false }) +
        ' UTC'
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onManualRefresh();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, onManualRefresh]);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    setCountdown(30);
    onManualRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & ERP Module Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-inner">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">GARMENTS ERP</span>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-blue-900/80 text-blue-300 border border-blue-700/50">
                  PPC MODULE
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                  <Activity className="w-3 h-3 animate-pulse text-emerald-400" />
                  Live Floor Feed
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Production Planning & Control // 14-Day Gantt & 6-Stage Cumulative Kanban
              </p>
            </div>
          </div>

          {/* Center Info Stats */}
          <div className="hidden lg:flex items-center gap-6 text-xs text-slate-300 border-x border-slate-800 px-6 py-1">
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider">Active POs</div>
              <div className="font-bold text-slate-100 text-sm font-mono">{activeOrderCount} Orders</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider">Floor Capacity</div>
              <div className="font-bold text-blue-400 text-sm font-mono">{totalPcs.toLocaleString()} pcs</div>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-md border border-slate-700/60">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-[11px] text-slate-200" title={csrfToken}>
                CSRF: <span className="text-emerald-300 font-bold">ACTIVE</span>
              </span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Live Clock */}
            <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-slate-800/60 px-2.5 py-1.5 rounded-md border border-slate-700/40">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{timeString || 'Loading clock...'}</span>
            </div>

            {/* Auto-refresh indicator & toggle */}
            <button
              id="btnAutoRefreshToggle"
              onClick={onToggleAutoRefresh}
              className={`text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors border ${
                autoRefresh 
                  ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' 
                  : 'bg-amber-950/50 text-amber-300 border-amber-800/50 hover:bg-amber-900/50'
              }`}
              title="Toggle automatic 30s polling"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-400' : 'text-amber-400'} ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="font-mono">{autoRefresh ? `${countdown}s` : 'Paused'}</span>
            </button>

            {/* Instant Manual Refresh */}
            <button
              id="btnManualRefresh"
              onClick={handleRefreshClick}
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700/40"
              title="Instant Refresh Data"
            >
              <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            {/* AI Production Copilot */}
            <button
              id="btnHeaderAiCopilot"
              onClick={onOpenAiCopilot}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-all transform active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>AI Copilot</span>
            </button>

            {/* New Production Order Button */}
            <button
              id="btnHeaderNewOrder"
              onClick={onOpenNewOrder}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New PO</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
