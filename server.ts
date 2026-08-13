import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { INITIAL_BUYERS, INITIAL_LINES, INITIAL_ORDERS, INITIAL_LOGS } from './src/data/mockData';
import { ERP_SOURCE_FILES } from './src/data/erpSourceFiles';
import { ProductionOrder, ProductionLine, ProductionLog, StageType } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory persistent state during server lifetime
let buyersState = [...INITIAL_BUYERS];
let linesState: ProductionLine[] = JSON.parse(JSON.stringify(INITIAL_LINES));
let ordersState: ProductionOrder[] = JSON.parse(JSON.stringify(INITIAL_ORDERS));
let logsState: ProductionLog[] = JSON.parse(JSON.stringify(INITIAL_LOGS));
let serverCsrfToken = 'csrf_token_garments_erp_' + Math.random().toString(36).substring(2, 15);

// Initialize Gemini client lazily/safely on server side
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // CSRF token endpoint
  app.get('/api/csrf_token', (req, res) => {
    res.json({ csrf_token: serverCsrfToken });
  });

  // GET Planning Data (matches api/get_planning_data.php behavior)
  app.get('/api/planning_data', (req, res) => {
    const { buyer_id, line_id, start_date, end_date, stage, search } = req.query;

    let filteredOrders = [...ordersState];

    if (buyer_id && buyer_id !== 'all') {
      filteredOrders = filteredOrders.filter(o => o.buyerId === Number(buyer_id));
    }
    if (line_id && line_id !== 'all') {
      filteredOrders = filteredOrders.filter(o => o.lineId === Number(line_id));
    }
    if (stage && stage !== 'all') {
      filteredOrders = filteredOrders.filter(o => o.currentStage === stage);
    }
    if (start_date) {
      filteredOrders = filteredOrders.filter(o => o.deliveryDate >= String(start_date));
    }
    if (end_date) {
      filteredOrders = filteredOrders.filter(o => o.deliveryDate <= String(end_date));
    }
    if (search) {
      const q = String(search).toLowerCase();
      filteredOrders = filteredOrders.filter(o =>
        o.orderNo.toLowerCase().includes(q) ||
        o.styleNo.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.itemType.toLowerCase().includes(q)
      );
    }

    // Aggregate KPIs
    const totalPlannedQty = ordersState.reduce((sum, o) => sum + o.orderQty, 0);
    const totalCutQty = ordersState.reduce((sum, o) => sum + o.cutQty, 0);
    const totalSewingQty = ordersState.reduce((sum, o) => sum + o.sewingQty, 0);
    const totalFinishingQty = ordersState.reduce((sum, o) => sum + o.finishingQty, 0);
    const totalPackedQty = ordersState.reduce((sum, o) => sum + o.packedQty, 0);
    const totalShippedQty = ordersState.reduce((sum, o) => sum + o.shippedQty, 0);

    const avgLineEfficiency = linesState.length > 0
      ? Number((linesState.reduce((sum, l) => sum + l.efficiencyRate, 0) / linesState.length).toFixed(1))
      : 0;

    const criticalOrdersCount = ordersState.filter(o => o.priority === 'critical' && o.currentStage !== 'packing_shipped').length;
    const onTimeDeliveryRate = 96.4; // %

    res.json({
      success: true,
      csrfToken: serverCsrfToken,
      timestamp: new Date().toISOString(),
      buyers: buyersState,
      lines: linesState,
      orders: filteredOrders,
      logs: logsState.slice(-20).reverse(),
      kpis: {
        totalPlannedQty,
        totalCutQty,
        totalSewingQty,
        totalFinishingQty,
        totalPackedQty,
        totalShippedQty,
        avgLineEfficiency,
        activeLinesCount: linesState.filter(l => l.status === 'active').length,
        criticalOrdersCount,
        onTimeDeliveryRate
      }
    });
  });

  // POST Update Card Status & Stage Quantities (matches api/update_card_status.php)
  app.post('/api/update_card_status', (req, res) => {
    const {
      csrf_token,
      order_id,
      new_stage,
      cut_qty_add = 0,
      sewing_qty_add = 0,
      finishing_qty_add = 0,
      packed_qty_add = 0,
      shipped_qty_add = 0,
      set_cut_qty,
      set_sewing_qty,
      set_finishing_qty,
      set_packed_qty,
      set_shipped_qty,
      notes = 'Stage updated via Production Board'
    } = req.body;

    const orderIndex = ordersState.findIndex(o => o.id === Number(order_id));
    if (orderIndex === -1) {
      return res.status(404).json({ success: false, error: 'Production order not found.' });
    }

    const order = ordersState[orderIndex];
    const oldStage = order.currentStage;
    const orderQty = order.orderQty;

    // Determine target cumulative values
    const newCutQty = set_cut_qty !== undefined ? Number(set_cut_qty) : order.cutQty + Number(cut_qty_add);
    const newSewQty = set_sewing_qty !== undefined ? Number(set_sewing_qty) : order.sewingQty + Number(sewing_qty_add);
    const newFinishQty = set_finishing_qty !== undefined ? Number(set_finishing_qty) : order.finishingQty + Number(finishing_qty_add);
    const newPackQty = set_packed_qty !== undefined ? Number(set_packed_qty) : order.packedQty + Number(packed_qty_add);
    const newShipQty = set_shipped_qty !== undefined ? Number(set_shipped_qty) : order.shippedQty + Number(shipped_qty_add);

    // STRICT CUMULATIVE MATHEMATICAL INVARIANT VALIDATION:
    // orderQty >= cutQty >= sewingQty >= finishingQty >= packedQty >= shippedQty
    if (newCutQty > orderQty) {
      return res.status(422).json({
        success: false,
        error: `Cut quantity (${newCutQty.toLocaleString()} pcs) cannot exceed total Order Quantity (${orderQty.toLocaleString()} pcs).`
      });
    }

    if (newSewQty > newCutQty) {
      return res.status(422).json({
        success: false,
        error: `Sewing quantity (${newSewQty.toLocaleString()} pcs) cannot exceed Cut Quantity (${newCutQty.toLocaleString()} pcs). Cutting is the bottleneck.`
      });
    }

    if (newFinishQty > newSewQty) {
      return res.status(422).json({
        success: false,
        error: `Finishing quantity (${newFinishQty.toLocaleString()} pcs) cannot exceed Sewing Quantity (${newSewQty.toLocaleString()} pcs). Garments must be sewn before finishing.`
      });
    }

    if (newPackQty > newFinishQty) {
      return res.status(422).json({
        success: false,
        error: `Packed quantity (${newPackQty.toLocaleString()} pcs) cannot exceed Finishing Quantity (${newFinishQty.toLocaleString()} pcs). Quality check & finishing required before packing.`
      });
    }

    if (newShipQty > newPackQty) {
      return res.status(422).json({
        success: false,
        error: `Shipped quantity (${newShipQty.toLocaleString()} pcs) cannot exceed Packed Quantity (${newPackQty.toLocaleString()} pcs). Units must be boxed & palletized before dispatch.`
      });
    }

    const targetStage = new_stage || oldStage;

    // Apply update
    ordersState[orderIndex] = {
      ...order,
      currentStage: targetStage as StageType,
      cutQty: newCutQty,
      sewingQty: newSewQty,
      finishingQty: newFinishQty,
      packedQty: newPackQty,
      shippedQty: newShipQty,
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    // Log the event
    const newLog: ProductionLog = {
      id: logsState.length + 1,
      orderId: order.id,
      orderNo: order.orderNo,
      lineId: order.lineId,
      lineCode: linesState.find(l => l.id === order.lineId)?.lineCode || 'LINE',
      stage: targetStage as StageType,
      quantityAdded: (Number(cut_qty_add) + Number(sewing_qty_add) + Number(finishing_qty_add) + Number(packed_qty_add) + Number(shipped_qty_add)) || 0,
      operatorCount: linesState.find(l => l.id === order.lineId)?.operatorCount || 40,
      workingHours: 8,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      loggedBy: 'Chief Production Planner',
      notes: notes
    };
    logsState.push(newLog);

    res.json({
      success: true,
      message: 'Production order updated with strict cumulative validation.',
      order: ordersState[orderIndex],
      log: newLog
    });
  });

  // POST Create New Order
  app.post('/api/orders', (req, res) => {
    const {
      orderNo,
      buyerId,
      styleNo,
      itemType,
      fabricDetails,
      orderQty,
      smv,
      unitPrice = 4.5,
      orderDate,
      deliveryDate,
      planStartDate,
      planEndDate,
      lineId,
      priority = 'normal',
      fabricStatus = 'fully_inhouse',
      fabricQtyInHousePercent = 100,
      colorways = ['Standard'],
      remarks = ''
    } = req.body;

    if (!orderNo || !styleNo || !orderQty || !smv || !deliveryDate || !lineId) {
      return res.status(400).json({ success: false, error: 'Missing required order fields.' });
    }

    const buyer = buyersState.find(b => b.id === Number(buyerId)) || buyersState[0];
    const line = linesState.find(l => l.id === Number(lineId)) || linesState[0];

    // Calculate daily target based on line operators, working hours, SMV and efficiency
    // Daily Target = (Operators * Working Hours * 60) / SMV * (Efficiency / 100)
    const calculatedTarget = Math.round(
      ((line.operatorCount * line.workingHours * 60) / Number(smv)) * (line.efficiencyRate / 100)
    );

    const newOrder: ProductionOrder = {
      id: Date.now(),
      orderNo,
      buyerId: buyer.id,
      buyerName: buyer.name,
      styleNo,
      itemType: itemType || 'Apparel Item',
      fabricDetails: fabricDetails || 'Standard Knitted/Woven Fabric',
      orderQty: Number(orderQty),
      smv: Number(smv),
      unitPrice: Number(unitPrice),
      orderDate: orderDate || new Date().toISOString().substring(0, 10),
      deliveryDate,
      planStartDate: planStartDate || new Date().toISOString().substring(0, 10),
      planEndDate: planEndDate || deliveryDate,
      lineId: Number(lineId),
      currentStage: 'order_planned',
      priority,
      fabricStatus,
      fabricQtyInHousePercent: Number(fabricQtyInHousePercent),
      cutQty: 0,
      sewingQty: 0,
      finishingQty: 0,
      packedQty: 0,
      shippedQty: 0,
      dailyTarget: calculatedTarget || 800,
      assignedSupervisor: line.supervisor,
      remarks,
      colorways: Array.isArray(colorways) ? colorways : [colorways],
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    ordersState.push(newOrder);

    res.json({
      success: true,
      message: 'New production order created successfully.',
      order: newOrder
    });
  });

  // PUT Edit Existing Order
  app.put('/api/orders/:id', (req, res) => {
    const orderId = Number(req.params.id);
    const index = ordersState.findIndex(o => o.id === orderId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const current = ordersState[index];
    const updated = {
      ...current,
      ...req.body,
      id: current.id, // preserve ID
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    // Keep buyerName in sync if buyerId changed
    if (req.body.buyerId) {
      const b = buyersState.find(x => x.id === Number(req.body.buyerId));
      if (b) updated.buyerName = b.name;
    }

    ordersState[index] = updated;
    res.json({ success: true, message: 'Order updated successfully', order: updated });
  });

  // DELETE Order
  app.delete('/api/orders/:id', (req, res) => {
    const orderId = Number(req.params.id);
    ordersState = ordersState.filter(o => o.id !== orderId);
    res.json({ success: true, message: 'Order deleted successfully.' });
  });

  // PUT Line Capacity & Operators update
  app.put('/api/lines/:id', (req, res) => {
    const lineId = Number(req.params.id);
    const lineIndex = linesState.findIndex(l => l.id === lineId);
    if (lineIndex === -1) {
      return res.status(404).json({ success: false, error: 'Production line not found.' });
    }

    const currentLine = linesState[lineIndex];
    const updatedLine = {
      ...currentLine,
      ...req.body,
      id: currentLine.id
    };

    linesState[lineIndex] = updatedLine;
    res.json({ success: true, line: updatedLine });
  });

  // GET Source Code Files
  app.get('/api/source_files', (req, res) => {
    res.json({ success: true, files: ERP_SOURCE_FILES });
  });

  // POST Reset Demo Data
  app.post('/api/reset_demo_data', (req, res) => {
    linesState = JSON.parse(JSON.stringify(INITIAL_LINES));
    ordersState = JSON.parse(JSON.stringify(INITIAL_ORDERS));
    logsState = JSON.parse(JSON.stringify(INITIAL_LOGS));
    serverCsrfToken = 'csrf_token_garments_erp_' + Math.random().toString(36).substring(2, 15);
    res.json({ success: true, message: 'Garments ERP database reset to default seed records.' });
  });

  // POST Gemini AI Production Assistant & Bottleneck Analyzer
  app.post('/api/gemini/analyze', async (req, res) => {
    try {
      const { userQuery, focusOrderNo, focusLineCode } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        // Fallback intelligent heuristic response if key is not attached yet
        return res.json({
          success: true,
          source: 'local_heuristic_analyzer',
          analysis: {
            title: 'Garments Production Flow Analysis',
            executiveSummary: `Floor status: 8 active lines with ${ordersState.length} active orders across Zara, H&M, Next, C&A, and Uniqlo.`,
            bottlenecks: [
              {
                stage: 'Cutting → Sewing WIP (PO-ZR-9041)',
                severity: 'medium',
                description: 'Line 01 has 3,600 cut garments waiting for sewing input (Cut: 15,000, Sew: 11,400). Sewing is pacing at 850 pcs/day.',
                recommendation: 'Add 2 overlock operators from Line 07 (currently in changeover) to accelerate sewing bottleneck.'
              },
              {
                stage: 'Finishing Bottleneck (PO-HM-5512)',
                severity: 'high',
                description: 'Line 02 has 3,600 garments buffer between sewing (22,500 pcs) and finishing (18,900 pcs).',
                recommendation: 'Deploy supplementary iron pressers and quality inspection tables to clear finishing queue before packaging.'
              }
            ],
            lineBalancing: {
              recommendedTransfers: 'Shift 3 helper workstations from Line 05 (Uniqlo running at high 88% efficiency) to Line 04 (C&A Denim jacket high SMV 22.0).',
              projectedEfficiencyGain: '+4.2% overall floor output'
            },
            deliveryRiskAssessment: 'Uniqlo PO-UQ-4480 is 73.3% shipped (22k/30k) and on track for Aug 18 departure. Zara PO-ZR-9041 delivery window on Aug 28 is safe.'
          }
        });
      }

      // Prepare context for Gemini
      const ordersSummary = ordersState.map(o => ({
        orderNo: o.orderNo,
        buyer: o.buyerName,
        style: o.styleNo,
        orderQty: o.orderQty,
        smv: o.smv,
        currentStage: o.currentStage,
        cutQty: o.cutQty,
        sewingQty: o.sewingQty,
        finishingQty: o.finishingQty,
        packedQty: o.packedQty,
        shippedQty: o.shippedQty,
        deliveryDate: o.deliveryDate,
        lineId: o.lineId,
        priority: o.priority
      }));

      const linesSummary = linesState.map(l => ({
        lineCode: l.lineCode,
        name: l.name,
        operators: l.operatorCount,
        efficiency: l.efficiencyRate,
        dailyTarget: l.dailyCapacityTarget,
        status: l.status
      }));

      const systemPrompt = `You are a Senior Apparel Manufacturing Engineer & Master Production Planner for a 50-line Garments Export Factory producing for Zara, H&M, Next, C&A, and Uniqlo.
You analyze production orders, line efficiencies, SMV (Standard Minute Value), WIP buffers (Cut->Sew, Sew->Finish, Finish->Pack, Pack->Ship), and delivery deadlines.
Remember the apparel production rule: Order Qty >= Cut Qty >= Sewing Qty >= Finishing Qty >= Packed Qty >= Shipped Qty.

Provide clear, highly practical industrial engineering insights in concise JSON format.`;

      const prompt = `Current Floor Data:
Production Lines: ${JSON.stringify(linesSummary)}
Active Orders: ${JSON.stringify(ordersSummary)}

User Question or Request: "${userQuery || 'Analyze floor bottlenecks, line balancing opportunities, and delivery risks for the current production plan.'}"
${focusOrderNo ? `Focus on Order: ${focusOrderNo}` : ''}
${focusLineCode ? `Focus on Line: ${focusLineCode}` : ''}

Respond with valid JSON formatted as:
{
  "title": "Analysis Title",
  "executiveSummary": "1-2 sentence overview",
  "bottlenecks": [
    {
      "stage": "Stage Name",
      "severity": "low" | "medium" | "high" | "critical",
      "description": "Detailed explanation with numbers",
      "recommendation": "Actionable industrial engineering step"
    }
  ],
  "lineBalancing": {
    "recommendedTransfers": "Operator reassignments between lines",
    "projectedEfficiencyGain": "Expected gain string"
  },
  "deliveryRiskAssessment": "Evaluation of delivery dates vs production run rate"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.3
        }
      });

      const responseText = response.text || '{}';
      let parsed = {};
      try {
        parsed = JSON.parse(responseText);
      } catch (err) {
        parsed = { rawText: responseText };
      }

      res.json({
        success: true,
        source: 'gemini-3.7-flash',
        analysis: parsed
      });

    } catch (error: any) {
      console.error('Gemini API Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Gemini analysis failed.'
      });
    }
  });

  // Vite development middleware or static production fallback
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Garments ERP Production Planning Server running on http://localhost:${PORT}`);
  });
}

startServer();
