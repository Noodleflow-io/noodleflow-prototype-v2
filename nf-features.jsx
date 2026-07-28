// nf-features.jsx — larger feature modules added per client feedback:
// Scenario Planning Engine, SKU detail, Checkout builder, drill-down drawers,
// and the global Ask command bar. Loaded before app.jsx.

// ============ SCENARIO PLANNING ENGINE ============
const NFScenarios = (() => {
  const KEY = 'nf-scenarios';
  let list; try { list = JSON.parse(localStorage.getItem(KEY)); } catch (e) { list = null; }
  if (!Array.isArray(list)) list = [];
  const listeners = new Set();
  const emit = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} listeners.forEach(l => l()); };
  return {
    get: () => list,
    add: (s) => { list = [...list, s]; emit(); },
    update: (id, patch) => { list = list.map(s => s.id === id ? { ...s, ...patch } : s); emit(); },
    remove: (id) => { list = list.filter(s => s.id !== id); emit(); },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); }
  };
})();
const useScenarios = () => {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => NFScenarios.subscribe(force), []);
  return NFScenarios.get();
};

// Shared projection model — one path so scenario numbers are consistent everywhere.
const GOAL = { text: 'Increase monthly profit by $5,000 by July 31', target: 5000 };
const projectScenario = (a) => {
  // a = { price, reorder, adspend, timing }
  const revenue = 142800 + a.price * 1180 + a.adspend * 1.9 - Math.max(0, a.reorder - 100) * 40;
  const profit = 22100 + a.price * 520 + a.adspend * 0.34 - Math.max(0, a.reorder - 100) * 26 + a.timing * 40;
  const cash = 44200 - a.adspend + a.timing * 620 - Math.max(0, a.reorder - 100) * 82;
  const profitGain = profit - 22100;
  return { revenue: Math.round(revenue), profit: Math.round(profit), cash: Math.round(cash), profitGain: Math.round(profitGain) };
};

// Per-unit economics derived from SKU intelligence — keeps scenarios at the
// SKU level (client: "reorder quantity of WHAT? you have 42 SKUs").
const skuUnitEcon = (s) => {
  const contribPerUnit = Math.max(1, Math.round(s.contribution / 600));
  const pricePerUnit = Math.max(contribPerUnit + 1, Math.round(contribPerUnit / (s.margin / 100)));
  return { contribPerUnit, pricePerUnit, costPerUnit: pricePerUnit - contribPerUnit };
};
const TAX_RATE = 0.085;
const BASELINE_PROFIT = 22100; // current monthly profit, per Run

// Sensitivity cases — Row 11 requires best / expected / worst for one scenario.
// Demand and unit cost are the two swing factors an operator actually feels.
const SCN_CASES = [
  { key: 'worst',    label: 'Worst',    demand: 0.75, cost: 1.08 },
  { key: 'expected', label: 'Expected', demand: 1.00, cost: 1.00 },
  { key: 'best',     label: 'Best',     demand: 1.25, cost: 0.93 }
];

// ONE projection path for all three modes, so every number on screen is
// traceable to the same economics (revenue → COGS → gross → tax → net).
const scenarioModel = (mode, inp, c) => {
  const round = Math.round;
  let revenue = 0, cogs = 0, opex = 0, outlay = 0, contribUnit = 0, extra = {};

  if (mode === 'product') {
    const sold = round(inp.sold * c.demand);
    const unitCost = inp.cost * c.cost;
    revenue = sold * inp.price;
    cogs = sold * unitCost;
    opex = inp.marketing;
    outlay = inp.units * unitCost;
    contribUnit = inp.price - unitCost;
    extra = { unitsSold: sold, unitCost, coverageGain: null };
  } else if (mode === 'reorder') {
    const e = skuUnitEcon(inp.sku);
    const unitCost = e.costPerUnit * c.cost;
    const sold = round(inp.units * c.demand);
    revenue = sold * e.pricePerUnit;
    cogs = sold * unitCost;
    opex = 0;
    outlay = inp.units * unitCost;
    contribUnit = e.pricePerUnit - unitCost;
    extra = { unitsSold: sold, unitCost, coverageGain: round(inp.units / 27) };
  } else {
    const base = projectScenario(inp);
    revenue = round(base.revenue * c.demand);
    const scaledProfit = round(base.profit * c.demand / c.cost);
    cogs = Math.max(0, revenue - scaledProfit - round(revenue * TAX_RATE));
    opex = 0;
    outlay = 0;
    contribUnit = 0;
    extra = { unitsSold: null, unitCost: null, coverageGain: null };
  }

  const gross = revenue - cogs;
  const tax = round(revenue * TAX_RATE);
  const profit = round(gross - opex - tax);
  const marginPct = revenue > 0 ? +(gross / revenue * 100).toFixed(1) : 0;
  const profitGain = mode === 'pricing' ? profit - BASELINE_PROFIT : profit;
  // Cash in month 1 absorbs the full inventory outlay — no averaging games.
  const cash = round(revenue - cogs - opex - tax - outlay);
  const breakEvenUnits = contribUnit > 0 ? Math.ceil((outlay + opex + tax) / contribUnit) : null;
  const paybackMonths = outlay > 0 && profit > 0 ? +(outlay / profit).toFixed(1) : null;
  const roi = outlay > 0 ? round(profit / outlay * 100) : null;

  const buckets = [
    { k: 'Tax Reserve', v: tax },
    { k: 'Inventory Reserve', v: round(revenue * 0.08) },
    ...(opex ? [{ k: 'Marketing Budget', v: opex }] : []),
    { k: 'Growth Reserve', v: Math.max(0, round(profitGain * 0.2)) }
  ];

  return { revenue, cogs, gross, tax, opex, outlay, profit, profitGain, marginPct,
    cash, breakEvenUnits, paybackMonths, roi, contribUnit: round(contribUnit), buckets, ...extra };
};

const SCN_MODES = [
  { key: 'product', label: 'Add a product' },
  { key: 'reorder', label: 'Reorder a SKU' },
  { key: 'pricing', label: 'Adjust pricing' }
];
// Each approach is framed as the question it answers, so the first screen is a
// decision, not a form.
const SCN_PICK = [
  { key: 'product', icon: 'revenue',  label: 'Add a product',  q: 'Can I afford to launch it, and when does it pay back?' },
  { key: 'reorder', icon: 'spend',    label: 'Reorder a SKU',  q: 'How many units of which SKU, and what does it tie up?' },
  { key: 'pricing', icon: 'activity', label: 'Adjust pricing', q: 'What happens to profit if I move price or spend?' }
];

const ScenarioBuilder = ({ onClose, seed, startCompare }) => {
  const scenarios = useScenarios();
  const reserves = useReserves();
  const [mode, setMode] = useState((seed && seed.mode) || 'product');
  const [view, setView] = useState(seed && seed.mode ? 'build' : startCompare ? 'compare' : 'pick');
  const [caseKey, setCaseKey] = useState('expected');
  // pricing mode (broad sliders)
  const [a, setA] = useState({ price: 4, reorder: 100, adspend: 4000, timing: 8, ...(seed && seed.mode === 'pricing' ? seed : {}) });
  // add-a-product mode
  const [p, setP] = useState({ name: 'New Product', units: 500, cost: 6, price: 24, sold: 220, marketing: 1200 });
  const setPk = (k, v) => setP(s => ({ ...s, [k]: Math.max(0, v) }));
  // reorder mode (SKU-level)
  const [skuIdx, setSkuIdx] = useState(0);
  const [units, setUnits] = useState(600);
  const sku = NF_SKUS[skuIdx] || NF_SKUS[0];

  // Load a saved candidate back in to keep editing it (Row 12).
  const loadScenario = (s) => {
    if (!s.inputs) { NFToast.show('This one was saved before editing was supported', { tone: 'warn', icon: 'bell' }); return; }
    if (s.mode === 'product') setP({ ...s.inputs });
    else if (s.mode === 'reorder') { setSkuIdx(s.inputs.skuIdx || 0); setUnits(s.inputs.units || 0); }
    else setA({ ...s.inputs });
    setMode(s.mode); setCaseKey('expected'); setView('build');
    NFToast.show('Loaded “' + s.name + '”', { icon: 'check' });
  };
  const rawInputs = () => mode === 'product' ? { ...p } : mode === 'reorder' ? { skuIdx, units } : { ...a };

  const inputs = mode === 'product' ? p : mode === 'reorder' ? { sku, units } : a;
  const cases = SCN_CASES.reduce((acc, c) => { acc[c.key] = scenarioModel(mode, inputs, c); return acc; }, {});
  const out = cases[caseKey] || cases.expected;
  // True progress is shown everywhere (builder + compare); only bar widths clamp.
  const goalPctRaw = Math.max(0, Math.round((out.profitGain / GOAL.target) * 100));
  const goalPct = Math.min(100, goalPctRaw);

  // Plain-language verdict — the one thing an owner needs to read.
  const verdict = out.profitGain <= 0
    ? { tone: 'danger', head: 'This loses money as modeled.', sub: 'Adjust price, volume, or unit cost to turn it positive.' }
    : goalPct >= 100
    ? { tone: 'ok', head: 'This hits your goal.', sub: `Projected +${fmt$(out.profitGain)}/mo, at or above your ${fmt$(GOAL.target)} target.` }
    : goalPct >= 60
    ? { tone: 'warn', head: 'Most of the way there.', sub: `Projected +${fmt$(out.profitGain)}/mo — ${fmt$(GOAL.target - out.profitGain)} short of your goal.` }
    : { tone: 'warn', head: 'Not enough on its own.', sub: `Projected +${fmt$(out.profitGain)}/mo — ${fmt$(GOAL.target - out.profitGain)} short. Combine it with another move.` };
  const constraint = out.outlay > 0
    ? `Ties up ${fmt$(out.outlay)}${out.paybackMonths ? ' · pays back in ' + out.paybackMonths + ' mo' : ''}`
    : 'No upfront cash required';

  // Company profit before/after — makes all three modes directly comparable.
  const companyAfter = mode === 'pricing' ? out.profit : BASELINE_PROFIT + out.profit;

  // Assumption snapshot travels with a saved scenario so comparisons show WHY.
  const assumpSnapshot = () => mode === 'product'
    ? [['Units bought', String(p.units)], ['Cost / unit', fmt$(p.cost)], ['Sell price', fmt$(p.price)], ['Units sold / mo', String(p.sold)], ['Marketing / mo', fmt$(p.marketing)]]
    : mode === 'reorder'
    ? [['SKU', sku.sku], ['Reorder qty', units + ' units'], ['SKU margin', sku.margin + '%']]
    : [['Price change', (a.price > 0 ? '+' : '') + a.price + '%'], ['Ad spend', fmt$(a.adspend) + '/mo'], ['Payment timing', '+' + a.timing + ' days']];

  const ruleText = () => mode === 'product'
    ? `Launch ${p.name}: buy ${p.units} units @ ${fmt$(p.cost)}, sell @ ${fmt$(p.price)}.`
    : mode === 'reorder'
    ? `Reorder ${units} units of ${sku.sku} (${sku.name}) while goal is active.`
    : `Apply +${a.price}% pricing & ${fmt$(a.adspend)}/mo spend while goal is active.`;

  // Row 12: hold 2+ candidate scenarios side by side before committing to one.
  const save = () => {
    const n = scenarios.length + 1;
    NFScenarios.add({ id: 'scn-' + Date.now(), mode,
      name: (mode === 'product' ? p.name : mode === 'reorder' ? sku.sku + ' reorder' : 'Pricing') + ' · S' + n,
      assumptions: assumpSnapshot(), inputs: rawInputs(), outcome: cases.expected,
      range: { worst: cases.worst.profit, best: cases.best.profit }, active: false });
    NFToast.show('Saved as a candidate', { icon: 'check' });
    setView('compare');
  };
  const activate = () => {
    const id = 'scn-' + Date.now();
    NFScenarios.add({ id, mode, name: (mode === 'product' ? p.name : mode === 'reorder' ? sku.sku : 'Pricing') + ' plan',
      assumptions: assumpSnapshot(), inputs: rawInputs(), outcome: cases.expected,
      range: { worst: cases.worst.profit, best: cases.best.profit }, active: true, activatedAt: Date.now() });
    NFStore.add({ id: 'scn-auto-' + id, category: 'Plan', area: 'Plan', rule: ruleText(),
      statement: 'Activated scenario · projected +' + fmt$(cases.expected.profitGain) + '/mo profit.' });
    NFToast.show('Scenario activated — tracking on Run', { icon: 'bolt', tone: 'accent' });
    onClose();
  };

  const foot = view === 'compare' ? (
    <button className="btn btn-ghost btn-sm" onClick={() => setView('build')}>← Back to builder</button>
  ) : view === 'pick' ? null : (
    <>
      <button className="btn btn-ghost btn-sm" onClick={save}>Save &amp; compare</button>
      <button className="btn btn-primary btn-sm" onClick={activate}><Icon name="bolt" size={12} /> Activate</button>
    </>
  );

  const priceAssumptions = [
    { k: 'price',   name: 'Price change',     min: -10, max: 20,    step: 1,   fmt: v => (v > 0 ? '+' : '') + v + '%' },
    { k: 'adspend', name: 'Ad spend',         min: 0,   max: 20000, step: 500, fmt: v => fmt$(v) + '/mo' },
    { k: 'timing',  name: 'Payment timing',   min: 0,   max: 30,    step: 1,   fmt: v => '+' + v + ' days' }
  ];

  return (
    <Modal title="Scenario builder" sub={GOAL.text} width={900} onClose={onClose} foot={foot}>
      {view === 'pick' ? (
        <div className="scn-pick">
          <div className="scn-pick-lead">What are you thinking about doing?</div>
          {SCN_PICK.map(m => (
            <button key={m.key} className="scn-pick-card" onClick={() => { setMode(m.key); setView('build'); }}>
              <span className="pk-ico"><Icon name={m.icon} size={18} /></span>
              <span className="pk-body">
                <span className="pk-t">{m.label}</span>
                <span className="pk-q">{m.q}</span>
              </span>
              <Icon name="arrow_right" size={16} />
            </button>
          ))}
        </div>
      ) : view === 'build' ? (
        <>
          <button className="scn-back" onClick={() => setView('pick')}>← Change approach</button>
          <div className="scn-grid">
            <div className="scn-assump">
              {mode === 'product' && (
                <div className="co-form" style={{ gap: 13 }}>
                  <div className="co-field"><label>Product name</label><input className="co-input" value={p.name} onChange={e => setP(s => ({ ...s, name: e.target.value }))} /></div>
                  <div className="co-row2">
                    <div className="co-field"><label>Units to buy</label><NumInput value={p.units} onChange={v => setPk('units', v)} /></div>
                    <div className="co-field"><label>Cost / unit ($)</label><NumInput value={p.cost} onChange={v => setPk('cost', v)} /></div>
                  </div>
                  <div className="co-row2">
                    <div className="co-field"><label>Sell price / unit ($)</label><NumInput value={p.price} onChange={v => setPk('price', v)} /></div>
                    <div className="co-field"><label>Est. units sold / mo</label><NumInput value={p.sold} onChange={v => setPk('sold', v)} /></div>
                  </div>
                  <div className="co-field"><label>Marketing budget / mo ($)</label><NumInput value={p.marketing} onChange={v => setPk('marketing', v)} /></div>
                  <div className="scn-unit-econ">
                    <div><span>Upfront inventory cost</span><b>{fmt$(out.outlay)}</b></div>
                  </div>
                </div>
              )}
              {mode === 'reorder' && (
                <div className="co-form" style={{ gap: 15 }}>
                  <div className="co-field"><label>Which SKU?</label>
                    <select className="co-input" value={skuIdx} onChange={e => setSkuIdx(+e.target.value)}>
                      {NF_SKUS.map((s, i) => <option key={s.sku} value={i}>{s.sku} · {s.name} ({s.margin}% margin)</option>)}
                    </select>
                  </div>
                  <div className="a-row">
                    <div className="a-top"><span className="a-name">Reorder quantity</span><span className="a-val">{units} units</span></div>
                    <input className="scn-slider" type="range" min="0" max="1500" step="50" value={units} onChange={e => setUnits(+e.target.value)} />
                  </div>
                  <div className="nf-detail-grid" style={{ margin: 0 }}>
                    <div className="nf-detail-cell"><div className="l">Coverage added</div><div className="v" style={{ fontSize: 16 }}>+{out.coverageGain}d</div></div>
                    <div className="nf-detail-cell"><div className="l">Cash outlay</div><div className="v" style={{ fontSize: 16 }}>{fmt$(out.outlay)}</div></div>
                  </div>
                  <div className="sku-tag engine" style={{ alignSelf: 'flex-start' }}>{sku.tagLabel}</div>
                </div>
              )}
              {mode === 'pricing' && priceAssumptions.map(as => (
                <div key={as.k} className="a-row">
                  <div className="a-top"><span className="a-name">{as.name}</span><span className="a-val">{as.fmt(a[as.k])}</span></div>
                  <input className="scn-slider" type="range" min={as.min} max={as.max} step={as.step} value={a[as.k]} onChange={e => setA(s => ({ ...s, [as.k]: +e.target.value }))} />
                </div>
              ))}
            </div>

            <div className="scn-out">
              <div className={`scn-verdict ${verdict.tone}`}>
                <div className="vd-head">{verdict.head}</div>
                <div className="vd-sub">{verdict.sub}</div>
                <div className="scn-goal-track"><i style={{ width: goalPct + '%' }} /></div>
                <div className="vd-foot"><span>{goalPctRaw}% of goal</span><span>{constraint}</span></div>
              </div>

              <div className="scn-three">
                <div className="t3"><div className="k">Profit added / mo</div><div className="v"><LiveValue value={(out.profitGain >= 0 ? '+' : '−') + fmt$(Math.abs(out.profitGain))} /></div></div>
                <div className="t3"><div className="k">Month 1 cash</div><div className={`v${out.cash < 0 ? ' neg' : ''}`}><LiveValue value={(out.cash >= 0 ? '+' : '−') + fmt$(Math.abs(out.cash))} /></div></div>
                <div className="t3"><div className="k">{out.paybackMonths ? 'Payback' : 'Break-even'}</div><div className="v">{out.paybackMonths ? out.paybackMonths + ' mo' : out.breakEvenUnits ? out.breakEvenUnits + 'u' : '—'}</div></div>
              </div>
              <div className="scn-company">
                <span>Company profit</span>
                <span className="cw">{fmt$(BASELINE_PROFIT)} <i>→</i> <b><LiveValue value={fmt$(companyAfter)} /></b></span>
              </div>

              <div className="scn-cases2">
                {SCN_CASES.map(c => (
                  <button key={c.key} className={`cs2 ${c.key}${caseKey === c.key ? ' on' : ''}`} onClick={() => setCaseKey(c.key)}>
                    <span className="cl">{c.label}</span>
                    <span className="cv">{fmt$(cases[c.key].profit)}</span>
                  </button>
                ))}
              </div>
              <div className="scn-case-note">
                {caseKey === 'expected' ? 'Your assumptions exactly as entered.'
                  : caseKey === 'best' ? 'If demand runs 25% higher and unit cost 7% lower.'
                  : 'If demand runs 25% lower and unit cost 8% higher.'}
              </div>

              <details className="scn-details">
                <summary><span>Full breakdown</span><span className="sm-hint">P&amp;L · reserves</span></summary>
                <div className="scn-det-body">
                  <div className="scn-pl">
                    <div className="scn-pl-row"><span className="k">Revenue</span><span className="v">{fmt$(out.revenue)}</span></div>
                    <div className="scn-pl-row"><span className="op">−</span><span className="k">Cost of goods</span><span className="v">{fmt$(out.cogs)}</span></div>
                    <div className="scn-pl-row sub"><span className="k">Gross profit</span><span className="v">{fmt$(out.gross)}</span></div>
                    {out.opex > 0 && <div className="scn-pl-row"><span className="op">−</span><span className="k">Marketing</span><span className="v">{fmt$(out.opex)}</span></div>}
                    <div className="scn-pl-row"><span className="op">−</span><span className="k">Tax set-aside (8.5%)</span><span className="v">{fmt$(out.tax)}</span></div>
                    <div className="scn-pl-row total"><span className="op">=</span><span className="k">Net monthly profit</span><span className="v">{fmt$(out.profit)}</span></div>
                  </div>
                  <div className="scn-det-lbl">Impact on your reserves</div>
                  <div className="scn-bucket-list">
                    {out.buckets.map((b, i) => (
                      <div key={i} className="scn-bucket-row"><span className="bn">{b.k}</span><span className="bv">+{fmt$(b.v)}/mo</span></div>
                    ))}
                  </div>
                </div>
              </details>

              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ConfidenceBadge level={goalPct >= 100 ? 'high' : goalPct >= 60 ? 'moderate' : 'low'} />
                <span style={{ fontSize: 11, color: 'var(--text-4)' }}>· modeling is inherently uncertain</span>
              </div>
              <div className="scn-onactivate">
                <Icon name="bolt" size={12} />
                <span><b>On activate:</b> {ruleText()}</span>
              </div>
            </div>
          </div>

        </>
      ) : (
        <div className="scn-compare">
          {scenarios.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No scenarios yet. Build one and hit Save &amp; compare.</div>
          ) : (
            <>
              <div className="nf-detail-section-lbl">Comparing {scenarios.length} scenario{scenarios.length > 1 ? 's' : ''} against: {GOAL.text}</div>
              <div className="scn-cmp-scroll">
                {scenarios.map(s => {
                  const gp = Math.max(0, Math.round((s.outcome.profitGain / GOAL.target) * 100));
                  const leader = scenarios.reduce((b, x) => x.outcome.profitGain > b.outcome.profitGain ? x : b, scenarios[0]);
                  const isBest = leader.id === s.id && scenarios.length > 1;
                  return (
                    <div key={s.id} className={`scn-compare-col${isBest ? ' is-best' : ''}`}>
                      <div className="scn-cmp-head">
                        <input defaultValue={s.name} onBlur={e => NFScenarios.update(s.id, { name: e.target.value })} />
                        <button className="res-del" onClick={() => NFScenarios.remove(s.id)}>×</button>
                      </div>
                      <div className="scn-cmp-tags">
                        <span className="scn-cmp-mode">{(SCN_MODES.find(m => m.key === s.mode) || {}).label || 'Scenario'}</span>
                        {s.active && <span className="pill pill-ok">Active</span>}
                        {!s.active && <span className="scn-cmp-draft">Draft</span>}
                        {isBest && <span className="scn-cmp-best">Best for goal</span>}
                      </div>

                      <div className="scn-cmp-rows">
                        <div className="r"><span className="k">Profit added</span><span className="v strong">+{fmt$(s.outcome.profitGain)}</span></div>
                        <div className="r"><span className="k">Revenue</span><span className="v">{fmt$(s.outcome.revenue)}</span></div>
                        <div className="r"><span className="k">Gross margin</span><span className="v">{s.outcome.marginPct != null ? s.outcome.marginPct + '%' : '—'}</span></div>
                        <div className="r"><span className="k">Month 1 cash</span><span className={`v${s.outcome.cash < 0 ? ' neg' : ''}`}>{(s.outcome.cash >= 0 ? '+' : '−') + fmt$(Math.abs(s.outcome.cash || 0))}</span></div>
                        <div className="r"><span className="k">Payback</span><span className="v">{s.outcome.paybackMonths ? s.outcome.paybackMonths + ' mo' : '—'}</span></div>
                      </div>

                      {s.range && (
                        <div className="scn-cmp-range">
                          <span>Worst {fmt$(s.range.worst)}</span><span>Best {fmt$(s.range.best)}</span>
                        </div>
                      )}

                      <div className="scn-goal-track" style={{ marginTop: 10 }}><i style={{ width: Math.max(0, Math.min(100, gp)) + '%' }} /></div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{gp}% to goal</div>

                      {s.assumptions && s.assumptions.length > 0 && (
                        <>
                          <div className="scn-cmp-lbl">Assumptions</div>
                          <div className="scn-cmp-assump">
                            {s.assumptions.map((r, i) => (
                              <div key={i} className="r"><span className="k">{r[0]}</span><span className="v">{r[1]}</span></div>
                            ))}
                          </div>
                        </>
                      )}
                      {s.inputs && <button className="scn-cmp-load" onClick={() => loadScenario(s)}>Load into builder</button>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

// ============ SKU INTELLIGENCE ============
const NF_SKUS = [
  { sku: 'SKU-113', name: 'Ridgefield 5 oz', margin: 68, profitShare: 32, volShare: 14, bar: 100, tag: 'engine', tagLabel: 'Profit Engine',
    contribution: 18400, returns: 1.2, discountImpact: 3.1, doi: 19, sellThrough: 88, reorderPt: 600, stockoutRisk: 74, leadTime: 12, cashTied: 11200,
    trend: { '7': [60,62,63,65,66,67,68], '30': [54,57,60,63,65,67,68], '90': [48,52,55,60,64,66,68] },
    narrative: 'SKU-113 is your most profitable product but you are underinvesting in it. It produces 32% of profit from 14% of volume. At current sales rate you will stock out in 19 days. Ordering 600 additional units is projected to generate $18,400 in contribution profit over 60 days while keeping $11,200 available for payroll.' },
  { sku: 'SKU-204', name: 'Cedar Trail 12 oz', margin: 41, profitShare: 28, volShare: 31, bar: 60, tag: 'opportunity', tagLabel: 'High Seller / Low Margin',
    contribution: 12200, returns: 2.8, discountImpact: 6.4, doi: 34, sellThrough: 71, reorderPt: 400, stockoutRisk: 22, leadTime: 9, cashTied: 8600,
    trend: { '7': [40,40,41,41,42,41,41], '30': [44,43,42,42,41,41,41], '90': [46,45,44,43,42,41,41] },
    narrative: 'SKU-204 drives 31% of volume but only 28% of profit. A 3% price test could lift contribution without materially denting sell-through, which is holding at 71%.' },
  { sku: 'SKU-089', name: 'Basin Blend 8 oz', margin: 29, profitShare: 18, volShare: 28, bar: 43, tag: 'risk', tagLabel: 'Needs Price Review',
    contribution: 7400, returns: 4.1, discountImpact: 9.2, doi: 41, sellThrough: 58, reorderPt: 350, stockoutRisk: 12, leadTime: 14, cashTied: 6900,
    trend: { '7': [31,30,30,29,29,29,29], '30': [34,33,32,31,30,29,29], '90': [38,36,34,32,30,29,29] },
    narrative: 'SKU-089 margin has slipped from 38% to 29% over 90 days, largely from a 9.2% discount load. Review promotional pricing before reordering.' },
  { sku: 'SKU-317', name: 'Harbor Mist 4 oz', margin: 22, profitShare: 12, volShare: 19, bar: 33, tag: 'slow', tagLabel: 'Slow Mover',
    contribution: 3100, returns: 3.4, discountImpact: 5.0, doi: 62, sellThrough: 39, reorderPt: 200, stockoutRisk: 4, leadTime: 10, cashTied: 4200,
    trend: { '7': [22,22,22,21,22,22,22], '30': [24,23,23,22,22,22,22], '90': [26,25,24,23,22,22,22] },
    narrative: 'SKU-317 turns slowly (62 days of inventory) and ties up $4,200 in cash. Consider a clearance promotion to free working capital.' },
  { sku: 'SKU-452', name: 'Pinecrest 2 oz', margin: 14, profitShare: 10, volShare: 8, bar: 21, tag: 'losing', tagLabel: 'Losing Money',
    contribution: -900, returns: 6.7, discountImpact: 11.4, doi: 78, sellThrough: 28, reorderPt: 120, stockoutRisk: 2, leadTime: 16, cashTied: 3400,
    trend: { '7': [15,14,14,14,13,14,14], '30': [18,17,16,15,14,14,14], '90': [22,20,18,16,15,14,14] },
    narrative: 'SKU-452 is contribution-negative after returns (6.7%) and discounts (11.4%). At 78 days of inventory it is a candidate to discontinue or reprice sharply.' }
];

const SkuDetail = ({ sku, onClose }) => {
  const [win, setWin] = useState('30');
  const cells = [
    { l: 'Contribution margin', v: fmt$(sku.contribution), s: '60-day projection' },
    { l: 'Days of inventory', v: sku.doi + ' days', s: 'At current velocity' },
    { l: 'Sell-through rate', v: sku.sellThrough + '%', s: 'Trailing 30 days' },
    { l: 'Stockout risk', v: sku.stockoutRisk + '%', s: sku.stockoutRisk > 50 ? 'Reorder soon' : 'Comfortable' },
    { l: 'Reorder point', v: sku.reorderPt + ' units', s: 'Vendor lead ' + sku.leadTime + ' days' },
    { l: 'Cash tied up', v: fmt$(sku.cashTied), s: 'In current stock' },
    { l: 'Returns / refunds', v: sku.returns + '%', s: 'Of gross sales' },
    { l: 'Discount impact', v: sku.discountImpact + '%', s: 'Margin drag' }
  ];
  const foot = (
    <>
      <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => { NFToast.show('Purchasing team notified'); }}>Notify Purchasing</button>
        <button className="btn btn-primary btn-sm" onClick={() => { NFToast.show('Reorder plan drafted', { icon: 'check' }); onClose(); }}>Adjust Inventory Plan</button>
      </div>
    </>
  );
  return (
    <Modal title={sku.sku + ' · ' + sku.name} sub={`Margin ${sku.margin}% · ${sku.profitShare}% of profit · ${sku.volShare}% of volume`} width={720} onClose={onClose} foot={foot}>
      <div className="nf-detail-section-lbl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Margin trend</span>
        <span className="seg" style={{ display: 'inline-flex', background: 'var(--surface-inset)', borderRadius: 8, padding: 2 }}>
          {['7', '30', '90'].map(w => (
            <button key={w} onClick={() => setWin(w)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11.5,
              background: win === w ? 'var(--bg-elevated)' : 'transparent', color: win === w ? 'var(--text-1)' : 'var(--text-3)' }}>{w}-day</button>
          ))}
        </span>
      </div>
      <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-faint)', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
        <Sparkline points={sku.trend[win]} color="var(--accent)" w={640} h={70} />
      </div>
      <div className="nf-detail-grid">
        {cells.map((c, i) => (
          <div key={i} className="nf-detail-cell"><div className="l">{c.l}</div><div className="v">{c.v}</div><div className="s">{c.s}</div></div>
        ))}
      </div>
      <div className="nf-detail-section-lbl">Recommended action</div>
      <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--accent-panel)', border: '1px solid var(--border-faint)', borderRadius: 12, padding: '14px 16px' }}>
        {sku.narrative}
      </div>
    </Modal>
  );
};

// ============ CHANNEL DRILL-DOWN ============
const ChannelDetail = ({ channel, onClose }) => {
  const trend = { Shopify: [72,74,78,80,82,86,88], Amazon: [36,35,34,33,33,32,32], Wholesale: [14,16,18,19,20,21,22] }[channel.name] || [1,2,3];
  const products = {
    Shopify: [['Ridgefield 5 oz', '$34,200'], ['Cedar Trail 12 oz', '$21,800'], ['Basin Blend 8 oz', '$14,100']],
    Amazon: [['Cedar Trail 12 oz', '$12,600'], ['Ridgefield 5 oz', '$9,400'], ['Harbor Mist 4 oz', '$5,300']],
    Wholesale: [['Ridgefield 5 oz', '$11,200'], ['Basin Blend 8 oz', '$6,800'], ['Cedar Trail 12 oz', '$4,300']]
  }[channel.name] || [];
  return (
    <Modal title={channel.name} sub={`${channel.amt} this month · ${channel.delta} vs last month`} width={640} onClose={onClose}
      foot={<button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>}>
      <div className="nf-detail-section-lbl">Revenue trend · 7 months</div>
      <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-faint)', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
        <Sparkline points={trend} color={channel.dir === 'up' ? 'var(--ok)' : 'var(--warn)'} w={560} h={70} />
      </div>
      <div className="nf-detail-section-lbl">Top products</div>
      <div className="list-card" style={{ background: 'transparent', border: 0, boxShadow: 'none', padding: 0 }}>
        {products.map((p, i) => (
          <div key={i} className="lc-row"><div className="lc-main"><div className="lc-name">{p[0]}</div></div><span className="lc-amt">{p[1]}</span></div>
        ))}
      </div>
    </Modal>
  );
};

// ============ VENDOR DETAIL ============
const VendorDetail = ({ vendor, onClose }) => {
  const cells = [
    { l: 'Total spend (YTD)', v: vendor.spend, s: 'Across all invoices' },
    { l: 'Avg payment timing', v: vendor.timing, s: 'vs stated ' + vendor.terms },
    { l: 'Open invoices', v: vendor.open, s: vendor.openAmt },
    { l: 'Reliability score', v: vendor.reliability, s: 'On-time delivery' },
    { l: 'Contract renewal', v: vendor.renewal, s: 'Auto-renews' },
    { l: 'Payment terms', v: vendor.terms, s: vendor.discount ? 'Early-pay discount available' : 'Standard' }
  ];
  return (
    <Modal title={vendor.name} sub="Vendor performance & terms" width={680} onClose={onClose}
      foot={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {vendor.discount && <RequestDiscountButton vendor={vendor} />}
          <button className="btn btn-primary btn-sm" onClick={() => { NFToast.show('Payment scheduled'); onClose(); }}>Schedule payment</button>
        </div>
      </>}>
      <div className="nf-detail-section-lbl">Spend trend · 7 months</div>
      <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-faint)', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
        <Sparkline points={vendor.trend} color="var(--accent)" w={600} h={64} />
      </div>
      <div className="nf-detail-grid">
        {cells.map((c, i) => (
          <div key={i} className="nf-detail-cell"><div className="l">{c.l}</div><div className="v">{c.v}</div><div className="s">{c.s}</div></div>
        ))}
      </div>
    </Modal>
  );
};

// Request Discount — produces a reviewable draft email artifact (not a no-op).
const RequestDiscountButton = ({ vendor }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-sm btn-discount" onClick={() => setOpen(true)}>Request Discount</button>
      {open && (
        <Modal title="Request early-payment discount" sub={vendor.name} width={600} onClose={() => setOpen(false)}
          foot={<>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={() => { NFToast.show('Negotiation email sent for review', { icon: 'check' }); setOpen(false); }}>Send for review</button>
          </>}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>NoodleFlow drafted this outbound email. Review and edit before sending.</div>
          <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-faint)', borderRadius: 12, padding: 16, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            <div style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 8 }}>To: accounts@{vendor.name.toLowerCase().replace(/[^a-z]/g, '')}.com</div>
            <div contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>
              Hi {vendor.name} team,<br /><br />
              We've been a consistent, on-time partner and would like to discuss a 2% early-payment discount in exchange for paying within 10 days going forward. Given our current volume, this would benefit both sides. Could we set up a quick call this week?<br /><br />
              Best,<br />Morgan · Ridgepoint Goods
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

// ============ GLOBAL ASK COMMAND BAR ============
const ASK_CTX = {
  'command-center': ['What changed since yesterday?', 'What needs my attention today?', 'How much can I safely spend this week?'],
  run: ['How much can I safely spend this week?', 'What should I reorder first?', 'Which automations are running?'],
  plan: ['What if I raise prices 4%?', 'How do I hit my July profit goal?', 'Model paying vendors on due date'],
  grow: ['Which product should I promote?', 'What is my best channel right now?', 'Draft a campaign for Ridgefield'],
  analyze: ['Why did SKU-113 margin change?', 'Which SKU is losing money?', 'What is my highest-margin product?'],
  'bk-accounts': ['How is Available calculated?', 'How much is protected in reserves?', 'How much can I safely spend this week?'],
  'bk-allocations': ['Is my payroll reserve funded?', 'How much is protected in reserves?', 'Which reserve fills next?'],
  'bk-payments': ['What bills are safe to delay?', 'Which vendors are paid early?', 'What is due this week?'],
  'bk-vendors': ['Which vendor offers a discount?', 'Who is my largest vendor?', 'Can I consolidate vendors?'],
  ask: ['How much can I safely spend this week?', 'What needs my attention today?', 'Why did SKU-113 margin change?']
};
const ASK_DEEP = {
  spend: { lead: 'You can safely deploy about $20,000 this week.', body: 'Available is $44,200 — your connected balance of $166,800 minus $84,200 protected in reserves and $38,400 committed to scheduled payments. After this week\'s obligations, ~$20,000 is free without touching a reserve.', links: [['bk-accounts', 'Accounts'], ['bk-allocations', 'Reserves']] },
  inventory: { lead: 'Coverage is 14 days — below your 21-day threshold.', body: 'Reserving $8,200 now closes the gap before stock depletes.', links: [['run', 'Run · Inventory'], ['analyze', 'SKU-113']] },
  sku: { lead: 'SKU-113 margin is up — 48% to 68% over 90 days.', body: 'Lower discount load and steady sell-through drove the gain. It now produces 32% of profit on 14% of volume.', links: [['analyze', 'SKU Profit Map']] },
  bills: { lead: 'Two payments are safe to delay to their due date.', body: 'Pacific Freight ($1,850) and StoragePro ($980) are scheduled early — shifting them preserves ~$2,800 in liquidity.', links: [['bk-payments', 'Payments']] },
  default: { lead: 'Here\'s the operator read on that.', body: 'Grounded in your connected data — reserves, obligations, and the last 90 days of activity.', links: [['command-center', 'Command Center']] }
};
const pickDeep = (q) => {
  const s = q.toLowerCase();
  if (s.includes('spend') || s.includes('deploy')) return ASK_DEEP.spend;
  if (s.includes('reorder') || s.includes('inventory')) return ASK_DEEP.inventory;
  if (s.includes('sku') || s.includes('margin')) return ASK_DEEP.sku;
  if (s.includes('bill') || s.includes('delay') || s.includes('due')) return ASK_DEEP.bills;
  return ASK_DEEP.default;
};

const AskCommandBar = ({ route, setRoute, onClose }) => {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState(null);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const sugs = ASK_CTX[route] || ASK_CTX['command-center'];
  const ask = (text) => { const t = (text || q).trim(); if (!t) return; setAnswer({ q: t, ...pickDeep(t) }); };
  const go = (r) => { setRoute(r); onClose(); };
  return (
    <div className="ask-cmd-scrim" onClick={onClose}>
      <div className="ask-cmd" onClick={e => e.stopPropagation()}>
        <div className="ask-cmd-input">
          <Icon name="ask" size={18} color="var(--accent)" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask(); }}
            placeholder="Ask about cash, reserves, SKUs, or what to do next…" />
          <span className="kbd">Esc</span>
        </div>
        {!answer && <>
          <div className="ask-cmd-ctx">Suggested for {route.startsWith('bk-') ? 'Money' : route === 'command-center' ? 'Command Center' : route}</div>
          <div className="ask-cmd-sugs">
            {sugs.map((s, i) => (
              <button key={i} className="ask-cmd-sug" onClick={() => ask(s)}><span className="ico"><Icon name="sparkle" size={14} /></span>{s}</button>
            ))}
          </div>
        </>}
        {answer && (
          <div className="ask-cmd-answer">
            <div className="lead">{answer.lead}</div>
            {answer.body}
            <div className="ask-cmd-links">
              {answer.links.map((l, i) => <button key={i} className="ask-cmd-link" onClick={() => go(l[0])}>→ {l[1]}</button>)}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => { setAnswer(null); setQ(''); }}>Ask another</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ CHECKOUT / PAYMENT LINK BUILDER ============
const CO_COLORS = ['#7F8CFF', '#4DD99A', '#F5B84D', '#FF6B6B', '#14151f'];
const CheckoutBuilder = ({ tool = 'link', onClose }) => {
  const reserves = useReserves();
  const [f, setF] = useState({
    brand: 'Ridgepoint Goods', color: '#7F8CFF', name: 'Ridgefield 5 oz',
    desc: 'Small-batch signature blend. Ships in 1–2 days.', price: 34, qty: 1,
    discount: '', confirm: 'Thanks! Your order is confirmed — check your email for tracking.',
    tax: 'exclusive', taxRate: 8.5, fulfillment: 'shipping',
    fields: ['name', 'email'], expiry: '', limit: '', reserve: 'inventory', campaign: 'summer-popup'
  });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const toggleField = (id) => setF(s => ({ ...s, fields: s.fields.includes(id) ? s.fields.filter(x => x !== id) : [...s.fields, id] }));
  const title = { link: 'Payment link builder', checkout: 'Checkout page builder', qr: 'QR code builder' }[tool] || 'Checkout builder';
  const tax = f.tax === 'exclusive' ? Math.round(f.price * f.taxRate) / 100 : 0;
  const fieldOpts = [['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['address', 'Shipping address']];
  return (
    <Modal title={title} sub="Brand it, configure checkout, and set where the money goes." width={900} onClose={onClose}
      foot={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={() => { NFToast.show('Branded ' + (tool === 'qr' ? 'QR code' : 'link') + ' generated', { icon: 'check' }); onClose(); }}>
          <Icon name={tool === 'qr' ? 'qr' : 'link'} size={13} /> Generate {tool === 'qr' ? 'QR' : 'link'}
        </button>
      </>}>
      <div className="co-grid">
        <div className="co-form">
          <div className="co-upload"><Icon name="upload" size={15} /> Upload logo (PNG/SVG)</div>
          <div className="co-field"><label>Brand accent color</label>
            <div className="co-swatches">{CO_COLORS.map(c => <span key={c} className={`co-swatch ${f.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set('color', c)} />)}</div>
          </div>
          <div className="co-field"><label>Product name</label><input className="co-input" value={f.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="co-field"><label>Description</label><input className="co-input" value={f.desc} onChange={e => set('desc', e.target.value)} /></div>
          <div className="co-upload"><Icon name="upload" size={15} /> Upload product image</div>
          <div className="co-row2">
            <div className="co-field"><label>Price ($)</label><input className="co-input" type="number" value={f.price} onChange={e => set('price', +e.target.value)} /></div>
            <div className="co-field"><label>Quantity available</label><input className="co-input" type="number" value={f.qty} onChange={e => set('qty', +e.target.value)} /></div>
          </div>
          <div className="co-field"><label>Discount code (optional)</label><input className="co-input" placeholder="e.g. SUMMER15" value={f.discount} onChange={e => set('discount', e.target.value)} /></div>

          <div className="co-field"><label>Tax handling</label>
            <div className="res-mode-seg" style={{ alignSelf: 'flex-start' }}>
              {[['exclusive', 'Add tax'], ['inclusive', 'Tax included']].map(o => <button key={o[0]} className={f.tax === o[0] ? 'on' : ''} onClick={() => set('tax', o[0])}>{o[1]}</button>)}
            </div>
          </div>
          <div className="co-row2">
            <div className="co-field"><label>Tax rate (%)</label><input className="co-input" type="number" value={f.taxRate} onChange={e => set('taxRate', +e.target.value)} /></div>
            <div className="co-field"><label>Fulfillment</label>
              <div className="res-mode-seg">{[['shipping', 'Shipping'], ['pickup', 'Local pickup']].map(o => <button key={o[0]} className={f.fulfillment === o[0] ? 'on' : ''} onClick={() => set('fulfillment', o[0])}>{o[1]}</button>)}</div>
            </div>
          </div>

          <div className="co-field"><label>Customer info required at checkout</label>
            <div className="co-fieldset">{fieldOpts.map(o => <button key={o[0]} className={`co-chip ${f.fields.includes(o[0]) ? 'on' : ''}`} onClick={() => toggleField(o[0])}>{f.fields.includes(o[0]) && <Icon name="check" size={11} />}{o[1]}</button>)}</div>
          </div>

          <div className="co-row2">
            <div className="co-field"><label>Expires on (optional)</label><input className="co-input" type="date" value={f.expiry} onChange={e => set('expiry', e.target.value)} /></div>
            <div className="co-field"><label>Sell-out limit (units)</label><input className="co-input" type="number" placeholder="e.g. 200" value={f.limit} onChange={e => set('limit', e.target.value)} /></div>
          </div>

          <div className="co-field"><label>Auto-allocate proceeds to reserve</label>
            <select className="co-input" value={f.reserve} onChange={e => set('reserve', e.target.value)}>
              {reserves.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
              <option value="split">Split across reserves (rule default)</option>
            </select>
          </div>
          <div className="co-field"><label>Campaign / channel tag</label><input className="co-input" value={f.campaign} onChange={e => set('campaign', e.target.value)} /></div>
          <div className="co-field"><label>Confirmation message</label><input className="co-input" value={f.confirm} onChange={e => set('confirm', e.target.value)} /></div>
        </div>

        {/* Live preview */}
        <div>
          <div className="nf-detail-section-lbl">Live preview</div>
          <div className="co-preview">
            <div className="co-pre-head" style={{ background: f.color }}>
              <span className="co-pre-logo" style={{ background: 'rgba(255,255,255,0.25)' }}>{f.brand.charAt(0)}</span>
              <span className="co-pre-brand">{f.brand}</span>
            </div>
            <div className="co-pre-body">
              <div className="co-pre-img"><Icon name="revenue" size={26} /></div>
              <div className="co-pre-name">{f.name}</div>
              <div className="co-pre-desc">{f.desc}</div>
              <div className="co-pre-price">${(f.price + tax).toFixed(2)}</div>
              {f.discount && <span className="co-pre-badge">Code {f.discount} applies</span>}
              <div className="co-pre-fields">
                {f.fields.map(id => <div key={id} className="co-pre-fieldrow">{fieldOpts.find(o => o[0] === id)[1]}</div>)}
              </div>
              <div className="co-pre-line"><span>Subtotal</span><span>${f.price.toFixed(2)}</span></div>
              {f.tax === 'exclusive' && <div className="co-pre-line"><span>Tax ({f.taxRate}%)</span><span>${tax.toFixed(2)}</span></div>}
              <div className="co-pre-line"><span>{f.fulfillment === 'pickup' ? 'Local pickup' : 'Shipping'}</span><span>{f.fulfillment === 'pickup' ? 'Free' : 'Calculated'}</span></div>
              <div className="co-pre-btn" style={{ background: f.color }}>Pay ${(f.price + tax).toFixed(2)}</div>
              <div className="co-pre-conf">{f.confirm}</div>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.5 }}>
            Proceeds auto-allocate to <b style={{ color: 'var(--text-2)' }}>{f.reserve === 'split' ? 'your default split' : (reserves.find(r => r.key === f.reserve) || {}).name}</b>. Sales tagged <b style={{ color: 'var(--text-2)' }}>{f.campaign || 'untagged'}</b> in Channel Performance.
          </div>
        </div>
      </div>
    </Modal>
  );
};

Object.assign(window, {
  NFScenarios, useScenarios, GOAL, projectScenario, ScenarioBuilder,
  NF_SKUS, SkuDetail, ChannelDetail, VendorDetail, RequestDiscountButton, AskCommandBar, CheckoutBuilder
});
