import React, { useMemo } from 'react';
import { 
  Calendar, 
  Users, 
  ChevronRight, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Scissors,
  Layers,
  Sparkles
} from 'lucide-react';
import { ProductionLine, ProductionOrder } from '../types';

interface GanttTimelineProps {
  lines: ProductionLine[];
  orders: ProductionOrder[];
  onSelectOrder: (order: ProductionOrder) => void;
  onOpenNewOrderForLine: (lineId: number) => void;
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({
  lines,
  orders,
  onSelectOrder,
  onOpenNewOrderForLine
}) => {
  // Generate 14-day timeline window starting Aug 10, 2026
  const timelineDays = useMemo(() => {
    const baseDate = new Date('2026-08-10T00:00:00');
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6; // Sun or Sat
      const isToday = i === 3; // Aug 13 is "today" per simulation timestamp
      const dateStr = d.toISOString().substring(0, 10);
      days.push({
        index: i,
        date: d,
        dateStr,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        monthName: d.toLocaleDateString('en-US', { month: 'short' }),
        isWeekend,
        isToday
      });
    }
    return days;
  }, []);

  const startDateStr = timelineDays[0].dateStr;
  const endDateStr = timelineDays[13].dateStr;

  // Function to calculate bar position and width across 14 days
  const calculateBarSpan = (planStart: string, planEnd: string) => {
    const startIdx = timelineDays.findIndex(d => d.dateStr === planStart);
    const endIdx = timelineDays.findIndex(d => d.dateStr === planEnd);

    const actualStart = startIdx !== -1 ? startIdx : (planStart < startDateStr ? 0 : 13);
    const actualEnd = endIdx !== -1 ? endIdx : (planEnd > endDateStr ? 13 : 0);

    const span = Math.max(1, actualEnd - actualStart + 1);
    const leftPercent = (actualStart / 14) * 100;
    const widthPercent = (span / 14) * 100;

    return { leftPercent, widthPercent, span };
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'order_planned': return 'bg-slate-500 border-slate-600';
      case 'fabric_inhouse': return 'bg-sky-600 border-sky-700';
      case 'cutting': return 'bg-amber-600 border-amber-700';
      case 'sewing': return 'bg-blue-600 border-blue-700';
      case 'finishing': return 'bg-purple-600 border-purple-700';
      case 'packing_shipped': return 'bg-emerald-600 border-emerald-700';
      default: return 'bg-slate-600 border-slate-700';
    }
  };

  const getBuyerBadge = (buyerName: string) => {
    if (buyerName.includes('Zara')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (buyerName.includes('H&M')) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (buyerName.includes('Next')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (buyerName.includes('C&A')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (buyerName.includes('Uniqlo')) return 'bg-pink-100 text-pink-800 border-pink-200';
    return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              14-Day Production Line Gantt Schedule
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
              Aug 10 - Aug 23, 2026
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time floor scheduling, workstation capacity loading & stage progress tracking
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> Planned</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span> Fabric</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> Cutting</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Sewing</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Finishing</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Shipped</span>
        </div>
      </div>

      {/* Gantt Matrix Grid */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <div className="min-w-[980px]">
          
          {/* Header Days Row */}
          <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 text-xs">
            {/* Left Line column label */}
            <div className="col-span-3 p-2.5 font-semibold text-slate-700 border-r border-slate-200 flex items-center justify-between">
              <span>Production Line & Chief</span>
              <span className="text-[10px] text-slate-400 font-mono">Capacity / Target</span>
            </div>

            {/* 14 Day columns */}
            <div className="col-span-9 grid grid-cols-14 divide-x divide-slate-200">
              {timelineDays.map((day) => (
                <div 
                  key={day.dateStr} 
                  className={`p-1.5 text-center text-[11px] ${
                    day.isToday 
                      ? 'bg-blue-50/80 font-bold text-blue-700' 
                      : day.isWeekend 
                      ? 'bg-slate-100/70 text-slate-400' 
                      : 'text-slate-700'
                  }`}
                >
                  <div className="text-[10px] uppercase">{day.dayName}</div>
                  <div className={`font-mono ${day.isToday ? 'w-5 h-5 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]' : ''}`}>
                    {day.dayNum}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Line Rows */}
          <div className="divide-y divide-slate-200">
            {lines.map((line) => {
              const lineOrders = orders.filter(o => o.lineId === line.id);

              return (
                <div key={line.id} className="grid grid-cols-12 hover:bg-slate-50/70 transition-colors group">
                  
                  {/* Left Line Card */}
                  <div className="col-span-3 p-2.5 border-r border-slate-200 flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 font-mono">{line.lineCode}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          line.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {line.status}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-blue-600">
                        {line.dailyCapacityTarget} pcs/d
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">{line.name}</div>
                    
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span className="truncate">Sup: {line.supervisor}</span>
                      <span className="flex items-center gap-1 font-mono text-slate-500">
                        <Users className="w-2.5 h-2.5" />
                        {line.operatorCount} ops ({line.efficiencyRate}%)
                      </span>
                    </div>
                  </div>

                  {/* Right 14-Day Timeline Bar Canvas */}
                  <div className="col-span-9 relative min-h-[58px] flex items-center bg-white">
                    {/* Background grid day lines */}
                    <div className="absolute inset-0 grid grid-cols-14 divide-x divide-slate-100 pointer-events-none">
                      {timelineDays.map(d => (
                        <div 
                          key={d.dateStr} 
                          className={`${d.isToday ? 'bg-blue-50/30' : d.isWeekend ? 'bg-slate-50/50' : ''}`} 
                        />
                      ))}
                    </div>

                    {/* Today vertical line marker */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none"
                      style={{ left: `${(3.5 / 14) * 100}%` }}
                      title="Today (Live Timestamp)"
                    />

                    {/* Schedule Bars */}
                    {lineOrders.length > 0 ? (
                      lineOrders.map((order) => {
                        const { leftPercent, widthPercent } = calculateBarSpan(order.planStartDate, order.planEndDate);
                        const progressPct = order.orderQty > 0 
                          ? ((order.shippedQty > 0 ? order.shippedQty : order.sewingQty) / order.orderQty) * 100 
                          : 0;

                        return (
                          <div
                            key={order.id}
                            id={`gantt-order-${order.id}`}
                            onClick={() => onSelectOrder(order)}
                            className={`absolute h-9 rounded-md shadow-sm border text-white text-[11px] p-1.5 flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all z-20 overflow-hidden ${getStageColor(order.currentStage)}`}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${Math.max(widthPercent, 7)}%`
                            }}
                            title={`Click to inspect PO ${order.orderNo}: ${order.styleNo} (${order.orderQty.toLocaleString()} pcs) - Stage: ${order.currentStage}`}
                          >
                            {/* Inner progress fill */}
                            <div 
                              className="absolute left-0 top-0 bottom-0 bg-white/20 pointer-events-none transition-all"
                              style={{ width: `${progressPct}%` }}
                            />

                            <div className="relative z-10 flex items-center justify-between gap-1 leading-tight">
                              <span className="font-bold truncate text-[10px] font-mono">{order.orderNo}</span>
                              <span className="text-[9px] bg-black/30 px-1 py-0.2 rounded font-mono">
                                {order.orderQty.toLocaleString()} pcs
                              </span>
                            </div>

                            <div className="relative z-10 flex items-center justify-between text-[9px] opacity-90 truncate">
                              <span className="truncate">{order.styleNo}</span>
                              <span className="capitalize font-medium">{order.currentStage.replace('_', ' ')}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="w-full flex items-center justify-center text-xs text-slate-300 italic py-2">
                        <button
                          onClick={() => onOpenNewOrderForLine(line.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                        >
                          + Load Style onto {line.lineCode}
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </div>

    </div>
  );
};
