// nf-cogs.jsx — SKU-level cost (COGS) capture and management.
// Feedback item 6 + the Reconciliation Framework's Economic Reconciliation type.
//
// Margin %, profit-share and SKU classification tags all depend on accurate
// per-unit cost. This module owns where that cost comes from, how a merchant
// corrects it, and — critically — refuses to render a margin figure built on a
// cost we don't actually have ("Never display a computed margin built on a
// guessed cost").

// ---------- COST SOURCE VOCABULARY ----------
const NF_COST_SOURCES = {
  pos_verified:        { label: 'POS-verified',        short: 'POS',      tone: 'ok',     desc: 'Pulled automatically from your point-of-sale feed.' },
  quickbooks_verified: { label: 'QuickBooks-verified', short: 'QB',       tone: 'ok',     desc: 'Pulled automatically from QuickBooks.' },
  merchant_entered:    { label: 'Merchant-entered',    short: 'Manual',   tone: 'info',   desc: 'You entered this cost by hand.' },
  estimated:           { label: 'Estimated',           short: 'Estimate', tone: 'warn',   desc: 'Inferred from category averages — not a verified cost.' },
  unknown:             { label: 'No cost data',        short: 'Missing',  tone: 'danger', desc: 'No cost on file. Margin figures are suppressed for this SKU.' }
};
const STALE_DAYS = 30;

// ---------- COST STORE ----------
const NF_COST_DEFAULTS = {
  'SKU-113': { unitCost: 15, source: 'pos_verified',        ageDays: 0,  uom: 'each' },
  'SKU-204': { unitCost: 18, source: 'quickbooks_verified', ageDays: 2,  uom: 'each' },
  'SKU-089': { unitCost: 29, source: 'merchant_entered',    ageDays: 41, uom: 'case', caseQty: 24, casePrice: 696 },
  'SKU-317': { unitCost: 21, source: 'estimated',           ageDays: 12, uom: 'each' },
  'SKU-452': { unitCost: null, source: 'unknown',           ageDays: null, uom: 'each' }
};

const NFCosts = (() => {
  const KEY = 'nf-costs-v1';
  let map;
  try { map = JSON.parse(localStorage.getItem(KEY)); } catch (e) { map = null; }
  if (!map || typeof map !== 'object') map = JSON.parse(JSON.stringify(NF_COST_DEFAULTS));
  const listeners = new Set();
  const emit = () => { try { localStorage.setItem(KEY, JSON.stringify(map)); } catch (e) {} listeners.forEach(l => l()); };
  return {
    all: () => map,
    get: (sku) => map[sku] || { unitCost: null, source: 'unknown', ageDays: null, uom: 'each' },
    set: (sku, patch) => { map = { ...map, [sku]: { ...(map[sku] || {}), ...patch } }; emit(); },
    reset: () => { map = JSON.parse(JSON.stringify(NF_COST_DEFAULTS)); emit(); },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); }
  };
})();
const useCosts = () => {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => NFCosts.subscribe(force), []);
  return NFCosts.all();
};

// A SKU's cost is "trustworthy" only when it's present and not stale.
const costState = (sku) => {
  const c = NFCosts.get(sku);
  const missing = c.unitCost == null || c.source === 'unknown';
  const stale = !missing && c.ageDays != null && c.ageDays > STALE_DAYS;
  const estimated = c.source === 'estimated';
  return { ...c, missing, stale, estimated, trusted: !missing && !stale && !estimated };
};

// ---------- COST SOURCE TAG ----------
// Surfaced anywhere a margin-derived figure is shown.
const CostSourceTag = ({ sku, compact }) => {
  useCosts();
  const c = costState(sku);
  const meta = NF_COST_SOURCES[c.source] || NF_COST_SOURCES.unknown;
  const tone = c.stale ? 'warn' : meta.tone;
  const label = c.stale ? meta.short + ' · stale' : (compact ? meta.short : meta.label);
  const title = meta.desc + (c.stale ? ` Last updated ${c.ageDays} days ago — past the ${STALE_DAYS}-day freshness window.` : '');
  return <span className={`cost-tag ${tone}`} title={title}>{label}</span>;
};

// ---------- COST GUARD ----------
// Wraps any margin-derived figure. If the cost behind it is unknown, the figure
// is suppressed rather than guessed; if it's stale or estimated, it's flagged.
const CostGuard = ({ sku, children, fallback = 'Needs cost' }) => {
  useCosts();
  const c = costState(sku);
  if (c.missing) return <span className="cost-suppressed" title="No cost on file — this figure cannot be computed.">{fallback}</span>;
  if (c.stale || c.estimated) return <span className="cost-flagged" title={c.stale ? 'Built on a cost that is ' + c.ageDays + ' days old.' : 'Built on an estimated cost, not a verified one.'}>{children}<i>*</i></span>;
  return children;
};

// ---------- COST EDITOR ----------
// Two entry paths: straight per-unit, or bulk/case with real unit-of-measure
// handling so $120 per case of 24 resolves to $5.00 per unit.
const UOMS = [
  { key: 'each',   label: 'Each',   defQty: 1 },
  { key: 'case',   label: 'Case',   defQty: 24 },
  { key: 'pack',   label: 'Pack',   defQty: 6 },
  { key: 'pallet', label: 'Pallet', defQty: 240 }
];

const CostEditor = ({ sku, name, onClose }) => {
  const existing = NFCosts.get(sku);
  const [mode, setMode] = useState(existing.uom && existing.uom !== 'each' ? 'bulk' : 'unit');
  const [unitCost, setUnitCost] = useState(existing.unitCost || 0);
  const [uom, setUom] = useState(existing.uom && existing.uom !== 'each' ? existing.uom : 'case');
  const [caseQty, setCaseQty] = useState(existing.caseQty || 24);
  const [casePrice, setCasePrice] = useState(existing.casePrice || 0);
  const derived = caseQty > 0 ? casePrice / caseQty : 0;
  const finalUnit = mode === 'bulk' ? derived : unitCost;

  const save = () => {
    NFCosts.set(sku, mode === 'bulk'
      ? { unitCost: Math.round(derived * 100) / 100, source: 'merchant_entered', ageDays: 0, uom, caseQty, casePrice }
      : { unitCost: Math.round(unitCost * 100) / 100, source: 'merchant_entered', ageDays: 0, uom: 'each' });
    NFToast.show('Cost saved for ' + sku, { icon: 'check' });
    onClose();
  };

  return (
    <Modal title={'Set cost · ' + sku} sub={name + ' — overrides the automated source until it is re-verified'} width={560} onClose={onClose}
      foot={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { NFCosts.set(sku, { ...NF_COST_DEFAULTS[sku] }); NFToast.show('Reverted to automated source'); onClose(); }}>Revert to source</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!finalUnit}>Save cost</button>
        </div>
      </>}>
      <div className="co-form">
        <div className="cost-current">
          <span className="ad-lbl">Current source</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <CostSourceTag sku={sku} />
            <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
              {existing.unitCost != null ? fmt$(existing.unitCost) + ' / unit' : 'No cost on file'}
              {existing.ageDays != null && ' · updated ' + (existing.ageDays === 0 ? 'today' : existing.ageDays + ' days ago')}
            </span>
          </div>
        </div>

        <div className="co-field"><label>Entry method</label>
          <div className="res-mode-seg" style={{ alignSelf: 'flex-start' }}>
            {[['unit', 'Per unit'], ['bulk', 'Bulk / case']].map(o => (
              <button key={o[0]} className={mode === o[0] ? 'on' : ''} onClick={() => setMode(o[0])}>{o[1]}</button>
            ))}
          </div>
        </div>

        {mode === 'unit' ? (
          <div className="co-field"><label>Cost per unit ($)</label><NumInput value={unitCost} onChange={setUnitCost} /></div>
        ) : (
          <>
            <div className="co-row2">
              <div className="co-field"><label>Unit of measure</label>
                <select className="co-input" value={uom} onChange={e => { const u = e.target.value; setUom(u); const d = UOMS.find(x => x.key === u); if (d) setCaseQty(d.defQty); }}>
                  {UOMS.filter(u => u.key !== 'each').map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
                </select>
              </div>
              <div className="co-field"><label>Units per {uom}</label><NumInput value={caseQty} onChange={setCaseQty} min={1} /></div>
            </div>
            <div className="co-field"><label>Price per {uom} ($)</label><NumInput value={casePrice} onChange={setCasePrice} /></div>
            <div className="cost-derive">
              <span>{fmt$(casePrice)} per {uom} ÷ {caseQty} units</span>
              <b>${derived.toFixed(2)} / unit</b>
            </div>
          </>
        )}

        <div className="cost-impact">
          <span className="ad-lbl">Effect on this SKU</span>
          <div className="ci-row"><span>Cost source becomes</span><b>Merchant-entered</b></div>
          <div className="ci-row"><span>Margin figures</span><b>{finalUnit ? 'Recalculated and shown' : 'Stay suppressed'}</b></div>
        </div>
      </div>
    </Modal>
  );
};

// ---------- COST EXCEPTIONS QUEUE ----------
// Same pattern as Reconcile Exceptions: a worklist, not a warning banner.
const CostExceptionsQueue = ({ onOpenSku }) => {
  useCosts();
  const rows = (window.NF_SKUS || []).map(s => ({ s, c: costState(s.sku) }))
    .filter(r => r.c.missing || r.c.stale || r.c.estimated);
  const [edit, setEdit] = useState(null);
  if (!rows.length) return null;
  const reason = (c) => c.missing ? 'No cost on file — margin suppressed'
    : c.stale ? `Cost is ${c.ageDays} days old — past the ${STALE_DAYS}-day window`
    : 'Cost is an estimate, not verified';
  return (
    <div className="card" style={{ padding: '18px 22px' }}>
      <SectionHead title="Cost exceptions" sub={`${rows.length} SKUs need cost attention. Margin, profit-share and classification all depend on this.`} />
      <div className="cost-exc" style={{ marginTop: 12 }}>
        {rows.map(({ s, c }) => (
          <div key={s.sku} className="cost-exc-row">
            <div className="ce-main">
              <div className="ce-name">{s.sku} · {s.name}</div>
              <div className="ce-reason">{reason(c)}</div>
            </div>
            <CostSourceTag sku={s.sku} />
            <button className="btn btn-ghost btn-sm" onClick={() => setEdit(s)}>Set cost</button>
            {onOpenSku && <button className="btn btn-ghost btn-sm" onClick={() => onOpenSku(s)}>Open SKU</button>}
          </div>
        ))}
      </div>
      {edit && <CostEditor sku={edit.sku} name={edit.name} onClose={() => setEdit(null)} />}
    </div>
  );
};

// ---------- PER-SKU RULE SETTING ----------
// Feedback item 6: per-SKU / per-category rule-setting must live in the SKU
// detail view, not only at reserve level.
const SkuRules = ({ sku }) => {
  const autos = useAutomations();
  const reserves = useReserves();
  const [pct, setPct] = useState(25);
  const [bucket, setBucket] = useState('inventory');
  const [scope, setScope] = useState('sku');
  const id = 'skurule-' + sku.sku;
  const on = autos.some(a => a.id === id);
  const target = (reserves.find(r => r.key === bucket) || {}).name || 'reserve';
  const ruleText = `Every time ${scope === 'sku' ? sku.sku : 'any ' + sku.tagLabel + ' SKU'} sells, move ${pct}% of the sale into ${target}.`;
  const toggle = () => {
    if (on) { NFStore.remove(id); return; }
    NFStore.add({ id, category: 'Product allocation', area: 'Insights', rule: ruleText,
      statement: `Per-sale allocation rule on ${sku.sku}.` });
    if (window.NFRules) NFRules.add({
      name: sku.sku + ' allocation',
      scope: 'sku',
      ruleType: 'percentage_allocation',
      skuId: scope === 'sku' ? sku.sku : null,
      target: bucket,
      value: pct,
      threshold: null,
      thresholdWindowDays: null,
      priority: 5,
      requiresApproval: true,
      createdVia: 'manual'
    });
    NFToast.show('Per-sale rule created', { icon: 'bolt', tone: 'accent' });
  };
  return (
    <div className="sku-rules">
      <div className="nf-detail-section-lbl">Rules for this product</div>
      <div className="sr-line">
        <span>Every time</span>
        <select className="sr-sel" value={scope} onChange={e => setScope(e.target.value)}>
          <option value="sku">{sku.sku} sells</option>
          <option value="cat">any “{sku.tagLabel}” SKU sells</option>
        </select>
        <span>move</span>
        <span className="sr-num"><NumInput value={pct} onChange={setPct} className="sr-input" /><i>%</i></span>
        <span>into</span>
        <select className="sr-sel" value={bucket} onChange={e => setBucket(e.target.value)}>
          {reserves.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
        </select>
      </div>
      <div className="sr-foot">
        <span className="sr-preview">{ruleText}</span>
        <button className={`ic-automate ${on ? 'is-on' : ''}`} onClick={toggle}>
          <Icon name={on ? 'check' : 'bolt'} size={12} /> {on ? 'Rule active' : 'Create rule'}
        </button>
      </div>
    </div>
  );
};

// ---------- CAPABILITY TIER (Reconciliation Framework) ----------
// "The product should always be able to state which tier a merchant is
// operating at, and which reconciliation types and rules are active as a
// result." Tier is DERIVED from what data actually exists, never asserted.
const CAP_TIERS = [
  { n: 0, label: 'Sale price & tax', unlocks: ['Settlement Reconciliation', 'Tax reserve bucketing', 'Generic Obligations bucket'] },
  { n: 1, label: 'Expense & vendor data', unlocks: ['Vendor Reconciliation', 'Automated bill payment timing'] },
  { n: 2, label: 'SKU cost data', unlocks: ['Economic Reconciliation', 'Real margin & SKU classification', 'Per-sale allocation rules'] },
  { n: 3, label: 'Multi-year history', unlocks: ['Recurring & annual expense pattern detection'] }
];

const capabilityState = () => {
  const skus = window.NF_SKUS || [];
  const withCost = skus.filter(s => !costState(s.sku).missing).length;
  const hasVendors = (window.NF_VENDORS || []).length > 0;
  const hasMultiYear = false; // only ~7 months of history ingested
  const costCoverage = skus.length ? Math.round(withCost / skus.length * 100) : 0;
  let tier = 0;
  if (hasVendors) tier = 1;
  if (hasVendors && withCost > 0) tier = 2;
  if (tier === 2 && hasMultiYear) tier = 3;
  return { tier, costCoverage, withCost, total: skus.length, hasVendors, hasMultiYear, partial: costCoverage < 100 };
};

const CapabilityTier = ({ compact }) => {
  useCosts();
  const st = capabilityState();
  const [open, setOpen] = useState(false);
  const cur = CAP_TIERS[st.tier];
  const next = CAP_TIERS[st.tier + 1];
  const nextReason = st.partial
    ? `${st.total - st.withCost} of ${st.total} SKUs still have no cost on file — margin stays suppressed for those.`
    : next ? `Needs ${next.label.toLowerCase()} — about ${12 - 7} more months of history.` : 'All capability tiers active.';
  return (
    <>
      <div className="cap-tier">
        <div className="cap-steps">
          {CAP_TIERS.map((t, i) => (
            <React.Fragment key={t.n}>
              {i > 0 && <span className="cs-bar" />}
              <span className={`cap-step ${t.n < st.tier ? 'done' : t.n === st.tier ? 'on' : ''}`}>
                <span className="cs-dot">{t.n < st.tier ? '✓' : t.n}</span>
                {!compact && <span className="cs-l">{t.label}</span>}
              </span>
            </React.Fragment>
          ))}
        </div>
        <div className="cap-note">
          Operating at <b style={{ color: 'var(--text-1)' }}>Tier {st.tier}</b>
          {st.partial && <> · cost data {st.costCoverage}% complete</>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>What this unlocks</button>
      </div>
      {open && (
        <Modal title={'Capability Tier ' + st.tier} sub="What NoodleFlow can do is a function of the data it has — stated, not guessed." width={560} onClose={() => setOpen(false)}>
          <div className="cap-list">
            {CAP_TIERS.map(t => {
              const state = t.n < st.tier ? 'done' : t.n === st.tier ? 'on' : 'off';
              return (
                <div key={t.n} className={`cap-row ${state}`}>
                  <span className="cs-dot">{state === 'done' ? '✓' : t.n}</span>
                  <div className="cap-row-b">
                    <div className="cr-n">Tier {t.n} · {t.label}
                      <span className="cr-st">{state === 'off' ? 'Not yet' : state === 'on' ? 'Current' : 'Active'}</span>
                    </div>
                    <ul className="cr-u">{t.unlocks.map((u, i) => <li key={i}>{u}</li>)}</ul>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="cap-next"><b>To reach Tier {Math.min(3, st.tier + 1)}:</b> {nextReason}</div>
        </Modal>
      )}
    </>
  );
};

Object.assign(window, {
  NF_COST_SOURCES, NF_COST_DEFAULTS, NFCosts, useCosts, costState, STALE_DAYS,
  CostSourceTag, CostGuard, CostEditor, CostExceptionsQueue, SkuRules, UOMS,
  CAP_TIERS, capabilityState, CapabilityTier
});
