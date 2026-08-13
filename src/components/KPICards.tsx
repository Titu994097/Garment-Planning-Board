import React from 'react';
import { 
  Package, 
  Scissors, 
  Layers, 
  CheckCircle2, 
  Truck, 
  TrendingUp, 
  AlertTriangle,
  Flame
} from 'lucide-react';
import { ProductionOrder, ProductionLine } from '../types';

interface KPICardsProps {
  orders: ProductionOrder[];
  lines: ProductionLine[];
}

export const KPICards: React.FC<KPICardsProps> = ({ orders, lines }) => {
  const totalPlanned = orders.reduce((sum, o) => sum + o.orderQty, 0);
  const totalCut = orders.reduce((sum, o) => sum + o.cutQty, 0);
  const totalSew = orders.reduce((sum, o) => sum + o.sewingQty, 0);
  const totalFinish = orders.reduce((sum, o) => sum + o.finishingQty, 0);
  const totalPack = orders.reduce((sum, o) => sum + o.packedQty, 0);
  const totalShip = orders.reduce((sum, o) => sum + o.shippedQty, 0);

  // Cumulative math buffers:
  const sewWipBuffer = totalCut - totalSew;
  const finishWipBuffer = totalSew - totalFinish;
  const packWipBuffer = totalFinish - totalPack;
  const readyToShipBuffer = totalPack - totalShip;

  const avgEfficiency = lines.length > 0 
    ? (lines.reduce((acc, l) => acc + l.efficiencyRate, 0) / lines.length).toFixed(1)
    : '0.0';

  const criticalOrders = orders.filter(o => o.priority === 'critical' && o.currentStage !== 'packing_shipped');

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      
      {/* 1. Total Planned Capacity */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">Total Planned</span>
          <Package className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-xl font-bold text-slate-900 font-mono">{totalPlanned.toLocaleString()}</div>
        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
          <span>{orders.length} Active Orders</span>
          <span className="font-semibold text-slate-700">100% Load</span>
        </div>
        <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
          <div className="bg-slate-700 h-full rounded-full w-full" />
        </div>
      </div>

      {/* 2. Cutting Output */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-amber-600 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">Cut Output</span>
          <Scissors className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-xl font-bold text-slate-900 font-mono">{totalCut.toLocaleString()}</div>
        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
          <span>Spread & Cut</span>
          <span className="font-semibold text-amber-600">
            {totalPlanned > 0 ? ((totalCut / totalPlanned) * 100).toFixed(0) : 0}% Done
          </span>
        </div>
        <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
          <div 
            className="bg-amber-500 h-full rounded-full transition-all" 
            style={{ width: `${totalPlanned > 0 ? (totalCut / totalPlanned) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* 3. Sewing Output & Floor Buffer */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-blue-600 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">Sewing Output</span>
          <Layers className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-xl font-bold text-slate-900 font-mono">{totalSew.toLocaleString()}</div>
        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
          <span title="Cut garments waiting for sewing">Cut➔Sew WIP:</span>
          <span className="font-semibold text-blue-600 font-mono">{sewWipBuffer.toLocaleString()} pcs</span>
        </div>
        <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
          <div 
            className="bg-blue-600 h-full rounded-full transition-all" 
            style={{ width: `${totalCut > 0 ? (totalSew / totalCut) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* 4. Finishing & QA Output */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-purple-600 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">Finishing & QA</span>
          <CheckCircle2 className="w-4 h-4 text-purple-500" />
        </div>
        <div className="text-xl font-bold text-slate-900 font-mono">{totalFinish.toLocaleString()}</div>
        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
          <span title="Sewn garments waiting for finishing/iron">Sew➔Finish WIP:</span>
          <span className="font-semibold text-purple-600 font-mono">{finishWipBuffer.toLocaleString()} pcs</span>
        </div>
        <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
          <div 
            className="bg-purple-600 h-full rounded-full transition-all" 
            style={{ width: `${totalSew > 0 ? (totalFinish / totalSew) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* 5. Packed & Dispatched */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-emerald-600 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">Packed / Shipped</span>
          <Truck className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-xl font-bold text-slate-900 font-mono">
          {totalPack.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ {totalShip.toLocaleString()}</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
          <span title="Cartons packed ready to depart port">Ready to Ship:</span>
          <span className="font-semibold text-emerald-600 font-mono">{readyToShipBuffer.toLocaleString()} pcs</span>
        </div>
        <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all" 
            style={{ width: `${totalFinish > 0 ? (totalPack / totalFinish) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* 6. Floor Efficiency & Critical Alerts */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-indigo-600 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider">Line Efficiency</span>
          <TrendingUp className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="text-xl font-bold text-slate-900 font-mono flex items-baseline gap-1.5">
          <span>{avgEfficiency}%</span>
          {criticalOrders.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold flex items-center gap-0.5" title="Critical orders requiring attention">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              {criticalOrders.length}
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
          <span>8 Production Lines</span>
          <span className="font-semibold text-emerald-600">On Target</span>
        </div>
        <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
          <div 
            className="bg-indigo-600 h-full rounded-full transition-all" 
            style={{ width: `${Math.min(100, Number(avgEfficiency))}%` }}
          />
        </div>
      </div>

    </div>
  );
};
