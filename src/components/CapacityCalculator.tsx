import React, { useState } from 'react';
import { 
  Cpu, 
  Users, 
  Clock, 
  TrendingUp, 
  Sliders, 
  CheckCircle2, 
  Calculator, 
  Layers,
  Save,
  RotateCcw
} from 'lucide-react';
import { ProductionLine, ProductionOrder } from '../types';

interface CapacityCalculatorProps {
  lines: ProductionLine[];
  orders: ProductionOrder[];
  onUpdateLine: (lineId: number, updatedFields: Partial<ProductionLine>) => Promise<void>;
}

export const CapacityCalculator: React.FC<CapacityCalculatorProps> = ({
  lines,
  orders,
  onUpdateLine
}) => {
  // Sandbox test state
  const [selectedLineId, setSelectedLineId] = useState<number>(lines[0]?.id || 1);
  const selectedLine = lines.find(l => l.id === selectedLineId) || lines[0];

  const [sandboxOperators, setSandboxOperators] = useState<number>(selectedLine?.operatorCount || 40);
  const [sandboxHours, setSandboxHours] = useState<number>(selectedLine?.workingHours || 8);
  const [sandboxEfficiency, setSandboxEfficiency] = useState<number>(selectedLine?.efficiencyRate || 75);
  const [sandboxSmv, setSandboxSmv] = useState<number>(14.5);
  const [sandboxUnitPrice, setSandboxUnitPrice] = useState<number>(4.80);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Sync sandbox when selectedLine changes
  const handleSelectLine = (id: number) => {
    setSelectedLineId(id);
    const l = lines.find(x => x.id === id);
    if (l) {
      setSandboxOperators(l.operatorCount);
      setSandboxHours(l.workingHours);
      setSandboxEfficiency(l.efficiencyRate);
      const runningOrder = orders.find(o => o.lineId === id);
      if (runningOrder) {
        setSandboxSmv(runningOrder.smv);
        setSandboxUnitPrice(runningOrder.unitPrice);
      }
    }
  };

  // Industrial Engineering Standard Formula:
  // Daily Target Output (pcs) = (Operators * Working Hours * 60) / SMV * (Efficiency / 100)
  const calculateOutput = (ops: number, hrs: number, eff: number, smvVal: number) => {
    if (!smvVal || smvVal <= 0) return 0;
    const totalMinutes = ops * hrs * 60;
    const standardOutput = totalMinutes / smvVal;
    return Math.round(standardOutput * (eff / 100));
  };

  const currentDailyOutput = calculateOutput(sandboxOperators, sandboxHours, sandboxEfficiency, sandboxSmv);
  const currentHourlyOutput = Math.round(currentDailyOutput / (sandboxHours || 8));
  const currentDailyRevenue = Math.round(currentDailyOutput * sandboxUnitPrice);

  const handleSaveToLine = async () => {
    setIsSaving(true);
    await onUpdateLine(selectedLine.id, {
      operatorCount: sandboxOperators,
      workingHours: sandboxHours,
      efficiencyRate: sandboxEfficiency,
      dailyCapacityTarget: currentDailyOutput
    });
    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Industrial Engineering Formula */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-base sm:text-lg">
                Apparel Line Balancing & Capacity Engine
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Industrial Engineering standard calculation for garment workstations, SMV allocation & shift capacity.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-xs font-mono">
            <div className="text-blue-400 font-semibold mb-1">Standard Production Capacity Formula:</div>
            <div className="text-slate-100 font-bold tracking-wide">
              Daily Target (pcs) = <span className="text-emerald-400">(Operators &times; Hours &times; 60)</span> / <span className="text-amber-400">SMV</span> &times; <span className="text-indigo-400">(Efficiency %)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Sandbox Simulator + All Lines Capacity Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Interactive Line Simulator (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-sm text-slate-900">Line Parameter Simulator</h4>
            </div>
            <select
              value={selectedLineId}
              onChange={(e) => handleSelectLine(Number(e.target.value))}
              className="py-1 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold font-mono text-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              {lines.map(l => (
                <option key={l.id} value={l.id}>{l.lineCode} - {l.name}</option>
              ))}
            </select>
          </div>

          {/* Slider 1: Operators */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Workstation Operators:
              </span>
              <span className="font-mono font-bold text-blue-600 text-sm">{sandboxOperators} Ops</span>
            </div>
            <input
              type="range"
              min="20"
              max="70"
              step="1"
              value={sandboxOperators}
              onChange={(e) => setSandboxOperators(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>20 (Basic Tee)</span>
              <span>45 (Standard Chino)</span>
              <span>70 (Outerwear/Denim)</span>
            </div>
          </div>

          {/* Slider 2: Efficiency */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                Line Efficiency Rate:
              </span>
              <span className="font-mono font-bold text-indigo-600 text-sm">{sandboxEfficiency}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="100"
              step="0.5"
              value={sandboxEfficiency}
              onChange={(e) => setSandboxEfficiency(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>40% (Changeover)</span>
              <span>75% (Target)</span>
              <span>100% (Max)</span>
            </div>
          </div>

          {/* Slider 3: Style SMV */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Style SMV (Minutes/Piece):
              </span>
              <span className="font-mono font-bold text-amber-600 text-sm">{sandboxSmv} mins</span>
            </div>
            <input
              type="range"
              min="4"
              max="35"
              step="0.1"
              value={sandboxSmv}
              onChange={(e) => setSandboxSmv(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>4.0 (T-Shirt)</span>
              <span>15.0 (Hoodie/Polo)</span>
              <span>35.0 (Heavy Jacket)</span>
            </div>
          </div>

          {/* Additional Settings: Working hours & Unit Price */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Daily Shift Hours</label>
              <input
                type="number"
                min="4"
                max="12"
                step="0.5"
                value={sandboxHours}
                onChange={(e) => setSandboxHours(Number(e.target.value))}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">FOB Unit Price ($)</label>
              <input
                type="number"
                min="0.5"
                max="50"
                step="0.05"
                value={sandboxUnitPrice}
                onChange={(e) => setSandboxUnitPrice(Number(e.target.value))}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Computed Output Stat Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-900">Projected Shift Output:</span>
              <span className="text-2xl font-extrabold font-mono text-blue-700">
                {currentDailyOutput.toLocaleString()} <span className="text-xs font-normal">pcs/day</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-blue-200/60 font-mono">
              <div>
                <div className="text-[10px] text-blue-600">Hourly Run Rate</div>
                <div className="font-bold text-slate-800">{currentHourlyOutput} pcs / hr</div>
              </div>
              <div>
                <div className="text-[10px] text-blue-600">Daily Revenue Capacity</div>
                <div className="font-bold text-emerald-700">${currentDailyRevenue.toLocaleString()} / day</div>
              </div>
            </div>
          </div>

          {/* Action Button: Apply to Live Line */}
          <button
            id="btnSaveSimulatorToLine"
            onClick={handleSaveToLine}
            disabled={isSaving}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Line Capacity Updated!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Updating Floor Line...' : `Update ${selectedLine.lineCode} Live Capacity`}</span>
              </>
            )}
          </button>
        </div>

        {/* Right: All Production Lines Capacity Matrix (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900">All Factory Production Lines Matrix</h4>
              <p className="text-xs text-slate-500">Live floor configuration across 8 production units</p>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              Total Factory Output: {lines.reduce((s, l) => s + l.dailyCapacityTarget, 0).toLocaleString()} pcs/d
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Line</th>
                  <th className="p-2.5">Supervisor & Floor</th>
                  <th className="p-2.5 text-center">Operators</th>
                  <th className="p-2.5 text-center">Efficiency</th>
                  <th className="p-2.5 text-right">Daily Target</th>
                  <th className="p-2.5 text-center">Status</th>
                  <th className="p-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {lines.map((l) => {
                  const isCurrent = l.id === selectedLineId;
                  return (
                    <tr key={l.id} className={`hover:bg-slate-50 transition-colors ${isCurrent ? 'bg-blue-50/40' : ''}`}>
                      <td className="p-2.5 font-bold text-slate-900 font-sans">
                        <div className="flex items-center gap-1.5">
                          <span>{l.lineCode}</span>
                          {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                        </div>
                      </td>
                      <td className="p-2.5 font-sans">
                        <div className="font-medium text-slate-800">{l.supervisor}</div>
                        <div className="text-[10px] text-slate-400">{l.floor}</div>
                      </td>
                      <td className="p-2.5 text-center text-slate-700">{l.operatorCount} ops</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-1.5 py-0.2 rounded font-bold ${
                          l.efficiencyRate >= 80 ? 'text-emerald-700 bg-emerald-50' : 'text-blue-700 bg-blue-50'
                        }`}>
                          {l.efficiencyRate}%
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-blue-700">
                        {l.dailyCapacityTarget.toLocaleString()} pcs
                      </td>
                      <td className="p-2.5 text-center font-sans">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          l.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-sans">
                        <button
                          onClick={() => handleSelectLine(l.id)}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                        >
                          Simulate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
