import React from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Scissors,
  Layers,
  Truck
} from 'lucide-react';
import { ProductionOrder, ProductionLine, Buyer } from '../types';

interface DailyProductionReportProps {
  orders: ProductionOrder[];
  lines: ProductionLine[];
  buyers: Buyer[];
}

export const DailyProductionReport: React.FC<DailyProductionReportProps> = ({
  orders,
  lines,
  buyers
}) => {
  const todayStr = '2026-08-13'; // Simulation date
  const totalPlanned = orders.reduce((sum, o) => sum + o.orderQty, 0);
  const totalCut = orders.reduce((sum, o) => sum + o.cutQty, 0);
  const totalSew = orders.reduce((sum, o) => sum + o.sewingQty, 0);
  const totalFinish = orders.reduce((sum, o) => sum + o.finishingQty, 0);
  const totalPacked = orders.reduce((sum, o) => sum + o.packedQty, 0);
  const totalShipped = orders.reduce((sum, o) => sum + o.shippedQty, 0);

  const handleDownloadCsv = () => {
    const headers = [
      'PO Number',
      'Buyer',
      'Style Code',
      'Garment Description',
      'Assigned Line',
      'Order Qty (pcs)',
      'Cut Qty',
      'Sewing Qty',
      'Finishing Qty',
      'Packed Qty',
      'Shipped Qty',
      'Balance To Ship',
      'Stage',
      'Delivery Date'
    ];

    const rows = orders.map(o => [
      `"${o.orderNo}"`,
      `"${o.buyerName}"`,
      `"${o.styleNo}"`,
      `"${o.itemType}"`,
      `"Line ${o.lineId}"`,
      o.orderQty,
      o.cutQty,
      o.sewingQty,
      o.finishingQty,
      o.packedQty,
      o.shippedQty,
      o.orderQty - o.shippedQty,
      `"${o.currentStage}"`,
      `"${o.deliveryDate}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DPR_Garments_ERP_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Report Actions & Title */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  Daily Production Report (DPR)
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-700">
                  Date: {todayStr}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official factory production summary, line productivity audit & buyer shipment status
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-2 px-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print DPR</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              className="py-2 px-3 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Top Summary Table */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 font-mono text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 block uppercase">Total Planned</span>
            <span className="text-base font-bold text-slate-900">{totalPlanned.toLocaleString()}</span>
          </div>
          <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
            <span className="text-[10px] text-amber-700 block uppercase">Total Cut</span>
            <span className="text-base font-bold text-amber-800">{totalCut.toLocaleString()}</span>
          </div>
          <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-200">
            <span className="text-[10px] text-blue-700 block uppercase">Total Sewn</span>
            <span className="text-base font-bold text-blue-800">{totalSew.toLocaleString()}</span>
          </div>
          <div className="bg-purple-50/60 p-2.5 rounded-lg border border-purple-200">
            <span className="text-[10px] text-purple-700 block uppercase">Total Finished</span>
            <span className="text-base font-bold text-purple-800">{totalFinish.toLocaleString()}</span>
          </div>
          <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
            <span className="text-[10px] text-emerald-700 block uppercase">Total Packed</span>
            <span className="text-base font-bold text-emerald-800">{totalPacked.toLocaleString()}</span>
          </div>
          <div className="bg-slate-900 text-white p-2.5 rounded-lg">
            <span className="text-[10px] text-slate-300 block uppercase">Total Shipped</span>
            <span className="text-base font-bold text-emerald-400">{totalShipped.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Line-Wise Production Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-hidden">
        <h4 className="font-bold text-sm text-slate-900 mb-3">Line-by-Line Execution & Stage Tracking</h4>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Line</th>
                <th className="p-2.5">PO & Buyer</th>
                <th className="p-2.5">Style / Item</th>
                <th className="p-2.5 text-right">Order Qty</th>
                <th className="p-2.5 text-right">Cut</th>
                <th className="p-2.5 text-right">Sewn</th>
                <th className="p-2.5 text-right">Finished</th>
                <th className="p-2.5 text-right">Packed</th>
                <th className="p-2.5 text-right">Shipped</th>
                <th className="p-2.5 text-right">Balance</th>
                <th className="p-2.5 text-center">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {orders.map((o) => {
                const line = lines.find(l => l.id === o.lineId);
                const balance = o.orderQty - o.shippedQty;

                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-bold text-slate-900 font-sans">
                      {line?.lineCode || 'LINE-01'}
                    </td>
                    <td className="p-2.5 font-sans">
                      <div className="font-bold text-slate-800">{o.orderNo}</div>
                      <div className="text-[10px] text-slate-500">{o.buyerName}</div>
                    </td>
                    <td className="p-2.5 font-sans">
                      <div className="font-medium text-slate-800">{o.styleNo}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{o.itemType}</div>
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-800">{o.orderQty.toLocaleString()}</td>
                    <td className="p-2.5 text-right text-amber-700">{o.cutQty.toLocaleString()}</td>
                    <td className="p-2.5 text-right text-blue-700">{o.sewingQty.toLocaleString()}</td>
                    <td className="p-2.5 text-right text-purple-700">{o.finishingQty.toLocaleString()}</td>
                    <td className="p-2.5 text-right text-emerald-700">{o.packedQty.toLocaleString()}</td>
                    <td className="p-2.5 text-right font-bold text-emerald-800">{o.shippedQty.toLocaleString()}</td>
                    <td className="p-2.5 text-right font-bold text-slate-700">{balance.toLocaleString()}</td>
                    <td className="p-2.5 text-center font-sans">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 capitalize">
                        {o.currentStage.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
