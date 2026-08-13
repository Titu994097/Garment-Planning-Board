import React, { useState } from 'react';
import { 
  Plus, 
  Scissors, 
  Layers, 
  CheckCircle2, 
  Truck, 
  Calendar, 
  User, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Clock
} from 'lucide-react';
import { ProductionOrder, ProductionLine, StageType } from '../types';

interface KanbanBoardProps {
  orders: ProductionOrder[];
  lines: ProductionLine[];
  onMoveStageClick: (order: ProductionOrder, targetStage?: StageType) => void;
  onEditOrder: (order: ProductionOrder) => void;
  onDragDropStageChange: (orderId: number, targetStage: StageType) => void;
  onOpenNewOrder: () => void;
}

const STAGES: { id: StageType; title: string; subtitle: string; icon: any; color: string; border: string; headerBg: string }[] = [
  {
    id: 'order_planned',
    title: '1. Order Planned',
    subtitle: 'BOM & Plan Locked',
    icon: Calendar,
    color: 'text-slate-700',
    border: 'border-slate-300',
    headerBg: 'bg-slate-100 text-slate-800'
  },
  {
    id: 'fabric_inhouse',
    title: '2. Fabric In-House',
    subtitle: 'Knits/Denim Tested',
    icon: Layers,
    color: 'text-sky-700',
    border: 'border-sky-300',
    headerBg: 'bg-sky-50 text-sky-800 border border-sky-200'
  },
  {
    id: 'cutting',
    title: '3. Cutting',
    subtitle: 'Spreading & Cut',
    icon: Scissors,
    color: 'text-amber-700',
    border: 'border-amber-300',
    headerBg: 'bg-amber-50 text-amber-800 border border-amber-200'
  },
  {
    id: 'sewing',
    title: '4. Sewing Assembly',
    subtitle: 'Line Workstations',
    icon: Layers,
    color: 'text-blue-700',
    border: 'border-blue-300',
    headerBg: 'bg-blue-50 text-blue-800 border border-blue-200'
  },
  {
    id: 'finishing',
    title: '5. Finishing & QA',
    subtitle: 'Iron, Button & QA',
    icon: CheckCircle2,
    color: 'text-purple-700',
    border: 'border-purple-300',
    headerBg: 'bg-purple-50 text-purple-800 border border-purple-200'
  },
  {
    id: 'packing_shipped',
    title: '6. Packed & Shipped',
    subtitle: 'Cartons & Container',
    icon: Truck,
    color: 'text-emerald-700',
    border: 'border-emerald-300',
    headerBg: 'bg-emerald-50 text-emerald-800 border border-emerald-200'
  }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  orders,
  lines,
  onMoveStageClick,
  onEditOrder,
  onDragDropStageChange,
  onOpenNewOrder
}) => {
  const [draggedOrderId, setDraggedOrderId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<StageType | null>(null);

  const handleDragStart = (e: React.DragEvent, orderId: number) => {
    e.dataTransfer.setData('text/plain', String(orderId));
    setDraggedOrderId(orderId);
  };

  const handleDragOver = (e: React.DragEvent, stage: StageType) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: StageType) => {
    e.preventDefault();
    setDragOverStage(null);
    const orderIdStr = e.dataTransfer.getData('text/plain');
    const orderId = Number(orderIdStr) || draggedOrderId;
    if (orderId) {
      onDragDropStageChange(orderId, targetStage);
    }
    setDraggedOrderId(null);
  };

  const getBuyerBadgeColor = (buyerName: string) => {
    if (buyerName.includes('Zara')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (buyerName.includes('H&M')) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (buyerName.includes('Next')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (buyerName.includes('C&A')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (buyerName.includes('Uniqlo')) return 'bg-pink-100 text-pink-800 border-pink-200';
    return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-600 text-white animate-pulse">CRITICAL</span>;
      case 'high':
        return <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 border border-orange-200">HIGH</span>;
      case 'medium':
        return <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200">MED</span>;
      default:
        return <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">NORMAL</span>;
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageOrders = orders.filter(o => o.currentStage === stage.id);
        const stageTotalQty = stageOrders.reduce((sum, o) => sum + o.orderQty, 0);
        const isTarget = dragOverStage === stage.id;
        const Icon = stage.icon;

        return (
          <div
            key={stage.id}
            id={`kanban-col-${stage.id}`}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
            className={`flex-shrink-0 w-80 rounded-xl bg-slate-100/90 border transition-all flex flex-col max-h-[calc(100vh-280px)] ${
              isTarget ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-400' : 'border-slate-200'
            }`}
          >
            {/* Stage Column Header */}
            <div className={`p-3 rounded-t-xl ${stage.headerBg} border-b flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-white/80 shadow-xs">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs">{stage.title}</h4>
                  <p className="text-[10px] opacity-75">{stage.subtitle}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-white/90 shadow-xs">
                  {stageOrders.length}
                </span>
                <div className="text-[9px] font-mono mt-0.5 opacity-80">
                  {stageTotalQty.toLocaleString()} pcs
                </div>
              </div>
            </div>

            {/* Cards List Container */}
            <div className="p-2 flex-1 overflow-y-auto space-y-2.5">
              {stageOrders.length > 0 ? (
                stageOrders.map((order) => {
                  const line = lines.find(l => l.id === order.lineId);
                  
                  // Cumulative Calculations for progress bar
                  const cutPct = (order.cutQty / order.orderQty) * 100;
                  const sewPct = (order.sewingQty / order.orderQty) * 100;
                  const finishPct = (order.finishingQty / order.orderQty) * 100;
                  const packPct = (order.packedQty / order.orderQty) * 100;
                  const shipPct = (order.shippedQty / order.orderQty) * 100;

                  // Buffer alerts
                  const sewWip = order.cutQty - order.sewingQty;
                  const finishWip = order.sewingQty - order.finishingQty;
                  const packWip = order.finishingQty - order.packedQty;
                  const shipWip = order.packedQty - order.shippedQty;

                  return (
                    <div
                      key={order.id}
                      id={`kanban-card-${order.id}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order.id)}
                      className="bg-white rounded-lg p-3 border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative"
                    >
                      {/* Top Card Info */}
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getBuyerBadgeColor(order.buyerName)}`}>
                          {order.buyerName.split(' ')[0]}
                        </span>
                        <div className="flex items-center gap-1">
                          {getPriorityBadge(order.priority)}
                        </div>
                      </div>

                      {/* PO Number & Style */}
                      <div className="mb-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 font-mono tracking-tight">{order.orderNo}</span>
                          <span className="text-[11px] font-bold text-blue-600 font-mono">
                            {order.orderQty.toLocaleString()} pcs
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-slate-700 truncate">{order.styleNo}</div>
                        <div className="text-[10px] text-slate-500 truncate">{order.itemType}</div>
                      </div>

                      {/* Line & Daily Target Info */}
                      <div className="bg-slate-50 p-1.5 rounded-md border border-slate-100 text-[11px] grid grid-cols-2 gap-1 mb-2">
                        <div className="flex items-center gap-1 text-slate-600">
                          <span className="font-mono font-semibold text-slate-900">{line?.lineCode || 'LINE-01'}</span>
                          <span className="text-[10px] text-slate-400">({line?.operatorCount} ops)</span>
                        </div>
                        <div className="text-right text-slate-500 font-mono">
                          SMV: <span className="font-semibold text-slate-800">{order.smv}m</span>
                        </div>
                      </div>

                      {/* Cumulative Progress Bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>Stage Cumulative Flow</span>
                          <span className="font-mono font-semibold text-slate-700">
                            {shipPct > 0 ? `${shipPct.toFixed(0)}% Shipped` : `${sewPct.toFixed(0)}% Sewn`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                          {/* Shipped (Green) */}
                          <div style={{ width: `${shipPct}%` }} className="bg-emerald-500 h-full" title={`Shipped: ${order.shippedQty.toLocaleString()} pcs`} />
                          {/* Packed (Teal) */}
                          <div style={{ width: `${packPct - shipPct}%` }} className="bg-emerald-300 h-full" title={`Packed: ${order.packedQty.toLocaleString()} pcs`} />
                          {/* Finishing (Purple) */}
                          <div style={{ width: `${finishPct - packPct}%` }} className="bg-purple-500 h-full" title={`Finishing: ${order.finishingQty.toLocaleString()} pcs`} />
                          {/* Sewing (Blue) */}
                          <div style={{ width: `${sewPct - finishPct}%` }} className="bg-blue-500 h-full" title={`Sewing: ${order.sewingQty.toLocaleString()} pcs`} />
                          {/* Cut (Amber) */}
                          <div style={{ width: `${cutPct - sewPct}%` }} className="bg-amber-400 h-full" title={`Cut: ${order.cutQty.toLocaleString()} pcs`} />
                        </div>
                        
                        {/* Breakdown Pills */}
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mt-1">
                          <span title="Cut output">Cut:{order.cutQty.toLocaleString()}</span>
                          <span title="Sewing output">Sew:{order.sewingQty.toLocaleString()}</span>
                          <span title="Finishing output">Fin:{order.finishingQty.toLocaleString()}</span>
                          <span title="Packed output">Pack:{order.packedQty.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* WIP Warnings / Stage Status Highlights */}
                      {sewWip > 0 && order.currentStage === 'cutting' && (
                        <div className="text-[10px] bg-amber-50 text-amber-800 p-1 rounded border border-amber-200 mb-2 flex items-center justify-between">
                          <span>Cut➔Sew Buffer:</span>
                          <span className="font-mono font-bold">+{sewWip.toLocaleString()} ready</span>
                        </div>
                      )}

                      {finishWip > 0 && order.currentStage === 'sewing' && (
                        <div className="text-[10px] bg-blue-50 text-blue-800 p-1 rounded border border-blue-200 mb-2 flex items-center justify-between">
                          <span>Sew➔Finish Buffer:</span>
                          <span className="font-mono font-bold">+{finishWip.toLocaleString()} ready</span>
                        </div>
                      )}

                      {shipWip > 0 && (
                        <div className="text-[10px] bg-emerald-50 text-emerald-800 p-1 rounded border border-emerald-200 mb-2 flex items-center justify-between">
                          <span>Ready for Vessel:</span>
                          <span className="font-mono font-bold">{shipWip.toLocaleString()} pcs</span>
                        </div>
                      )}

                      {/* Bottom Controls */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        <button
                          id={`btn-edit-order-${order.id}`}
                          onClick={() => onEditOrder(order)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 py-1 rounded transition-colors font-medium"
                        >
                          Details
                        </button>

                        <button
                          id={`btn-move-stage-${order.id}`}
                          onClick={() => onMoveStageClick(order)}
                          className="flex items-center gap-1 text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded font-semibold transition-colors border border-blue-200"
                        >
                          <span>Log / Move</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                    </div>
                  );
                })
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-lg p-3 text-center">
                  <p className="text-[11px]">No orders in this stage</p>
                  <p className="text-[10px] text-slate-400 mt-1">Drag cards here or create new</p>
                </div>
              )}
            </div>

            {/* Column Footer: Quick add if stage is planned */}
            {stage.id === 'order_planned' && (
              <div className="p-2 border-t border-slate-200 bg-white rounded-b-xl">
                <button
                  id="btnKanbanAddNewOrder"
                  onClick={onOpenNewOrder}
                  className="w-full py-1.5 px-3 text-xs bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg border border-slate-200 hover:border-blue-200 font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Production PO</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
