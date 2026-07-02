// operator.jsx — Operator module (Run / Plan / Grow / Analyze)
// Built to the product-feedback doc: Insight → Recommendation → Action → Rule,
// progressive disclosure, and Grow as a revenue differentiator.

const OP_TABS = [
  { key: 'run',     label: 'Run' },
  { key: 'plan',    label: 'Plan' },
  { key: 'grow',    label: 'Grow' },
  { key: 'analyze', label: 'Analyze' }
];

// ---------- RUN ----------
const OperatorRun = () => {
  const stats = [
    { lbl: 'Cash Available', val: '$84,200', note: 'Available to deploy', noteCls: 'up', accent: 'var(--accent)' },
    { lbl: 'Upcoming Expenses', val: '$38,400', note: '3 items need attention', noteCls: 'warn', accent: 'var(--warn)' },
    { lbl: 'Inventory Coverage', val: '14 days', note: 'Below 21-day threshold', noteCls: 'danger', accent: 'var(--danger)' },
    { lbl: 'Profit This Month', val: '$22,100', note: '↑ On target', noteCls: 'up', accent: 'var(--ok)' }
  ];
  return (
    <div className="col gap-6">
      <SectionHead title="Today's operations" sub="What needs attention right now." />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {stats.map((s, i) => (
          <div key={i} className="metric metric-accent" style={{ '--cc-accent': s.accent }}>
            <div className="lbl">{s.lbl}</div>
            <div className="val">{s.val}</div>
            <div className={`sub-note ${s.noteCls}`}>{s.note}</div>
          </div>
        ))}
      </section>

      <SectionHead title="Insights &amp; recommendations" sub="Every card includes a recommendation, a next action, and an optional rule." />
      <div className="col gap-4">
        <InsightCard
          id="run-inventory" tone="warn" category="Inventory" status="Watch"
          statement="Inventory projected to run out in 14 days based on current sales velocity."
          recommendation="Reserve $8,200 for reorder before stock depletes."
          rule="Always reserve inventory cash when coverage drops below 21 days."
          actions={[{ label: 'Reserve Funds' }, { label: 'Create Purchase Order' }]} />
        <InsightCard
          id="run-cashflow" tone="ok" category="Cash Flow" status="Opportunity"
          statement="Operating cash is 18% above 90-day average. No immediate action needed."
          recommendation="Consider moving $12,000 to your growth reserve while conditions hold."
          rule="Sweep operating cash above the 90-day average into Growth Reserve."
          actions={[{ label: 'Move to Reserve' }, { label: 'Review Allocations' }]} />
      </div>
    </div>
  );
};

// ---------- PLAN ----------
const OperatorPlan = () => {
  const recs = [
    { title: 'Increase Product A pricing by 4%', impact: 'Est. impact: +$2,100/mo', action: 'Build Scenario' },
    { title: 'Reduce Vendor B spend by renegotiating terms', impact: 'Est. impact: +$1,400/mo', action: 'Review Contract' },
    { title: 'Adjust inventory reorder cadence to bi-weekly', impact: 'Est. impact: +$800/mo', action: 'Update Schedule' }
  ];
  const autos = useAutomations();
  const planAuto = autos.some(a => a.id === 'plan-goal');
  const toggleRule = () => NFStore.toggle({
    id: 'plan-goal', category: 'Plan', area: 'Plan',
    rule: 'Apply pricing & vendor optimizations automatically while goal is active.',
    statement: 'Goal: increase monthly profit by $5,000 by July 31.'
  });
  return (
    <div className="col gap-6">
      <SectionHead title="Planning &amp; Forecasting" sub="Budgeting, forecasting, scenario planning, and goal tracking." />
      <div className="card" style={{ padding: '22px 24px' }}>
        <div className="plan-goal">
          <div className="pg-lbl">Active Goal</div>
          <div className="pg-title">Increase monthly profit by $5,000 by July 31</div>
        </div>
        <div className="plan-list-lbl">AI Recommendations</div>
        {recs.map((r, i) => (
          <div key={i} className="plan-rec-row">
            <div>
              <div className="pr-title">{r.title}</div>
              <div className="pr-impact">{r.impact}</div>
            </div>
            <button className="btn btn-ghost btn-sm">{r.action}</button>
          </div>
        ))}
        <div className="plan-foot">
          <button className="btn btn-primary btn-sm"><Icon name="check" size={12} /> Apply Recommendations</button>
          <button className="btn btn-ghost btn-sm">Build Scenario</button>
          <span className="spacer" />
          <button className={`ic-automate ${planAuto ? 'is-on' : ''}`} onClick={toggleRule}>
            <Icon name={planAuto ? 'check' : 'bolt'} size={12} /> {planAuto ? 'Rule active' : 'Create Automation Rule'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- GROW ----------
const GROW_TOOLS = [
  { key: 'link',     icon: 'link',     label: 'Payment Link',  sub: 'Shareable checkout URL' },
  { key: 'checkout', icon: 'receipt',  label: 'Checkout Page', sub: 'Hosted product page' },
  { key: 'qr',       icon: 'qr',       label: 'QR Code',       sub: 'Scan to pay, in-person' },
  { key: 'campaign', icon: 'ask',      label: 'Email + SMS',   sub: 'One-tap campaigns' }
];

const GrowPreview = ({ tool }) => {
  if (tool === 'campaign') {
    return (
      <div className="link-preview" style={{ alignItems: 'stretch', textAlign: 'left' }}>
        <div className="lp-title" style={{ textAlign: 'left' }}>Promotion campaign · Ridgefield 5 oz</div>
        <div className="grow-msg">
          <div className="grow-msg-lbl">Email subject</div>
          <div className="grow-msg-body">Back in focus: 15% off Ridgefield 5 oz this week only</div>
        </div>
        <div className="grow-msg">
          <div className="grow-msg-lbl">SMS</div>
          <div className="grow-msg-body">Ridgefield 5 oz is back — 15% off ends Sunday. Tap to shop: nflo.co/r5</div>
        </div>
        <div className="lp-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn btn-primary btn-sm"><Icon name="ask" size={13} /> Send campaign</button>
          <button className="btn btn-ghost btn-sm">Edit</button>
        </div>
      </div>
    );
  }
  const map = {
    link: { url: 'noodleflow.co/r/ridge5oz', title: 'Ridgefield 5 oz', desc: 'Shareable payment link. Funds auto-allocate to your reserves on every sale.' },
    checkout: { url: 'noodleflow.co/c/ridge5oz', title: 'Checkout · Ridgefield 5 oz', desc: 'Hosted checkout page with upsells. Live in seconds, no code.' },
    qr: { url: 'noodleflow.co/r/ridge5oz', title: 'Scan to pay · Ridgefield 5 oz', desc: 'Printable QR for markets and pop-ups. Tracks back to this product.' }
  };
  const p = map[tool] || map.link;
  return (
    <div className="link-preview">
      <div className="qr"><div className="qr-inner"><Icon name="qr" size={36} /></div></div>
      <div className="url">{p.url}</div>
      <div className="lp-title">{p.title}</div>
      <div className="lp-desc">{p.desc}</div>
      <div className="lp-actions">
        <button className="btn btn-primary btn-sm"><Icon name="link" size={13} /> Copy link</button>
        <button className="btn btn-ghost btn-sm"><Icon name="download" size={13} /> {tool === 'qr' ? 'Download QR' : 'Share'}</button>
      </div>
    </div>
  );
};

const OperatorGrow = () => {
  const [tool, setTool] = useState('link');
  const channels = [
    { name: 'Shopify',   bar: 100, amt: '$88,400', delta: '+8%',  dir: 'up' },
    { name: 'Amazon',    bar: 42,  amt: '$32,100', delta: '−3%',  dir: 'down' },
    { name: 'Wholesale', bar: 28,  amt: '$22,300', delta: '+21%', dir: 'up' }
  ];
  return (
    <div className="col gap-6">
      <SectionHead title="Revenue &amp; Growth" sub="NoodleFlow-powered tools to generate more revenue." />
      <InsightCard
        tone="danger" category="Products" status="Needs Action"
        statement="Revenue for Product A declined 18% over the past 30 days."
        recommendation="Create a targeted promotion campaign to recover lost volume."
        actions={[{ label: 'Generate Payment Link' }, { label: 'Email Campaign' }, { label: 'SMS Campaign' }]}
        automate={false} />
      <InsightCard
        id="grow-roas" tone="ok" category="Marketing" status="Opportunity"
        statement="Paid social ROAS is running 1.4× above target on the Ridgefield line."
        recommendation="Scale spend while efficiency holds — budget is the only constraint."
        rule="Increase marketing budget 10% weekly while ROAS exceeds target."
        actions={[{ label: 'Increase Budget' }, { label: 'View Campaign' }]} />

      <SectionHead title="Revenue tools" sub="Turn any product into a paid moment — instantly." />
      <div className="grow-tools">
        {GROW_TOOLS.map(t => (
          <button key={t.key} className={`grow-tool ${tool === t.key ? 'active' : ''}`} onClick={() => setTool(t.key)}>
            <span className="gt-ico"><Icon name={t.icon} size={18} /></span>
            <span className="gt-label">{t.label}</span>
            <span className="gt-sub">{t.sub}</span>
          </button>
        ))}
      </div>
      <div className="grow-preview-wrap">
        <GrowPreview tool={tool} />
      </div>

      <SectionHead title="Channel Performance" />
      <div className="card" style={{ padding: '8px 24px' }}>
        {channels.map((c, i) => (
          <div key={i} className="chan-row">
            <span className="chan-name">{c.name}</span>
            <span className="chan-track"><i style={{ width: c.bar + '%' }} /></span>
            <span className="chan-amt">{c.amt}</span>
            <span className={`chan-delta ${c.dir}`}>{c.delta}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- ANALYZE ----------
const OperatorAnalyze = () => {
  const skus = [
    { sku: 'SKU-113', margin: 68, bar: 100, pv: 'P:32% V:14%', lead: true },
    { sku: 'SKU-204', margin: 41, bar: 60,  pv: 'P:28% V:31%' },
    { sku: 'SKU-089', margin: 29, bar: 43,  pv: 'P:18% V:28%' },
    { sku: 'SKU-317', margin: 22, bar: 33,  pv: 'P:12% V:19%' },
    { sku: 'SKU-452', margin: 14, bar: 21,  pv: 'P:10% V:8%' }
  ];
  return (
    <div className="col gap-6">
      <SectionHead title="Performance Analysis" sub="Decision support — not just reporting." />
      <InsightCard
        id="analyze-sku113" tone="ok" category="Analysis" status="Opportunity"
        statement="SKU-113 generates 32% of total profit on just 14% of total volume."
        recommendation="Increase purchasing volume to capture more of this margin."
        rule="Flag and reserve cash for high-margin SKUs above 30% profit share."
        actions={[{ label: 'Adjust Inventory Plan' }, { label: 'Reserve Cash' }, { label: 'Notify Purchasing Team' }]} />

      <SectionHead title="SKU Profit Map" />
      <div className="card" style={{ padding: '8px 24px' }}>
        {skus.map((s, i) => (
          <div key={i} className="skumap-row">
            <span className="skumap-name">{s.sku}</span>
            <div className="skumap-mid">
              <div className="sm-lbl">Margin {s.margin}%</div>
              <div className={`skumap-track ${s.lead ? 'lead' : ''}`}><i style={{ width: s.bar + '%' }} /></div>
            </div>
            <span className="skumap-pv">{s.pv}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- MODULE SHELL ----------
const Operator = ({ route, setRoute }) => {
  const tab = OP_TABS.some(t => t.key === route) ? route : 'run';
  const view = { run: OperatorRun, plan: OperatorPlan, grow: OperatorGrow, analyze: OperatorAnalyze }[tab];
  const View = view || OperatorRun;
  return (
    <div className="col gap-6 fade-in">
      <SubTabs items={OP_TABS} active={tab} onChange={setRoute} />
      <View />
    </div>
  );
};

window.Operator = Operator;
