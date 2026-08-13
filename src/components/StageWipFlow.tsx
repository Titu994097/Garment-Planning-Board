import React, { useState } from 'react';
import { 
  GitCommit, 
  ArrowRight, 
  Scissors, 
  Layers, 
  CheckCircle2, 
  Truck, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp,
  Info,
  Check
} from 'lucide-react';
import { ProductionOrder } from '../types';

interface StageWipFlowProps {
  orders: ProductionOrder[];
  onSelectOrderToMove: (order: ProductionOrder) => void;
}

export const StageWipFlow: React.FC<StageWipFlowProps> = ({ orders, onSelectOrderToMove }) => {
  const [selectedOrderId, setSelectedOrderId] = useState<number>(orders[0]?.id || 101);
  const selectedOrder = orders.find(o => o.id === selectedOrderId) || orders[0];

  if (!selectedOrder) return null;

  // Inter-stage WIP Buffers:
  const cuttingWip = selectedOrder.orderQty - selectedOrder.cutQty; // yet to be cut
  const cutToSewWip = selectedOrder.cutQty - selectedOrder.sewingQty; // waiting for sewing
  const sewToFinishWip = selectedOrder.sewingQty - selectedOrder.finishingQty; // waiting for finishing
  const finishToPackWip = selectedOrder.finishingQty - selectedOrder.packedQty; // waiting for packing
  const packToShipWip = selectedOrder.packedQty - selectedOrder.shippedQty; // waiting for ship
  const totalBalanceToShip = selectedOrder.orderQty - selectedOrder.shippedQty;

  const cutPct = (selectedOrder.cutQty / selectedOrder.orderQty) * 100;
  const sewPct = (selectedOrder.sewingQty / selectedOrder.orderQty) * 100;
  const finishPct = (selectedOrder.finishingQty / selectedOrder.orderQty) * 100;
  const packPct = (selectedOrder.packedQty / selectedOrder.orderQty) * 100;
  const shipPct = (selectedOrder.shippedQty / selectedOrder.orderQty) * 100;

  return (
    <div className="space-y-6">
      
      {/* Mathematical Correction Explanation Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-base">
              Apparel Manufacturing Production Flow: Mathematical Proof
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              In garment manufacturing, the <strong>exact same pieces of fabric</strong> pass sequentially through 
              Cutting &rarr; Sewing &rarr; Finishing &rarr; Packing &rarr; Shipment. A naive additive formula like 
              <code className="mx-1 px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded font-mono text-[11px]">
                Order Qty = Cut + Sew + Finish + Pack + Balance
              </code> 
              erroneously double-counts the same garments at every stage.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs">
                <div className="font-bold text-rose-800 flex items-center gap-1.5 mb-1">
                  <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-[10px]">✕</span>
                  Flawed Naive Additive Method
                </div>
                <div className="font-mono text-rose-900 text-[11px]">
                  Order Qty = Cut + Sew + Finish + Pack + Balance
                </div>
                <p className="text-[10px] text-rose-700 mt-1">
                  Causes massive double-counting because sewn garments were already counted during cutting.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
                  <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">✓</span>
                  Rigorous Cumulative Stage Output Invariant
                </div>
                <div className="font-mono text-emerald-900 text-[11px] font-bold">
                  Order Qty &ge; Cut Qty &ge; Sewing Qty &ge; Finishing Qty &ge; Packed Qty &ge; Shipped Qty
                </div>
                <p className="text-[10px] text-emerald-700 mt-1">
                  Mathematically sound. Inter-stage WIP is measured as the difference between consecutive stage cumulative totals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-sm text-slate-900">Select Production Order to Inspect Flow</h4>
            <p className="text-xs text-slate-500">Examine live buffer quantities between factory workstations</p>
          </div>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(Number(e.target.value))}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold font-mono text-blue-700 focus:ring-2 focus:ring-blue-500"
          >
            {orders.map(o => (
              <option key={o.id} value={o.id}>
                {o.orderNo} - {o.buyerName.split(' ')[0]} ({o.styleNo}) - {o.orderQty.toLocaleString()} pcs
              </option>
            ))}
          </select>
        </div>

        {/* Sequential Step Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          
          {/* Step 1: Cutting Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5" />
                  1. Cutting Output
                </span>
                <span className="font-mono text-xs font-bold">{cutPct.toFixed(0)}%</span>
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {selectedOrder.cutQty.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ {selectedOrder.orderQty.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="bg-white p-2 rounded border border-slate-200 text-[11px]">
              <div className="text-slate-500">Uncut Fabric Balance:</div>
              <div className="font-bold font-mono text-slate-800">{cuttingWip.toLocaleString()} pcs</div>
            </div>
          </div>

          {/* Step 2: Sewing Assembly */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-2 relative">
            <div>
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  2. Sewing Output
                </span>
                <span className="font-mono text-xs font-bold">{sewPct.toFixed(0)}%</span>
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {selectedOrder.sewingQty.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ {selectedOrder.cutQty.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-blue-50/80 p-2 rounded border border-blue-200 text-[11px]">
              <div className="text-blue-700 font-semibold">Cut➔Sew Floor Buffer:</div>
              <div className="font-bold font-mono text-blue-900">+{cutToSewWip.toLocaleString()} pcs ready</div>
            </div>
          </div>

          {/* Step 3: Finishing & QA */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between text-purple-700 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  3. Finishing / QA
                </span>
                <span className="font-mono text-xs font-bold">{finishPct.toFixed(0)}%</span>
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {selectedOrder.finishingQty.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ {selectedOrder.sewingQty.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-purple-50/80 p-2 rounded border border-purple-200 text-[11px]">
              <div className="text-purple-700 font-semibold">Sew➔Finish Buffer:</div>
              <div className="font-bold font-mono text-purple-900">+{sewToFinishWip.toLocaleString()} pcs ready</div>
            </div>
          </div>

          {/* Step 4: Packing */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  4. Cartons Packed
                </span>
                <span className="font-mono text-xs font-bold">{packPct.toFixed(0)}%</span>
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {selectedOrder.packedQty.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ {selectedOrder.finishingQty.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-emerald-50/80 p-2 rounded border border-emerald-200 text-[11px]">
              <div className="text-emerald-700 font-semibold">Finish➔Pack Buffer:</div>
              <div className="font-bold font-mono text-emerald-900">+{finishToPackWip.toLocaleString()} pcs ready</div>
            </div>
          </div>

          {/* Step 5: Shipped */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  5. Shipped to Port
                </span>
                <span className="font-mono text-xs font-bold">{shipPct.toFixed(0)}%</span>
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {selectedOrder.shippedQty.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ {selectedOrder.packedQty.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-emerald-100/70 p-2 rounded border border-emerald-300 text-[11px]">
              <div className="text-emerald-800 font-semibold">Ready in Warehouse:</div>
              <div className="font-bold font-mono text-emerald-950">+{packToShipWip.toLocaleString()} pcs ready</div>
            </div>
          </div>

        </div>

        {/* Bottom Detailed Analysis Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-bold text-slate-800">Total Order Balance to Ship:</span>
            <span className="font-mono font-bold text-blue-700 text-sm">{totalBalanceToShip.toLocaleString()} pcs</span>
            <span className="text-slate-400">({(100 - shipPct).toFixed(1)}% remaining)</span>
          </div>

          <button
            onClick={() => onSelectOrderToMove(selectedOrder)}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>Log Output / Advance Stage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
};
