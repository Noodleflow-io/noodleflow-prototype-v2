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
  const [txn, setTxn] = useState(null);
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
            <div className="lbl">{c.lbl}<FigureInfo figure={['available','protected','committed'][i]} amount={[cash.available, cash.protected, cash.committed][i]} /></div>
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
        <h3>Connected Accounts <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>· click an account for transaction history</span></h3>
        {cash.accounts.map((a, i) => (
          <div key={i} className="lc-row row-clickable" onClick={() => setTxn(a)}>
            <span className="lc-ico"><Icon name="accounts" size={16} /></span>
            <div className="lc-main">
              <div className="lc-name">{a.name} {a.tail}</div>
              <div className="lc-sub">{a.role} · synced {NF_SYNC.last}</div>
            </div>
            <span className="lc-amt">{fmt$(a.amt)}</span>
            <Icon name="arrow_right" size={14} color="var(--text-3)" />
          </div>
        ))}
        <div className="lc-row row-clickable" style={{ borderTop: '1px solid var(--border-soft)' }} onClick={() => setTxn({ name: 'All connected accounts', tail: '', amt: cash.total, role: 'Combined' })}>
          <div className="lc-main"><div className="lc-name" style={{ color: 'var(--text-2)' }}>Total connected <FigureInfo figure="settled" amount={cash.total} label="Total connected balance" /></div></div>
          <span className="lc-amt" style={{ color: 'var(--accent)' }}>{fmt$(cash.total)}</span>
        </div>
      </div>
      {txn && <AccountTransactions account={txn} onClose={() => setTxn(null)} />}
    </div>
  );
};

// ---------- ACCOUNT TRANSACTIONS (feedback item 5) ----------
// Clicking a connected account opens pulled-in transaction history, not just a
// balance. Cleared vs pending is explicit, matching the provenance disclosure.
const NF_TXNS = {
  'Chase Business Checking': [
    { d: 'Jun 12', desc: 'Shopify Payout',            ref: 'DEP-0618', amt: 1842.10,  st: 'cleared' },
    { d: 'Jun 12', desc: 'Amazon Settlement',         ref: 'DEP-0617', amt: 447.20,   st: 'pending' },
    { d: 'Jun 11', desc: 'Apex Supplies Co.',         ref: 'PMT-2204', amt: -4200.00, st: 'cleared' },
    { d: 'Jun 10', desc: 'Shopify Payout',            ref: 'DEP-0615', amt: 3420.55,  st: 'cleared' },
    { d: 'Jun 10', desc: 'Payroll Reserve transfer',  ref: 'INT-0092', amt: -2800.00, st: 'cleared' },
    { d: 'Jun 09', desc: 'Merrill Packaging',         ref: 'PMT-2201', amt: -3100.00, st: 'pending' },
    { d: 'Jun 08', desc: 'Shopify Payout',            ref: 'DEP-0611', amt: 2960.40,  st: 'cleared' }
  ],
  'Mercury Operating': [
    { d: 'Jun 13', desc: 'Shopify Payout',            ref: 'DEP-0619', amt: 1793.90,  st: 'cleared' },
    { d: 'Jun 11', desc: 'Square Payout',             ref: 'DEP-0616', amt: 980.00,   st: 'pending' },
    { d: 'Jun 11', desc: 'TechBridge SaaS',           ref: 'PMT-2198', amt: -2400.00, st: 'cleared' },
    { d: 'Jun 09', desc: 'Growth Reserve sweep',      ref: 'INT-0090', amt: -3100.00, st: 'cleared' },
    { d: 'Jun 08', desc: 'StoragePro',                ref: 'PMT-2195', amt: -980.00,  st: 'cleared' }
  ]
};

const AccountTransactions = ({ account, onClose }) => {
  const [filter, setFilter] = useState('all');
  const rows = account.name === 'All connected accounts'
    ? Object.entries(NF_TXNS).flatMap(([k, v]) => v.map(t => ({ ...t, acct: k })))
    : (NF_TXNS[account.name] || []).map(t => ({ ...t, acct: account.name }));
  const shown = filter === 'all' ? rows : rows.filter(t => t.st === filter);
  const cleared = rows.filter(t => t.st === 'cleared').reduce((s, t) => s + t.amt, 0);
  const pending = rows.filter(t => t.st === 'pending').reduce((s, t) => s + t.amt, 0);
  return (
    <Modal title={account.name + (account.tail ? ' ' + account.tail : '')}
      sub={`Balance ${fmt$(account.amt)} · pulled from your connected feed · synced ${NF_SYNC.last}`}
      width={700} onClose={onClose}
      foot={<button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>}>
      <div className="nf-detail-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        <div className="nf-detail-cell"><div className="l">Balance</div><div className="v" style={{ fontSize: 17 }}>{fmt$(account.amt)}</div></div>
        <div className="nf-detail-cell"><div className="l">Cleared activity</div><div className="v" style={{ fontSize: 17 }}>{(cleared >= 0 ? '+' : '−') + fmt$(Math.abs(Math.round(cleared)))}</div><div className="s">Last 7 days</div></div>
        <div className="nf-detail-cell"><div className="l">Pending</div><div className="v" style={{ fontSize: 17, color: 'var(--warn)' }}>{(pending >= 0 ? '+' : '−') + fmt$(Math.abs(Math.round(pending)))}</div><div className="s">Not yet settled</div></div>
      </div>
      <div className="nf-toolbar" style={{ marginBottom: 10 }}>
        <div className="seg">
          {[['all', 'All'], ['cleared', 'Cleared'], ['pending', 'Pending']].map(o => (
            <button key={o[0]} className={filter === o[0] ? 'on' : ''} onClick={() => setFilter(o[0])}>{o[1]}</button>
          ))}
        </div>
      </div>
      <div className="txn-table">
        <div className="txn-head">
          <span>Date</span><span>Description</span><span>Reference</span><span className="r">Amount</span><span>Status</span>
        </div>
        {shown.map((t, i) => (
          <div key={i} className="txn-row">
            <span className="td">{t.d}</span>
            <span className="tdesc">{t.desc}{account.name === 'All connected accounts' && <em>{t.acct}</em>}</span>
            <span className="tref">{t.ref}</span>
            <span className={`tamt r ${t.amt < 0 ? 'neg' : 'pos'}`}>{(t.amt < 0 ? '−' : '+') + fmt$(Math.abs(t.amt))}</span>
            <span className={`pay-status ${t.st === 'cleared' ? 'settled' : 'pending'}`}>{t.st}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
};

// ---------- RESERVES (formerly Allocations) ----------
// Scope tickets 3 + 11: the manual form stays as the fallback for a plain,
// triggerless bucket like Equipment — but it is no longer a SEPARATE,
// incompatible path. Switch on a rule and it emits the same RBA rule object
// (PSPTD Epic 7) stored in and editable from Automate.
const CreateReserveModal = ({ onClose }) => {
  const COLORS = ['var(--accent)', 'var(--ok)', 'var(--warn)', 'var(--c-violet)', 'var(--c-cyan)', 'var(--danger)'];
  const rules = useRules();
  const cash = useCash();
  const skus = (window.NF_SKUS || []).map(s => s.sku);
  const [name, setName] = useState('');
  const [mode, setMode] = useState('pct');
  const [target, setTarget] = useState(10);
  const [amt, setAmt] = useState(0);
  const [color, setColor] = useState('var(--c-cyan)');
  const [ruled, setRuled] = useState(false);
  const [scope, setScope] = useState('tenant');
  const [skuId, setSkuId] = useState(skus[0] || 'SKU-113');

  const ruleType = mode === 'pct' ? 'percentage_allocation' : mode === 'fixed' ? (scope === 'sku' ? 'fixed_per_unit' : 'fixed_amount') : 'waterfall';
  const draft = {
    name: (name || 'New reserve') + ' rule',
    scope, ruleType, skuId: scope === 'sku' ? skuId : null,
    target: 'pending', value: mode === 'pct' ? target : (mode === 'fixed' ? amt : 100),
    threshold: null, thresholdWindowDays: null, priority: scope === 'sku' ? 5 : 10,
    requiresApproval: true, createdVia: 'manual'
  };
  const sim = ruled ? simulateRule(draft, rules, cash) : null;

  const create = () => {
    const key = (name || 'reserve').toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Date.now().toString(36);
    NFReserves.add({ key, name: (name || 'New Reserve') + (name.toLowerCase().includes('reserve') ? '' : ' Reserve'), amt: amt || 0, color, mode, target,
      rule: ruled
        ? (typeof describeRule === 'function' ? describeRule({ ...draft, target: key }, () => name || 'reserve') : 'Rule-backed reserve')
        : mode === 'pct' ? `Auto-hold ${target}% of every deposit.` : mode === 'fixed' ? `Fixed allocation of ${fmt$(amt)}.` : 'Custom funding rule.',
      detail: ruled ? 'Rule-backed reserve' : 'Static reserve', history: [0, amt || 0], project: 'Just created' });
    if (ruled) {
      NFRules.add({ ...draft, target: key });
      NFToast.show('Reserve + rule created \u2014 visible in Automate', { icon: 'bolt', tone: 'accent' });
    } else {
      NFToast.show('Reserve created', { icon: 'check' });
    }
    onClose();
  };

  return (
    <Modal title="Create a reserve" sub={ruled ? 'Rule-backed \u2014 this will appear in Automate alongside every other RBA rule' : 'A plain bucket. Add a rule if it should fund itself automatically.'} width={560} onClose={onClose}
      foot={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" onClick={create}>{ruled ? 'Create reserve & rule' : 'Create reserve'}</button></>}>
      <div className="co-form">
        <div className="co-field"><label>Reserve name</label><input className="co-input" placeholder="e.g. Equipment" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="co-field"><label>Funding rule</label>
          <div className="res-mode-seg" style={{ alignSelf: 'flex-start' }}>
            {[['pct', '% of deposits'], ['fixed', 'Fixed amount'], ['sweep', 'Waterfall / surplus']].map(o => <button key={o[0]} className={mode === o[0] ? 'on' : ''} onClick={() => setMode(o[0])}>{o[1]}</button>)}
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

        <div className="res-upgrade">
          <label className="ru-toggle">
            <input type="checkbox" checked={ruled} onChange={e => setRuled(e.target.checked)} />
            <span>
              <b>Attach an RBA rule</b>
              <em>Creates a percentage, fixed, or waterfall rule targeting this bucket — editable from Automate.</em>
            </span>
          </label>
          {ruled && (
            <div className="ru-body">
              <div className="co-row2">
                <div className="co-field"><label>Scope</label>
                  <select className="co-input" value={scope} onChange={e => setScope(e.target.value)}>
                    <option value="tenant">Tenant</option>
                    <option value="sku">SKU</option>
                    <option value="bucket">Bucket</option>
                  </select>
                </div>
                {scope === 'sku' ? (
                  <div className="co-field"><label>SKU</label>
                    <select className="co-input" value={skuId} onChange={e => setSkuId(e.target.value)}>
                      {(skus.length ? skus : ['SKU-113']).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="co-field"><label>Rule type</label>
                    <input className="co-input" value={ruleTypeMeta ? ruleTypeMeta(ruleType).label : ruleType} disabled />
                  </div>
                )}
              </div>
              {sim && (
                <div className="ru-sim">
                  <div className="rb-row"><span className="rb-k">Costs</span><span className="rb-v">{fmt$(sim.draftCost)}/mo</span></div>
                  <div className="rb-src">From {sim.basis.source} · {sim.basis.label}</div>
                  {sim.conflicts.length === 0
                    ? <div className="ru-ok"><Icon name="check" size={12} /> No conflicts with your {rules.filter(r => r.active !== false).length} active rules.</div>
                    : sim.conflicts.map((c, i) => <div key={i} className="ru-warn">{c.text}</div>)}
                </div>
              )}
            </div>
          )}
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
          <div>
            <span className="ad-lbl">Underlying rule</span>
            <span className="ad-rule">{r.rule}</span>
          </div>
          <div className="res-mode-block">
            <span className="ad-lbl">Funding mode</span>
            <div className="res-mode-seg">
              {[['pct', '%'], ['fixed', 'Fixed'], ['cycles', 'Cycles'], ['sweep', 'Sweep']].map(o => (
                <button key={o[0]} className={r.mode === o[0] ? 'on' : ''} onClick={() => NFReserves.update(r.key, { mode: o[0] })}>{o[1]}</button>
              ))}
            </div>
          </div>
          <div className="res-hist-grid">
            <div>
              <span className="ad-lbl">Funding history</span>
              <div style={{ marginTop: 6 }}><Sparkline points={r.history || [r.amt]} color={r.color} w={170} h={30} /></div>
            </div>
            <div className="res-hist-proj">
              <span className="ad-lbl">Projected</span>
              <div style={{ fontSize: 13, color: 'var(--text-1)', marginTop: 6 }}>{r.project || '—'}</div>
            </div>
          </div>
          <div className="res-detail-foot">
            <button className="btn btn-ghost btn-sm" onClick={() => { NFReserves.remove(r.key); NFToast.show('Reserve removed', { tone: 'warn', icon: 'bell' }); }}>Delete reserve</button>
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
            <span className="t-lbl">Total Protected <FigureInfo figure="protected" amount={cash.protected} /></span>
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
window.NF_VENDORS = NF_VENDORS;
window.AccountTransactions = AccountTransactions;
