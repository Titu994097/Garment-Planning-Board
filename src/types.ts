export type StageType =
  | 'order_planned'
  | 'fabric_inhouse'
  | 'cutting'
  | 'sewing'
  | 'finishing'
  | 'packing_shipped';

export interface Buyer {
  id: number;
  name: string;
  code: string;
  country: string;
  contactPerson: string;
  email: string;
  colorTag: string;
  totalActiveOrders?: number;
}

export interface ProductionLine {
  id: number;
  lineCode: string;
  name: string;
  floor: string;
  supervisor: string;
  operatorCount: number;
  helperCount: number;
  workingHours: number;
  efficiencyRate: number; // in %
  dailyCapacityTarget: number; // pcs / day calculated
  currentStyleRunning: string;
  status: 'active' | 'changeover' | 'maintenance';
}

export interface ProductionOrder {
  id: number;
  orderNo: string;
  buyerId: number;
  buyerName: string;
  styleNo: string;
  itemType: string;
  fabricDetails: string;
  orderQty: number;
  smv: number; // Standard Minute Value
  unitPrice: number;
  orderDate: string; // YYYY-MM-DD
  deliveryDate: string; // YYYY-MM-DD
  planStartDate: string; // YYYY-MM-DD
  planEndDate: string; // YYYY-MM-DD
  lineId: number;
  currentStage: StageType;
  priority: 'normal' | 'medium' | 'high' | 'critical';
  fabricStatus: 'pending' | 'partially_inhouse' | 'fully_inhouse';
  fabricQtyInHousePercent: number;
  
  // Cumulative Quantities (Strict invariant: orderQty >= cutQty >= sewingQty >= finishingQty >= packedQty >= shippedQty)
  cutQty: number;
  sewingQty: number;
  finishingQty: number;
  packedQty: number;
  shippedQty: number;

  dailyTarget: number;
  assignedSupervisor: string;
  remarks: string;
  colorways: string[];
  lastUpdated: string;
}

export interface StageWIPMetrics {
  cuttingWip: number; // orderQty - cutQty (un-cut balance)
  sewingWip: number; // cutQty - sewingQty (ready to sew)
  finishingWip: number; // sewingQty - finishingQty (ready to finish)
  packingWip: number; // finishingQty - packedQty (ready to pack)
  readyToShipWip: number; // packedQty - shippedQty (ready to ship)
  totalBalanceToShip: number; // orderQty - shippedQty
  stageCompletionPct: number; // (shippedQty / orderQty) * 100
}

export interface ProductionLog {
  id: number;
  orderId: number;
  orderNo: string;
  lineId: number;
  lineCode: string;
  stage: StageType;
  quantityAdded: number;
  operatorCount: number;
  workingHours: number;
  timestamp: string;
  loggedBy: string;
  notes?: string;
}

export interface KPIStats {
  totalPlannedQty: number;
  totalCutQty: number;
  totalSewingQty: number;
  totalFinishingQty: number;
  totalPackedQty: number;
  totalShippedQty: number;
  avgLineEfficiency: number;
  activeLinesCount: number;
  criticalOrdersCount: number;
  onTimeDeliveryRate: number;
}

export interface PlanningDataResponse {
  success: boolean;
  csrfToken: string;
  timestamp: string;
  buyers: Buyer[];
  lines: ProductionLine[];
  orders: ProductionOrder[];
  kpis: KPIStats;
}
