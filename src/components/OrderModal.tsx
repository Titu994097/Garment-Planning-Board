import React, { useState, useEffect } from 'react';
import { X, Package, Calendar, Users, Cpu, FileText, Check } from 'lucide-react';
import { ProductionOrder, ProductionLine, Buyer, StageType } from '../types';

interface OrderModalProps {
  isOpen: boolean;
  orderToEdit: ProductionOrder | null;
  defaultLineId?: number;
  buyers: Buyer[];
  lines: ProductionLine[];
  onClose: () => void;
  onSave: (orderData: Partial<ProductionOrder>) => Promise<void>;
  onDelete?: (orderId: number) => Promise<void>;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  orderToEdit,
  defaultLineId,
  buyers,
  lines,
  onClose,
  onSave,
  onDelete
}) => {
  if (!isOpen) return null;

  const [orderNo, setOrderNo] = useState<string>('');
  const [buyerId, setBuyerId] = useState<number>(buyers[0]?.id || 1);
  const [styleNo, setStyleNo] = useState<string>('');
  const [itemType, setItemType] = useState<string>('');
  const [fabricDetails, setFabricDetails] = useState<string>('');
  const [orderQty, setOrderQty] = useState<number>(10000);
  const [smv, setSmv] = useState<number>(14.5);
  const [unitPrice, setUnitPrice] = useState<number>(4.50);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [planStartDate, setPlanStartDate] = useState<string>('');
  const [planEndDate, setPlanEndDate] = useState<string>('');
  const [lineId, setLineId] = useState<number>(defaultLineId || lines[0]?.id || 1);
  const [priority, setPriority] = useState<'normal' | 'medium' | 'high' | 'critical'>('medium');
  const [fabricStatus, setFabricStatus] = useState<'pending' | 'partially_inhouse' | 'fully_inhouse'>('fully_inhouse');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (orderToEdit) {
      setOrderNo(orderToEdit.orderNo);
      setBuyerId(orderToEdit.buyerId);
      setStyleNo(orderToEdit.styleNo);
      setItemType(orderToEdit.itemType);
      setFabricDetails(orderToEdit.fabricDetails);
      setOrderQty(orderToEdit.orderQty);
      setSmv(orderToEdit.smv);
      setUnitPrice(orderToEdit.unitPrice);
      setDeliveryDate(orderToEdit.deliveryDate);
      setPlanStartDate(orderToEdit.planStartDate);
      setPlanEndDate(orderToEdit.planEndDate);
      setLineId(orderToEdit.lineId);
      setPriority(orderToEdit.priority);
      setFabricStatus(orderToEdit.fabricStatus);
      setRemarks(orderToEdit.remarks);
    } else {
      // New Order defaults
      const randPo = 'PO-' + (buyers.find(b => b.id === buyerId)?.code || 'ZR') + '-' + Math.floor(1000 + Math.random() * 9000);
      setOrderNo(randPo);
      setStyleNo('ST-2026-APPAR-' + Math.floor(10 + Math.random() * 90));
      setItemType("Men's Knit Polo Shirt");
      setFabricDetails('100% Combed Cotton 200 GSM Single Jersey');
      setOrderQty(12000);
      setSmv(12.5);
      setUnitPrice(3.80);
      setDeliveryDate('2026-09-10');
      setPlanStartDate('2026-08-16');
      setPlanEndDate('2026-09-02');
      setLineId(defaultLineId || lines[0]?.id || 1);
      setPriority('medium');
      setFabricStatus('fully_inhouse');
      setRemarks('Standard production lot. Target 98% first-pass yield.');
    }
  }, [orderToEdit, defaultLineId, buyers, lines]);

  // Selected line stats
  const selectedLine = lines.find(l => l.id === Number(lineId)) || lines[0];

  // Calculated daily target & duration
  const dailyTarget = selectedLine && smv > 0
    ? Math.round(((selectedLine.operatorCount * selectedLine.workingHours * 60) / smv) * (selectedLine.efficiencyRate / 100))
    : 800;

  const estimatedDays = dailyTarget > 0 ? Math.ceil(orderQty / dailyTarget) : 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const buyer = buyers.find(b => b.id === Number(buyerId));

    await onSave({
      orderNo,
      buyerId: Number(buyerId),
      buyerName: buyer?.name || 'Buyer',
      styleNo,
      itemType,
      fabricDetails,
      orderQty: Number(orderQty),
      smv: Number(smv),
      unitPrice: Number(unitPrice),
      deliveryDate,
      planStartDate,
      planEndDate,
      lineId: Number(lineId),
      priority,
      fabricStatus,
      dailyTarget,
      assignedSupervisor: selectedLine?.supervisor || 'Supervisor',
      remarks
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {orderToEdit ? `Edit Production Order: ${orderToEdit.orderNo}` : 'Create New Production Order'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                PPC Production Schedule & Capacity Loading Setup
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Buyer Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Buyer Account</label>
              <select
                value={buyerId}
                onChange={(e) => setBuyerId(Number(e.target.value))}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {buyers.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>

            {/* PO Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PO / Contract Number</label>
              <input
                type="text"
                required
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder="e.g. PO-ZR-9820"
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900"
              />
            </div>

            {/* Style Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Style Code</label>
              <input
                type="text"
                required
                value={styleNo}
                onChange={(e) => setStyleNo(e.target.value)}
                placeholder="e.g. ZR-SLIM-POLO-01"
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Item Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Garment Description</label>
              <input
                type="text"
                required
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                placeholder="e.g. Men's Stretch Chino Pant"
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Fabric Details */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fabric & Material Specs</label>
              <input
                type="text"
                value={fabricDetails}
                onChange={(e) => setFabricDetails(e.target.value)}
                placeholder="e.g. 100% Combed Cotton Pique 220 GSM Bio-Washed"
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Order Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Order Quantity (pcs)</label>
              <input
                type="number"
                required
                min="100"
                value={orderQty}
                onChange={(e) => setOrderQty(Number(e.target.value))}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-700"
              />
            </div>

            {/* SMV */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SMV (Standard Minute Value)
              </label>
              <input
                type="number"
                step="0.1"
                required
                min="1"
                value={smv}
                onChange={(e) => setSmv(Number(e.target.value))}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Target Production Line */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Production Line</label>
              <select
                value={lineId}
                onChange={(e) => setLineId(Number(e.target.value))}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {lines.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.lineCode} - {l.name} ({l.operatorCount} ops, {l.efficiencyRate}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Order Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="normal">Normal Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical Delivery / Top Rush</option>
              </select>
            </div>

            {/* Dates: Start, End, Delivery */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Start Date</label>
              <input
                type="date"
                required
                value={planStartDate}
                onChange={(e) => setPlanStartDate(e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Final Delivery Date (Ex-Factory)</label>
              <input
                type="date"
                required
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
              />
            </div>

          </div>

          {/* Line Capacity Simulation Box */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-900">
              <Cpu className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold">Calculated Daily Target: </span>
                <span className="font-mono font-bold text-blue-800 text-sm">{dailyTarget} pcs/day</span>
                <p className="text-[10px] text-blue-700">
                  Formula: ({selectedLine?.operatorCount} ops &times; 8h &times; 60m) / {smv}m &times; {selectedLine?.efficiencyRate}%
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-blue-900">
              <span className="font-bold">~{estimatedDays} Running Days</span>
              <div className="text-[10px] text-blue-600">Line Load Window</div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Planning Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. PP sample approved by buyer. Wash test reports cleared."
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <div>
              {orderToEdit && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete order ${orderToEdit.orderNo}?`)) {
                      onDelete(orderToEdit.id);
                      onClose();
                    }
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
                >
                  Delete PO
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : orderToEdit ? 'Update PO Plan' : 'Create PO Plan'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
