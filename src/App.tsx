import React, { useState, useEffect, useCallback } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  FilterBar, 
  ViewTab 
} from './components/FilterBar';
import { 
  KPICards 
} from './components/KPICards';
import { 
  GanttTimeline 
} from './components/GanttTimeline';
import { 
  KanbanBoard 
} from './components/KanbanBoard';
import { 
  MoveStageModal 
} from './components/MoveStageModal';
import { 
  OrderModal 
} from './components/OrderModal';
import { 
  CapacityCalculator 
} from './components/CapacityCalculator';
import { 
  StageWipFlow 
} from './components/StageWipFlow';
import { 
  DailyProductionReport 
} from './components/DailyProductionReport';
import { 
  SourceCodeViewer 
} from './components/SourceCodeViewer';
import { 
  AICopilotModal 
} from './components/AICopilotModal';
import { 
  ProductionOrder, 
  ProductionLine, 
  Buyer, 
  StageType,
  KPIStats 
} from './types';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck 
} from 'lucide-react';

export default function App() {
  // State
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [kpis, setKpis] = useState<KPIStats | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<ViewTab>('board');
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>('all');
  const [selectedLineId, setSelectedLineId] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Modals
  const [orderToMove, setOrderToMove] = useState<ProductionOrder | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState<boolean>(false);
  const [orderToEdit, setOrderToEdit] = useState<ProductionOrder | null>(null);
  const [defaultLineForNewOrder, setDefaultLineForNewOrder] = useState<number | undefined>(undefined);
  const [aiCopilotOpen, setAiCopilotOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch planning data from backend API
  const fetchPlanningData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBuyerId !== 'all') params.append('buyer_id', selectedBuyerId);
      if (selectedLineId !== 'all') params.append('line_id', selectedLineId);
      if (selectedStage !== 'all') params.append('stage', selectedStage);
      if (searchQuery) params.append('search', searchQuery);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await fetch(`/api/planning_data?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders || []);
        setLines(data.lines || []);
        setBuyers(data.buyers || []);
        setKpis(data.kpi_summary || null);
        if (data.csrf_token) setCsrfToken(data.csrf_token);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to parse planning response');
      }
    } catch (err: any) {
      console.error('Error loading planning data:', err);
      setError(err?.message || 'Error communicating with backend API');
    } finally {
      setLoading(false);
    }
  }, [selectedBuyerId, selectedLineId, selectedStage, searchQuery, startDate, endDate]);

  useEffect(() => {
    fetchPlanningData();
  }, [fetchPlanningData]);

  // Stage update handler (Drag & Drop or Modal)
  const handleUpdateCardStatus = async (payload: {
    order_id: number;
    new_stage: StageType;
    cut_qty_add: number;
    sewing_qty_add: number;
    finishing_qty_add: number;
    packed_qty_add: number;
    shipped_qty_add: number;
    notes: string;
  }) => {
    try {
      const res = await fetch('/api/update_card_status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          ...payload,
          csrf_token: csrfToken
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(`PO ${data.order?.orderNo || ''} stage updated to ${payload.new_stage.replace('_', ' ')}!`, 'success');
        await fetchPlanningData();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to update stage' };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  };

  // Drag and drop quick stage move
  const handleDragDropStageChange = async (orderId: number, targetStage: StageType) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    if (targetOrder.currentStage === targetStage) return;

    // Determine auto increments based on target stage
    let cut_add = 0;
    let sew_add = 0;
    let finish_add = 0;
    let pack_add = 0;
    let ship_add = 0;

    if (targetStage === 'cutting' && targetOrder.cutQty === 0) {
      cut_add = targetOrder.orderQty;
    } else if (targetStage === 'sewing') {
      if (targetOrder.cutQty === 0) cut_add = targetOrder.orderQty;
      if (targetOrder.sewingQty === 0) sew_add = targetOrder.orderQty;
    } else if (targetStage === 'finishing') {
      if (targetOrder.cutQty === 0) cut_add = targetOrder.orderQty;
      if (targetOrder.sewingQty === 0) sew_add = targetOrder.orderQty;
      if (targetOrder.finishingQty === 0) finish_add = targetOrder.orderQty;
    } else if (targetStage === 'packing_shipped') {
      if (targetOrder.cutQty === 0) cut_add = targetOrder.orderQty;
      if (targetOrder.sewingQty === 0) sew_add = targetOrder.orderQty;
      if (targetOrder.finishingQty === 0) finish_add = targetOrder.orderQty;
      if (targetOrder.packedQty === 0) pack_add = targetOrder.orderQty;
      if (targetOrder.shippedQty === 0) ship_add = targetOrder.orderQty;
    }

    const res = await handleUpdateCardStatus({
      order_id: orderId,
      new_stage: targetStage,
      cut_qty_add: cut_add,
      sewing_qty_add: sew_add,
      finishing_qty_add: finish_add,
      packed_qty_add: pack_add,
      shipped_qty_add: ship_add,
      notes: `Stage advanced to ${targetStage} via Kanban drag-and-drop`
    });

    if (!res.success) {
      // If direct drag-and-drop validation fails, open the manual logger modal so supervisor can log partials
      setOrderToMove(targetOrder);
      showToast(`Please verify stage quantities before moving to ${targetStage}`, 'info');
    }
  };

  // Save Order (Create or Edit)
  const handleSaveOrder = async (orderData: Partial<ProductionOrder>) => {
    try {
      if (orderToEdit) {
        // Update
        const res = await fetch(`/api/orders/${orderToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify(orderData)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Order ${orderData.orderNo} updated successfully!`);
          await fetchPlanningData();
        }
      } else {
        // Create
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify(orderData)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Order ${orderData.orderNo} planned and loaded onto Line!`);
          await fetchPlanningData();
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save order', 'error');
    }
  };

  // Delete Order
  const handleDeleteOrder = async (orderId: number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrfToken }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Production order removed from schedule');
        await fetchPlanningData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Line capacity
  const handleUpdateLine = async (lineId: number, fields: Partial<ProductionLine>) => {
    try {
      const res = await fetch(`/api/lines/${lineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify(fields)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Line configuration saved!`);
        await fetchPlanningData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset demo factory data
  const handleResetData = async () => {
    if (confirm('Reset factory orders and lines to pristine sample state?')) {
      try {
        const res = await fetch('/api/reset_data', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('Demo factory data reset to default 5 buyer orders');
          await fetchPlanningData();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleResetFilters = () => {
    setSelectedBuyerId('all');
    setSelectedLineId('all');
    setSelectedStage('all');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans text-slate-800 antialiased">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : toastMessage.type === 'error'
              ? 'bg-rose-900 text-rose-100 border-rose-700'
              : 'bg-blue-900 text-blue-100 border-blue-700'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* 1. ERP Header */}
      <Header
        csrfToken={csrfToken}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        onManualRefresh={fetchPlanningData}
        onOpenNewOrder={() => {
          setOrderToEdit(null);
          setDefaultLineForNewOrder(undefined);
          setOrderModalOpen(true);
        }}
        onOpenAiCopilot={() => setAiCopilotOpen(true)}
        onResetData={handleResetData}
        activeOrderCount={orders.length}
        totalPcs={lines.reduce((s, l) => s + l.dailyCapacityTarget, 0)}
      />

      {/* 2. Top Filter Navigation Toolbar */}
      <FilterBar
        buyers={buyers}
        lines={lines}
        selectedBuyerId={selectedBuyerId}
        onSelectBuyer={setSelectedBuyerId}
        selectedLineId={selectedLineId}
        onSelectLine={setSelectedLineId}
        selectedStage={selectedStage}
        onSelectStage={setSelectedStage}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onResetFilters={handleResetFilters}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 3. Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-500 font-mono">
              Loading Garments PPC Production Database...
            </p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center max-w-md mx-auto my-12">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-rose-900">Database Connection Notice</h3>
            <p className="text-xs text-rose-700 mt-1">{error}</p>
            <button
              onClick={fetchPlanningData}
              className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-500 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <KPICards orders={orders} lines={lines} />

            {/* TAB CONTENT */}

            {/* VIEW 1: Planning Board (Gantt + 6-Stage Kanban) */}
            {activeTab === 'board' && (
              <div className="space-y-4">
                {/* 14-Day Gantt Schedule */}
                <GanttTimeline
                  lines={lines}
                  orders={orders}
                  onSelectOrder={(ord) => setOrderToMove(ord)}
                  onOpenNewOrderForLine={(lId) => {
                    setOrderToEdit(null);
                    setDefaultLineForNewOrder(lId);
                    setOrderModalOpen(true);
                  }}
                />

                {/* 6-Stage Cumulative Kanban */}
                <KanbanBoard
                  orders={orders}
                  lines={lines}
                  onMoveStageClick={(ord) => setOrderToMove(ord)}
                  onEditOrder={(ord) => {
                    setOrderToEdit(ord);
                    setOrderModalOpen(true);
                  }}
                  onDragDropStageChange={handleDragDropStageChange}
                  onOpenNewOrder={() => {
                    setOrderToEdit(null);
                    setDefaultLineForNewOrder(undefined);
                    setOrderModalOpen(true);
                  }}
                />
              </div>
            )}

            {/* VIEW 2: Line Capacity & IE Calculator */}
            {activeTab === 'capacity' && (
              <CapacityCalculator
                lines={lines}
                orders={orders}
                onUpdateLine={handleUpdateLine}
              />
            )}

            {/* VIEW 3: WIP Flow & Mathematical Proof */}
            {activeTab === 'wip_flow' && (
              <StageWipFlow
                orders={orders}
                onSelectOrderToMove={(ord) => setOrderToMove(ord)}
              />
            )}

            {/* VIEW 4: Daily Production Report (DPR) */}
            {activeTab === 'dpr' && (
              <DailyProductionReport
                orders={orders}
                lines={lines}
                buyers={buyers}
              />
            )}

            {/* VIEW 5: PHP / MySQL Architecture Code Explorer */}
            {activeTab === 'source_code' && (
              <SourceCodeViewer
                orders={orders}
                lines={lines}
                buyers={buyers}
              />
            )}

            {/* VIEW 6: AI Floor Copilot */}
            {activeTab === 'ai_advisor' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center max-w-xl mx-auto space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Gemini Apparel Industrial Engineering Assistant</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Analyze live line loading, diagnose work-in-progress pileups, and prevent delivery delays.
                  </p>
                </div>
                <button
                  onClick={() => setAiCopilotOpen(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all transform active:scale-95"
                >
                  Open Industrial Engineering Copilot
                </button>
              </div>
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Garments ERP PPC System</span>
            <span>&bull;</span>
            <span>PHP 8 + MySQL 8 + Bootstrap 5 + React Module</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Strict Invariant: Order Qty &ge; Cut &ge; Sew &ge; Finish &ge; Pack &ge; Ship
          </div>
        </div>
      </footer>

      {/* MODALS */}

      {/* Strict Stage Movement Modal */}
      <MoveStageModal
        order={orderToMove}
        lines={lines}
        onClose={() => setOrderToMove(null)}
        onConfirmUpdate={handleUpdateCardStatus}
      />

      {/* Order Create/Edit Modal */}
      <OrderModal
        isOpen={orderModalOpen}
        orderToEdit={orderToEdit}
        defaultLineId={defaultLineForNewOrder}
        buyers={buyers}
        lines={lines}
        onClose={() => {
          setOrderModalOpen(false);
          setOrderToEdit(null);
        }}
        onSave={handleSaveOrder}
        onDelete={handleDeleteOrder}
      />

      {/* AI Copilot Modal */}
      <AICopilotModal
        isOpen={aiCopilotOpen}
        onClose={() => setAiCopilotOpen(false)}
        orders={orders}
        lines={lines}
      />

    </div>
  );
}
