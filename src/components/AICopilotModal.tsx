import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  TrendingUp,
  Cpu,
  Bot
} from 'lucide-react';
import { ProductionOrder, ProductionLine } from '../types';

interface AICopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: ProductionOrder[];
  lines: ProductionLine[];
}

export const AICopilotModal: React.FC<AICopilotModalProps> = ({
  isOpen,
  onClose,
  orders,
  lines
}) => {
  if (!isOpen) return null;

  const [prompt, setPrompt] = useState<string>('Analyze active production lines for WIP pileups and delivery bottlenecks');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<{
    summary?: string;
    bottlenecks?: Array<{ stage: string; severity: string; issue: string; recommendation: string }>;
    deliveryRisks?: Array<{ orderNo: string; riskLevel: string; projectedDelayDays: number; action: string }>;
    lineBalancingRecommendations?: Array<{ lineCode: string; currentEfficiency: number; targetEfficiency: number; recommendation: string }>;
  } | null>(null);

  const handleRunAnalysis = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    setIsLoading(true);
    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: activePrompt,
          orders,
          lines
        })
      });
      const data = await response.json();
      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
      }
    } catch (err) {
      console.error('Failed to run Gemini analysis', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/80 border border-purple-400 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Gemini Industrial Engineering Copilot</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-800 text-purple-200 border border-purple-700 font-mono">
                  gemini-3.7-flash
                </span>
              </div>
              <p className="text-xs text-purple-200">
                AI bottleneck detection, line capacity balancing & delivery risk mitigation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-purple-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5">
          
          {/* Quick Prompt Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Industrial Engineering Query Preset:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const p = 'Identify WIP pileups between Cutting, Sewing, and Finishing workstations';
                  setPrompt(p);
                  handleRunAnalysis(p);
                }}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 text-left text-xs transition-all flex items-start gap-2"
              >
                <Layers className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">WIP & Buffer Diagnostic</span>
                  <span className="text-[11px] text-slate-500">Detect cut-to-sew & sew-to-finish buffers</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const p = 'Evaluate 14-day shipment deadlines and forecast critical delivery risks';
                  setPrompt(p);
                  handleRunAnalysis(p);
                }}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 text-left text-xs transition-all flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Delivery Risk Forecast</span>
                  <span className="text-[11px] text-slate-500">Check Zara & H&M vessel departure schedules</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const p = 'Recommend operator rebalancing across Line 01 to Line 08 based on SMV';
                  setPrompt(p);
                  handleRunAnalysis(p);
                }}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 text-left text-xs transition-all flex items-start gap-2"
              >
                <Cpu className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Line Balancing Strategy</span>
                  <span className="text-[11px] text-slate-500">Operator shifts & efficiency optimization</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const p = 'Audit cumulative stage quantities and ensure strict invariant adherence';
                  setPrompt(p);
                  handleRunAnalysis(p);
                }}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 text-left text-xs transition-all flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Cumulative Integrity Audit</span>
                  <span className="text-[11px] text-slate-500">
                    {'Verify Order >= Cut >= Sew >= Finish >= Pack'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Custom Query Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask Copilot (e.g. How to recover 2 days delay on PO-ZR-9820?)"
              className="flex-1 py-2 px-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <button
              onClick={() => handleRunAnalysis()}
              disabled={isLoading}
              className="py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <span className="animate-spin">🌀</span>
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{isLoading ? 'Analyzing...' : 'Run Analysis'}</span>
            </button>
          </div>

          {/* Analysis Results Display */}
          {analysisResult && (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              
              {/* Summary Card */}
              {analysisResult.summary && (
                <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 text-xs text-purple-950">
                  <div className="font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-purple-700" />
                    Executive Production Assessment
                  </div>
                  <p className="leading-relaxed">{analysisResult.summary}</p>
                </div>
              )}

              {/* Bottlenecks */}
              {analysisResult.bottlenecks && analysisResult.bottlenecks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Identified Factory Bottlenecks:
                  </h4>
                  <div className="space-y-2">
                    {analysisResult.bottlenecks.map((b, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 capitalize">{b.stage} Stage</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            b.severity === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {b.severity} Severity
                          </span>
                        </div>
                        <p className="text-slate-600">{b.issue}</p>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 text-slate-800 font-medium text-[11px] flex items-start gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                          <span><strong>Action:</strong> {b.recommendation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Line Balancing Recommendations */}
              {analysisResult.lineBalancingRecommendations && analysisResult.lineBalancingRecommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Workstation Rebalancing Suggestions:
                  </h4>
                  <div className="space-y-2">
                    {analysisResult.lineBalancingRecommendations.map((lb, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                          <span>{lb.lineCode}</span>
                          <span className="font-mono text-emerald-700">
                            {lb.currentEfficiency}% &rarr; {lb.targetEfficiency}% Eff
                          </span>
                        </div>
                        <p className="text-slate-600">{lb.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
