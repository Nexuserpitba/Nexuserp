const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ===== Data Storage =====
const DATA_DIR = path.join(__dirname, "bi_data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to read/write JSON files
const readJsonFile = (filename) => {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
  }
  return null;
};

const writeJsonFile = (filename, data) => {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err.message);
    return false;
  }
};

// ===== Intelligent Analytics Engine =====
class AnalyticsEngine {
  // Calculate moving average for trend detection
  static calculateMovingAverage(data, windowSize = 7) {
    if (!data || data.length < windowSize) return data;
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < windowSize - 1) {
        result.push(data[i]);
      } else {
        const window = data.slice(i - windowSize + 1, i + 1);
        const avg = window.reduce((sum, val) => sum + val, 0) / windowSize;
        result.push(Math.round(avg));
      }
    }
    return result;
  }

  // Detect seasonality patterns
  static detectSeasonality(data, period = 7) {
    if (!data || data.length < period * 2) return null;
    const seasonalFactors = [];
    for (let i = 0; i < period; i++) {
      const values = [];
      for (let j = i; j < data.length; j += period) {
        values.push(data[j]);
      }
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      seasonalFactors.push(avg);
    }
    const overallAvg = seasonalFactors.reduce((sum, val) => sum + val, 0) / period;
    return seasonalFactors.map(factor => factor / overallAvg);
  }

  // Simple linear regression for forecasting
  static linearRegression(xData, yData) {
    const n = xData.length;
    if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
    
    const sumX = xData.reduce((a, b) => a + b, 0);
    const sumY = yData.reduce((a, b) => a + b, 0);
    const sumXY = xData.reduce((sum, x, i) => sum + x * yData[i], 0);
    const sumXX = xData.reduce((sum, x) => sum + x * x, 0);
    const sumYY = yData.reduce((sum, y) => sum + y * y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const yMean = sumY / n;
    const ssTotal = yData.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = yData.reduce((sum, y, i) => {
      const predicted = slope * xData[i] + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const r2 = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;

    return { slope, intercept, r2 };
  }

  // Calculate variance and standard deviation
  static calculateVariance(data) {
    if (!data || data.length === 0) return 0;
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
  }

  static calculateStdDev(data) {
    return Math.sqrt(this.calculateVariance(data));
  }

  // Detect outliers using IQR method
  static detectOutliers(data) {
    if (!data || data.length < 4) return { outliers: [], normal: data };
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outliers = [];
    const normal = [];
    data.forEach(val => {
      if (val < lowerBound || val > upperBound) {
        outliers.push(val);
      } else {
        normal.push(val);
      }
    });
    return { outliers, normal, lowerBound, upperBound };
  }

  // Generate KPI score based on threshold
  static calculateKPIScore(actual, target, type = "higher") {
    if (target === 0) return 0;
    const ratio = actual / target;
    if (type === "higher") {
      return Math.min(100, Math.round(ratio * 100));
    } else {
      return Math.min(100, Math.round((2 - ratio) * 100));
    }
  }

  // ABC Classification (Pareto analysis)
  static classifyABC(items, valueKey = "value") {
    const sorted = [...items].sort((a, b) => b[valueKey] - a[valueKey]);
    const total = sorted.reduce((sum, item) => sum + item[valueKey], 0);
    let cumulative = 0;
    return sorted.map(item => {
      cumulative += item[valueKey];
      const cumulativePct = (cumulative / total) * 100;
      let category = "C";
      if (cumulativePct <= 80) category = "A";
      else if (cumulativePct <= 95) category = "B";
      return { ...item, cumulativePct, category };
    });
  }

  // Forecast next N periods using exponential smoothing
  static exponentialSmoothing(data, periods = 4, alpha = 0.3) {
    if (!data || data.length === 0) return [];
    let forecast = data[0];
    const forecasts = [forecast];
    for (let i = 1; i < data.length; i++) {
      forecast = alpha * data[i] + (1 - alpha) * forecast;
      forecasts.push(Math.round(forecast));
    }
    // Project future periods
    for (let i = 0; i < periods; i++) {
      forecast = alpha * forecasts[forecasts.length - 1] + (1 - alpha) * forecast;
      forecasts.push(Math.round(forecast));
    }
    return forecasts;
  }

  // Calculate profitability metrics
  static calculateProfitability(revenue, costs) {
    const grossProfit = revenue - costs;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const costRatio = revenue > 0 ? (costs / revenue) * 100 : 0;
    return { grossProfit, grossMargin: Math.round(grossMargin * 100) / 100, costRatio: Math.round(costRatio * 100) / 100 };
  }

  // Cohort analysis helper
  static cohortAnalysis(data, dateKey, valueKey, cohortSize = 7) {
    const cohorts = {};
    data.forEach(item => {
      const date = new Date(item[dateKey]);
      const cohortStart = new Date(date);
      cohortStart.setDate(cohortStart.getDate() - cohortStart.getDay());
      const cohortKey = cohortStart.toISOString().split("T")[0];
      if (!cohorts[cohortKey]) {
        cohorts[cohortKey] = { cohort: cohortKey, items: [], total: 0 };
      }
      cohorts[cohortKey].items.push(item);
      cohorts[cohortKey].total += item[valueKey] || 0;
    });
    return Object.values(cohorts).sort((a, b) => a.cohort.localeCompare(b.cohort));
  }
}

// ===== BI Data Models =====
class BIDataManager {
  // Sales data
  static getSalesData(filters = {}) {
    const sales = readJsonFile("sales.json") || [];
    return this.applyFilters(sales, filters);
  }

  static saveSalesData(data) {
    return writeJsonFile("sales.json", data);
  }

  // Financial data
  static getFinancialData(filters = {}) {
    const financial = readJsonFile("financial.json") || [];
    return this.applyFilters(financial, filters);
  }

  static saveFinancialData(data) {
    return writeJsonFile("financial.json", data);
  }

  // Products data
  static getProductsData(filters = {}) {
    const products = readJsonFile("products.json") || [];
    return this.applyFilters(products, filters);
  }

  static saveProductsData(data) {
    return writeJsonFile("products.json", data);
  }

  // Customers data
  static getCustomersData(filters = {}) {
    const customers = readJsonFile("customers.json") || [];
    return this.applyFilters(customers, filters);
  }

  static saveCustomersData(data) {
    return writeJsonFile("customers.json", data);
  }

  // KPIs and targets
  static getKPIs() {
    return readJsonFile("kpis.json") || {};
  }

  static saveKPIs(data) {
    return writeJsonFile("kpis.json", data);
  }

  // Apply filters to data
  static applyFilters(data, filters) {
    if (!filters || Object.keys(filters).length === 0) return data;
    return data.filter(item => {
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null) continue;
        if (item[key] !== value) return false;
      }
      return true;
    });
  }

  // Aggregate data by time period
  static aggregateByPeriod(data, dateKey, valueKey, period = "month") {
    const aggregated = {};
    data.forEach(item => {
      const date = new Date(item[dateKey]);
      let key;
      switch (period) {
        case "day":
          key = date.toISOString().split("T")[0];
          break;
        case "week":
          const weekStart = new Date(date);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = weekStart.toISOString().split("T")[0];
          break;
        case "month":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        case "quarter":
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        case "year":
          key = String(date.getFullYear());
          break;
        default:
          key = date.toISOString().split("T")[0];
      }
      if (!aggregated[key]) {
        aggregated[key] = { period: key, value: 0, count: 0 };
      }
      aggregated[key].value += item[valueKey] || 0;
      aggregated[key].count++;
    });
    return Object.values(aggregated).sort((a, b) => a.period.localeCompare(b.period));
  }
}

// ===== API Routes =====

// Health check
app.get("/api/bi/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ===== Sales Analytics =====
app.get("/api/bi/sales/summary", (req, res) => {
  try {
    const sales = BIDataManager.getSalesData();
    const totalRevenue = sales.reduce((sum, s) => sum + (s.valor || 0), 0);
    const totalQuantity = sales.reduce((sum, s) => sum + (s.quantidade || 0), 0);
    const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;
    
    // Group by product
    const byProduct = {};
    sales.forEach(s => {
      const product = s.produto || "Outros";
      if (!byProduct[product]) byProduct[product] = { value: 0, quantity: 0 };
      byProduct[product].value += s.valor || 0;
      byProduct[product].quantity += s.quantidade || 0;
    });
    
    // Group by customer
    const byCustomer = {};
    sales.forEach(s => {
      const customer = s.cliente || "Outros";
      if (!byCustomer[customer]) byCustomer[customer] = { value: 0, quantity: 0 };
      byCustomer[customer].value += s.valor || 0;
      byCustomer[customer].quantity += s.quantidade || 0;
    });

    // Top 5 products
    const topProducts = Object.entries(byProduct)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Top 5 customers
    const topCustomers = Object.entries(byCustomer)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    res.json({
      totalRevenue,
      totalQuantity,
      averageTicket,
      totalSales: sales.length,
      topProducts,
      topCustomers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/bi/sales/trends", (req, res) => {
  try {
    const sales = BIDataManager.getSalesData();
    const { period = "month" } = req.query;
    
    // Aggregate by period
    const aggregated = BIDataManager.aggregateByPeriod(sales, "data", "valor", period);
    
    // Calculate moving average
    const values = aggregated.map(a => a.value);
    const movingAvg = AnalyticsEngine.calculateMovingAverage(values, period === "day" ? 7 : 3);
    
    // Detect seasonality
    const seasonality = AnalyticsEngine.detectSeasonality(values, period === "day" ? 7 : 12);
    
    // Calculate trend (linear regression)
    const xData = values.map((_, i) => i);
    const regression = AnalyticsEngine.linearRegression(xData, values);
    
    res.json({
      data: aggregated.map((a, i) => ({
        ...a,
        movingAverage: movingAvg[i],
        trend: Math.round(regression.slope * i + regression.intercept)
      })),
      seasonality,
      regression,
      forecast: AnalyticsEngine.exponentialSmoothing(values, 6)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/bi/sales/abc", (req, res) => {
  try {
    const sales = BIDataManager.getSalesData();
    
    // Group by product
    const byProduct = {};
    sales.forEach(s => {
      const product = s.produto || "Outros";
      if (!byProduct[product]) byProduct[product] = { name: product, value: 0, quantity: 0 };
      byProduct[product].value += s.valor || 0;
      byProduct[product].quantity += s.quantidade || 0;
    });
    
    // ABC classification
    const items = Object.values(byProduct);
    const classified = AnalyticsEngine.classifyABC(items, "value");
    
    res.json({ classified, summary: {
      a: classified.filter(i => i.category === "A").length,
      b: classified.filter(i => i.category === "B").length,
      c: classified.filter(i => i.category === "C").length
    }});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Financial Analytics =====
app.get("/api/bi/financial/summary", (req, res) => {
  try {
    const financial = BIDataManager.getFinancialData();
    
    const totalReceivable = financial
      .filter(f => f.tipo === "receber" && f.status !== "recebida")
      .reduce((sum, f) => sum + (f.valor - (f.valorRecebido || 0)), 0);
    
    const totalPayable = financial
      .filter(f => f.tipo === "pagar" && f.status !== "paga")
      .reduce((sum, f) => sum + (f.valor - (f.valorPago || 0)), 0);
    
    const overdueReceivable = financial
      .filter(f => f.tipo === "receber" && f.status !== "recebida" && new Date(f.vencimento) < new Date())
      .reduce((sum, f) => sum + (f.valor - (f.valorRecebido || 0)), 0);
    
    const overduePayable = financial
      .filter(f => f.tipo === "pagar" && f.status !== "paga" && new Date(f.vencimento) < new Date())
      .reduce((sum, f) => sum + (f.valor - (f.valorPago || 0)), 0);
    
    const netBalance = totalReceivable - totalPayable;
    const currentRatio = totalPayable > 0 ? totalReceivable / totalPayable : 0;
    
    // Aging analysis
    const now = new Date();
    const agingBuckets = [
      { range: "1-7 dias", min: 1, max: 7 },
      { range: "8-15 dias", min: 8, max: 15 },
      { range: "16-30 dias", min: 16, max: 30 },
      { range: "31-60 dias", min: 31, max: 60 },
      { range: "> 60 dias", min: 61, max: Infinity }
    ];
    
    const aging = agingBuckets.map(bucket => {
      const items = financial.filter(f => {
        if (f.status === "recebida" || f.status === "paga") return false;
        const venc = new Date(f.vencimento);
        const days = Math.floor((now - venc) / (1000 * 60 * 60 * 24));
        return days >= bucket.min && days <= bucket.max;
      });
      const total = items.reduce((sum, f) => sum + (f.valor - (f.valorRecebido || f.valorPago || 0)), 0);
      return { ...bucket, count: items.length, total };
    });

    res.json({
      totalReceivable,
      totalPayable,
      overdueReceivable,
      overduePayable,
      netBalance,
      currentRatio: Math.round(currentRatio * 100) / 100,
      aging
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/bi/financial/cashflow", (req, res) => {
  try {
    const financial = BIDataManager.getFinancialData();
    const { months = 6 } = req.query;
    
    const now = new Date();
    const cashflow = [];
    
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const inflows = financial
        .filter(f => f.tipo === "receber" && f.status === "recebida")
        .filter(f => {
          const date = new Date(f.dataPagamento || f.vencimento);
          return date >= monthStart && date <= monthEnd;
        })
        .reduce((sum, f) => sum + (f.valorRecebido || f.valor || 0), 0);
      
      const outflows = financial
        .filter(f => f.tipo === "pagar" && f.status === "paga")
        .filter(f => {
          const date = new Date(f.dataPagamento || f.vencimento);
          return date >= monthStart && date <= monthEnd;
        })
        .reduce((sum, f) => sum + (f.valorPago || f.valor || 0), 0);
      
      cashflow.push({
        month: monthStart.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        inflows,
        outflows,
        net: inflows - outflows
      });
    }
    
    // Forecast next 3 months
    const netValues = cashflow.map(c => c.net);
    const forecast = AnalyticsEngine.exponentialSmoothing(netValues, 3);
    
    res.json({ cashflow, forecast });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== KPIs and Targets =====
app.get("/api/bi/kpis", (req, res) => {
  try {
    const kpis = BIDataManager.getKPIs();
    const sales = BIDataManager.getSalesData();
    const financial = BIDataManager.getFinancialData();
    
    // Calculate actual KPIs
    const totalRevenue = sales.reduce((sum, s) => sum + (s.valor || 0), 0);
    const totalCosts = financial
      .filter(f => f.tipo === "pagar" && f.status === "paga")
      .reduce((sum, f) => sum + (f.valorPago || f.valor || 0), 0);
    
    const profitability = AnalyticsEngine.calculateProfitability(totalRevenue, totalCosts);
    
    const overdueReceivable = financial
      .filter(f => f.tipo === "receber" && f.status !== "recebida" && new Date(f.vencimento) < new Date())
      .reduce((sum, f) => sum + (f.valor - (f.valorRecebido || 0)), 0);
    
    const totalReceivable = financial
      .filter(f => f.tipo === "receber" && f.status !== "recebida")
      .reduce((sum, f) => sum + (f.valor - (f.valorRecebido || 0)), 0);
    
    const defaultRate = totalReceivable > 0 ? (overdueReceivable / totalReceivable) * 100 : 0;
    
    const kpiScores = {
      revenue: {
        actual: totalRevenue,
        target: kpis.revenue?.target || totalRevenue * 1.2,
        score: AnalyticsEngine.calculateKPIScore(totalRevenue, kpis.revenue?.target || totalRevenue * 1.2, "higher")
      },
      profitability: {
        actual: profitability.grossMargin,
        target: kpis.profitability?.target || 30,
        score: AnalyticsEngine.calculateKPIScore(profitability.grossMargin, kpis.profitability?.target || 30, "higher")
      },
      defaultRate: {
        actual: Math.round(defaultRate * 100) / 100,
        target: kpis.defaultRate?.target || 5,
        score: AnalyticsEngine.calculateKPIScore(defaultRate, kpis.defaultRate?.target || 5, "lower")
      }
    };
    
    res.json({ kpiScores, profitability, defaultRate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/bi/kpis", (req, res) => {
  try {
    const kpis = req.body;
    BIDataManager.saveKPIs(kpis);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Alerts =====
app.get("/api/bi/alerts", (req, res) => {
  try {
    const sales = BIDataManager.getSalesData();
    const financial = BIDataManager.getFinancialData();
    const kpis = BIDataManager.getKPIs();
    
    const alerts = [];
    const now = new Date();
    
    // Check for overdue payments
    const overdueItems = financial.filter(f => {
      if (f.status === "recebida" || f.status === "paga") return false;
      const venc = new Date(f.vencimento);
      return venc < now;
    });
    
    if (overdueItems.length > 0) {
      const totalOverdue = overdueItems.reduce((sum, f) => sum + (f.valor - (f.valorRecebido || f.valorPago || 0)), 0);
      alerts.push({
        type: overdueItems.some(i => {
          const venc = new Date(i.vencimento);
          return Math.floor((now - venc) / (1000 * 60 * 60 * 24)) > 30;
        }) ? "critical" : "warning",
        category: "financial",
        title: "Pagamentos Vencidos",
        message: `${overdueItems.length} item(s) vencido(s) totalizando R$ ${totalOverdue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        action: "Ver contas a pagar/receber"
      });
    }
    
    // Check for sales decline
    const salesByMonth = BIDataManager.aggregateByPeriod(sales, "data", "valor", "month");
    if (salesByMonth.length >= 2) {
      const lastMonth = salesByMonth[salesByMonth.length - 1].value;
      const prevMonth = salesByMonth[salesByMonth.length - 2].value;
      if (prevMonth > 0 && lastMonth < prevMonth * 0.8) {
        const decline = ((prevMonth - lastMonth) / prevMonth) * 100;
        alerts.push({
          type: "warning",
          category: "sales",
          title: "Queda nas Vendas",
          message: `Vendas caíram ${Math.round(decline)}% em relação ao mês anterior`,
          action: "Analisar tendências"
        });
      }
    }
    
    // Check KPI targets
    if (kpis.revenue?.target) {
      const totalRevenue = sales.reduce((sum, s) => sum + (s.valor || 0), 0);
      const revenuePct = (totalRevenue / kpis.revenue.target) * 100;
      if (revenuePct < 80) {
        alerts.push({
          type: "warning",
          category: "kpi",
          title: "Meta de Faturamento",
          message: `Atingido apenas ${Math.round(revenuePct)}% da meta de faturamento`,
          action: "Ajustar estratégias"
        });
      }
    }
    
    res.json({ alerts, count: alerts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Data Import/Export =====
app.post("/api/bi/data/import", (req, res) => {
  try {
    const { type, data } = req.body;
    if (!type || !data) {
      return res.status(400).json({ error: "Type and data are required" });
    }
    
    let success = false;
    switch (type) {
      case "sales":
        success = BIDataManager.saveSalesData(data);
        break;
      case "financial":
        success = BIDataManager.saveFinancialData(data);
        break;
      case "products":
        success = BIDataManager.saveProductsData(data);
        break;
      case "customers":
        success = BIDataManager.saveCustomersData(data);
        break;
      default:
        return res.status(400).json({ error: "Invalid data type" });
    }
    
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/bi/data/export/:type", (req, res) => {
  try {
    const { type } = req.params;
    let data;
    switch (type) {
      case "sales":
        data = BIDataManager.getSalesData();
        break;
      case "financial":
        data = BIDataManager.getFinancialData();
        break;
      case "products":
        data = BIDataManager.getProductsData();
        break;
      case "customers":
        data = BIDataManager.getCustomersData();
        break;
      default:
        return res.status(400).json({ error: "Invalid data type" });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Reports Generation =====
app.post("/api/bi/reports/generate", (req, res) => {
  try {
    const { type, filters } = req.body;
    const sales = BIDataManager.getSalesData(filters);
    const financial = BIDataManager.getFinancialData(filters);
    
    let report = {};
    
    switch (type) {
      case "executive":
        report = {
          title: "Relatório Executivo",
          date: new Date().toLocaleDateString("pt-BR"),
          sales: {
            total: sales.reduce((sum, s) => sum + (s.valor || 0), 0),
            count: sales.length,
            average: sales.length > 0 ? sales.reduce((sum, s) => sum + (s.valor || 0), 0) / sales.length : 0
          },
          financial: {
            receivable: financial.filter(f => f.tipo === "receber").reduce((sum, f) => sum + (f.valor || 0), 0),
            payable: financial.filter(f => f.tipo === "pagar").reduce((sum, f) => sum + (f.valor || 0), 0)
          }
        };
        break;
      case "sales":
        report = {
          title: "Relatório de Vendas",
          period: filters,
          data: sales,
          summary: {
            total: sales.reduce((sum, s) => sum + (s.valor || 0), 0),
            byProduct: {},
            byCustomer: {}
          }
        };
        break;
      default:
        return res.status(400).json({ error: "Invalid report type" });
    }
    
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Predictive Analytics =====
app.get("/api/bi/predictions/sales", (req, res) => {
  try {
    const sales = BIDataManager.getSalesData();
    const { periods = 6 } = req.query;
    
    const salesByMonth = BIDataManager.aggregateByPeriod(sales, "data", "valor", "month");
    const values = salesByMonth.map(s => s.value);
    
    // Use multiple methods for prediction
    const exponentialForecast = AnalyticsEngine.exponentialSmoothing(values, parseInt(periods));
    const xData = values.map((_, i) => i);
    const regression = AnalyticsEngine.linearRegression(xData, values);
    const linearForecast = Array.from({ length: parseInt(periods) }, (_, i) => {
      return Math.round(regression.slope * (values.length + i) + regression.intercept);
    });
    
    // Combine predictions (weighted average)
    const combinedForecast = exponentialForecast.slice(-parseInt(periods)).map((exp, i) => {
      const lin = linearForecast[i];
      return Math.round(exp * 0.6 + lin * 0.4);
    });
    
    res.json({
      historical: salesByMonth,
      exponential: exponentialForecast,
      linear: linearForecast,
      combined: combinedForecast,
      confidence: Math.round(regression.r2 * 100)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/bi/predictions/cashflow", (req, res) => {
  try {
    const financial = BIDataManager.getFinancialData();
    const { periods = 3 } = req.query;
    
    const now = new Date();
    const historical = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const inflows = financial
        .filter(f => f.tipo === "receber" && f.status === "recebida")
        .filter(f => {
          const date = new Date(f.dataPagamento || f.vencimento);
          return date >= monthStart && date <= monthEnd;
        })
        .reduce((sum, f) => sum + (f.valorRecebido || f.valor || 0), 0);
      
      const outflows = financial
        .filter(f => f.tipo === "pagar" && f.status === "paga")
        .filter(f => {
          const date = new Date(f.dataPagamento || f.vencimento);
          return date >= monthStart && date <= monthEnd;
        })
        .reduce((sum, f) => sum + (f.valorPago || f.valor || 0), 0);
      
      historical.push(inflows - outflows);
    }
    
    const forecast = AnalyticsEngine.exponentialSmoothing(historical, parseInt(periods));
    
    res.json({ historical, forecast });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Performance Metrics =====
app.get("/api/bi/performance", (req, res) => {
  try {
    const sales = BIDataManager.getSalesData();
    const financial = BIDataManager.getFinancialData();
    
    const totalRevenue = sales.reduce((sum, s) => sum + (s.valor || 0), 0);
    const totalCosts = financial
      .filter(f => f.tipo === "pagar" && f.status === "paga")
      .reduce((sum, f) => sum + (f.valorPago || f.valor || 0), 0);
    
    const profitability = AnalyticsEngine.calculateProfitability(totalRevenue, totalCosts);
    
    // Calculate growth rate
    const salesByMonth = BIDataManager.aggregateByPeriod(sales, "data", "valor", "month");
    let growthRate = 0;
    if (salesByMonth.length >= 2) {
      const lastMonth = salesByMonth[salesByMonth.length - 1].value;
      const prevMonth = salesByMonth[salesByMonth.length - 2].value;
      if (prevMonth > 0) {
        growthRate = ((lastMonth - prevMonth) / prevMonth) * 100;
      }
    }
    
    // Calculate collection rate
    const totalReceivable = financial
      .filter(f => f.tipo === "receber")
      .reduce((sum, f) => sum + (f.valor || 0), 0);
    const totalReceived = financial
      .filter(f => f.tipo === "receber" && f.status === "recebida")
      .reduce((sum, f) => sum + (f.valorRecebido || f.valor || 0), 0);
    const collectionRate = totalReceivable > 0 ? (totalReceived / totalReceivable) * 100 : 0;
    
    res.json({
      profitability,
      growthRate: Math.round(growthRate * 100) / 100,
      collectionRate: Math.round(collectionRate * 100) / 100,
      totalRevenue,
      totalCosts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.BI_PORT || 3002;
app.listen(PORT, () => {
  console.log(`BI API Server running on port ${PORT}`);
  console.log(`Analytics Engine ready`);
  console.log(`Data directory: ${DATA_DIR}`);
});