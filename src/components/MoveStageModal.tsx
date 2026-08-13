import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Scissors, 
  Layers, 
  Truck, 
  Clock, 
  Lock, 
  ArrowRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProductionOrder, ProductionLine, StageType } from '../types';

interface MoveStageModalProps {
  order: ProductionOrder | null;
  lines: ProductionLine[];
  onClose: () => void;
  onConfirmUpdate: (payload: {
    order_id: number;
    new_stage: StageType;
    cut_qty_add: number;
    sewing_qty_add: number;
    finishing_qty_add: number;
    packed_qty_add: number;
    shipped_qty_add: number;
    notes: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export const MoveStageModal: React.FC<MoveStageModalProps> = ({
  order,
  lines,
  onClose,
  onConfirmUpdate
}) => {
  if (!order) return null;

  const [selectedStage, setSelectedStage] = useState<StageType>(order.currentStage);
  const [cutAdd, setCutAdd] = useState<number>(0);
  const [sewAdd, setSewAdd] = useState<number>(0);
  const [finishAdd, setFinishAdd] = useState<number>(0);
  const [packAdd, setPackAdd] = useState<number>(0);
  const [shipAdd, setShipAdd] = useState<number>(0);
  const [notes, setNotes] = useState<string>('Standard shift output update via supervisor tablet');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const prospectiveCut = order.cutQty + Number(cutAdd || 0);
  const prospectiveSew = order.sewingQty + Number(sewAdd || 0);
  const prospectiveFinish = order.finishingQty + Number(finishAdd || 0);
  const prospectivePack = order.packedQty + Number(packAdd || 0);
  const prospectiveShip = order.shippedQty + Number(shipAdd || 0);

  // Validation checks:
  const isCutValid = prospectiveCut <= order.orderQty;
  const isSewValid = prospectiveSew <= prospectiveCut;
  const isFinishValid = prospectiveFinish <= prospectiveSew;
  const isPackValid = prospectivePack <= prospectiveFinish;
  const isShipValid = prospectiveShip <= prospectivePack;

  const isValidMovement = isCutValid && isSewValid && isFinishValid && isPackValid && isShipValid;

  const handleQuickFillStage = (stage: StageType) => {
    setSelectedStage(stage);
    if (stage === 'cutting') {
      const remainingCut = order.orderQty - order.cutQty;
      setCutAdd(Math.max(0, remainingCut));
    } else if (stage === 'sewing') {
      const availableCut = prospectiveCut - order.sewingQty;
      setSewAdd(Math.max(0, availableCut));
    } else if (stage === 'finishing') {
      const availableSew = prospectiveSew - order.finishingQty;
      setFinishAdd(Math.max(0, availableSew));
    } else if (stage === 'packing_shipped') {
      const availableFinish = prospectiveFinish - order.packedQty;
      setPackAdd(Math.max(0, availableFinish));
      setShipAdd(Math.max(0, availableFinish));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidMovement) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await onConfirmUpdate({
      order_id: order.id,
      new_stage: selectedStage,
      cut_qty_add: Number(cutAdd || 0),
      sewing_qty_add: Number(sewAdd || 0),
      finishing_qty_add: Number(finishAdd || 0),
      packed_qty_add: Number(packAdd || 0),
      shipped_qty_add: Number(shipAdd || 0),
      notes
    });

    setIsSubmitting(false);

    if (res.success) {
      if (prospectiveShip >= order.orderQty && prospectiveShip > 0) {
        // Trigger celebratory confetti for full shipment!
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (_) {}
      }
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to update stage quantities');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">Stage Transition & Output Logger</h3>
                <span className="text-[10px] font-mono bg-blue-950 border border-blue-700 px-2 py-0.5 rounded text-blue-300">
                  {order.orderNo}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {order.buyerName} // Style: {order.styleNo} ({order.orderQty.toLocaleString()} pcs)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Mathematical Invariant Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
            <div className="flex items-center justify-between text-slate-700 font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-blue-700">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Apparel Cumulative Invariant Protection (Row Lock)
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Order Qty ({order.orderQty.toLocaleString()}) &ge; Cut &ge; Sew &ge; Finish &ge; Pack &ge; Ship
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">
              The system executes <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">SELECT ... FOR UPDATE</code> before validation to prevent simultaneous double-counting of garments.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Stage Update Rejected:</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Current vs Prospective Quantities Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Garment Stage</th>
                  <th className="p-2.5 text-right">Current Output</th>
                  <th className="p-2.5 text-center">Add This Shift</th>
                  <th className="p-2.5 text-right">New Cumulative</th>
                  <th className="p-2.5 text-center">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                
                {/* 1. Cutting */}
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-sans font-medium text-slate-800 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-amber-600" />
                    <span>1. Cutting (Cut Qty)</span>
                  </td>
                  <td className="p-2.5 text-right text-slate-600">{order.cutQty.toLocaleString()}</td>
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      min="0"
                      max={order.orderQty - order.cutQty}
                      value={cutAdd || ''}
                      onChange={(e) => setCutAdd(Number(e.target.value))}
                      placeholder="0"
                      className="w-24 text-center py-1 px-2 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-2.5 text-right font-bold text-amber-700">{prospectiveCut.toLocaleString()}</td>
                  <td className="p-2.5 text-center font-sans">
                    {isCutValid ? (
                      <span className="text-emerald-600 font-medium text-[11px]">&le; Order Qty</span>
                    ) : (
                      <span className="text-rose-600 font-bold text-[11px]">Exceeds Order!</span>
                    )}
                  </td>
                </tr>

                {/* 2. Sewing */}
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-sans font-medium text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>2. Sewing (Assembly)</span>
                  </td>
                  <td className="p-2.5 text-right text-slate-600">{order.sewingQty.toLocaleString()}</td>
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      min="0"
                      value={sewAdd || ''}
                      onChange={(e) => setSewAdd(Number(e.target.value))}
                      placeholder="0"
                      className="w-24 text-center py-1 px-2 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-2.5 text-right font-bold text-blue-700">{prospectiveSew.toLocaleString()}</td>
                  <td className="p-2.5 text-center font-sans">
                    {isSewValid ? (
                      <span className="text-emerald-600 font-medium text-[11px]">&le; Cut Qty</span>
                    ) : (
                      <span className="text-rose-600 font-bold text-[11px]">Exceeds Cut Qty!</span>
                    )}
                  </td>
                </tr>

                {/* 3. Finishing & QA */}
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-sans font-medium text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>3. Finishing & QA</span>
                  </td>
                  <td className="p-2.5 text-right text-slate-600">{order.finishingQty.toLocaleString()}</td>
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      min="0"
                      value={finishAdd || ''}
                      onChange={(e) => setFinishAdd(Number(e.target.value))}
                      placeholder="0"
                      className="w-24 text-center py-1 px-2 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-2.5 text-right font-bold text-purple-700">{prospectiveFinish.toLocaleString()}</td>
                  <td className="p-2.5 text-center font-sans">
                    {isFinishValid ? (
                      <span className="text-emerald-600 font-medium text-[11px]">&le; Sewing Qty</span>
                    ) : (
                      <span className="text-rose-600 font-bold text-[11px]">Exceeds Sewn!</span>
                    )}
                  </td>
                </tr>

                {/* 4. Packing & Cartons */}
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-sans font-medium text-slate-800 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>4. Packing (Cartons)</span>
                  </td>
                  <td className="p-2.5 text-right text-slate-600">{order.packedQty.toLocaleString()}</td>
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      min="0"
                      value={packAdd || ''}
                      onChange={(e) => setPackAdd(Number(e.target.value))}
                      placeholder="0"
                      className="w-24 text-center py-1 px-2 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-2.5 text-right font-bold text-emerald-700">{prospectivePack.toLocaleString()}</td>
                  <td className="p-2.5 text-center font-sans">
                    {isPackValid ? (
                      <span className="text-emerald-600 font-medium text-[11px]">&le; Finished Qty</span>
                    ) : (
                      <span className="text-rose-600 font-bold text-[11px]">Exceeds QA Pass!</span>
                    )}
                  </td>
                </tr>

                {/* 5. Shipped & Port Dispatch */}
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-sans font-medium text-slate-800 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>5. Dispatched / Shipped</span>
                  </td>
                  <td className="p-2.5 text-right text-slate-600">{order.shippedQty.toLocaleString()}</td>
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      min="0"
                      value={shipAdd || ''}
                      onChange={(e) => setShipAdd(Number(e.target.value))}
                      placeholder="0"
                      className="w-24 text-center py-1 px-2 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-2.5 text-right font-bold text-emerald-800">{prospectiveShip.toLocaleString()}</td>
                  <td className="p-2.5 text-center font-sans">
                    {isShipValid ? (
                      <span className="text-emerald-600 font-medium text-[11px]">&le; Packed Qty</span>
                    ) : (
                      <span className="text-rose-600 font-bold text-[11px]">Exceeds Packed!</span>
                    )}
                  </td>
                </tr>

              </tbody>
            </table>
          </div>

          {/* Quick Target Stage Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Set Current Active Kanban Stage:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'order_planned', label: '1. Planned' },
                { id: 'fabric_inhouse', label: '2. Fabric In-House' },
                { id: 'cutting', label: '3. Cutting' },
                { id: 'sewing', label: '4. Sewing' },
                { id: 'finishing', label: '5. Finishing' },
                { id: 'packing_shipped', label: '6. Packed & Shipped' }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStage(st.id as StageType)}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition-all ${
                    selectedStage === st.id
                      ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Supervisor Audit Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Production Log Notes / Supervisor Handoff:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full py-1.5 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. 1st batch cleared button attach stations with zero defects"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValidMovement || isSubmitting}
              className={`px-5 py-2 text-xs font-semibold rounded-lg text-white flex items-center gap-2 transition-all shadow-sm ${
                isValidMovement && !isSubmitting
                  ? 'bg-blue-600 hover:bg-blue-500 active:scale-95'
                  : 'bg-slate-300 cursor-not-allowed text-slate-500'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Verifying Row Lock...' : 'Commit Stage Update'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
