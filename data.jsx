// data.jsx — sample data for the prototype (growing ecommerce brand: $200K/mo, Shopify + Amazon + Wholesale)

window.NF_DATA = {
  brand: {
    name: 'Ridgepoint Goods',
    handle: 'ridgepoint',
    monthlyRevenue: 197400,
    platforms: ['Shopify', 'Amazon', 'Wholesale'],
    framework: 'Ecommerce Operator'
  },

  // Hero numbers (Operator Mode home)
  hero: {
    available: 42380,         // formerly "Safe to Spend"
    realCash: 88540,          // formerly "Total in Bank"
    reserved: 46160,
    forecastTrend: 'tight'    // tight | comfortable | flush
  },

  // Time horizons for new Home
  horizons: [
    { key: 'now', label: 'Available Now', amount: 42380, chip: 'Tight', tone: 'warn',
      detail: '$46,160 reserved across 6 reserves. Inventory $6,200 short of Apr 26 restock target.' },
    { key: '7d',  label: '7 Days',        amount: 51900, chip: 'Easing', tone: 'ok',
      detail: 'Apr 24 Amazon deposit ($14,200 expected) closes the inventory gap and lifts Available.' },
    { key: '30d', label: '30 Days',       amount: 71240, chip: 'Building', tone: 'ok',
      detail: 'After payroll ($11,600) and vendor commitments, surplus begins accumulating into Operating.' },
    { key: '90d', label: '90 Days',       amount: 138900, chip: 'Q4 incoming', tone: 'ok',
      detail: 'Seasonality model: 38% revenue uplift starts mid-Sep. Reserve uplift suggested.' }
  ],

  // Primary recommendation (one only — replaces the multi-card optimization strip)
  primaryRec: {
    eyebrow: 'Primary recommendation · time-sensitive',
    impact: '$10K decision · 3-day window',
    title: 'Wait until Apr 24 before the next $10K marketing push.',
    reasoning:
      'The 4/24 Amazon deposit closes your inventory gap and lifts Available by $9,520. ' +
      'Spending the same $10K today drops Inventory $6,200 below the Apr 26 restock target and ' +
      'compresses your payroll buffer to $900. Wait 3 days — same spend, zero protected reserves touched.',
    impactPanel: [
      { label: 'Today: Available after spend', value: '$32,380', dir: 'up' },
      { label: 'Apr 24: Available after spend', value: '$41,900', dir: 'down' },
      { label: 'Inventory reserve risk', value: 'Removed', dir: 'down' },
      { label: 'Payroll buffer protected', value: '$3,900', dir: 'down' }
    ]
  },

  // What changed since yesterday — max 3 items
  changed: [
    { kind: 'up',   icon: '↑', title: 'Shopify deposit cleared',
      desc: '$8,400 from order SHP-4471 (3 SKUs) flowed through — Inventory +$1,176, Tax +$714.' },
    { kind: 'down', icon: '!', title: 'Northline Packaging invoice ready',
      desc: '$4,280 due Apr 22 from Inventory reserve. Funded — confirm before noon Friday.' },
    { kind: 'flat', icon: '~', title: 'Bright Market still unfunded',
      desc: '$10,000 marketing invoice. No marketing reserve exists yet. Open question.' }
  ],

  // Reserves (formerly "buckets")
  reserveGroups: [
    {
      key: 'operating', label: 'Operating Reserves', total: 28340,
      sub: 'reserved · auto-allocated from deposits',
      rows: [
        { id: 'inventory', name: 'Inventory', desc: 'Apr 26 restock target', amount: 14800, status: 'Short $6,200', tone: 'warn',
          ctx: { funded: '71%', short: 6200, depleteRisk: 'medium', feedsFrom: ['Shopify 14%', 'Amazon 18%'] } },
        { id: 'partners', name: 'Partners', desc: 'Scheduled vendor payments · 3 due', amount: 13540, status: '3 due this week', tone: 'ok',
          ctx: { funded: '100%', short: 0, depleteRisk: 'low', feedsFrom: ['Allocation rules', 'Manual'] } },
        { id: 'commissions', name: 'Commissions', desc: 'Ridgefield rep · pays Friday', amount: 2480, status: 'Pays Friday', tone: 'ok',
          ctx: { funded: '100%', short: 0, depleteRisk: 'low', feedsFrom: ['5% Ridgefield SKU revenue'] } }
      ]
    },
    {
      key: 'protected', label: 'Protected Reserves', total: 21020,
      sub: 'auto-managed · cannot be drawn from operating decisions',
      rows: [
        { id: 'payroll', name: 'Payroll', desc: 'Staff payment · Apr 30', amount: 11600, status: 'Fully covered', tone: 'ok',
          ctx: { funded: '100%', short: 0, depleteRisk: 'low', feedsFrom: ['Fixed weekly allocation'] } },
        { id: 'taxes', name: 'Taxes', desc: 'Auto-held · 8.5% of deposits', amount: 9420, status: 'On track', tone: 'ok',
          ctx: { funded: '100%', short: 0, depleteRisk: 'low', feedsFrom: ['8.5% of every deposit'] } }
      ]
    },
    {
      key: 'savings', label: 'Savings & Buffer', total: 4800,
      sub: 'protected runway',
      rows: [
        { id: 'buffer', name: 'Seasonal Buffer', desc: 'Pre-Q4 build', amount: 4800, status: 'Building', tone: 'ok',
          ctx: { funded: '32%', short: 0, depleteRisk: 'none', feedsFrom: ['Surplus auto-sweep'] } }
      ]
    }
  ],

  // Revenue — platforms (formerly "Ops Revenue")
  platforms: [
    { id: 'shopify', name: 'Shopify', amount: 24200, orders: 14, share: 0.49, active: true },
    { id: 'amazon',  name: 'Amazon',  amount: 18800, orders: 3,  share: 0.38, active: false },
    { id: 'whlsl',   name: 'Wholesale', amount: 6600, orders: 2, share: 0.13, active: false }
  ],

  shopifyOrders: [
    { id: 'SHP-4471', date: 'Apr 17', skus: ['NF-RIDGE-01','NF-PACK-02','NF-LABEL-03'], skuCount: 3, amount: 8400, active: true },
    { id: 'SHP-4468', date: 'Apr 16', skus: ['NF-RIDGE-01','NF-PACK-02'], skuCount: 2, amount: 5200, active: false },
    { id: 'SHP-4462', date: 'Apr 15', skus: ['NF-LABEL-03','NF-PACK-02'], skuCount: 2, amount: 4800, active: false },
    { id: 'SHP-4455', date: 'Apr 14', skus: ['NF-RIDGE-01'], skuCount: 1, amount: 3900, active: false }
  ],

  // NoodleFlow Links
  links: {
    total: 24,
    activeLinks: 18,
    last30Sales: 14820,
    avgAOV: 62,
    topProduct: 'Ridgefield 5 oz'
  },

  // SKU contribution (Available, not gross)
  skuContribution: [
    { sku: 'NF-RIDGE-01', name: 'Ridgefield 5 oz', gross: 28400, available: 20590, pct: 72.5, bar: 100 },
    { sku: 'NF-PACK-02',  name: 'Ridge Pack 4ct', gross: 18200, available: 11830, pct: 65.0, bar: 65 },
    { sku: 'NF-LABEL-03', name: 'Label upgrade',  gross: 6900,  available: 3450,  pct: 50.0, bar: 32 },
    { sku: 'NF-BUNDLE-01',name: 'Seasonal bundle', gross: 12100, available: 4720,  pct: 39.0, bar: 22 }
  ],

  // Partners (formerly "Vendors")
  partners: [
    { id: 'northline', name: 'Northline Packaging', tag: 'Supplier · Inventory',
      annual: 51360, terms: 'Net 15', onTime: 96, contribution: 'Critical', risk: 'low',
      insight: 'Eligible for Net 30 negotiation based on 18-month payment history. Could free $8,400 in working capital per cycle.',
      stats: [
        { l: 'Annual spend', v: '$51,360' }, { l: 'Avg payment cycle', v: '12 days' },
        { l: 'On-time rate', v: '96%' }, { l: 'Margin contribution', v: '+11% vs avg' }
      ], active: true },
    { id: 'peak', name: 'Peak Logistics', tag: 'Fulfillment',
      annual: 38280, terms: 'Net 15', onTime: 100, contribution: 'Critical', risk: 'medium',
      insight: 'Spend concentration: 78% of fulfillment volume. Consider secondary partner for Q4 redundancy.',
      stats: [
        { l: 'Annual spend', v: '$38,280' }, { l: 'Avg payment cycle', v: '11 days' },
        { l: 'On-time rate', v: '100%' }, { l: 'Volume share', v: '78%' }
      ], active: false },
    { id: 'bright', name: 'Bright Market Agency', tag: 'Marketing · Paid social',
      annual: 86400, terms: 'Due on receipt', onTime: 88, contribution: 'Variable', risk: 'medium',
      insight: 'No marketing reserve exists. Past 60 days: ROAS down 14% — recommend reviewing scope before next cycle.',
      stats: [
        { l: 'Annual spend', v: '$86,400' }, { l: 'Avg payment cycle', v: 'Immediate' },
        { l: 'On-time rate', v: '88%' }, { l: 'ROAS trend', v: '-14% / 60d' }
      ], active: false },
    { id: 'summit', name: 'Summit Labels', tag: 'Supplier · Labels',
      annual: 14280, terms: 'Net 30', onTime: 100, contribution: 'Stable', risk: 'low',
      insight: 'Lowest-risk supplier in your roster. Auto-pay on Net 30 since 2024. No action needed.',
      stats: [
        { l: 'Annual spend', v: '$14,280' }, { l: 'Avg payment cycle', v: '28 days' },
        { l: 'On-time rate', v: '100%' }, { l: 'Auto-pay', v: 'On' }
      ], active: false },
    { id: 'ridge', name: 'Ridgefield Sales Rep', tag: 'Affiliate · Commission',
      annual: 12480, terms: '5% revenue', onTime: 100, contribution: 'Growth driver', risk: 'low',
      insight: 'Ridgefield SKUs are your strongest Available contributor at 72.5¢ per $1. Consider expanding rep coverage.',
      stats: [
        { l: 'Annual spend', v: '$12,480' }, { l: 'Drives revenue', v: '$249K/yr' },
        { l: 'Available impact', v: '+72.5¢/$1' }, { l: 'Cycle', v: 'Weekly · auto' }
      ], active: false }
  ],

  // Invoices
  invoices: [
    { vendor: 'Northline Packaging', due: 'Apr 22', status: 'Ready to pay',     statusTone: 'warn',
      recorded: 'Yes', reserve: 'Inventory',  amount: 4280 },
    { vendor: 'Peak Logistics',      due: 'Apr 21', status: 'Waiting approval', statusTone: 'info',
      recorded: 'Yes', reserve: 'Partners',   amount: 1920 },
    { vendor: 'Bright Market Agency',due: 'Apr 25', status: 'Not funded',       statusTone: 'danger',
      recorded: 'Yes', reserve: 'No reserve', amount: 10000 },
    { vendor: 'Summit Labels',       due: 'Apr 30', status: 'Paid',             statusTone: 'ok',
      recorded: 'Yes', reserve: 'Inventory',  amount: 2860 }
  ],

  // Receipts
  receipts: [
    { merchant: 'Bright Market Agency', date: 'Apr 18', category: 'Marketing · Paid social',
      method: 'Email · receipts@noodleflow.ai', amount: 1450, status: 'matched' },
    { merchant: 'AWS', date: 'Apr 17', category: 'SaaS · Infrastructure',
      method: 'Auto-forwarded · Virtual Card 0942', amount: 286.10, status: 'matched' },
    { merchant: 'Whole Foods Market', date: 'Apr 16', category: 'Office · Snacks',
      method: 'Photo · iPhone', amount: 78.40, status: 'missing-tx' },
    { merchant: 'Stripe Payouts', date: 'Apr 16', category: 'Revenue',
      method: 'Auto-imported', amount: 1240, status: 'matched' },
    { merchant: 'Unknown · $84.20 Chase debit', date: 'Apr 15', category: 'Uncategorized',
      method: 'Bank import · awaiting receipt', amount: 84.20, status: 'missing-receipt' }
  ],

  // Operating Frameworks
  frameworks: [
    { id: 'ecommerce', name: 'Ecommerce Operator', tag: 'Most popular for you',
      desc: 'Inventory, paid media, payroll, tax, vendor, returns, buffer, and growth capital — built for Shopify + Amazon brands.',
      chips: ['Inventory', 'Paid Media', 'Payroll', 'Tax', 'Vendor', 'Returns', 'Buffer', 'Growth'],
      usage: '4,120 operators', fit: '94% match', accent: true, installed: true },
    { id: 'profit-first', name: 'Profit First', tag: 'Mike Michalowicz method',
      desc: 'Income, Owner Pay, Operating Expense, Taxes, Profit, and Emergency Reserve. Disciplined and proven.',
      chips: ['Income', 'Owner Pay', 'OpEx', 'Taxes', 'Profit', 'Emergency'],
      usage: '12,840 operators', fit: '78% match' },
    { id: 'agency', name: 'Agency Operator', tag: 'Services + retainers',
      desc: 'Payroll, contractors, taxes, tools, operating reserve, owner draw, bonus pool. Optimized for retainer cycles.',
      chips: ['Payroll', 'Contractors', 'Taxes', 'Tools', 'Operating', 'Owner Draw', 'Bonus'],
      usage: '2,810 operators', fit: '52% match' },
    { id: 'hospitality', name: 'Hospitality Operator', tag: 'Toast POS + seasonal',
      desc: 'COGS, payroll, rent, taxes, marketing, equipment reserve, seasonal buffer. Cycle-aware.',
      chips: ['COGS', 'Payroll', 'Rent', 'Taxes', 'Marketing', 'Equipment', 'Seasonal'],
      usage: '1,640 operators', fit: '38% match' },
    { id: 'lean', name: 'Lean Bootstrap', tag: 'Solo founders',
      desc: 'Tax Reserve, Operating Reserve, Available. Three reserves. Maximum simplicity.',
      chips: ['Tax', 'Operating', 'Available'],
      usage: '8,290 operators', fit: '60% match' },
    { id: 'custom', name: 'Custom', tag: 'Operator-defined',
      desc: 'Start from blank or have AI suggest a framework based on your last 90 days of deposits and obligations.',
      chips: ['AI-assisted', 'Templates', 'Editable'],
      usage: '—', fit: 'Build your own' }
  ],

  // Seasonality intelligence
  seasonality: {
    detected: true,
    window: 'Mid-Sept → Late-Dec',
    suggestion: 'Lift Inventory holdback from 14% → 22% starting Sept 15',
    reasoning: 'Last 2 Q4s your Inventory reserve ran short by an average of $14,800 in November. Raising the holdback now compounds the buffer before the Sept 15 inventory cycle starts.',
    nextLowSeason: 'Jan + Feb compresses Available by ~38%',
    suggestedBuild: '$8,000 seasonal buffer'
  },

  // Growth / capital deployment
  surplus: { available30: 12400, available90: 38200 },
  deployments: [
    { id: 'inventory-expand', title: 'Expand inventory pre-Q4', risk: 'low',
      thesis: 'Inventory turn improved to 5.8x last quarter. Pre-Q4 inventory buy at $8K–$12K would compound through the seasonal cycle starting Sept 15.',
      bench: 'Operators at your volume typically allocate 18–24% of surplus into inventory ahead of seasonal peaks. Reference, not prescription.',
      stats: [{ l: 'Expected return', v: '+$22K Q4' }, { l: 'Payback', v: '60–90 days' }, { l: 'Tier-1 risk', v: 'Supplier lead time' }] },
    { id: 'media-seed', title: 'Seed paid media testing', risk: 'med',
      thesis: 'Ridgefield SKUs are your highest Available-per-$ contributor. Allocating $4K–$6K to test new creative concepts could establish next-cycle winners early.',
      bench: 'Operators with similar ROAS profiles typically allocate 8–12% of surplus to channel testing.',
      stats: [{ l: 'Expected return', v: 'Variable' }, { l: 'Decision window', v: '7–14 days' }, { l: 'Tier-2 risk', v: 'ROAS variance' }] },
    { id: 'debt-paydown', title: 'Pay down line of credit', risk: 'low',
      thesis: 'Current LOC balance $8,400 at 11.2% APR. Paying down $5K now avoids ~$280/quarter in interest. No operational downside.',
      bench: 'When LOC > 6% APR, surplus deployment to debt typically beats yield account return.',
      stats: [{ l: 'Annual interest saved', v: '$1,120' }, { l: 'Liquidity hit', v: '$5,000' }, { l: 'Tier-1 risk', v: 'None' }] },
    { id: 'yield', title: 'Park in yield account', risk: 'low',
      thesis: 'Money-market access via banking partner is paying 4.5% APY. Idle Operating > $30K could earn an extra ~$112/mo without locking liquidity.',
      bench: 'Operators at your volume park 20–30% of surplus in yield when peak cycle is more than 60 days out.',
      stats: [{ l: 'Yield', v: '4.5% APY' }, { l: 'Liquidity', v: 'Same day' }, { l: 'Tier-1 risk', v: 'Rate compression' }] }
  ],

  // Banking accounts
  bankAccounts: [
    { id: 'primary', name: 'Operating · Primary', type: 'Checking', balance: 64280, last4: '••8412', routing: '••4412', status: 'Active', primary: true,
      purpose: 'Deposits land here first', operatorReserve: 'Available', source: 'noodleflow', apy: null },
    { id: 'reserve', name: 'Reserves Holding', type: 'Sub-account', balance: 18260, last4: '••8413', routing: '••4412', status: 'Active',
      purpose: 'Logical reserve mirror', operatorReserve: 'All reserves', source: 'noodleflow', apy: null },
    { id: 'tax', name: 'Taxes', type: 'Sub-account', balance: 9420, last4: '••8414', routing: '••4412', status: 'Active',
      purpose: 'Auto-filled per deposit', operatorReserve: 'Taxes', source: 'noodleflow', apy: null },
    { id: 'payroll', name: 'Payroll', type: 'Sub-account', balance: 11600, last4: '••8415', routing: '••4412', status: 'Active',
      purpose: 'Apr 30 run · protected', operatorReserve: 'Payroll', source: 'noodleflow', apy: null },
    { id: 'yield', name: 'Yield Reserve', type: 'Money market', balance: 4800, last4: '••8416', routing: '——', status: 'Active',
      purpose: 'Surplus · earns yield', operatorReserve: 'Seasonal Buffer', source: 'noodleflow', apy: '4.5%' },
    { id: 'external-chase', name: 'Chase Business Checking', type: 'External · Plaid', balance: 12400, last4: '••8821', routing: 'Plaid sync', status: 'Synced',
      purpose: 'Legacy account · read-only', operatorReserve: '—', source: 'external', apy: null, externalBank: 'Chase' }
  ],

  // Cards
  cards: [
    { id: 'c1', name: 'Marketing — Bright Market', holder: 'M. Ridge',  last4: '0942', limit: 12000, spent: 8420, type: 'Virtual · USD', controls: ['Category lock · Marketing', 'Daily cap $1,500'], status: 'Active' },
    { id: 'c2', name: 'Operations',                holder: 'M. Ridge',  last4: '1188', limit: 6000,  spent: 1130, type: 'Physical · USD', controls: ['No restrictions'], status: 'Active' },
    { id: 'c3', name: 'AWS · Subscriptions',       holder: 'Automation', last4: '4477', limit: 1500,  spent: 286,  type: 'Virtual · SaaS', controls: ['Merchant lock · 6 vendors', 'No cash'], status: 'Active' }
  ],

  // Activity
  activity: [
    { date: 'Apr 18', merchant: 'Shopify payout',         category: 'Revenue · Shopify',  amount: 8400,  in: true,  receipt: 'matched' },
    { date: 'Apr 18', merchant: 'Bright Market Agency',   category: 'Marketing',         amount: 1450,  in: false, receipt: 'matched' },
    { date: 'Apr 17', merchant: 'Amazon settlement',      category: 'Revenue · Amazon',  amount: 14200, in: true,  receipt: 'na' },
    { date: 'Apr 17', merchant: 'AWS',                    category: 'SaaS',              amount: 286.10,in: false, receipt: 'matched' },
    { date: 'Apr 16', merchant: 'Whole Foods Market',     category: 'Office · Snacks',   amount: 78.40, in: false, receipt: 'matched' },
    { date: 'Apr 15', merchant: 'Unknown — Chase debit',  category: 'Uncategorized',     amount: 84.20, in: false, receipt: 'missing' },
    { date: 'Apr 14', merchant: 'Northline Packaging',    category: 'Inventory',         amount: 4280,  in: false, receipt: 'matched' }
  ],

  // Ask AI suggested questions
  askQuestions: [
    { cat: 'Try asking', items: [
      'What can I safely spend this week?',
      'Which partners should be paid today?',
      'Why is inventory tight?',
      'How much of Amazon goes to taxes?',
      'What if I delay the payroll bonus?'
    ]},
    { cat: 'Best for', items: [
      'Why a number changed',
      'Complex what-if reasoning',
      'Nuanced operator questions'
    ]}
  ],

  // Sample products for NoodleFlow Links creation (also used in Simulate)
  products: [
    { id: 'p1', sku: 'NF-RIDGE-01', name: 'Ridgefield 5 oz',  price: 28,  stock: 142, sources: ['shopify', 'amazon', 'links', 'square'] },
    { id: 'p2', sku: 'NF-PACK-02',  name: 'Ridge Pack 4ct',   price: 92,  stock: 38,  sources: ['shopify', 'amazon', 'links', 'wholesale'] },
    { id: 'p3', sku: 'NF-LABEL-03', name: 'Label upgrade',    price: 6,   stock: 412, sources: ['shopify', 'links', 'square'] },
    { id: 'p4', sku: 'NF-BUNDLE-01',name: 'Seasonal bundle',  price: 124, stock: 22,  sources: ['amazon', 'links', 'wholesale'] }
  ],

  // POS / channel sources for Simulate product picker
  posSources: [
    { id: 'shopify', name: 'Shopify',       type: 'Commerce', lastSync: '2 min ago',  weekGross: 24200, allocPct: 0.49, productIds: ['p1', 'p2', 'p3'] },
    { id: 'amazon',  name: 'Amazon Seller', type: 'Commerce', lastSync: '18 min ago', weekGross: 18800, allocPct: 0.38, productIds: ['p1', 'p2', 'p4'] }
  ],

  // Flat reserve balances for Simulate impact table
  reserveBalances: {
    available:   { name: 'Available',        group: 'Operating',  before: 42380 },
    inventory:   { name: 'Inventory',        group: 'Operating',  before: 15200 },
    partners:    { name: 'Partners',         group: 'Operating',  before: 13540 },
    commissions: { name: 'Commissions',      group: 'Operating',  before: 2480 },
    payroll:     { name: 'Payroll',          group: 'Protected',  before: 11600 },
    taxes:       { name: 'Taxes',            group: 'Protected',  before: 9420 },
    buffer:      { name: 'Seasonal Buffer',  group: 'Savings',    before: 4800 }
  }
};
