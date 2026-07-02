// banking.jsx — Banking module (Accounts / Allocations / Payments / Vendors)
// Client-reviewed structure. SubTabs mirror + drive the route.

const BK_TABS = [
  { key: 'bk-accounts',    label: 'Accounts' },
  { key: 'bk-allocations', label: 'Allocations' },
  { key: 'bk-payments',    label: 'Payments' },
  { key: 'bk-vendors',     label: 'Vendors' }
];

// ---------- ACCOUNTS ----------
const BankingAccounts = () => {
  const cards = [
    { lbl: 'Available', val: '$84,200', note: 'Ready to deploy', sub: 'Hero metric', accent: 'var(--accent)', hero: true },
    { lbl: 'Protected', val: '$84,200', note: 'Allocated & reserved', sub: 'Payroll, inventory, taxes', accent: 'var(--ok)' },
    { lbl: 'Committed', val: '$38,400', note: 'Scheduled to leave', sub: 'Next 14 days', accent: 'var(--warn)' }
  ];
  const accounts = [
    { name: 'Chase Business Checking', tail: '···4821', role: 'Primary', amt: '$122,600' },
    { name: 'Mercury Operating', tail: '···9104', role: 'Operating', amt: '$44,200' }
  ];
  return (
    <div className="col gap-6">
      <SectionHead title="Where your money lives" sub="You don't need to understand virtual accounts or ledgers — just what's available." />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {cards.map((c, i) => (
          <div key={i} className="metric metric-accent" style={{ '--cc-accent': c.accent }}>
            {c.hero && <span className="hero-badge">Hero</span>}
            <div className="lbl">{c.lbl}</div>
            <div className="val">{c.val}</div>
            <div className="sub-note up" style={c.lbl === 'Protected' ? { color: 'var(--ok)' } : c.lbl === 'Committed' ? { color: 'var(--warn)' } : {}}>{c.note}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </section>

      <div className="list-card">
        <h3>Connected Accounts</h3>
        {accounts.map((a, i) => (
          <div key={i} className="lc-row">
            <span className="lc-ico"><Icon name="accounts" size={16} /></span>
            <div className="lc-main">
              <div className="lc-name">{a.name} {a.tail}</div>
              <div className="lc-sub">{a.role}</div>
            </div>
            <span className="lc-amt">{a.amt}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- ALLOCATIONS ----------
const BankingAllocations = () => {
  const [open, setOpen] = useState(null);
  const allocs = [
    { name: 'Payroll Reserve',   pct: 34, amt: '$28,400', color: 'var(--accent)',
      rule: 'Maintain 1.5 payroll cycles in reserve. Funded 12% of each deposit · next run Jun 30.' },
    { name: 'Inventory Reserve', pct: 22, amt: '$18,200', color: 'var(--ok)',
      rule: 'Reserve reorder cash when coverage drops below 21 days. Funded 8% of sales.' },
    { name: 'Tax Reserve',       pct: 15, amt: '$12,800', color: 'var(--warn)',
      rule: 'Auto-hold 8.5% of every deposit for quarterly tax obligations.' },
    { name: 'Marketing Budget',  pct: 11, amt: '$9,600',  color: 'var(--c-violet)',
      rule: 'Fixed monthly allocation. Scales +10%/week while ROAS exceeds target.' },
    { name: 'Growth Reserve',    pct: 18, amt: '$15,200', color: 'var(--c-cyan)',
      rule: 'Surplus above operating needs is swept here weekly for deployment.' }
  ];
  return (
    <div className="col gap-6">
      <SectionHead title="How money is protected" sub="Expand any allocation to see its rules and logic." />
      <div className="alloc-grid">
        <div className="alloc-card">
          <div className="alloc-bar">
            {allocs.map((a, i) => <i key={i} style={{ width: a.pct + '%', background: a.color }} />)}
          </div>
          {allocs.map((a, i) => (
            <div key={i} className={`alloc-item ${open === i ? 'open' : ''}`}>
              <div className="alloc-row" onClick={() => setOpen(open === i ? null : i)}>
                <span className="sw" style={{ background: a.color }} />
                <span className="a-name">{a.name}</span>
                <span className="a-pct">{a.pct}%</span>
                <span className="a-amt">{a.amt}</span>
                <span className="a-caret">{open === i ? '▾' : '▸'}</span>
              </div>
              {open === i && (
                <div className="alloc-detail">
                  <span className="ad-lbl">Underlying rule</span>
                  <span className="ad-rule">{a.rule}</span>
                </div>
              )}
            </div>
          ))}
          <div className="alloc-total">
            <span className="t-lbl">Total Protected</span>
            <span className="t-val">$84,200</span>
          </div>
        </div>

        <InsightCard
          id="alloc-payroll" tone="danger" category="Payroll" status="Needs Action"
          statement="Payroll reserve buffer is at 0.8 cycles — below the 1.5-cycle minimum."
          recommendation="Increase payroll reserve by $14,400 before next payroll date."
          rule="Maintain 1.5 payroll cycles in reserve."
          actions={[{ label: 'Add to Reserve' }, { label: 'View Payroll Schedule' }]} />
      </div>
    </div>
  );
};

// ---------- PAYMENTS ----------
const BankingPayments = () => {
  const payments = [
    { name: 'Apex Supplies Co.', due: 'Due Jun 18', amt: '$4,200' },
    { name: 'Pacific Freight LLC', due: 'Due Jun 14', amt: '$1,850', early: true },
    { name: 'Merrill Packaging', due: 'Due Jun 22', amt: '$3,100' },
    { name: 'StoragePro', due: 'Due Jun 12', amt: '$980', early: true },
    { name: 'TechBridge SaaS', due: 'Due Jun 30', amt: '$2,400' }
  ];
  return (
    <div className="col gap-6">
      <SectionHead title="How money leaves" sub="AI recommends optimal payment timing to preserve liquidity." />
      <InsightCard
        id="pay-duedate" tone="warn" category="Payments" status="Watch"
        statement="Vendor payments are being made 12 days early — consistently, every month."
        recommendation="Shift to due-date payments. Preserve ~$18,000 average monthly liquidity."
        rule="Shift vendor payments to their due date to preserve liquidity."
        actions={[{ label: 'Apply Rule' }, { label: 'Review Schedule' }]} />

      <div className="list-card">
        <h3>Scheduled Payments</h3>
        {payments.map((p, i) => (
          <div key={i} className="lc-row">
            <div className="lc-main">
              <div className="lc-name">{p.name}</div>
              <div className="lc-sub">{p.due}</div>
            </div>
            <div className="lc-right">
              {p.early && <span className="early-pill">Early</span>}
              <span className="lc-amt">{p.amt}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- VENDORS ----------
const BankingVendors = () => {
  const vendors = [
    { name: 'Apex Supplies Co.', next: 'Next payment: Jun 18 · $4,200' },
    { name: 'Pacific Freight LLC', next: 'Next payment: Jun 14 · $1,850', discount: true },
    { name: 'Merrill Packaging', next: 'Next payment: Jun 22 · $3,100' },
    { name: 'StoragePro', next: 'Next payment: Jun 12 · $980', discount: true },
    { name: 'TechBridge SaaS', next: 'Next payment: Jun 30 · $2,400' }
  ];
  return (
    <div className="col gap-6">
      <SectionHead title="Who gets paid" sub="Vendor performance, payment history, and consolidation opportunities." />
      <div className="list-card">
        {vendors.map((v, i) => (
          <div key={i} className="lc-row">
            <span className="lc-ico"><Icon name="spend" size={16} /></span>
            <div className="lc-main">
              <div className="lc-name">{v.name}</div>
              <div className="lc-sub">{v.next}</div>
            </div>
            <div className="lc-actions">
              {v.discount && <button className="btn btn-sm btn-discount">Request Discount</button>}
              <button className="btn btn-ghost btn-sm">View History</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- MODULE SHELL ----------
const Banking = ({ route, setRoute }) => {
  const tab = BK_TABS.some(t => t.key === route) ? route : 'bk-accounts';
  const View = {
    'bk-accounts': BankingAccounts,
    'bk-allocations': BankingAllocations,
    'bk-payments': BankingPayments,
    'bk-vendors': BankingVendors
  }[tab] || BankingAccounts;
  return (
    <div className="col gap-6 fade-in">
      <SubTabs items={BK_TABS} active={tab} onChange={setRoute} />
      <View />
    </div>
  );
};

window.Banking = Banking;
