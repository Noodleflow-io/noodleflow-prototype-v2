// reconcile.jsx — Reconciliation module
// Maps WF-2 (deposit ingestion), WF-3 (matching), WF-6 (refunds/chargebacks),
// WF-7 (exceptions) + order ingestion, funds breakdown, and audit history.
// Reuses shared components/tokens; drill-in detail via local state.

const RC_TABS = [
  { key: 'rc-overview',   label: 'Overview' },
  { key: 'rc-orders',     label: 'Orders' },
  { key: 'rc-exceptions', label: 'Exceptions' }
];

const CHAN = {
  Shopify: 'var(--ok)',
  Amazon:  'var(--warn)',
  Square:  'var(--c-cyan)'
};

const RC_CHANNELS = ['Shopify', 'Amazon', 'Square'];
const RC_SOURCES = ['Shopify', 'Amazon', 'Square'];

const RC_ORDERS = [
  { id: '#RG-4821', chan: 'Shopify', date: 'Jun 12', gross: '$1,240.00', net: '$1,081.60', status: 'ok',        deposit: 'DEP-0619', skus: 3, skuLine: 'NF-RIDGE-01, NF-PACK-02, NF-LABEL-03' },
  { id: '#RG-4820', chan: 'Amazon',  date: 'Jun 12', gross: '$864.00',   net: '$712.30',   status: 'ok',        deposit: 'DEP-0619', skus: 2, skuLine: 'NF-RIDGE-01, NF-BALM-02' },
  { id: '#RG-4818', chan: 'Shopify', date: 'Jun 11', gross: '$2,110.00', net: '$1,842.10', status: 'ok',        deposit: 'DEP-0618', skus: 4, skuLine: 'NF-RIDGE-01, NF-PACK-02, NF-KIT-01, NF-BALM-02' },
  { id: '#RG-4817', chan: 'Square',  date: 'Jun 10', gross: '$425.00',   net: '$412.50',   status: 'unmatched', deposit: '—',       skus: 1, skuLine: 'NF-BALM-02' },
  { id: '#RG-4816', chan: 'Amazon',  date: 'Jun 10', gross: '$540.00',   net: '$447.20',   status: 'ok',        deposit: 'DEP-0617', skus: 2, skuLine: 'NF-KIT-01, NF-LABEL-03' },
  { id: '#RG-4814', chan: 'Shopify', date: 'Jun 09', gross: '$680.00',   net: '$592.40',   status: 'pending',   deposit: '—',       skus: 2, skuLine: 'NF-RIDGE-01, NF-PACK-02' },
  { id: '#RG-4812', chan: 'Square',  date: 'Jun 09', gross: '$210.00',   net: '$198.50',   status: 'pending',   deposit: '—',       skus: 1, skuLine: 'NF-KIT-01' },
  { id: '#RG-4811', chan: 'Amazon',  date: 'Jun 08', gross: '$318.00',   net: '$264.50',   status: 'unmatched', deposit: '—',       skus: 1, skuLine: 'NF-RIDGE-01' },
  { id: '#RG-4810', chan: 'Shopify', date: 'Jun 08', gross: '$890.00',   net: '$776.20',   status: 'unmatched', deposit: '—',       skus: 2, skuLine: 'NF-PACK-02, NF-KIT-01' }
];

const parseAmt = s => Number(String(s).replace(/[$,]/g, '')) || 0;
const fmtChanAmt = n => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

// Anchored to sample order dates so range presets stay meaningful in the prototype.
const RC_NOW = new Date(2026, 5, 13);
const RC_MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const parseOrderDate = s => {
  const [mon, day] = String(s).split(' ');
  return new Date(2026, RC_MONTHS[mon] ?? 5, Number(day) || 1);
};
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = d => {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(x, diff);
};
const startOfMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = d => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
const fmtRangeDay = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const toInputDate = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const fromInputDate = s => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const RC_RANGE_PRESETS = [
  { key: 'week', label: 'This week', pctLabel: 'week', get: () => ({ from: startOfWeek(RC_NOW), to: endOfDay(addDays(startOfWeek(RC_NOW), 6)) }) },
  { key: '7d', label: 'Last 7 days', pctLabel: 'range', get: () => ({ from: startOfDay(addDays(RC_NOW, -6)), to: endOfDay(RC_NOW) }) },
  { key: 'month', label: 'This month', pctLabel: 'month', get: () => ({ from: startOfMonth(RC_NOW), to: endOfMonth(RC_NOW) }) },
  { key: '30d', label: 'Last 30 days', pctLabel: 'range', get: () => ({ from: startOfDay(addDays(RC_NOW, -29)), to: endOfDay(RC_NOW) }) }
];

const resolveRange = (key, custom) => {
  if (key === 'custom' && custom?.from && custom?.to) {
    return { from: startOfDay(custom.from), to: endOfDay(custom.to), pctLabel: 'range', label: `${fmtRangeDay(custom.from)} – ${fmtRangeDay(custom.to)}` };
  }
  const p = RC_RANGE_PRESETS.find(x => x.key === key) || RC_RANGE_PRESETS[0];
  const { from, to } = p.get();
  return { from, to, pctLabel: p.pctLabel, label: p.label };
};

const inRange = (orderDate, from, to) => {
  const t = parseOrderDate(orderDate).getTime();
  return t >= from.getTime() && t <= to.getTime();
};

const RC_DEPOSITS = [
  { id: 'DEP-0619', date: 'Jun 13', source: 'Shopify Payout',              amount: '$1,793.90', orders: 2, status: 'ok' },
  { id: 'DEP-0618', date: 'Jun 12', source: 'Shopify Payout',              amount: '$1,842.10', orders: 1, status: 'ok' },
  { id: 'DEP-0617', date: 'Jun 12', source: 'Amazon Settlement Report',    amount: '$447.20',  orders: 1, status: 'pending' },
  { id: 'DEP-0616', date: 'Jun 11', source: 'Square Payout',               amount: '$980.00',  orders: 0, status: 'unmatched' },
  { id: 'DEP-0615', date: 'Jun 10', source: 'Shopify Payout',              amount: '$3,420.55', orders: 3, status: 'ok' }
];
const RC_DEP_STATUS = Object.fromEntries(RC_DEPOSITS.map(d => [d.id, d.status]));

// ---------- SINGLE STATUS STATE MACHINE (documented, one vocabulary everywhere) ----------
// Confidence scores are system-internal per spec and are NEVER shown to merchants.
const RC_STATES = {
  reconciled: { label: 'Reconciled', scope: 'user', desc: 'Matched to its orders and settled to your bank.' },
  pending:    { label: 'Pending',    scope: 'user', desc: 'Deposit received — still clearing or awaiting settlement data.' },
  unmatched:  { label: 'Unmatched',  scope: 'user', desc: 'No linked deposit yet — awaiting the payout that covers it.' },
  held:       { label: 'Held',       scope: 'user', desc: 'Set aside for manual review — nothing cleared the auto-match threshold.' },
  watch:      { label: 'Watch',      scope: 'user', desc: 'Close to matching — may resolve itself on the next payout.' },
  action:     { label: 'Needs Action', scope: 'user', desc: 'Requires your decision to resolve.' }
};
// old order keys map onto the shared vocabulary so no screen invents its own labels.
const RC_STATE_ALIAS = { ok: 'reconciled' };
const rcStateKey = s => RC_STATE_ALIAS[s] || s;

const RC_EXCEPTIONS = [
  { id: 'EXC-118', dep: 'DEP-0617', source: 'Amazon',  reason: 'Top candidate is below the auto-match threshold.', amount: '$447.20', age: '4h', status: 'watch',  _conf: 71 },
  { id: 'EXC-117', dep: 'DEP-0620', source: 'Shopify', reason: 'Settlement window spans 2 payout cycles.', amount: '$1,120.00', age: '1d', status: 'held',   _conf: 58 },
  { id: 'EXC-115', dep: 'DEP-0613', source: 'Square',  reason: 'No candidate orders within ±3 day window.', amount: '$312.40', age: '3d', status: 'action', _conf: 41 }
];

const StatusPill = ({ s }) => {
  const key = rcStateKey(s);
  const st = RC_STATES[key] || { label: s };
  return <span className={`rc-status2 ${key}`}>{st.label}</span>;
};
const Chan = ({ name }) => <span className="rc-chan"><span className="cdot" style={{ background: CHAN[name] || 'var(--text-4)' }} />{name}</span>;

// ---------- OVERVIEW ----------
const RcOverview = () => (
  <div className="col gap-6">
    <SectionHead title="Reconciliation status" sub="Data tracked from order ingestion through final bank settlement." />
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
      {[
        { lbl: 'Deposits Reconciled', val: '92%', note: '23 of 25 this week', cls: 'up', accent: 'var(--ok)' },
        { lbl: 'Unreconciled', val: '$980', note: '1 deposit pending', cls: 'warn', accent: 'var(--warn)' },
          { lbl: 'Open Exceptions', val: '3', note: 'Held for manual review', cls: 'danger', accent: 'var(--danger)' },
        { lbl: 'Funds Settled', val: '$48.2K', note: 'Net · last 7 days', cls: 'up', accent: 'var(--accent)' }
      ].map((m, i) => (
        <div key={i} className="metric metric-accent" style={{ '--cc-accent': m.accent }}>
          <div className="lbl">{m.lbl}</div>
          <div className="val">{m.val}</div>
          <div className={`sub-note ${m.cls}`}>{m.note}</div>
        </div>
      ))}
    </section>

    <SectionHead title="Recent deposits" />
    <div className="rc-table">
      <div className="rc-thead" style={{ gridTemplateColumns: '120px 1fr 130px 130px' }}>
        <span>Deposit</span><span>Source</span><span>Amount</span><span>Status</span>
      </div>
      {RC_DEPOSITS.slice(0, 4).map(d => (
        <div key={d.id} className="rc-trow static" style={{ gridTemplateColumns: '120px 1fr 130px 130px' }}>
          <span className="rc-cell-mono">{d.id}</span>
          <span className="rc-cell-dim">{d.source}</span>
          <span className="rc-cell-amt">{d.amount}</span>
          <StatusPill s={d.status} />
        </div>
      ))}
    </div>

    <SectionHead title="Status guide" sub="One shared set of statuses across Overview, Orders, and Exceptions — no screen invents its own." />
    <div className="rc-legend">
      {Object.entries(RC_STATES).map(([k, s]) => (
        <div key={k} className="rc-legend-row">
          <StatusPill s={k} />
          <span className="rc-legend-desc">{s.desc}</span>
          <span className="rc-legend-scope user">Merchant-facing</span>
        </div>
      ))}
      <div className="rc-legend-row">
        <span className="rc-status2 system">Match confidence</span>
        <span className="rc-legend-desc">Internal auto-match score (80% threshold). Drives matching behind the scenes.</span>
        <span className="rc-legend-scope system">System-internal · never shown</span>
      </div>
    </div>
  </div>
);

// ---------- ORDERS ----------
const RcDateRange = ({ rangeKey, custom, onPreset, onCustomApply }) => {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const ref = useRef(null);
  const fromRef = useRef(null);
  const resolved = resolveRange(rangeKey, custom);
  const customLabel = custom?.from && custom?.to
    ? `${fmtRangeDay(custom.from)} – ${fmtRangeDay(custom.to)}`
    : null;
  const triggerVal = rangeKey === 'custom' && customLabel ? customLabel : resolved.label;
  useEffect(() => {
    if (!open) return;
    const onDoc = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setShowCustom(false);
      }
    };
    const onKey = e => {
      if (e.key === 'Escape') {
        if (showCustom) setShowCustom(false);
        else setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, showCustom]);
  useEffect(() => {
    if (showCustom && fromRef.current) {
      const t = setTimeout(() => fromRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [showCustom]);
  const openCustom = () => {
    const base = rangeKey === 'custom' && custom?.from && custom?.to
      ? custom
      : { from: startOfDay(addDays(RC_NOW, -6)), to: startOfDay(RC_NOW) };
    setDraftFrom(toInputDate(base.from));
    setDraftTo(toInputDate(base.to));
    setShowCustom(true);
  };
  const applyCustom = () => {
    const from = fromInputDate(draftFrom);
    const to = fromInputDate(draftTo);
    if (!from || !to || from > to) return;
    onCustomApply({ from, to });
    setShowCustom(false);
    setOpen(false);
  };
  const customValid = draftFrom && draftTo && fromInputDate(draftFrom) <= fromInputDate(draftTo);
  const draftPreview = customValid
    ? `${fmtRangeDay(fromInputDate(draftFrom))} – ${fmtRangeDay(fromInputDate(draftTo))}`
    : null;
  return (
    <div className={`rc-chan-dd rc-range-dd${open ? ' open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`rc-chan-trigger${rangeKey !== 'week' ? ' active' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { setOpen(o => !o); setShowCustom(false); }}>
        <span className="rc-chan-trigger-lbl">Range</span>
        <span className="rc-chan-trigger-sep">·</span>
        <span className="rc-chan-trigger-val">{triggerVal}</span>
        <span className="rc-chan-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div
          className={`rc-chan-menu rc-range-menu${showCustom ? ' is-custom' : ''}`}
          role="listbox"
          aria-label="Date range">
          {!showCustom ? (
            <>
              {RC_RANGE_PRESETS.map(p => (
                <button
                  key={p.key}
                  type="button"
                  role="option"
                  aria-selected={rangeKey === p.key}
                  className={rangeKey === p.key ? 'on' : ''}
                  onClick={() => { onPreset(p.key); setOpen(false); }}>
                  <span className="rc-chan-opt-main">{p.label}</span>
                  {rangeKey === p.key && <Icon name="check" size={13} color="var(--accent)" />}
                </button>
              ))}
              <div className="rc-range-sep" />
              <button
                type="button"
                role="option"
                aria-selected={rangeKey === 'custom'}
                className={`rc-range-custom-opt${rangeKey === 'custom' ? ' on' : ''}`}
                onClick={openCustom}>
                <span className="rc-range-custom-opt-text">
                  <span className="rc-chan-opt-main">Custom</span>
                  {customLabel && <span className="rc-range-opt-sub">{customLabel}</span>}
                </span>
                <span className="rc-range-custom-opt-end">
                  {rangeKey === 'custom' && <Icon name="check" size={13} color="var(--accent)" />}
                  <span className="rc-range-drill" aria-hidden="true">›</span>
                </span>
              </button>
            </>
          ) : (
            <div className="rc-range-custom">
              <div className="rc-range-custom-head">
                <div className="rc-range-custom-title">Custom range</div>
                {draftPreview && <div className="rc-range-custom-preview">{draftPreview}</div>}
              </div>
              <div className="rc-range-fields">
                <label className="rc-range-field">
                  <span>From</span>
                  <input
                    ref={fromRef}
                    type="date"
                    value={draftFrom}
                    max={draftTo || undefined}
                    onChange={e => setDraftFrom(e.target.value)}
                  />
                </label>
                <label className="rc-range-field">
                  <span>To</span>
                  <input
                    type="date"
                    value={draftTo}
                    min={draftFrom || undefined}
                    onChange={e => setDraftTo(e.target.value)}
                  />
                </label>
              </div>
              <div className="rc-range-custom-hint">Cards, totals, and the order list follow this window.</div>
              <div className="rc-range-custom-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCustom(false)}>Back</button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!customValid}
                  style={!customValid ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                  onClick={applyCustom}>
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RcOrders = ({ selId, setSel }) => {
  const [activeChan, setActiveChan] = useState('Shopify');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rangeKey, setRangeKey] = useState('week');
  const [customRange, setCustomRange] = useState(null);
  const range = resolveRange(rangeKey, customRange);
  const rangedOrders = RC_ORDERS.filter(o => inRange(o.date, range.from, range.to));
  const chanOrders = rangedOrders.filter(o => o.chan === activeChan);
  const rows = chanOrders.filter(o => statusFilter === 'all' || o.status === statusFilter);
  const sel = (selId && rangedOrders.find(o => o.id === selId)) || null;
  const totalGross = chanOrders.reduce((s, o) => s + parseAmt(o.gross), 0);
  const rangeGross = rangedOrders.reduce((s, o) => s + parseAmt(o.gross), 0) || 1;
  const chanStats = RC_CHANNELS.map(c => {
    const list = rangedOrders.filter(o => o.chan === c);
    const gross = list.reduce((s, o) => s + parseAmt(o.gross), 0);
    return {
      name: c,
      count: list.length,
      gross,
      pct: Math.round((gross / rangeGross) * 100),
      delta: c === 'Shopify' ? '+12%' : c === 'Amazon' ? '+4%' : '−2%',
      up: c !== 'Square'
    };
  });
  // Keep selection valid; default to first visible order so the right rail never jumps.
  useEffect(() => {
    const r = resolveRange(rangeKey, customRange);
    const visible = RC_ORDERS.filter(o =>
      inRange(o.date, r.from, r.to) && o.chan === activeChan && (statusFilter === 'all' || o.status === statusFilter)
    );
    if (!visible.length) {
      if (selId) setSel(null);
      return;
    }
    if (!visible.some(o => o.id === selId)) setSel(visible[0].id);
  }, [activeChan, statusFilter, rangeKey, customRange, selId, setSel]);
  const pickChan = c => {
    if (c === activeChan) return;
    setActiveChan(c);
    setStatusFilter('all');
  };
  return (
    <div className="col gap-4">
      <SectionHead
        title="Orders"
        sub="Select a channel, then an order to review settlement detail (WF-1, WF-3)."
        right={
          <RcDateRange
            rangeKey={rangeKey}
            custom={customRange}
            onPreset={k => { setRangeKey(k); setCustomRange(null); }}
            onCustomApply={r => { setCustomRange(r); setRangeKey('custom'); }}
          />
        }
      />
      <div className="rc-orders-board">
        <div className="rc-chan-rail">
          {chanStats.map(c => (
            <button
              key={c.name}
              type="button"
              className={`platform-card rc-chan-card${activeChan === c.name ? ' active' : ''}`}
              onClick={() => pickChan(c.name)}>
              <div className="p-name">
                <span className="rc-chan-card-name"><span className="cdot" style={{ background: CHAN[c.name] }} />{c.name}</span>
                <span className="p-tag">{c.count} orders</span>
              </div>
              <div className="p-val">{fmtChanAmt(c.gross)}</div>
              <div className="p-meta">{c.pct}% of {range.pctLabel} · <span className={c.up ? 'up' : 'down'}>{c.up ? '↗' : '↘'} {c.delta}</span></div>
              <div className="p-bar rc-chan-bar" aria-hidden="true">
                <span className="rc-chan-fill" style={{ width: Math.max(c.pct, 0) + '%', background: CHAN[c.name] }} />
              </div>
            </button>
          ))}
        </div>

        <div className="orders-panel rc-orders-panel">
          <div className="op-head">
            <div>
              <h4>{activeChan} — Orders</h4>
              <div className="sub">{range.label} · settlement detail updates as you select.</div>
            </div>
            <span className="total">{fmtChanAmt(totalGross)}</span>
          </div>
          <div className="rc-orders-filters">
            <div className="rc-seg" role="group" aria-label="Status">
              {[['all', 'All'], ['ok', 'Reconciled'], ['pending', 'Pending'], ['unmatched', 'Unmatched']].map(([k, l]) => (
                <button key={k} type="button" className={statusFilter === k ? 'on' : ''} onClick={() => setStatusFilter(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="rc-order-list">
            {rows.map(o => (
              <div key={o.id} className={`order-row rc-order-row${selId === o.id ? ' selected' : ''}`} onClick={() => setSel(o.id)}>
                <div className="rc-or-main">
                  <div className="or-id">{o.id}</div>
                  <div className="or-meta">{o.date} · {o.skuLine}</div>
                </div>
                <span className="or-sku">{o.skus} SKUs</span>
                <StatusPill s={o.status} />
                <span className="or-amt">{o.gross}</span>
              </div>
            ))}
            {!rows.length && (
              <div className="rc-empty">No {activeChan} orders in this range.</div>
            )}
          </div>
        </div>

        <div className="rc-order-rail">
          {sel ? (
            <OrderDetail o={sel} />
          ) : (
            <div className="rc-order-placeholder">
              <div className="rc-order-placeholder-lbl">Selected order</div>
              <div className="rc-order-placeholder-txt">No orders match this filter for {activeChan}.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const OrderDetail = ({ o }) => (
  <aside className="rc-order-side">
    <div className="rc-detail rc-detail-panel rc-order-panel">
      <div className="rc-detail-eyebrow">
        <span>Order detail</span>
      </div>
      <div className="rc-detail-head rc-order-head">
        <div>
          <div className="rc-detail-title">{o.id}</div>
          <div className="rc-detail-sub"><Chan name={o.chan} /> · {o.date}, 2026 · {o.skus} SKUs</div>
        </div>
        <StatusPill s={o.status} />
      </div>

      <div className="rc-money-strip">
        <div className="rc-money-cell">
          <div className="k">Gross</div>
          <div className="v">{o.gross}</div>
        </div>
        <div className="rc-money-divider" aria-hidden="true" />
        <div className="rc-money-cell">
          <div className="k">Net settled</div>
          <div className="v accent">{o.net}</div>
        </div>
      </div>

      <div className="rc-order-section" style={{ marginBottom: 14 }}>
        <div className="rc-order-section-lbl">Order ↔ deposit</div>
        <RcOrderDepositLink o={o} />
      </div>

      <div className="rc-order-section">
        <div className="rc-order-section-lbl">Line items</div>
        <div className="rc-lines">
          {[['Ridgefield 5 oz × 4', '$780.00'], ['Cedar Balm × 2', '$310.00'], ['Trail Kit × 1', '$150.00'], ['Platform fee', '−$78.00']].map(([n, a], i) => (
            <div key={i} className="rc-lines-row">
              <span className="rc-lines-name">{n}</span>
              <span className={`rc-lines-amt${a.startsWith('−') ? ' neg' : ''}`}>{a}</span>
            </div>
          ))}
          <div className="rc-lines-row total">
            <span className="rc-lines-name">Net</span>
            <span className="rc-lines-amt pos">{o.net}</span>
          </div>
        </div>
      </div>
    </div>
  </aside>
);

// Surfaces the order-to-deposit relationship + flags divergence between the two.
const RcOrderDepositLink = ({ o }) => {
  const os = rcStateKey(o.status);
  const ds = o.deposit === '—' ? null : (RC_DEP_STATUS[o.deposit] ? rcStateKey(RC_DEP_STATUS[o.deposit]) : 'pending');
  let note = null, tone = 'ok';
  if (!ds) { note = 'Awaiting the payout that will cover this order.'; tone = 'warn'; }
  else if (os === 'reconciled' && ds !== 'reconciled') { note = `Order is settled, but deposit ${o.deposit} is still ${RC_STATES[ds].label.toLowerCase()}.`; tone = 'warn'; }
  else if (os === 'reconciled' && ds === 'reconciled') { note = 'Order and its deposit are in sync.'; tone = 'ok'; }
  else { note = `Resolves once ${o.deposit} settles.`; tone = 'ok'; }
  return (
    <div className="rc-rel">
      <div className="rc-rel-row">
        <span className="rc-rel-node">Order</span>
        <StatusPill s={o.status} />
      </div>
      <div className={`rc-rel-conn ${tone}`} aria-hidden="true"><span /></div>
      <div className="rc-rel-row">
        <span className="rc-rel-node">{o.deposit === '—' ? 'Deposit' : o.deposit}</span>
        {ds ? <StatusPill s={ds} /> : <span className="rc-order-meta-val mute">Not linked</span>}
      </div>
      {note && <div className={`rc-rel-note ${tone}`}>{note}</div>}
    </div>
  );
};

// ---------- CANDIDATE DATA (per platform, used by exceptions) ----------
const RC_CAND_BY_SOURCE = {
  Amazon: [
    { id: '#RG-4820', chan: 'Amazon', date: 'Jun 12', amt: '$712.30', conf: 71 },
    { id: '#RG-4811', chan: 'Amazon', date: 'Jun 08', amt: '$264.50', conf: 44 }
  ],
  Shopify: [
    { id: '#RG-4821', chan: 'Shopify', date: 'Jun 12', amt: '$1,081.60', conf: 62 },
    { id: '#RG-4810', chan: 'Shopify', date: 'Jun 08', amt: '$776.20', conf: 48 }
  ],
  Square: [
    { id: '#RG-4817', chan: 'Square', date: 'Jun 10', amt: '$412.50', conf: 41 },
    { id: '#RG-4812', chan: 'Square', date: 'Jun 09', amt: '$198.50', conf: 33 }
  ]
};
// Qualitative match strength (no numeric confidence shown to merchants).
const matchTier = c => c >= 60 ? 2 : c >= 45 ? 1 : 0;
const MatchStrength = ({ conf }) => {
  const t = matchTier(conf);
  const label = ['Weak match', 'Possible match', 'Strong match'][t];
  const tone = ['lo', 'mid', 'hi'][t];
  return (
    <div className={`rc-match ${tone}`}>
      <span className="rc-match-bars">{[0, 1, 2].map(i => <i key={i} className={i <= t ? 'on' : ''} />)}</span>
      <span className="rc-match-lbl">{label}</span>
    </div>
  );
};

// ---------- EXCEPTIONS ----------
const RcExceptions = ({ selId, setSel }) => {
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sourceOpen, setSourceOpen] = useState(false);
  const sourceMenuRef = useRef(null);
  const rows = RC_EXCEPTIONS.filter(e => sourceFilter === 'all' || e.source === sourceFilter);
  const sel = rows.find(e => e.id === selId) || null;
  const pick = id => setSel(selId === id ? null : id);
  const sourceCounts = RC_SOURCES.reduce((acc, s) => {
    acc[s] = RC_EXCEPTIONS.filter(e => e.source === s).length;
    return acc;
  }, { all: RC_EXCEPTIONS.length });
  useEffect(() => {
    if (!sourceOpen) return;
    const onDoc = e => {
      if (sourceMenuRef.current && !sourceMenuRef.current.contains(e.target)) setSourceOpen(false);
    };
    const onKey = e => { if (e.key === 'Escape') setSourceOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [sourceOpen]);
  useEffect(() => {
    if (!selId) return;
    const stillVisible = RC_EXCEPTIONS.some(e => e.id === selId && (sourceFilter === 'all' || e.source === sourceFilter));
    if (!stillVisible) setSel(null);
  }, [sourceFilter, selId, setSel]);
  const pickSource = s => { setSourceFilter(s); setSourceOpen(false); };
  const sourceLabel = sourceFilter === 'all' ? 'All' : sourceFilter;
  const cols = '1.1fr 1fr 120px 128px 64px';
  return (
    <div className="col gap-4">
      <SectionHead title="Exceptions" sub="Deposits held when nothing clears the auto-match threshold (WF-7). Match confidence stays internal." />
      <div className="rc-toolbar">
        <div className="rc-toolbar-spacer" />
        <div className={`rc-chan-dd${sourceOpen ? ' open' : ''}`} ref={sourceMenuRef}>
          <button
            type="button"
            className={`rc-chan-trigger${sourceFilter !== 'all' ? ' active' : ''}`}
            aria-haspopup="listbox"
            aria-expanded={sourceOpen}
            onClick={() => setSourceOpen(o => !o)}>
            {sourceFilter !== 'all' && <span className="cdot" style={{ background: CHAN[sourceFilter] }} />}
            <span className="rc-chan-trigger-lbl">Source</span>
            <span className="rc-chan-trigger-sep">·</span>
            <span className="rc-chan-trigger-val">{sourceLabel}</span>
            <span className="rc-chan-caret" aria-hidden="true">▾</span>
          </button>
          {sourceOpen && (
            <div className="rc-chan-menu" role="listbox" aria-label="Source">
              <button type="button" role="option" aria-selected={sourceFilter === 'all'} className={sourceFilter === 'all' ? 'on' : ''} onClick={() => pickSource('all')}>
                <span className="rc-chan-opt-main">All sources</span>
                <span className="rc-chan-opt-count">{sourceCounts.all}</span>
              </button>
              {RC_SOURCES.map(s => (
                <button key={s} type="button" role="option" aria-selected={sourceFilter === s} className={sourceFilter === s ? 'on' : ''} onClick={() => pickSource(s)}>
                  <span className="rc-chan-opt-main"><span className="cdot" style={{ background: CHAN[s] }} />{s}</span>
                  <span className="rc-chan-opt-count">{sourceCounts[s]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={`rc-split${sel ? ' has-sel' : ''}`}>
        <div className="rc-split-main">
          <div className="rc-table">
            <div className="rc-thead" style={{ gridTemplateColumns: cols }}>
              <span>Deposit</span><span>Source</span><span className="rc-th-amt">Amount</span><span>Status</span><span className="rc-th-num">Age</span>
            </div>
            {rows.map(e => (
              <div key={e.id} className={`rc-trow${selId === e.id ? ' sel' : ''}`} style={{ gridTemplateColumns: cols }} onClick={() => pick(e.id)}>
                <span className="rc-cell-mono">{e.dep}</span>
                <Chan name={e.source} />
                <span className="rc-cell-amt">{e.amount}</span>
                <StatusPill s={e.status} />
                <span className="rc-cell-dim rc-cell-num">{e.age}</span>
              </div>
            ))}
            {!rows.length && (
              <div className="rc-empty">No held deposits for this source.</div>
            )}
          </div>
        </div>
        {sel && <ExceptionDetail key={sel.id} e={sel} onClose={() => setSel(null)} />}
      </div>
    </div>
  );
};

const ExceptionDetail = ({ e, onClose }) => {
  const cands = RC_CAND_BY_SOURCE[e.source] || [];
  const [picked, setPicked] = useState(() => new Set(cands[0] ? [cands[0].id] : []));
  const [done, setDone] = useState(false);
  const toggle = id => setPicked(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const canSubmit = picked.size > 0 && !done;
  const submit = () => {
    if (!canSubmit) return;
    setDone(true);
  };
  return (
    <aside className="rc-split-detail">
      <div className="rc-detail rc-detail-panel rc-exc-panel">
        <div className="rc-detail-eyebrow">
          <span>Manual review</span>
          <button type="button" className="rc-detail-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="rc-detail-head rc-exc-head">
          <div>
            <div className="rc-detail-title">{e.id}</div>
            <div className="rc-detail-sub"><Chan name={e.source} /> · {e.dep} · held {e.age} ago</div>
          </div>
          <span className={`rc-status ${done ? 'ok' : 'held'}`}>{done ? 'Reconciled' : 'Held'}</span>
        </div>

        <div className="rc-money-strip rc-exc-money">
          <div className="rc-money-cell">
            <div className="k">Amount</div>
            <div className="v">{e.amount}</div>
          </div>
          <div className="rc-money-divider" aria-hidden="true" />
          <div className="rc-money-cell">
            <div className="k">Match status</div>
            <div className="v" style={{ marginTop: 2 }}><StatusPill s={e.status} /></div>
          </div>
        </div>

        <div className="rc-order-meta">
          <span className="rc-order-meta-lbl">Deposit</span>
          <span className="rc-order-meta-val">{e.dep}</span>
        </div>

        <div className="rc-hold-line">
          <span className="rc-hold-line-lbl">Hold reason</span>
          <span className="rc-hold-line-txt">{e.reason}</span>
        </div>

        <div className="rc-exc-section">
          <div className="rc-exc-section-head">
            <span>Suggested candidates · {e.source}</span>
            <span className="rc-exc-section-meta">{picked.size} selected</span>
          </div>
          <div className="rc-cand-pick-list">
            {cands.map(c => {
              const on = picked.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`rc-cand-pick${on ? ' on' : ' off'}${done ? ' locked' : ''}`}
                  onClick={() => !done && toggle(c.id)}
                  disabled={done}
                  aria-pressed={on}>
                  <span className={`rc-check${on ? ' on' : ''}`}><Icon name="check" size={12} /></span>
                  <div className="rc-cand-pick-body">
                    <div className="rc-cell-main">{c.id}</div>
                    <div className="rc-cell-sub"><Chan name={c.chan} /> · {c.date} · {c.amt}</div>
                  </div>
                  <MatchStrength conf={c.conf} />
                </button>
              );
            })}
            {!cands.length && (
              <div className="rc-empty" style={{ padding: '18px 8px' }}>No candidate orders for {e.source}.</div>
            )}
          </div>
        </div>

        {done ? (
          <div className="rc-exc-foot rc-exc-foot-done">
            <div className="rc-exc-done">
              <Icon name="check" size={14} color="var(--ok)" />
              <div>
                <div className="rc-exc-done-title">Manually reconciled</div>
                <div className="rc-exc-done-sub">Override logged · deposit attributed to selected orders</div>
              </div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Done</button>
          </div>
        ) : (
          <div className="rc-exc-foot">
            <div className="rc-exc-foot-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Keep hold</button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!canSubmit}
                onClick={submit}
                style={!canSubmit ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}>
                <Icon name="check" size={13} /> Submit to reconcile
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

// ---------- MODULE SHELL ----------
const Reconcile = ({ route, setRoute }) => {
  const tab = RC_TABS.some(t => t.key === route) ? route : 'rc-overview';
  const [orderSel, setOrderSel] = useState(() => (RC_ORDERS.find(o => o.chan === 'Shopify') || RC_ORDERS[0] || {}).id || null);
  const [excSel, setExcSel] = useState(null);
  let view;
  if (tab === 'rc-overview') view = <RcOverview />;
  else if (tab === 'rc-orders') view = <RcOrders selId={orderSel} setSel={setOrderSel} />;
  else if (tab === 'rc-exceptions') view = <RcExceptions selId={excSel} setSel={setExcSel} />;
  return (
    <div className="col gap-6 fade-in">
      <SubTabs items={MONEY_TABS} active="rc-overview" onChange={setRoute} />
      <SubTabs items={RC_TABS} active={tab} onChange={setRoute} />
      {view}
    </div>
  );
};

window.Reconcile = Reconcile;
