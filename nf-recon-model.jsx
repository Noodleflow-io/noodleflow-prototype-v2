// nf-recon-model.jsx — the five reconciliation types as first-class data.
//
// Framework doc: "Reconciliation data isn't a report. It's the input the
// automation runs on." Until this existed, rules costed themselves against a
// hardcoded monthly-inflow constant, which is exactly the "static entered
// values" the scope doc asked us to move off (tickets 8–10).
//
// Every field name here matches the framework's data-model tables verbatim, so
// the prototype and the build spec can be diffed against each other.

// ---------- 1. EXPENSE RECONCILIATION ----------
// recurrence_type · product_attribution · allocation_method · source · confidence
const NF_EXPENSES = [
  { id: 'EXP-001', name: 'Warehouse lease', monthly: 3200, recurrence_type: 'recurring',
    product_attribution: 'shared_allocation', allocation_method: 'revenue_share',
    source: 'both', confidence: 'high', obligation: true },
  { id: 'EXP-002', name: 'Electricity & water', monthly: 780, recurrence_type: 'recurring',
    product_attribution: 'business_obligation', source: 'banking_only', confidence: 'high', obligation: true },
  { id: 'EXP-003', name: 'Business insurance', monthly: 820, recurrence_type: 'annual',
    product_attribution: 'business_obligation', source: 'accounting_software', confidence: 'high', obligation: true },
  { id: 'EXP-004', name: 'Packaging materials', monthly: 1450, recurrence_type: 'recurring',
    product_attribution: 'shared_allocation', allocation_method: 'unit_volume',
    source: 'both', confidence: 'moderate', obligation: false },
  { id: 'EXP-005', name: 'Paid social (Ridgefield launch)', monthly: 2400, recurrence_type: 'one_off',
    product_attribution: 'single_sku', sku: 'SKU-113', source: 'banking_only', confidence: 'high', obligation: false },
  // Deliberately ambiguous: a card charge with no accounting counterpart. This is
  // the case the framework routes to an exceptions queue rather than guessing.
  { id: 'EXP-006', name: 'Unlabelled card charge · WEBSVC', monthly: 340, recurrence_type: 'recurring',
    product_attribution: 'business_obligation', source: 'banking_only', confidence: 'low', obligation: true },
  { id: 'EXP-007', name: 'Contract design work', monthly: 600, recurrence_type: 'one_off',
    product_attribution: 'shared_allocation', allocation_method: 'manual',
    source: 'accounting_software', confidence: 'low', obligation: false }
];
// "Low routes to the exceptions queue."
const expenseExceptions = () => NF_EXPENSES.filter(e => e.confidence === 'low');
// Protected obligations are read from Expense Reconciliation, not typed in.
const recurringObligations = () =>
  NF_EXPENSES.filter(e => e.obligation && e.recurrence_type !== 'one_off');
const obligationsMonthly = () => recurringObligations().reduce((s, e) => s + e.monthly, 0);

// ---------- 2. TRANSACTION-LEVEL RECONCILIATION ----------
// line_items array + fees "itemized, one entry per fee type … Never merged
// into a single number."
const NF_TXN_RECON = [
  { id: 'TXN-4471', deposit: 'DEP-0619', gross: 1240.00,
    line_items: [
      { sku: 'SKU-113', name: 'Ridgefield 5 oz', qty: 4, sale_price: 195.00 },
      { sku: 'SKU-204', name: 'Cedar Trail 12 oz', qty: 2, sale_price: 155.00 },
      { sku: 'SKU-089', name: 'Basin Blend 8 oz', qty: 1, sale_price: 150.00 }
    ],
    fees: [
      { type: 'platform_fee', label: 'Platform fee', amount: 37.20 },
      { type: 'processing_fee', label: 'Processing fee', amount: 38.26 },
      { type: 'shipping', label: 'Shipping', amount: 24.00 },
      { type: 'other', label: 'Currency conversion', amount: 4.10 }
    ] }
];

// ---------- 3 & 4. SKU-LEVEL + ECONOMIC RECONCILIATION ----------
// Kept deliberately separate, per the framework: SKU-Level is what one sale
// owed (transactional); Economic is the catalog-level cost and pricing profile.
//   SKU-Level : sale_price · obligated_amount · cost_source
//   Economic  : replacement_cost · price_flexibility
// cost_source itself lives in nf-cogs.jsx (NFCosts) so there is one owner.
const NF_SKU_ECON = {
  'SKU-113': { sale_price: 48, replacement_cost: 15, price_flexibility: 0.82, monthly_units: 476,
    obligated: { tax: 4.08, cost: 15, supplier: 0 } },
  'SKU-204': { sale_price: 31, replacement_cost: 18, price_flexibility: 0.44, monthly_units: 1054,
    obligated: { tax: 2.64, cost: 18, supplier: 0 } },
  'SKU-089': { sale_price: 41, replacement_cost: 29, price_flexibility: 0.28, monthly_units: 952,
    obligated: { tax: 3.49, cost: 29, supplier: 0 } },
  // A dropship line — the framework's worked example: half of every sale is
  // obligated to the supplier before anything else can be allocated.
  'SKU-317': { sale_price: 27, replacement_cost: 21, price_flexibility: 0.35, monthly_units: 646,
    obligated: { tax: 2.30, cost: 8, supplier: 13.50 }, dropship: true },
  'SKU-452': { sale_price: 16, replacement_cost: null, price_flexibility: 0.15, monthly_units: 272,
    obligated: { tax: 1.36, cost: null, supplier: 0 } }
};
const skuEcon = (sku) => NF_SKU_ECON[sku] || null;
const obligatedAmount = (sku) => {
  const e = skuEcon(sku); if (!e) return 0;
  return Object.values(e.obligated).reduce((s, v) => s + (v || 0), 0);
};
// price_flexibility "connects directly to the pricing recommendation engine
// already in Plan — that recommendation type should read from this field, not
// a separate one." A rigid SKU (low flexibility) loses more volume per point
// of price; a flexible one absorbs the increase.
const skuElasticity = (sku) => {
  const e = skuEcon(sku);
  const flex = e && e.price_flexibility != null ? e.price_flexibility : 0.5;
  return +(2.6 - flex * 2.0).toFixed(2); // 0.15 → 2.30 rigid · 0.82 → 0.96 flexible
};

// Monthly inflow, reconciled from transaction data rather than asserted.
const reconciledInflow = () =>
  Math.round(Object.values(NF_SKU_ECON).reduce((s, e) => s + e.sale_price * e.monthly_units, 0));
const skuMonthlyRevenue = (sku) => {
  const e = skuEcon(sku); return e ? Math.round(e.sale_price * e.monthly_units) : 0;
};

// ---------- 5. VENDOR RECONCILIATION ----------
// payment_frequency · automation_eligible ("Defaults to false", true only once
// a payment pattern has enough history to be safely automated.)
const NF_VENDOR_RECON = {
  'Apex Supplies Co.':   { payment_frequency: 'monthly',   monthly: 4200, history_months: 14, on_time_rate: 0.96 },
  'Pacific Freight LLC': { payment_frequency: 'weekly',    monthly: 1850, history_months: 11, on_time_rate: 0.91 },
  'Merrill Packaging':   { payment_frequency: 'monthly',   monthly: 3100, history_months: 9,  on_time_rate: 0.88 },
  'StoragePro':          { payment_frequency: 'monthly',   monthly: 980,  history_months: 16, on_time_rate: 0.99 },
  'TechBridge SaaS':     { payment_frequency: 'annual',    monthly: 2400, history_months: 4,  on_time_rate: 1.00 }
};
// Computed from the full history, which is why this is its own reconciliation
// type and not a view on a single expense record.
const AUTOMATION_MIN_MONTHS = 6;
const AUTOMATION_MIN_ONTIME = 0.90;
const vendorRecon = (name) => {
  const v = NF_VENDOR_RECON[name];
  if (!v) return null;
  const eligible = v.payment_frequency !== 'irregular'
    && v.history_months >= AUTOMATION_MIN_MONTHS
    && v.on_time_rate >= AUTOMATION_MIN_ONTIME;
  return { ...v, automation_eligible: eligible,
    blocked_reason: eligible ? null
      : v.history_months < AUTOMATION_MIN_MONTHS
        ? `Only ${v.history_months} months of history — needs ${AUTOMATION_MIN_MONTHS}.`
        : `On-time rate ${Math.round(v.on_time_rate * 100)}% — needs ${Math.round(AUTOMATION_MIN_ONTIME * 100)}%.` };
};
const vendorsMonthly = () => Object.keys(NF_VENDOR_RECON)
  .reduce((s, k) => s + NF_VENDOR_RECON[k].monthly, 0);

Object.assign(window, {
  NF_EXPENSES, expenseExceptions, recurringObligations, obligationsMonthly,
  NF_TXN_RECON,
  NF_SKU_ECON, skuEcon, obligatedAmount, skuElasticity, reconciledInflow, skuMonthlyRevenue,
  NF_VENDOR_RECON, vendorRecon, vendorsMonthly, AUTOMATION_MIN_MONTHS, AUTOMATION_MIN_ONTIME
});
