// nf-automate.jsx — Rules-Based Automation
// Sources of truth (merged):
//   • Reconciliation Framework — rule object (trigger/condition/action),
//     priority_tier funding waterfall (protected → product → discretionary),
//     Automate screen with funding status, simulation before commit
//   • Phase 1 Scope — 3 tiers + conflict resolution + consolidated Automate screen
//   • PSPTD Epic 7 / §15 — scope, rule types, last fired, acceptance rate, confirmation

// ---------- FRAMEWORK: TRIGGERS / ACTIONS / PRIORITY TIERS ----------
const RULE_TRIGGERS = {
  sku_sale_event:           { label: 'When a product sells',        hint: 'Fires on every matching sale' },
  scheduled_date:           { label: 'On a schedule',               hint: 'Fires on a fixed date each period' },
  deposit_threshold:        { label: 'When a deposit lands',        hint: 'Fires when a payout clears above a threshold' },
  recurring_obligation_due: { label: 'When an obligation is due',   hint: 'Fires ahead of a recurring bill' }
};

// Condition presets — framework "condition" is an expression that narrows the trigger.
const CONDITION_PRESETS = {
  sku_sale_event: [
    { key: 'sku', label: 'A specific SKU', build: (ctx) => (ctx.skuId || 'SKU-113') + ' sells' },
    { key: 'any', label: 'Any product sale', build: () => 'Any sale' }
  ],
  scheduled_date: [
    { key: '1st_15th', label: '1st and 15th', build: () => '1st and 15th' },
    { key: 'monday', label: 'Every Monday', build: () => 'Every Monday' },
    { key: 'week', label: 'Every week', build: () => 'Every week' },
    { key: 'month', label: 'Every month', build: () => 'Every month' },
    { key: '1st', label: '1st of each month', build: () => '1st of each month' }
  ],
  deposit_threshold: [
    { key: 'every', label: 'Every deposit', build: () => 'Every deposit' },
    { key: 'above', label: 'Deposit above a threshold', build: (ctx) => 'Deposit above ' + fmt$(ctx.depositMin || 1000) }
  ],
  recurring_obligation_due: [
    { key: 'rent', label: 'Rent, electric, water', build: () => 'Rent, electric, water' },
    { key: 'payroll', label: 'Payroll', build: () => 'Payroll' },
    { key: 'vendor', label: 'A specific vendor', build: (ctx) => (ctx.vendor || 'Apex Supplies') + ' bill' },
    { key: 'all', label: 'Any recurring obligation', build: () => 'Any recurring obligation' }
  ]
};

const defaultConditionFor = (trigger, ctx = {}) => {
  const presets = CONDITION_PRESETS[trigger] || [];
  const first = presets[0];
  return first ? first.build(ctx) : '';
};

const matchConditionPreset = (trigger, condition) => {
  const c = (condition || '').trim().toLowerCase();
  const presets = CONDITION_PRESETS[trigger] || [];
  if (trigger === 'sku_sale_event') {
    if (/^any sale/.test(c)) return 'any';
    return 'sku';
  }
  if (trigger === 'deposit_threshold') {
    if (/above|over|>=|>/.test(c)) return 'above';
    return 'every';
  }
  if (trigger === 'recurring_obligation_due') {
    if (/apex|vendor|freight|storage|bill/.test(c) && !/rent|electric|payroll/.test(c)) return 'vendor';
    if (/payroll/.test(c)) return 'payroll';
    if (/any recurring/.test(c)) return 'all';
    return 'rent';
  }
  const hit = presets.find(p => p.build({}).toLowerCase() === c);
  return hit ? hit.key : (presets[0] && presets[0].key);
};
const RULE_ACTIONS = {
  move_percent:      { label: 'Move a percentage', unit: '%' },
  move_fixed_amount: { label: 'Move a fixed amount', unit: '$' },
  sweep_surplus:     { label: 'Sweep the surplus', unit: '' }
};
// Funding waterfall — protected obligations clear first, always.
// Framework: "protected obligations clear first, then per-sale product rules,
// then discretionary or growth rules."
const RULE_TIERS = [
  { key: 'protected_obligation', order: 1, label: 'Protected obligation',
    desc: 'Rent, payroll, utilities, tax. Funded first, before anything else moves.', color: 'var(--danger)' },
  { key: 'product_allocation', order: 2, label: 'Product allocation',
    desc: 'Per-sale rules that set aside cost, tax or supplier share on a product.', color: 'var(--accent)' },
  { key: 'discretionary', order: 3, label: 'Discretionary',
    desc: 'Growth, marketing and opportunistic sweeps. Funded from what remains.', color: 'var(--c-cyan)' }
];
const tierMeta = (k) => RULE_TIERS.find(t => t.key === k) || RULE_TIERS[2];

// Intra-tier resolution (Phase 1 scope ticket 4)
const TIER_RESOLUTION = {
  protected_obligation: { key: 'sequential', label: 'Sequential, in listed order',
    note: 'A part-funded obligation is still a missed payment — you cannot pay 60% of rent. These fund one at a time so the shortfall lands on one named rule instead of quietly starving all of them.' },
  product_allocation: { key: 'pro_rata', label: 'Pro rata, shared by size',
    note: 'A percentage rule can meaningfully take a smaller cut, so a shortfall is shared in proportion to each rule\u2019s size.' },
  discretionary: { key: 'pro_rata', label: 'Pro rata, shared by size',
    note: 'Discretionary rules absorb a shortfall proportionally rather than starving whichever was added last.' }
};

// ---------- PSPTD: SCOPE + RULE TYPES (additive) ----------
const RULE_SCOPES = [
  { key: 'tenant', label: 'Tenant', desc: 'Applies to remaining balance after SKU rules.' },
  { key: 'sku',    label: 'SKU',    desc: 'Fires against SKU-attributed revenue on each deposit.' },
  { key: 'bucket', label: 'Bucket', desc: 'Watches a bucket balance (e.g. minimum reserve).' }
];
const RULE_TYPES = {
  percentage_allocation: {
    label: 'Percentage allocation', scopes: ['tenant', 'sku'],
    valueLabel: 'Percent (%)', valueUnit: '%', needsValue: true,
    action: 'move_percent', defaultTier: 'product_allocation'
  },
  fixed_amount: {
    label: 'Fixed amount', scopes: ['tenant'],
    valueLabel: 'Amount ($)', valueUnit: '$', needsValue: true,
    action: 'move_fixed_amount', defaultTier: 'protected_obligation'
  },
  waterfall: {
    label: 'Waterfall / surplus', scopes: ['tenant'],
    valueLabel: 'Percent of remainder (%)', valueUnit: '%', needsValue: true,
    action: 'sweep_surplus', defaultTier: 'discretionary'
  },
  minimum_balance: {
    label: 'Minimum balance', scopes: ['tenant', 'bucket'],
    valueLabel: 'Minimum ($)', valueUnit: '$', needsValue: true,
    action: 'move_fixed_amount', defaultTier: 'protected_obligation'
  },
  vendor_bill_reserve: {
    label: 'Vendor bill reserve', scopes: ['tenant'],
    valueLabel: 'Reserve buffer (%)', valueUnit: '%', needsValue: true,
    action: 'move_percent', defaultTier: 'protected_obligation'
  },
  fixed_per_unit: {
    label: 'Fixed reserve per unit', scopes: ['sku'],
    valueLabel: 'Per unit ($)', valueUnit: '$', needsValue: true,
    action: 'move_fixed_amount', defaultTier: 'product_allocation'
  },
  margin_threshold: {
    label: 'Margin threshold', scopes: ['sku'],
    valueLabel: 'Action amount', valueUnit: '', needsValue: false, needsThreshold: true, thresholdUnit: '%',
    action: 'move_percent', defaultTier: 'product_allocation'
  },
  velocity_trigger: {
    label: 'Velocity trigger', scopes: ['sku'],
    valueLabel: 'Action amount', valueUnit: '', needsValue: false, needsThreshold: true, needsWindow: true, thresholdUnit: 'units',
    action: 'move_percent', defaultTier: 'product_allocation'
  },
  cogs_reserve: {
    label: 'COGS reserve', scopes: ['sku'],
    valueLabel: 'COGS per unit ($)', valueUnit: '$', needsValue: true,
    action: 'move_fixed_amount', defaultTier: 'product_allocation'
  },
  profitability_gate: {
    label: 'Profitability gate', scopes: ['sku'],
    valueLabel: 'Suppress below ($)', valueUnit: '$', needsValue: false, needsThreshold: true, thresholdUnit: '$',
    action: 'sweep_surplus', defaultTier: 'discretionary'
  }
};
const ruleTypesForScope = (scope) => Object.entries(RULE_TYPES).filter(([, m]) => m.scopes.includes(scope));
const ruleTypeMeta = (k) => RULE_TYPES[k] || RULE_TYPES.percentage_allocation;
const scopeMeta = (k) => RULE_SCOPES.find(s => s.key === k) || RULE_SCOPES[0];

// ---------- NORMALIZE (one rule object for Automate / Ask / Banking) ----------
const normalizeRule = (r) => {
  if (!r) return r;
  const skuMatch = ((r.condition || '') + ' ' + (r.name || '') + ' ' + (r.skuId || '')).match(/SKU-\d{3}/);
  const skuId = r.skuId || (skuMatch ? skuMatch[0] : null);

  let scope = r.scope;
  if (!scope) {
    scope = (r.trigger === 'sku_sale_event' || skuId) ? 'sku'
      : (r.ruleType === 'minimum_balance') ? 'bucket' : 'tenant';
  }

  let ruleType = r.ruleType;
  if (!ruleType) {
    if (r.action === 'sweep_surplus') ruleType = 'waterfall';
    else if (r.action === 'move_fixed_amount' && scope === 'sku') ruleType = 'fixed_per_unit';
    else if (r.action === 'move_fixed_amount') ruleType = 'fixed_amount';
    else if (/vendor|bill/i.test((r.name || '') + (r.condition || ''))) ruleType = 'vendor_bill_reserve';
    else ruleType = 'percentage_allocation';
  }

  const meta = ruleTypeMeta(ruleType);
  const tier = r.tier || r.priority_tier || meta.defaultTier || 'discretionary';
  const value = r.value != null ? r.value : (r.amount != null ? r.amount : 0);
  const action = r.action || meta.action || 'move_percent';
  const trigger = r.trigger
    || (scope === 'sku' ? 'sku_sale_event'
      : tier === 'protected_obligation' ? 'recurring_obligation_due'
      : 'deposit_threshold');
  const condition = r.condition
    || (skuId ? skuId + ' sells'
      : trigger === 'deposit_threshold' ? 'Every deposit'
      : trigger === 'scheduled_date' ? 'Every period'
      : 'As due');

  return {
    id: r.id,
    name: r.name || 'Untitled rule',
    // Framework rule object
    trigger, condition, action, amount: value, target: r.target,
    tier, priority_tier: tier,
    createdVia: r.createdVia || 'manual',
    // PSPTD fields
    scope, ruleType, skuId, value,
    threshold: r.threshold != null ? r.threshold : null,
    thresholdWindowDays: r.thresholdWindowDays != null ? r.thresholdWindowDays : null,
    priority: r.priority != null ? r.priority : (tier === 'protected_obligation' ? 1 : tier === 'product_allocation' ? 5 : 20),
    requiresApproval: r.requiresApproval !== false,
    active: r.active !== false,
    enabled: r.enabled != null ? r.enabled : (r.active !== false),
    lastFiredAt: r.lastFiredAt || null,
    lastFiredAmount: r.lastFiredAmount != null ? r.lastFiredAmount : null,
    acceptanceRate: r.acceptanceRate != null ? r.acceptanceRate : null
  };
};

const NF_RULE_SEED = [
  {
    id: 'rule-rent', name: 'Rent & utilities',
    trigger: 'recurring_obligation_due', condition: 'Rent, electric, water',
    action: 'move_fixed_amount', amount: 4800, target: 'obligations',
    tier: 'protected_obligation', scope: 'tenant', ruleType: 'fixed_amount', value: 4800,
    createdVia: 'onboarding_proposed', active: true,
    lastFiredAt: '2026-06-01', lastFiredAmount: 4800, acceptanceRate: 100
  },
  {
    id: 'rule-tax', name: 'Tax hold',
    trigger: 'deposit_threshold', condition: 'Every deposit',
    action: 'move_percent', amount: 8.5, target: 'tax',
    tier: 'protected_obligation', scope: 'tenant', ruleType: 'percentage_allocation', value: 8.5,
    createdVia: 'onboarding_proposed', active: true,
    lastFiredAt: '2026-06-18', lastFiredAmount: 1840, acceptanceRate: 96
  },
  {
    id: 'rule-payroll', name: 'Payroll cycle reserve',
    trigger: 'scheduled_date', condition: '1st and 15th',
    action: 'move_fixed_amount', amount: 14200, target: 'payroll',
    tier: 'protected_obligation', scope: 'tenant', ruleType: 'fixed_amount', value: 14200,
    createdVia: 'manual', active: true,
    lastFiredAt: '2026-06-15', lastFiredAmount: 14200, acceptanceRate: 100
  },
  {
    id: 'rule-restock', name: 'SKU-113 restock hold',
    trigger: 'sku_sale_event', condition: 'SKU-113 sells',
    action: 'move_percent', amount: 22, target: 'inventory',
    tier: 'product_allocation', scope: 'sku', ruleType: 'percentage_allocation',
    skuId: 'SKU-113', value: 22,
    createdVia: 'ai_assisted', active: true,
    lastFiredAt: '2026-06-18', lastFiredAmount: 640, acceptanceRate: 91
  },
  {
    id: 'rule-growth', name: 'Weekly surplus sweep',
    trigger: 'scheduled_date', condition: 'Every Monday',
    action: 'sweep_surplus', amount: 0, target: 'growth',
    tier: 'discretionary', scope: 'tenant', ruleType: 'waterfall', value: 100,
    createdVia: 'manual', active: true,
    lastFiredAt: '2026-06-16', lastFiredAmount: 2200, acceptanceRate: 87
  }
].map(normalizeRule);

const NFRules = (() => {
  const KEY = 'nf-rules-v6';
  let list;
  try { list = JSON.parse(localStorage.getItem(KEY)); } catch (e) { list = null; }
  if (!Array.isArray(list)) list = NF_RULE_SEED.map(r => ({ ...r }));
  else list = list.map(normalizeRule);
  const listeners = new Set();
  const emit = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} listeners.forEach(l => l()); };
  return {
    get: () => list,
    add: (r) => { list = [...list, normalizeRule({ id: 'rule-' + Date.now(), active: true, enabled: true, ...r })]; emit(); },
    update: (id, patch) => {
      list = list.map(r => r.id === id ? normalizeRule({
        ...r, ...patch,
        active: patch.active != null ? patch.active : (patch.enabled != null ? patch.enabled : r.active)
      }) : r);
      emit();
    },
    remove: (id) => { list = list.filter(r => r.id !== id); emit(); },
    reset: () => { list = NF_RULE_SEED.map(r => ({ ...r })); emit(); },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); }
  };
})();
const useRules = () => {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => NFRules.subscribe(force), []);
  return NFRules.get();
};

// ---------- BASIS + MONTHLY COST (wired to recon model where available) ----------
const ruleBasis = (r) => {
  const n = normalizeRule(r);
  if (n.action === 'move_fixed_amount' || n.ruleType === 'fixed_amount' || n.ruleType === 'minimum_balance') {
    return { base: n.value, label: 'Fixed amount, set directly', source: 'No reconciliation basis', fixed: true };
  }
  if (n.ruleType === 'fixed_per_unit' || n.ruleType === 'cogs_reserve') {
    return { base: n.value, label: (n.skuId || 'SKU') + ' per unit', source: 'Economic + SKU-Level Reconciliation', sku: n.skuId, fixed: true };
  }
  if (n.ruleType === 'vendor_bill_reserve') {
    const base = typeof obligationsMonthly === 'function' ? obligationsMonthly() : 12000;
    return { base, label: 'Upcoming QBO bills', source: 'Vendor Reconciliation', fixed: false };
  }
  const vendor = Object.keys(window.NF_VENDOR_RECON || {}).find(name => (n.condition || '').includes(name));
  if (vendor && typeof vendorRecon === 'function') {
    const v = vendorRecon(vendor);
    return { base: v.monthly, label: vendor + ' · ' + v.payment_frequency, source: 'Vendor Reconciliation', vendor, eligible: v.automation_eligible, blocked: v.blocked_reason, fixed: false };
  }
  if (n.trigger === 'sku_sale_event' || n.scope === 'sku') {
    return n.skuId && typeof skuMonthlyRevenue === 'function'
      ? { base: skuMonthlyRevenue(n.skuId), label: n.skuId + ' monthly sales', source: 'Economic + SKU-Level Reconciliation', sku: n.skuId, fixed: false }
      : { base: typeof reconciledInflow === 'function' ? reconciledInflow() : 92000, label: 'All product sales', source: 'Economic + SKU-Level Reconciliation', fixed: false };
  }
  if (n.trigger === 'recurring_obligation_due') {
    return { base: typeof obligationsMonthly === 'function' ? obligationsMonthly() : 12000, label: 'Recurring obligations', source: 'Expense Reconciliation', fixed: false };
  }
  return { base: typeof reconciledInflow === 'function' ? reconciledInflow() : 92000, label: 'Monthly deposits', source: 'Settlement Reconciliation', fixed: false };
};

const ruleMonthlyCost = (r) => {
  const n = normalizeRule(r);
  if (n.action === 'move_fixed_amount' || n.ruleType === 'fixed_amount') {
    return Math.round(n.value * (n.trigger === 'scheduled_date' ? 2 : 1));
  }
  if (n.ruleType === 'fixed_per_unit' || n.ruleType === 'cogs_reserve') {
    return Math.round((n.value || 0) * 80);
  }
  if (n.action === 'sweep_surplus' || n.ruleType === 'waterfall') {
    const inflow = typeof reconciledInflow === 'function' ? reconciledInflow() : 92000;
    const obl = typeof obligationsMonthly === 'function' ? obligationsMonthly() : 0;
    const ven = typeof vendorsMonthly === 'function' ? vendorsMonthly() : 0;
    return Math.max(0, Math.round((inflow - obl - ven) * 0.08));
  }
  if (n.ruleType === 'minimum_balance' || n.ruleType === 'margin_threshold' || n.ruleType === 'velocity_trigger' || n.ruleType === 'profitability_gate') {
    return 0;
  }
  return Math.round(ruleBasis(n).base * ((n.value || 0) / 100));
};

// ---------- FUNDING WATERFALL (Framework + Phase 1) ----------
const allocateRules = (rules, inflow) => {
  const total = inflow != null ? inflow : (typeof reconciledInflow === 'function' ? reconciledInflow() : 92000);
  const active = rules.map(normalizeRule).filter(r => r.active !== false && r.enabled !== false);
  let pool = total;
  const byRule = {};
  const waterfall = RULE_TIERS.map(t => {
    const inTier = active.filter(r => r.tier === t.key);
    const costs = inTier.map(ruleMonthlyCost);
    const need = costs.reduce((x, c) => x + c, 0);
    const avail = Math.max(0, pool);
    const method = TIER_RESOLUTION[t.key];
    let funded = 0;
    if (need <= avail) {
      inTier.forEach((r, i) => { byRule[r.id] = { need: costs[i], funded: costs[i], pct: 100 }; });
      funded = need;
    } else if (method.key === 'sequential') {
      let p = avail;
      inTier.forEach((r, i) => {
        const got = Math.min(p, costs[i]); p -= got;
        byRule[r.id] = { need: costs[i], funded: got, pct: costs[i] ? Math.round(got / costs[i] * 100) : 100 };
      });
      funded = avail;
    } else {
      const ratio = need ? avail / need : 1;
      inTier.forEach((r, i) => {
        const got = Math.round(costs[i] * ratio);
        byRule[r.id] = { need: costs[i], funded: got, pct: costs[i] ? Math.round(got / costs[i] * 100) : 100 };
      });
      funded = avail;
    }
    pool = Math.max(0, pool - funded);
    return { tier: t, need, funded, short: Math.max(0, need - funded), method };
  });
  const committed = waterfall.reduce((x, w) => x + w.need, 0);
  return {
    byRule, waterfall, inflow: total, committed, uncommitted: total - committed,
    underfunded: Object.values(byRule).filter(x => x.pct < 100).length
  };
};

const simulateRule = (draft, existing, cash) => {
  const n = normalizeRule({ ...draft, id: draft.id || '__draft' });
  const withDraft = [...existing.map(normalizeRule).filter(r => r.id !== n.id), { ...n, active: true, enabled: true }];
  const alloc = allocateRules(withDraft);
  const draftCost = ruleMonthlyCost(n);
  const basis = ruleBasis(n);

  let engine = null;
  if (cash) {
    engine = {
      path: basis.sku ? ('Scenario engine · ' + basis.sku + ' economics') : 'Scenario engine · cash position',
      sku: basis.sku || null,
      cashBefore: cash.available,
      cashAfter: cash.available - draftCost
    };
  }

  const conflicts = [];
  alloc.waterfall.forEach(w => {
    if (w.short > 0) {
      const starved = withDraft.filter(r => r.tier === w.tier.key && (alloc.byRule[r.id] || {}).pct < 100);
      const named = starved.length ? starved[0].name : w.tier.label;
      const runway = cash && w.short > 0 ? Math.max(1, Math.round(cash.available / (w.short / 30))) : null;
      conflicts.push({
        sev: w.tier.key === 'protected_obligation' ? 'high' : 'med',
        text: `${w.tier.label} rules need ${fmt$(w.short)}/mo more than the inflow left at this tier. \u201C${named}\u201D is the first to miss funding` +
          (runway ? `, starting in about ${runway} days.` : '.'),
        fix: `Resolved ${w.method.label.toLowerCase()}. Lower this rule\u2019s amount, or move it to a lower tier.`
      });
    }
  });
  if (basis.vendor && basis.eligible === false) {
    conflicts.push({
      sev: 'med',
      text: `${basis.vendor} is not automation-eligible yet. ${basis.blocked}`,
      fix: 'Vendor Reconciliation marks a vendor eligible once its payment history supports it.'
    });
  }

  const notes = [];
  const goalDrag = Math.round(draftCost * 0.2);
  if (n.tier === 'discretionary' && goalDrag >= 500 && window.GOAL) {
    const days = Math.max(1, Math.round(goalDrag / (GOAL.target / 30)));
    notes.push(`Diverts ${fmt$(goalDrag)}/mo away from Growth Reserve, pushing \u201C${GOAL.text}\u201D out by about ${days} days.`);
  }
  return {
    draftCost, basis, engine, waterfall: alloc.waterfall, conflicts, notes,
    totalNeed: alloc.committed, inflow: alloc.inflow, uncommitted: alloc.uncommitted
  };
};

const describeRule = (r, bucketNameFn) => {
  const n = normalizeRule(r);
  const bucket = bucketNameFn ? bucketNameFn(n.target) : n.target;
  const trig = RULE_TRIGGERS[n.trigger] ? RULE_TRIGGERS[n.trigger].label : n.trigger;
  if (n.ruleType === 'minimum_balance') return `Alert when ${bucket} falls below ${fmt$(n.value)}.`;
  if (n.ruleType === 'vendor_bill_reserve') return `Recommend reserving upcoming QBO bills (+${n.value}% buffer) into ${bucket}.`;
  if (n.ruleType === 'fixed_per_unit') return `Reserve ${fmt$(n.value)} per unit of ${n.skuId || 'SKU'} sold into ${bucket}.`;
  if (n.ruleType === 'cogs_reserve') return `Reserve ${fmt$(n.value)} COGS per unit of ${n.skuId || 'SKU'} sold into ${bucket}.`;
  if (n.ruleType === 'margin_threshold') return `Alert when ${n.skuId || 'SKU'} margin crosses ${n.threshold}%.`;
  if (n.ruleType === 'velocity_trigger') return `When ${n.skuId || 'SKU'} sells >${n.threshold} units in ${n.thresholdWindowDays || 7} days, recommend action.`;
  if (n.ruleType === 'profitability_gate') return `Suppress discretionary allocations until ${n.skuId || 'SKU'} contribution exceeds ${fmt$(n.threshold)}.`;
  const amt = n.action === 'move_percent' ? (n.value + '%')
    : n.action === 'move_fixed_amount' ? fmt$(n.value) : 'the surplus';
  return `${trig} (${n.condition}) → move ${amt} to ${bucket}.`;
};

// Suggest the framework-correct priority tier from rule shape.
// Soft-warn only — merchant can override (framework open question: soft-warn).
const suggestedTier = (r) => {
  const n = normalizeRule(r);
  const blob = ((n.name || '') + ' ' + (n.condition || '') + ' ' + (n.target || '') + ' ' + (n.ruleType || '')).toLowerCase();
  if (n.ruleType === 'minimum_balance' || n.ruleType === 'vendor_bill_reserve'
    || n.trigger === 'recurring_obligation_due'
    || /\b(rent|utilit|payroll|tax|obligation|bill)\b/.test(blob)) {
    return 'protected_obligation';
  }
  if (n.scope === 'sku' || n.trigger === 'sku_sale_event' || n.ruleType === 'percentage_allocation'
    || n.ruleType === 'fixed_per_unit' || n.ruleType === 'cogs_reserve'
    || n.ruleType === 'margin_threshold' || n.ruleType === 'velocity_trigger') {
    return 'product_allocation';
  }
  if (n.action === 'sweep_surplus' || n.ruleType === 'waterfall' || n.ruleType === 'profitability_gate'
    || /\b(growth|marketing|surplus|sweep)\b/.test(blob)) {
    return 'discretionary';
  }
  return ruleTypeMeta(n.ruleType).defaultTier || 'discretionary';
};

// ---------- RULE BUILDER ----------
const RuleBuilder = ({ onClose, seed, onCreated }) => {
  const rules = useRules();
  const reserves = useReserves();
  const cash = useCash();
  const skus = (window.NF_SKUS || []).map(s => ({ id: s.sku, name: s.name || s.sku }));
  const vendors = (window.NF_VENDORS || []).map(v => v.name);
  const seedN = seed ? normalizeRule(seed) : null;

  const [d, setD] = useState(() => {
    const base = {
      name: '',
      scope: 'sku',
      ruleType: 'percentage_allocation',
      skuId: (window.NF_SKUS && NF_SKUS[0] && NF_SKUS[0].sku) || 'SKU-113',
      trigger: 'sku_sale_event',
      condition: 'SKU-113 sells',
      action: 'move_percent',
      target: reserves[0] ? reserves[0].key : 'inventory',
      value: 25,
      amount: 25,
      threshold: 35,
      thresholdWindowDays: 7,
      depositMin: 1000,
      vendor: (window.NF_VENDORS && NF_VENDORS[0] && NF_VENDORS[0].name) || 'Apex Supplies Co.',
      condPreset: 'sku',
      tier: 'product_allocation',
      priority: 5,
      requiresApproval: true,
      createdVia: 'manual',
      ...(seedN || {})
    };
    base.condPreset = matchConditionPreset(base.trigger, base.condition);
    const m = (base.condition || '').match(/above\s+\$?([\d,]+)/i);
    if (m) base.depositMin = parseFloat(m[1].replace(/,/g, '')) || 1000;
    const vHit = vendors.find(v => (base.condition || '').includes(v.split(' ')[0]));
    if (vHit) base.vendor = vHit;
    return base;
  });
  const set = (k, v) => setD(s => ({ ...s, [k]: v }));
  const [step, setStep] = useState(seedN && seedN.createdVia === 'ai_assisted' ? 'confirm' : 'build');

  const typeMeta = ruleTypeMeta(d.ruleType);
  const availableTypes = ruleTypesForScope(d.scope);
  const condCtx = { skuId: d.skuId, depositMin: d.depositMin, vendor: d.vendor };
  const applyCondition = (trigger, presetKey, ctx) => {
    const presets = CONDITION_PRESETS[trigger] || [];
    const p = presets.find(x => x.key === presetKey) || presets[0];
    return p ? p.build(ctx || condCtx) : '';
  };

  const setScope = (scope) => {
    const types = ruleTypesForScope(scope);
    const nextType = types.some(([k]) => k === d.ruleType) ? d.ruleType : types[0][0];
    const meta = ruleTypeMeta(nextType);
    const trigger = scope === 'sku' ? 'sku_sale_event' : (d.trigger === 'sku_sale_event' ? 'deposit_threshold' : d.trigger);
    const condPreset = scope === 'sku' ? 'sku' : matchConditionPreset(trigger, d.condition);
    const ctx = { skuId: d.skuId, depositMin: d.depositMin, vendor: d.vendor };
    setD(s => ({
      ...s, scope, ruleType: nextType, action: meta.action,
      tier: s.tier || meta.defaultTier, trigger, condPreset,
      condition: applyCondition(trigger, condPreset, ctx)
    }));
  };
  const setRuleType = (ruleType) => {
    const meta = ruleTypeMeta(ruleType);
    setD(s => ({
      ...s, ruleType, action: meta.action,
      tier: RULE_TIERS.some(t => t.key === s.tier) ? s.tier : meta.defaultTier,
      value: meta.needsValue === false ? s.value : (s.value || 10),
      amount: meta.needsValue === false ? s.amount : (s.amount || 10)
    }));
  };
  const setTrigger = (trigger) => {
    const condPreset = (CONDITION_PRESETS[trigger] || [])[0]?.key;
    const ctx = { skuId: d.skuId, depositMin: d.depositMin, vendor: d.vendor };
    setD(s => ({
      ...s, trigger, condPreset,
      condition: applyCondition(trigger, condPreset, ctx),
      scope: trigger === 'sku_sale_event' ? 'sku' : (s.scope === 'sku' ? 'tenant' : s.scope)
    }));
  };
  const setCondPreset = (condPreset) => {
    const ctx = { skuId: d.skuId, depositMin: d.depositMin, vendor: d.vendor };
    setD(s => ({ ...s, condPreset, condition: applyCondition(s.trigger, condPreset, ctx) }));
  };

  const draft = normalizeRule({ ...d, amount: d.value, value: d.value });
  const sim = simulateRule(draft, rules, cash);
  const targetName = (reserves.find(r => r.key === d.target) || {}).name || d.target;
  const plain = describeRule(draft, () => targetName);
  const expectTier = suggestedTier(draft);
  const tierMismatch = expectTier && d.tier !== expectTier;
  const blocking = sim.conflicts.some(c => c.sev === 'high');
  const editing = !!(seedN && seedN.id && !String(seedN.id).startsWith('__'));

  const commit = () => {
    const payload = {
      name: d.name || (d.scope === 'sku' ? `${d.skuId} ${typeMeta.label}` : typeMeta.label),
      scope: d.scope, ruleType: d.ruleType, skuId: d.scope === 'sku' ? d.skuId : null,
      trigger: d.trigger, condition: d.condition || (d.scope === 'sku' ? d.skuId + ' sells' : 'Every deposit'),
      action: typeMeta.action, amount: Number(d.value) || 0, value: Number(d.value) || 0,
      target: d.target, tier: d.tier, priority_tier: d.tier, priority: Number(d.priority) || 10,
      threshold: typeMeta.needsThreshold ? Number(d.threshold) : null,
      thresholdWindowDays: typeMeta.needsWindow ? Number(d.thresholdWindowDays) || 7 : null,
      requiresApproval: !!d.requiresApproval, createdVia: d.createdVia || 'manual',
      active: true, enabled: true
    };
    if (editing) {
      NFRules.update(seedN.id, payload);
      NFToast.show('Rule updated', { icon: 'bolt', tone: 'accent' });
    } else {
      NFRules.add(payload);
      NFStore.add({
        id: 'rule-auto-' + Date.now(), category: tierMeta(d.tier).label, area: 'Automate',
        rule: plain, statement: 'Rule created from the Automate screen.'
      });
      NFToast.show('Rule created and active', { icon: 'bolt', tone: 'accent' });
    }
    if (onCreated) onCreated();
    onClose();
  };

  return (
    <Modal
      title={step === 'confirm' ? 'Confirm this rule' : (editing ? 'Edit rule' : 'New rule')}
      sub={step === 'confirm'
        ? 'Simulated against every active rule before anything is created'
        : 'Trigger, action, target bucket, and priority tier — then confirm'}
      width={880} onClose={onClose}
      foot={<>
        <button className="btn btn-ghost btn-sm" onClick={step === 'confirm' ? () => setStep('build') : onClose}>
          {step === 'confirm' ? '← Edit rule' : 'Cancel'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {step === 'build' && <button className="btn btn-primary btn-sm" onClick={() => setStep('confirm')}>Review &amp; simulate</button>}
          {step === 'confirm' && (
            <button className="btn btn-primary btn-sm" onClick={commit}>
              {blocking ? 'Create anyway' : (editing ? 'Save rule' : 'Create rule')}
            </button>
          )}
        </div>
      </>}>
      {step === 'build' ? (
        <div className="rule-grid">
          <div className="co-form">
            <div className="co-field"><label>Rule name</label>
              <input className="co-input" placeholder="e.g. Dropship supplier share" value={d.name} onChange={e => set('name', e.target.value)} /></div>

            <div className="co-field"><label>Scope</label>
              <div className="scope-pick">
                {RULE_SCOPES.map(s => (
                  <button key={s.key} type="button" className={`sp ${d.scope === s.key ? 'on' : ''}`} onClick={() => setScope(s.key)}>
                    <span className="sp-n">{s.label}</span>
                    <span className="sp-d">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="co-field"><label>Rule type</label>
              <select className="co-input" value={d.ruleType} onChange={e => setRuleType(e.target.value)}>
                {availableTypes.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <span className="rule-hint">{plain}</span>
            </div>

            {d.scope === 'sku' && d.trigger !== 'sku_sale_event' && (
              <div className="co-field"><label>SKU</label>
                <select className="co-input" value={d.skuId || ''} onChange={e => {
                  const skuId = e.target.value;
                  setD(s => ({ ...s, skuId, condition: s.trigger === 'sku_sale_event' && s.condPreset === 'sku' ? skuId + ' sells' : s.condition }));
                }}>
                  {(skus.length ? skus : [{ id: 'SKU-113', name: 'SKU-113' }]).map(s => (
                    <option key={s.id} value={s.id}>{s.id} · {s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="co-field"><label>Trigger</label>
              <select className="co-input" value={d.trigger} onChange={e => setTrigger(e.target.value)}>
                {Object.entries(RULE_TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <span className="rule-hint">{RULE_TRIGGERS[d.trigger].hint}</span>
            </div>

            <div className="co-field"><label>Condition</label>
              <select className="co-input" value={d.condPreset || ''} onChange={e => setCondPreset(e.target.value)}>
                {(CONDITION_PRESETS[d.trigger] || []).map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>

              {d.trigger === 'sku_sale_event' && d.condPreset === 'sku' && (
                <select className="co-input" style={{ marginTop: 8 }} value={d.skuId || ''}
                  onChange={e => {
                    const skuId = e.target.value;
                    setD(s => ({ ...s, skuId, condition: skuId + ' sells' }));
                  }}>
                  {(skus.length ? skus : [{ id: 'SKU-113', name: 'SKU-113' }]).map(s => (
                    <option key={s.id} value={s.id}>{s.id} · {s.name}</option>
                  ))}
                </select>
              )}

              {d.trigger === 'deposit_threshold' && d.condPreset === 'above' && (
                <div className="co-field" style={{ marginTop: 8 }}>
                  <label>Minimum deposit ($)</label>
                  <NumInput value={d.depositMin} onChange={v => {
                    setD(s => ({ ...s, depositMin: v, condition: 'Deposit above ' + fmt$(v) }));
                  }} />
                </div>
              )}

              {d.trigger === 'recurring_obligation_due' && d.condPreset === 'vendor' && (
                <select className="co-input" style={{ marginTop: 8 }} value={d.vendor || ''}
                  onChange={e => {
                    const vendor = e.target.value;
                    setD(s => ({ ...s, vendor, condition: vendor + ' bill' }));
                  }}>
                  {(vendors.length ? vendors : ['Apex Supplies Co.']).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              )}

              <span className="rule-hint">Narrows when the trigger fires · currently “{d.condition}”</span>
            </div>

            {typeMeta.needsValue !== false && (
              <div className="co-field"><label>{typeMeta.valueLabel}</label>
                <NumInput value={d.value} onChange={v => { set('value', v); set('amount', v); }} /></div>
            )}
            {typeMeta.needsThreshold && (
              <div className="co-row2">
                <div className="co-field"><label>Threshold ({typeMeta.thresholdUnit || ''})</label>
                  <NumInput value={d.threshold} onChange={v => set('threshold', v)} /></div>
                {typeMeta.needsWindow && (
                  <div className="co-field"><label>Window (days)</label>
                    <NumInput value={d.thresholdWindowDays} onChange={v => set('thresholdWindowDays', v)} /></div>
                )}
              </div>
            )}

            <div className="co-field"><label>Target bucket</label>
              <select className="co-input" value={d.target} onChange={e => set('target', e.target.value)}>
                {reserves.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
              </select>
            </div>

            <div className="co-field"><label>Priority tier</label>
              <div className="tier-pick">
                {RULE_TIERS.map(t => (
                  <button key={t.key} type="button" className={`tp ${d.tier === t.key ? 'on' : ''}`} onClick={() => set('tier', t.key)}>
                    <span className="tp-dot" style={{ background: t.color }} />
                    <span className="tp-b">
                      <span className="tp-n">{t.order}. {t.label}</span>
                      <span className="tp-d">{t.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
              {tierMismatch && (
                <div className="rule-tier-mismatch">
                  <b>This rule looks like a {tierMeta(expectTier).label.toLowerCase()}.</b>
                  {' '}Putting it in {tierMeta(d.tier).label.toLowerCase()} means it only gets funded after higher tiers clear — rent/tax/product rules could starve it, or it could take cash before obligations if you elevate it wrongly.
                  <button type="button" onClick={() => set('tier', expectTier)}>
                    Switch to {tierMeta(expectTier).label}
                  </button>
                  {' '}or keep your choice and continue.
                </div>
              )}
            </div>

            <label className="ru-toggle">
              <input type="checkbox" checked={!!d.requiresApproval} onChange={e => set('requiresApproval', e.target.checked)} />
              <span><b>Requires approval</b><em>Recommendation only until you approve in Banking → Allocations.</em></span>
            </label>
          </div>

          <div className="rule-side">
            <div className="nf-detail-section-lbl">In plain language</div>
            <div className="rule-plain">{plain}</div>
            <div className="nf-detail-section-lbl" style={{ marginTop: 16 }}>Priority tier</div>
            <div className="rc-tier" style={{ marginTop: 6 }}>
              <span className="tp-dot" style={{ background: tierMeta(d.tier).color }} />
              {tierMeta(d.tier).order}. {tierMeta(d.tier).label}
            </div>
            {sim.draftCost > 0 && (
              <>
                <div className="nf-detail-section-lbl" style={{ marginTop: 16 }}>Estimated monthly cost</div>
                <div className="rule-cost">{fmt$(sim.draftCost)}<em>/mo of {fmt$(sim.inflow)} inflow</em></div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="rule-confirm">
          <div className="rc-plain"><Icon name="bolt" size={15} /><span>{plain}</span></div>
          <div className="rc-tier">
            <span className="tp-dot" style={{ background: tierMeta(d.tier).color }} />
            {tierMeta(d.tier).label} · funded {tierMeta(d.tier).order === 1 ? 'first' : tierMeta(d.tier).order === 2 ? 'second' : 'last'}
            <span>·</span>
            <span className={`rr-scope ${d.scope}`}>{scopeMeta(d.scope).label}</span>
            <span>·</span>
            <span>{typeMeta.label}</span>
          </div>
          {tierMismatch && (
            <div className="rule-tier-mismatch">
              <b>Priority tier may be wrong.</b> Suggested: {tierMeta(expectTier).label}.
              <button type="button" onClick={() => { set('tier', expectTier); setStep('build'); }}>
                Fix tier
              </button>
              {' '}You can still create anyway — simulation below shows the funding impact.
            </div>
          )}

          <div className="rule-basis">
            <div className="rb-row">
              <span className="rb-k">Costed from</span>
              <span className="rb-v">{sim.basis.fixed ? fmt$(sim.draftCost) + '/mo' : sim.basis.label + ' · ' + fmt$(sim.basis.base) + '/mo'}</span>
            </div>
            <div className="rb-src">{sim.basis.fixed
              ? 'You entered this amount directly — no reconciliation type feeds it.'
              : 'Read from ' + sim.basis.source + ' — not a typed-in estimate.'}</div>
          </div>

          {sim.engine && sim.draftCost > 0 && (
            <>
              <div className="nf-detail-section-lbl" style={{ marginTop: 18 }}>Before and after · {sim.engine.path}</div>
              <div className="rule-ba">
                <div className="ba-cell"><div className="l">Deployable cash before</div><div className="v">{fmt$(sim.engine.cashBefore)}</div></div>
                <span className="ba-arrow">→</span>
                <div className="ba-cell"><div className="l">After this rule</div><div className="v" style={{ color: 'var(--accent)' }}>{fmt$(sim.engine.cashAfter)}</div></div>
              </div>
            </>
          )}

          <div className="nf-detail-section-lbl" style={{ marginTop: 18 }}>
            Funding waterfall · simulated against every active rule from {fmt$(sim.inflow)}/mo inflow
          </div>
          <div className="rule-water">
            {sim.waterfall.map(w => (
              <div key={w.tier.key} className={`rw-row ${w.short > 0 ? 'short' : ''}`}>
                <span className="rw-dot" style={{ background: w.tier.color }} />
                <span className="rw-n" title={w.method.note}>{w.tier.order}. {w.tier.label}<em className="rw-m">{w.method.label}</em></span>
                <span className="rw-bar"><i style={{ width: (w.need ? Math.min(100, w.funded / w.need * 100) : 100) + '%', background: w.tier.color }} /></span>
                <span className="rw-v">{fmt$(w.funded)}<em>/ {fmt$(w.need)}</em></span>
              </div>
            ))}
          </div>

          {sim.conflicts.length === 0 ? (
            <div className="rule-ok"><Icon name="check" size={14} /> No conflicts. Every existing rule and protected obligation stays funded.</div>
          ) : (
            <div className="rule-conflicts">
              {sim.conflicts.map((c, i) => (
                <div key={i} className={`rcf ${c.sev}`}>
                  <div className="rcf-t">{c.text}</div>
                  <div className="rcf-f">{c.fix}</div>
                </div>
              ))}
            </div>
          )}
          {sim.notes.length > 0 && (
            <div className="rule-conflicts">
              {sim.notes.map((n, i) => <div key={i} className="rcf low"><div className="rcf-t">{n}</div></div>)}
            </div>
          )}
          <div className="rule-after">
            <span>Uncommitted monthly inflow after this rule</span>
            <b>{fmt$(sim.uncommitted)}<em style={{ fontStyle: 'normal', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginLeft: 6 }}>/mo</em></b>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ---------- AUTOMATE SCREEN ----------
// Reconciliation Framework + Phase 1 Scope:
// "Automate screen showing every active rule, its priority tier, and current
// funding status in one place." No extra dashboard columns beyond that.
const AutomateScreen = ({ setRoute }) => {
  const rules = useRules().map(normalizeRule);
  const reserves = useReserves();
  const [build, setBuild] = useState(null);

  const alloc = allocateRules(rules);
  const committed = alloc.committed;
  const uncommitted = alloc.uncommitted;
  const pctOfInflow = Math.round(committed / Math.max(1, alloc.inflow) * 100);
  const underfunded = alloc.underfunded;
  const bucketName = (k) => (reserves.find(r => r.key === k) || {}).name || k;
  const byTier = RULE_TIERS.map((t, i) => ({
    t,
    list: rules.filter(r => r.tier === t.key),
    cost: alloc.waterfall[i].need
  }));
  const viaLabel = (v) => v === 'ai_assisted' ? 'AI' : v === 'onboarding_proposed' ? 'Onboarding' : 'Manual';

  return (
    <div className="col gap-6 fade-in">
      <SectionHead
        title="Automate"
        sub="Every active rule, its priority tier, and what it funds — in one place."
        right={<button className="btn btn-primary btn-sm" onClick={() => setBuild({})}><Icon name="plus" size={12} /> New rule</button>}
      />
      <FreshnessLine note={`${rules.filter(r => r.active !== false).length} rules active`} />
      <CapabilityTier />

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <div className="metric metric-accent" style={{ '--cc-accent': 'var(--accent)' }}>
          <div className="lbl">Committed per month<FigureInfo figure="rule_commitments" amount={committed} label="Committed to rules" /></div>
          <div className="val"><LiveValue value={fmt$(committed)} /></div>
          <div className="sub-note">{pctOfInflow}% of {fmt$(alloc.inflow)} monthly inflow</div>
        </div>
        <div className="metric metric-accent" style={{ '--cc-accent': uncommitted >= 0 ? 'var(--ok)' : 'var(--danger)' }}>
          <div className="lbl">Uncommitted per month</div>
          <div className="val"><LiveValue value={(uncommitted < 0 ? '−' : '') + fmt$(Math.abs(uncommitted))} /></div>
          <div className={`sub-note ${uncommitted >= 0 ? 'up' : 'danger'}`}>
            {uncommitted >= 0 ? 'Left over each month after rules' : 'Shortfall — rules exceed monthly inflow'}
          </div>
        </div>
        <div className="metric metric-accent" style={{ '--cc-accent': underfunded ? 'var(--warn)' : 'var(--ok)' }}>
          <div className="lbl">Needs attention</div>
          <div className="val">{underfunded}</div>
          <div className={`sub-note ${underfunded ? 'warn' : 'up'}`}>{underfunded ? 'Under-funded this cycle' : 'All rules fully funded'}</div>
        </div>
      </section>

      <div className="card" style={{ padding: '18px 22px' }}>
        <SectionHead
          title="Funding waterfall"
          sub={`Protected obligations clear first. Funded from ${fmt$(alloc.inflow)} of reconciled monthly inflow — nothing below a tier is funded until the tier above it is whole.`}
        />
        <div className="rule-water" style={{ marginTop: 12 }}>
          {alloc.waterfall.map(w => (
            <div key={w.tier.key} className={`rw-row ${w.short > 0 ? 'short' : ''}`}>
              <span className="rw-dot" style={{ background: w.tier.color }} />
              <span className="rw-n">{w.tier.order}. {w.tier.label}</span>
              <span className="rw-bar"><i style={{ width: Math.min(100, w.need / Math.max(1, alloc.inflow) * 100) + '%', background: w.tier.color }} /></span>
              <span className="rw-v">{fmt$(w.need)}<em>/ mo</em></span>
            </div>
          ))}
        </div>
      </div>

      {byTier.map(({ t, list, cost }) => (
        <div key={t.key} className="card" style={{ padding: '18px 22px' }}>
          <div className="rule-tier-head">
            <span className="tp-dot" style={{ background: t.color }} />
            <div className="rt-copy">
              <div className="rt-n">{t.order}. {t.label}</div>
              <div className="rt-d">{t.desc}</div>
            </div>
            <span className="rt-count">{list.length}</span>
          </div>

          {list.length === 0 ? (
            <div className="cc-empty" style={{ marginTop: 10 }}>No rules in this tier yet.</div>
          ) : list.map(r => {
            const a = alloc.byRule[r.id];
            const pct = r.active !== false && a ? a.pct : null;
            return (
              <div key={r.id} className={`rule-row ${r.active === false ? 'off' : ''}`}>
                <div className="rr-main">
                  <div className="rr-n">
                    {r.name}
                    <span className={`rr-via ${r.createdVia}`}>{viaLabel(r.createdVia)}</span>
                  </div>
                  <div className="rr-d">{describeRule(r, bucketName)}</div>
                </div>
                <div className="rr-fund">
                  {pct == null ? (
                    <span className="rr-pct" style={{ width: 'auto' }}>Disabled</span>
                  ) : (
                    <>
                      <span className="rr-track"><i style={{ width: pct + '%', background: pct < 100 ? 'var(--warn)' : t.color }} /></span>
                      <span className="rr-pct">{pct}%</span>
                    </>
                  )}
                </div>
                <div className="rr-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setBuild({ ...r })}>Edit</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => NFRules.update(r.id, { active: !r.active, enabled: !r.active })}>
                    {r.active !== false ? 'Disable' : 'Enable'}
                  </button>
                  <button className="res-del" onClick={() => { NFRules.remove(r.id); NFToast.show('Rule removed', { tone: 'warn', icon: 'bell' }); }}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {build && <RuleBuilder seed={build.id ? build : null} onClose={() => setBuild(null)} />}
    </div>
  );
};

Object.assign(window, {
  RULE_TRIGGERS, RULE_ACTIONS, RULE_TIERS, tierMeta, TIER_RESOLUTION,
  RULE_SCOPES, RULE_TYPES, ruleTypesForScope, ruleTypeMeta, scopeMeta,
  normalizeRule, describeRule, suggestedTier, ruleBasis,
  NFRules, useRules, allocateRules, simulateRule, ruleMonthlyCost, RuleBuilder, AutomateScreen
});
