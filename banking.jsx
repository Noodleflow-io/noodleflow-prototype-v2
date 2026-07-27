// banking.jsx — Money module (Accounts / Reserves / Payments / Vendors)
// All cash values pull from the shared useCash() source. Reserves are editable
// in place, payments carry status + row actions, vendors open detail views.

const BK_TABS = [
  { key: 'bk-accounts',    label: 'Accounts' },
  { key: 'bk-allocations', label: 'Reserves' },
  { key: 'bk-payments',    label: 'Payments' },
  { key: 'bk-vendors',     label: 'Vendors' }
];
// Reconcile now lives inside Money as a peer sub-tab (client IA fix), not a 4th pillar.
const MONEY_TABS = [...BK_TABS, { key: 'rc-overview', label: 'Reconcile' }];

// ---------- ACCOUNTS ----------
const BankingAccounts = () => {
  const cash = useCash();
  const cards = [
    { lbl: 'Available', val: fmt$(cash.available), note: 'Ready to deploy', sub: 'Hero metric', accent: 'var(--accent)', hero: true },
    { lbl: 'Protected', val: fmt$(cash.protected), note: 'Allocated & reserved', sub: 'Payroll, inventory, taxes', accent: 'var(--ok)' },
    { lbl: 'Committed', val: fmt$(cash.committed), note: 'Scheduled to leave', sub: 'Next 14 days', accent: 'var(--warn)' }
  ];
  return (
    <div className="col gap-6">
      <SectionHead title="Where your money lives" sub="You don't need to understand virtual accounts or ledgers — just what's available." />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {cards.map((c, i) => (
          <div key={i} className="metric metric-accent" style={{ '--cc-accent': c.accent }}>
            {c.hero && <span className="hero-badge">Hero</span>}
            <div className="lbl">{c.lbl}{i === 0 && <CashInfo />}</div>
            <div className="val"><LiveValue value={c.val} /></div>
            <div className="sub-note up" style={c.lbl === 'Protected' ? { color: 'var(--ok)' } : c.lbl === 'Committed' ? { color: 'var(--warn)' } : {}}>{c.note}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </section>

      <div className="card" style={{ padding: '18px 24px' }}>
        <SectionHead title="Total connected balance" sub="Available and Protected are mutually exclusive — this shows the full equation." />
        <CashEquation cash={cash} />
      </div>

      <div className="list-card">
        <h3>Connected Accounts</h3>
        {cash.accounts.map((a, i) => (
          <div key={i} className="lc-row">
            <span className="lc-ico"><Icon name="accounts" size={16} /></span>
            <div className="lc-main">
              <div className="lc-name">{a.name} {a.tail}</div>
              <div className="lc-sub">{a.role}</div>
            </div>
            <span className="lc-amt">{fmt$(a.amt)}</span>
          </div>
        ))}
        <div className="lc-row" style={{ borderTop: '1px solid var(--border-soft)' }}>
          <div className="lc-main"><div className="lc-name" style={{ color: 'var(--text-2)' }}>Total connected</div></div>
          <span className="lc-amt" style={{ color: 'var(--accent)' }}>{fmt$(cash.total)}</span>
        </div>
      </div>
    </div>
  );
};

// ---------- RESERVES (formerly Allocations) ----------
const CreateReserveModal = ({ onClose }) => {
  const COLORS = ['var(--accent)', 'var(--ok)', 'var(--warn)', 'var(--c-violet)', 'var(--c-cyan)', 'var(--danger)'];
  const [name, setName] = useState('');
  const [mode, setMode] = useState('pct');
  const [target, setTarget] = useState(10);
  const [amt, setAmt] = useState(0);
  const [color, setColor] = useState('var(--c-cyan)');
  const create = () => {
    const key = (name || 'reserve').toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Date.now().toString(36);
    NFReserves.add({ key, name: (name || 'New Reserve') + (name.toLowerCase().includes('reserve') ? '' : ' Reserve'), amt: amt || 0, color, mode, target,
      rule: mode === 'pct' ? `Auto-hold ${target}% of every deposit.` : mode === 'fixed' ? `Fixed allocation of ${fmt$(amt)}.` : 'Custom funding rule.',
      detail: 'Custom reserve', history: [0, amt || 0], project: 'Just created' });
    NFToast.show('Reserve created', { icon: 'check' });
    onClose();
  };
  return (
    <Modal title="Create a reserve" sub="Define a new protected bucket. It funds like the defaults." width={520} onClose={onClose}
      foot={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" onClick={create}>Create reserve</button></>}>
      <div className="co-form">
        <div className="co-field"><label>Reserve name</label><input className="co-input" placeholder="e.g. Equipment" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="co-field"><label>Funding rule</label>
          <div className="res-mode-seg" style={{ alignSelf: 'flex-start' }}>
            {[['pct', '% of deposits'], ['fixed', 'Fixed amount'], ['sweep', 'Surplus sweep']].map(o => <button key={o[0]} className={mode === o[0] ? 'on' : ''} onClick={() => setMode(o[0])}>{o[1]}</button>)}
          </div>
        </div>
        <div className="co-row2">
          {mode === 'pct'
            ? <div className="co-field"><label>Target % of deposits</label><input className="co-input" type="number" value={target} onChange={e => setTarget(+e.target.value)} /></div>
            : <div className="co-field"><label>Starting amount</label><InlineAmount value={amt} onChange={setAmt} step={500} width={90} /></div>}
          <div className="co-field"><label>Color</label>
            <div className="co-swatches">{COLORS.map(c => <span key={c} className={`co-swatch ${color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />)}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const ReserveRow = ({ r }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const total = NFReserves.total();
  const pct = total ? Math.round((r.amt / total) * 100) : 0;
  return (
    <div className={`alloc-item ${open ? 'open' : ''}`}>
      <div className="alloc-row" onClick={() => setOpen(o => !o)}>
        <span className="sw" style={{ background: r.color }} />
        <span className="a-name">{r.name}</span>
        <span className="a-pct">{pct}%</span>
        {editing ? (
          <span onClick={e => e.stopPropagation()}><InlineAmount value={r.amt} onChange={v => NFReserves.update(r.key, { amt: v })} step={500} width={82} /></span>
        ) : (
          <span className="a-amt">{fmt$(r.amt)}</span>
        )}
        <button className="res-del" onClick={e => { e.stopPropagation(); setEditing(v => !v); }} title="Edit amount"><Icon name="settings" size={13} /></button>
        <span className="a-caret">{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <div className="alloc-detail">
          <span className="ad-lbl">Underlying rule</span>
          <span className="ad-rule">{r.rule}</span>
          <div className="res-edit-row" style={{ borderTop: 0, paddingTop: 4 }}>
            <span className="rname" style={{ flex: 'none', color: 'var(--text-3)', fontWeight: 400, fontSize: 12 }}>Funding mode</span>
            <div className="res-mode-seg">
              {[['pct', '%'], ['fixed', 'Fixed'], ['cycles', 'Cycles'], ['sweep', 'Sweep']].map(o => (
                <button key={o[0]} className={r.mode === o[0] ? 'on' : ''} onClick={() => NFReserves.update(r.key, { mode: o[0] })}>{o[1]}</button>
              ))}
            </div>
            <span className="spacer" style={{ flex: 1 }} />
            <button className="res-del" onClick={() => { NFReserves.remove(r.key); NFToast.show('Reserve removed', { tone: 'warn', icon: 'bell' }); }} title="Delete reserve">🗑</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <div>
              <span className="ad-lbl">Funding history</span>
              <div style={{ marginTop: 4 }}><Sparkline points={r.history || [r.amt]} color={r.color} w={180} h={30} /></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="ad-lbl">Projected</span>
              <div style={{ fontSize: 13, color: 'var(--text-1)', marginTop: 4 }}>{r.project || '—'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BankingAllocations = () => {
  const reserves = useReserves();
  const cash = useCash();
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <div className="col gap-6">
      <SectionHead title="How money is protected" sub="Edit any reserve inline — Total Protected recalculates live." right={
        <button className="btn btn-ghost btn-sm" onClick={() => setCreateOpen(true)}><Icon name="plus" size={12} /> Create Reserve</button>
      } />
      <div className="alloc-grid">
        <div className="alloc-card">
          <div className="alloc-bar">
            {reserves.map((r, i) => { const pct = cash.protected ? (r.amt / cash.protected) * 100 : 0; return <i key={r.key} style={{ width: pct + '%', background: r.color }} />; })}
          </div>
          {reserves.map(r => <ReserveRow key={r.key} r={r} />)}
          <div className="alloc-total">
            <span className="t-lbl">Total Protected <CashInfo /></span>
            <span className="t-val"><LiveValue value={fmt$(cash.protected)} /></span>
          </div>
        </div>

        <InsightCard
          id="alloc-payroll" tone="danger" category="Payroll" status="Needs Action" confidence="high"
          statement="Payroll reserve buffer is at 0.8 cycles — below the 1.5-cycle minimum."
          recommendation="Increase payroll reserve before next payroll date."
          rule="Maintain 1.5 payroll cycles in reserve."
          why={{ note: 'Buffer dropped below the 1.5-cycle floor after the last payroll run.', rows: [
            { k: 'Current buffer', v: '0.8 cycles' }, { k: 'Minimum', v: '1.5 cycles' }, { k: 'Shortfall', v: '$14,400' }, { k: 'Next payroll', v: 'Jun 30' } ] }}
          actions={[
            { label: 'Add $14,400 to Reserve', primary: true, onClick: () => { NFReserves.update('payroll', { amt: NFReserves.get().find(r => r.key === 'payroll').amt + 14400 }); NFToast.show('$14,400 added to Payroll Reserve', { icon: 'check' }); } },
            { label: 'View Payroll Schedule', onClick: () => NFToast.show('Opening payroll schedule…') }
          ]} />
      </div>
      {createOpen && <CreateReserveModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
};

// ---------- PAYMENTS ----------
const PAY_FLOW = ['scheduled', 'pending', 'approved', 'sent', 'settled'];
const PaymentRow = ({ p }) => {
  const [status, setStatus] = useState(p.status);
  const [open, setOpen] = useState(false);
  const advance = () => { const i = PAY_FLOW.indexOf(status); const next = PAY_FLOW[Math.min(i + 1, PAY_FLOW.length - 1)]; setStatus(next); NFToast.show(p.name + ' → ' + next, { icon: 'check' }); };
  return (
    <div>
      <div className="lc-row row-clickable" onClick={() => setOpen(o => !o)}>
        <div className="lc-main">
          <div className="lc-name">{p.name}</div>
          <div className="lc-sub">{p.due}</div>
        </div>
        <div className="lc-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {p.early && <span className="early-pill">Early</span>}
          <span className={`pay-status ${status}`}>{status}</span>
          <span className="lc-amt">{p.amt}</span>
        </div>
      </div>
      {open && (
        <div className="pay-row-expand">
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Status: <b style={{ color: 'var(--text-1)' }}>{status}</b></span>
          <span className="spacer" style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" onClick={() => NFToast.show(p.name + ' rescheduled to due date', { icon: 'check' })}>Reschedule</button>
          <button className="btn btn-ghost btn-sm" onClick={() => NFToast.show(p.name + ' split into 2 payments', { icon: 'check' })}>Split</button>
          {status !== 'settled' && <button className="btn btn-primary btn-sm" onClick={advance}>{status === 'scheduled' || status === 'pending' ? 'Approve' : 'Send'}</button>}
        </div>
      )}
    </div>
  );
};

const BankingPayments = () => {
  const payments = [
    { name: 'Apex Supplies Co.', due: 'Due Jun 18', amt: '$4,200', status: 'scheduled' },
    { name: 'Pacific Freight LLC', due: 'Due Jun 14', amt: '$1,850', early: true, status: 'pending' },
    { name: 'Merrill Packaging', due: 'Due Jun 22', amt: '$3,100', status: 'approved' },
    { name: 'StoragePro', due: 'Due Jun 12', amt: '$980', early: true, status: 'scheduled' },
    { name: 'TechBridge SaaS', due: 'Due Jun 30', amt: '$2,400', status: 'settled' }
  ];
  return (
    <div className="col gap-6">
      <SectionHead title="How money leaves" sub="AI recommends optimal payment timing — accounting for discounts and late-fee risk per vendor." />
      <InsightCard
        id="pay-duedate" tone="warn" category="Payments" status="Watch" confidence="moderate"
        statement="Most vendor payments are made 12 days early — but two vendors offer early-pay discounts worth keeping."
        recommendation="Shift low-value early payments to due date; keep early payments where a discount beats the liquidity cost."
        rule="Shift vendor payments to due date unless an early-payment discount exceeds the liquidity value."
        why={{ note: 'Per-vendor discount and late-fee terms are now factored in, not a flat rule.', rows: [
          { k: 'Avg days early', v: '12 days' }, { k: 'Liquidity preserved', v: '~$18,000/mo' }, { k: 'Vendors w/ early-pay discount', v: '2 of 5' } ] }}
        model={{ title: 'Preview payment timing', unit: ' days later', step: 1,
          presets: [{ label: 'Pay today', factor: 0 }, { label: '+6 days', factor: 6 }, { label: 'Due date', factor: 12 }],
          compute: (d) => {
            const liq = Math.round(38400 * d / 30);
            const disc = d <= 3 ? 52 : 0;
            return [
              { l: 'Liquidity preserved', v: fmt$(liq), d: d === 0 ? 'paid today' : '+' + d + ' days float', dir: 'up' },
              { l: 'Early-pay discounts', v: fmt$(disc), d: disc ? 'kept' : 'forgone', dir: disc ? 'up' : 'down' },
              { l: 'Net benefit', v: fmt$(liq + disc), dir: 'up' }
            ];
          } }}
        actions={[
          { label: 'Apply Rule', primary: true, onClick: () => NFToast.show('Payment timing rule applied', { icon: 'check' }) },
          { label: 'Review Schedule', onClick: () => NFToast.show('Opening schedule…') }
        ]} />

      <div className="list-card">
        <h3>Scheduled Payments <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>· click a row for actions</span></h3>
        {payments.map((p, i) => <PaymentRow key={i} p={p} />)}
      </div>
    </div>
  );
};

// ---------- VENDORS ----------
const NF_VENDORS = [
  { name: 'Apex Supplies Co.', next: 'Next payment: Jun 18 · $4,200', spend: '$52,400', timing: '11 days early', terms: 'Net 30', open: '2', openAmt: '$6,900', reliability: '96%', renewal: 'Mar 2027', trend: [6,7,8,7,9,8,9] },
  { name: 'Pacific Freight LLC', next: 'Next payment: Jun 14 · $1,850', discount: true, spend: '$21,800', timing: '9 days early', terms: 'Net 15 · 2% early', open: '1', openAmt: '$1,850', reliability: '91%', renewal: 'Jan 2027', trend: [3,3,4,4,5,4,5] },
  { name: 'Merrill Packaging', next: 'Next payment: Jun 22 · $3,100', spend: '$34,600', timing: 'On time', terms: 'Net 30', open: '1', openAmt: '$3,100', reliability: '88%', renewal: 'Sep 2026', trend: [4,5,5,6,5,6,6] },
  { name: 'StoragePro', next: 'Next payment: Jun 12 · $980', discount: true, spend: '$11,760', timing: '14 days early', terms: 'Net 15 · 1.5% early', open: '1', openAmt: '$980', reliability: '99%', renewal: 'Dec 2026', trend: [2,2,2,3,2,3,3] },
  { name: 'TechBridge SaaS', next: 'Next payment: Jun 30 · $2,400', spend: '$28,800', timing: 'On time', terms: 'Annual', open: '0', openAmt: '$0', reliability: '100%', renewal: 'Jun 2027', trend: [3,3,3,3,3,3,3] }
];

const BankingVendors = () => {
  const [detail, setDetail] = useState(null);
  return (
    <div className="col gap-6">
      <SectionHead title="Who gets paid" sub="Vendor performance, payment history, and consolidation opportunities. Click a vendor for detail." />
      <div className="list-card">
        {NF_VENDORS.map((v, i) => (
          <div key={i} className="lc-row row-clickable" onClick={() => setDetail(v)}>
            <span className="lc-ico"><Icon name="spend" size={16} /></span>
            <div className="lc-main">
              <div className="lc-name">{v.name}</div>
              <div className="lc-sub">{v.next}</div>
            </div>
            <div className="lc-actions" onClick={e => e.stopPropagation()}>
              {v.discount && <RequestDiscountButton vendor={v} />}
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(v)}>View History</button>
            </div>
          </div>
        ))}
      </div>
      {detail && <VendorDetail vendor={detail} onClose={() => setDetail(null)} />}
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
      <SubTabs items={MONEY_TABS} active={tab} onChange={setRoute} />
      <View />
    </div>
  );
};

window.Banking = Banking;
