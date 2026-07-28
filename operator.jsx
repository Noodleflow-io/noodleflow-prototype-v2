// operator.jsx — Business module (Run / Plan / Grow / Insights)
// Insight → Recommendation → Action → Rule, now with explainability, inline
// editing, model-this previews, scenario builder, and full drill-downs.

const OP_TABS = [
  { key: 'run',     label: 'Run' },
  { key: 'plan',    label: 'Plan' },
  { key: 'grow',    label: 'Grow' },
  { key: 'analyze', label: 'Insights' }
];

// Small purchase-order flow (mock) so "Create Purchase Order" isn't a dead click.
const PurchaseOrderModal = ({ amount, onClose }) => {
  const [qty, setQty] = useState(600);
  return (
    <Modal title="Create purchase order" sub="SKU-113 · Ridgefield 5 oz · Apex Supplies Co." width={560} onClose={onClose}
      foot={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={() => { NFToast.show('PO drafted & sent to vendor', { icon: 'check' }); onClose(); }}>Generate & send PO</button>
      </>}>
      <div className="co-field" style={{ marginBottom: 14 }}>
        <label>Order quantity (units)</label>
        <InlineAmount value={qty} onChange={setQty} prefix="" suffix="u" step={50} width={80} />
      </div>
      <div className="nf-detail-grid">
        <div className="nf-detail-cell"><div className="l">Reserved from</div><div className="v" style={{ fontSize: 16 }}>{fmt$(amount)}</div><div className="s">Inventory Reserve</div></div>
        <div className="nf-detail-cell"><div className="l">Projected coverage</div><div className="v" style={{ fontSize: 16 }}>{14 + Math.round(qty / 27)} days</div><div className="s">Above 21-day threshold</div></div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12 }}>PO will be sent to the vendor and tracked (draft → sent → confirmed → shipped → received), then reconciled against the invoice on receipt.</div>
    </Modal>
  );
};

// Automation health summary (Engagement epic).
const AutomationHealth = () => {
  const autos = useAutomations();
  const saved = 3200 + autos.length * 1450;
  return (
    <div className="card" style={{ padding: '18px 22px' }}>
      <SectionHead title="Automation health" sub="What NoodleFlow is running for you right now." />
      <div className="auto-health" style={{ marginTop: 14 }}>
        <div className="auto-health-cell"><div className="l">Rules running</div><div className="v"><LiveValue value={String(autos.length)} /></div><div className="s">Active automations</div></div>
        <div className="auto-health-cell"><div className="l">Saved this month</div><div className="v"><LiveValue value={fmt$(saved)} /></div><div className="s">Vs. manual handling</div></div>
        <div className="auto-health-cell"><div className="l">Actions taken</div><div className="v">{7 + autos.length * 2}</div><div className="s">Without your input</div></div>
      </div>
    </div>
  );
};

// ---------- RUN ----------
const OperatorRun = ({ setRoute }) => {
  const cash = useCash();
  const [reserveAmt, setReserveAmt] = useState(8200);
  const [moveAmt, setMoveAmt] = useState(12000);
  const [poOpen, setPoOpen] = useState(false);
  const stats = [
    { lbl: 'Cash Available', val: fmt$(cash.available), note: 'Available to deploy', noteCls: 'up', accent: 'var(--accent)', info: true },
    { lbl: 'Upcoming Expenses', val: fmt$(cash.committed), note: '3 items need attention', noteCls: 'warn', accent: 'var(--warn)' },
    { lbl: 'Inventory Coverage', val: '14 days', note: 'Below 21-day threshold', noteCls: 'danger', accent: 'var(--danger)' },
    { lbl: 'Profit This Month', val: '$22,100', note: '↑ On target', noteCls: 'up', accent: 'var(--ok)' }
  ];
  return (
    <div className="col gap-6">
      <SectionHead title="Today's action queue" sub="The moves that need a decision right now. Business health lives on Command Center." />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {stats.map((s, i) => (
          <div key={i} className="metric metric-accent" style={{ '--cc-accent': s.accent }}>
            <div className="lbl">{s.lbl}{s.info && <CashInfo />}</div>
            <div className="val"><LiveValue value={s.val} /></div>
            <div className={`sub-note ${s.noteCls}`}>{s.note}</div>
          </div>
        ))}
      </section>

      <SectionHead title="Insights &amp; recommendations" sub="Every card explains itself, and amounts are editable before you commit." />
      <div className="col gap-4">
        <InsightCard
          id="run-inventory" tone="warn" category="Inventory" status="Watch" confidence="high"
          statement="Inventory projected to run out in 14 days based on current sales velocity."
          recommendation="Reserve for reorder before stock depletes."
          editable={{ value: reserveAmt, onChange: setReserveAmt, label: 'Reserve', step: 200, width: 74 }}
          rule="Always reserve inventory cash when coverage drops below 21 days."
          why={{ note: 'Triggered because projected coverage fell below your 21-day threshold.', rows: [
            { k: 'Sales velocity (30d avg)', v: '41 units/day' },
            { k: 'Units on hand', v: '574 units' },
            { k: 'Days of coverage', v: '14 days' },
            { k: 'Vendor lead time', v: '12 days' }
          ] }}
          model={{ title: 'Preview reorder size', unit: '%', presets: [{ label: '20%', factor: 20 }, { label: '50%', factor: 50 }, { label: '100%', factor: 100 }],
            compute: (p) => { const amt = Math.round(reserveAmt * p / 100); const cov = 14 + Math.round(p / 100 * 22); const prof = Math.round(p / 100 * 4200);
              return [{ l: 'Reserve', v: fmt$(amt) }, { l: 'Coverage', v: cov + 'd', d: cov >= 21 ? 'above threshold' : 'below', dir: cov >= 21 ? 'up' : 'down' }, { l: '60-day profit', v: fmt$(prof), dir: 'up' }]; } }}
          actions={[
            { label: 'Reserve ' + fmt$(reserveAmt), primary: true, onClick: () => NFToast.show(fmt$(reserveAmt) + ' reserved for inventory', { icon: 'check' }) },
            { label: 'Create Purchase Order', onClick: () => setPoOpen(true) }
          ]} />
        <InsightCard
          id="run-cashflow" tone="ok" category="Cash Flow" status="Opportunity" confidence="moderate"
          statement="Operating cash is 18% above 90-day average. No immediate action needed."
          recommendation="Consider moving cash to your growth reserve while conditions hold."
          editable={{ value: moveAmt, onChange: setMoveAmt, label: 'Move', step: 500, width: 80 }}
          rule="Sweep operating cash above the 90-day average into Growth Reserve."
          why={{ note: 'Surfaced because operating cash exceeded its 90-day average band.', rows: [
            { k: '90-day average balance', v: '$71,300' },
            { k: 'Current operating cash', v: '$84,100' },
            { k: 'Surplus above average', v: '+18%' }
          ] }}
          actions={[
            { label: 'Move ' + fmt$(moveAmt) + ' to Reserve', primary: true, onClick: () => NFToast.show(fmt$(moveAmt) + ' moved to Growth Reserve', { icon: 'check' }) },
            { label: 'Review Reserves', onClick: () => setRoute('bk-allocations') }
          ]} />
      </div>

      <AutomationHealth />
      {poOpen && <PurchaseOrderModal amount={reserveAmt} onClose={() => setPoOpen(false)} />}
    </div>
  );
};

// ---------- PLAN ----------
const OperatorPlan = ({ setRoute }) => {
  const scenarios = useScenarios();
  const activeScns = scenarios.filter(s => s.active);
  const [scnOpen, setScnOpen] = useState(false);
  const [seed, setSeed] = useState(null);
  const [compare, setCompare] = useState(false);
  const recs = [
    { title: 'Add a new product line', impact: 'Model upfront cost, bucket & tax impact', seed: { mode: 'product' } },
    { title: 'Reorder SKU-113 (Ridgefield 5 oz)', impact: 'SKU-level coverage & contribution profit', seed: { mode: 'reorder' } },
    { title: 'Increase Ridgefield 5 oz price by 4%', impact: 'Est. impact: +$2,100/mo', seed: { mode: 'pricing', price: 4, reorder: 100, adspend: 4000, timing: 8 } }
  ];
  const autos = useAutomations();
  const planAuto = autos.some(a => a.id === 'plan-goal');
  const toggleRule = () => { if (!planAuto) NFToast.show('Goal automation active', { icon: 'bolt', tone: 'accent' }); NFStore.toggle({
    id: 'plan-goal', category: 'Plan', area: 'Plan',
    rule: 'Apply pricing & vendor optimizations automatically while goal is active.',
    statement: 'Goal: increase monthly profit by $5,000 by July 31.' }); };
  const openBuilder = (s) => { setSeed(s || null); setCompare(false); setScnOpen(true); };
  const openCompare = () => { setSeed(null); setCompare(true); setScnOpen(true); };
  return (
    <div className="col gap-6">
      <SectionHead title="Planning &amp; Forecasting" sub="Model assumptions, compare scenarios, and activate a plan against your goal." />
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
            <button className="btn btn-ghost btn-sm" onClick={() => openBuilder(r.seed)}>Model scenario</button>
          </div>
        ))}
        <div className="plan-foot">
          <button className="btn btn-primary btn-sm" onClick={() => NFToast.show('3 recommendations applied', { icon: 'check' })}><Icon name="check" size={12} /> Apply Recommendations</button>
          <button className="btn btn-ghost btn-sm" onClick={() => openBuilder()}><Icon name="plan" size={12} /> Build Scenario</button>
          {scenarios.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={openCompare}><Icon name="activity" size={12} /> Compare scenarios ({scenarios.length})</button>
          )}
          <span className="spacer" />
          <button className={`ic-automate ${planAuto ? 'is-on' : ''}`} onClick={toggleRule}>
            <Icon name={planAuto ? 'check' : 'bolt'} size={12} /> {planAuto ? 'Rule active' : 'Create Automation Rule'}
          </button>
        </div>
      </div>

      {activeScns.length > 0 && (
        <div className="card" style={{ padding: '20px 24px' }}>
          <SectionHead title="Actual vs. projected" sub="Tracking activated scenarios against their original projection." />
          <div className="col gap-2" style={{ marginTop: 12 }}>
            {activeScns.map(s => {
              const days = Math.max(1, Math.round((Date.now() - (s.activatedAt || Date.now())) / 86400000));
              const actual = Math.round(s.outcome.profit * (days >= 7 ? 0.94 : 0.4));
              const pct = Math.round((actual / s.outcome.profit) * 100);
              return (
                <div key={s.id} className="scn-saved-row">
                  <span className="sn">{s.name}</span>
                  <span className="sv">Projected {fmt$(s.outcome.profit)}</span>
                  <span className="sv" style={{ color: 'var(--ok)' }}>Actual {fmt$(actual)} ({pct}%)</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{days >= 7 ? days + 'd tracked' : 'needs 7d'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {scnOpen && <ScenarioBuilder seed={seed} startCompare={compare} onClose={() => setScnOpen(false)} />}
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

const GrowPreview = ({ tool, onCustomize }) => {
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
          <button className="btn btn-primary btn-sm" onClick={() => NFToast.show('Campaign scheduled', { icon: 'check' })}><Icon name="ask" size={13} /> Send campaign</button>
          <button className="btn btn-ghost btn-sm" onClick={onCustomize}>Edit</button>
        </div>
      </div>
    );
  }
  const map = {
    link: { url: 'noodleflow.co/r/ridge5oz', title: 'Ridgefield 5 oz', desc: 'Shareable payment link. Customize branding, checkout fields, and the reserve it funds.' },
    checkout: { url: 'noodleflow.co/c/ridge5oz', title: 'Checkout · Ridgefield 5 oz', desc: 'Hosted checkout page with upsells. Fully brandable — live in seconds, no code.' },
    qr: { url: 'noodleflow.co/r/ridge5oz', title: 'Scan to pay · Ridgefield 5 oz', desc: 'Printable QR for markets and pop-ups. Tracks back to this product and campaign.' }
  };
  const p = map[tool] || map.link;
  return (
    <div className="link-preview">
      <div className="qr"><div className="qr-inner"><Icon name="qr" size={36} /></div></div>
      <div className="url">{p.url}</div>
      <div className="lp-title">{p.title}</div>
      <div className="lp-desc">{p.desc}</div>
      <div className="lp-actions">
        <button className="btn btn-primary btn-sm" onClick={onCustomize}><Icon name="settings" size={13} /> Customize</button>
        <button className="btn btn-ghost btn-sm" onClick={() => NFToast.show('Link copied', { icon: 'link' })}><Icon name={tool === 'qr' ? 'download' : 'link'} size={13} /> {tool === 'qr' ? 'Download QR' : 'Copy link'}</button>
      </div>
    </div>
  );
};

const ChannelRow = ({ c, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <div className="chan-row row-clickable" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ position: 'relative' }}>
      <span className="chan-name">{c.name}</span>
      <span className="chan-track" style={{ position: 'relative' }}>
        <i style={{ width: c.bar + '%' }} />
        {hover && <span className="nf-bar-tip">{c.amt} · {c.delta} MoM · {c.orders} orders</span>}
      </span>
      <span className="chan-amt">{c.amt}</span>
      <span className={`chan-delta ${c.dir}`}>{c.delta}</span>
    </div>
  );
};

const OperatorGrow = ({ setRoute }) => {
  const [tool, setTool] = useState('link');
  const [coOpen, setCoOpen] = useState(false);
  const [chan, setChan] = useState(null);
  const [budget, setBudget] = useState(2400);
  const channels = [
    { name: 'Shopify',   bar: 100, amt: '$88,400', delta: '+8%',  dir: 'up', orders: 1284 },
    { name: 'Amazon',    bar: 42,  amt: '$32,100', delta: '−3%',  dir: 'down', orders: 612 },
    { name: 'Wholesale', bar: 28,  amt: '$22,300', delta: '+21%', dir: 'up', orders: 47 }
  ];
  return (
    <div className="col gap-6">
      <SectionHead title="Revenue &amp; Growth" sub="NoodleFlow-powered tools to generate more revenue." />
      <InsightCard
        tone="danger" category="Products" status="Needs Action" confidence="moderate"
        statement="Revenue for Product A declined 18% over the past 30 days."
        recommendation="Create a targeted promotion campaign to recover lost volume."
        why={{ note: 'Flagged after a sustained 30-day decline exceeding 15%.', rows: [
          { k: '30-day revenue', v: '$14,100' }, { k: 'Prior 30-day', v: '$17,200' }, { k: 'Change', v: '−18%' } ] }}
        actions={[
          { label: 'Generate Payment Link', primary: true, onClick: () => { setTool('link'); setCoOpen(true); } },
          { label: 'Email Campaign', onClick: () => { setTool('campaign'); NFToast.show('Email campaign drafted', { icon: 'check' }); } },
          { label: 'SMS Campaign', onClick: () => { setTool('campaign'); NFToast.show('SMS campaign drafted', { icon: 'check' }); } }
        ]}
        automate={false} />
      <InsightCard
        id="grow-roas" tone="ok" category="Marketing" status="Opportunity" confidence="high"
        statement="Paid social ROAS is running 1.4× above target on the Ridgefield line."
        recommendation="Scale weekly budget while efficiency holds."
        editable={{ value: budget, onChange: setBudget, label: 'Weekly +', step: 200, width: 74 }}
        rule="Increase marketing budget 10% weekly while ROAS exceeds target."
        why={{ note: 'ROAS has held above target for 3 consecutive weeks.', rows: [
          { k: 'Current ROAS', v: '3.9×' }, { k: 'Target ROAS', v: '2.8×' }, { k: 'Headroom', v: '+40%' } ] }}
        model={{ title: 'Preview budget increase', unit: '%', presets: [{ label: '+10%', factor: 10 }, { label: '+25%', factor: 25 }, { label: '+50%', factor: 50 }],
          compute: (p) => { const add = Math.round(budget * p / 100); const rev = Math.round(add * 3.9); return [{ l: 'Extra spend', v: fmt$(add) }, { l: 'Proj. revenue', v: fmt$(rev), dir: 'up' }, { l: 'Proj. ROAS', v: (3.9 - p / 100 * 0.6).toFixed(1) + '×' }]; } }}
        actions={[
          { label: 'Increase Budget', primary: true, onClick: () => NFToast.show('Budget raised by ' + fmt$(budget) + '/wk', { icon: 'check' }) },
          { label: 'View Campaign', onClick: () => NFToast.show('Opening campaign…') }
        ]} />

      <SectionHead title="Revenue tools" sub="Turn any product into a branded paid moment — instantly." />
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
        <GrowPreview tool={tool} onCustomize={() => setCoOpen(true)} />
      </div>

      <SectionHead title="Channel Performance" sub="Click any channel for trend and top products." />
      <div className="card" style={{ padding: '8px 24px' }}>
        {channels.map((c, i) => <ChannelRow key={i} c={c} onClick={() => setChan(c)} />)}
      </div>

      {coOpen && <CheckoutBuilder tool={tool} onClose={() => setCoOpen(false)} />}
      {chan && <ChannelDetail channel={chan} onClose={() => setChan(null)} />}
    </div>
  );
};

// ---------- INSIGHTS (formerly Analyze) ----------
const SkuRow = ({ s, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <div className="skumap-row row-clickable" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <span className="skumap-name">{s.sku}</span>
      <div className="skumap-mid">
        <div className="sm-lbl" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Margin {s.margin}% <span className={`sku-tag ${s.tag}`}>{s.tagLabel}</span></div>
        <div className={`skumap-track ${s.tag === 'engine' ? 'lead' : ''}`} style={{ position: 'relative' }}>
          <i style={{ width: s.bar + '%' }} />
          {hover && <span className="nf-bar-tip">P {s.profitShare}% · V {s.volShare}% · {s.doi}d cover · {fmt$(s.contribution)} contrib</span>}
        </div>
      </div>
      <div className="skumap-extra">
        <span className="skumap-spark"><Sparkline points={s.trend['30']} color="var(--text-3)" w={64} h={26} /></span>
        <Icon name="arrow_right" size={14} color="var(--text-3)" />
      </div>
    </div>
  );
};

const OperatorAnalyze = ({ setRoute }) => {
  const [detail, setDetail] = useState(null);
  const [sort, setSort] = useState('margin');
  const [filter, setFilter] = useState('all');
  const [amt, setAmt] = useState(8400);
  let skus = [...NF_SKUS];
  if (filter === 'risk') skus = skus.filter(s => s.tag === 'risk' || s.tag === 'losing');
  if (filter === 'winners') skus = skus.filter(s => s.tag === 'engine' || s.tag === 'opportunity');
  skus.sort((a, b) => sort === 'margin' ? b.margin - a.margin : sort === 'profit' ? b.profitShare - a.profitShare : b.volShare - a.volShare);
  return (
    <div className="col gap-6">
      <SectionHead title="Performance Insights" sub="Decision support — not just reporting." />
      <InsightCard
        id="analyze-sku113" tone="ok" category="Analysis" status="Opportunity" confidence="high"
        statement="SKU-113 is your most profitable product but you're underinvesting in it. It produces 32% of profit from 14% of volume, and at current sales rate you'll stock out in 19 days."
        recommendation="Order additional units to capture more of this margin before stockout."
        editable={{ value: amt, onChange: setAmt, label: 'Reserve', step: 200, width: 74 }}
        rule="Flag and reserve cash for high-margin SKUs above 30% profit share."
        why={{ note: 'SKU-113 exceeds the 30% profit-share threshold with high stockout risk.', rows: [
          { k: 'Profit share', v: '32%' }, { k: 'Volume share', v: '14%' }, { k: 'Days to stockout', v: '19 days' }, { k: 'Proj. 60-day contribution', v: '$18,400' } ] }}
        model={{ title: 'Preview reorder', unit: '%', presets: [{ label: '20%', factor: 20 }, { label: '50%', factor: 50 }, { label: '100%', factor: 100 }],
          compute: (p) => { const units = Math.round(600 * p / 100); const prof = Math.round(18400 * p / 100); return [{ l: 'Units', v: units + 'u' }, { l: '60-day profit', v: fmt$(prof), dir: 'up' }, { l: 'Cash kept free', v: fmt$(44200 - Math.round(amt * p / 100)) }]; } }}
        actions={[
          { label: 'Adjust Inventory Plan', primary: true, onClick: () => NFToast.show('Inventory plan updated', { icon: 'check' }) },
          { label: 'Reserve ' + fmt$(amt), onClick: () => NFToast.show(fmt$(amt) + ' reserved') },
          { label: 'Notify Purchasing Team', onClick: () => NFToast.show('Purchasing team notified') }
        ]} />

      <SectionHead title="SKU Profit Map" sub="Click any SKU for the full detail view." right={
        <div className="nf-toolbar">
          <div className="seg">
            {[['margin', 'Margin'], ['profit', 'Profit'], ['volume', 'Volume']].map(o => (
              <button key={o[0]} className={sort === o[0] ? 'on' : ''} onClick={() => setSort(o[0])}>{o[1]}</button>
            ))}
          </div>
          <div className="seg">
            {[['all', 'All'], ['winners', 'Winners'], ['risk', 'At risk']].map(o => (
              <button key={o[0]} className={filter === o[0] ? 'on' : ''} onClick={() => setFilter(o[0])}>{o[1]}</button>
            ))}
          </div>
        </div>
      } />
      <div className="card" style={{ padding: '8px 24px' }}>
        {skus.map((s, i) => <SkuRow key={s.sku} s={s} onClick={() => setDetail(s)} />)}
      </div>
      {detail && <SkuDetail sku={detail} onClose={() => setDetail(null)} />}
    </div>
  );
};

// ---------- MODULE SHELL ----------
const Operator = ({ route, setRoute }) => {
  const tab = OP_TABS.some(t => t.key === route) ? route : 'run';
  const View = { run: OperatorRun, plan: OperatorPlan, grow: OperatorGrow, analyze: OperatorAnalyze }[tab] || OperatorRun;
  return (
    <div className="col gap-6 fade-in">
      <SubTabs items={OP_TABS} active={tab} onChange={setRoute} />
      <View setRoute={setRoute} />
    </div>
  );
};

window.Operator = Operator;
