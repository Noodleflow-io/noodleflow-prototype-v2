// nf-shared.jsx — shared infrastructure for the client-feedback revision.
// Single source of truth for cash, reserves store, motion preference, toast,
// modal, and reusable primitives (confidence, why-disclosure, inline amount,
// model-this preview, cash equation). Loaded after common.jsx.

// ============ CASH: SINGLE SOURCE OF TRUTH ============
// Financial Data Integrity epic. One code path computes every surface's numbers.
//   Available = Total connected − Protected (reserves) − Committed
//   $44,200   = $166,800        − $84,200            − $38,400
const NF_ACCOUNTS = [
  { name: 'Chase Business Checking', tail: '···4821', role: 'Primary',   amt: 122600 },
  { name: 'Mercury Operating',       tail: '···9104', role: 'Operating', amt: 44200 }
];
const NF_COMMITTED = 38400;

const NF_RESERVE_DEFAULTS = [
  { key:'payroll',   name:'Payroll Reserve',   amt:28400, color:'var(--accent)',   mode:'cycles', target:1.5,
    rule:'Maintain 1.5 payroll cycles in reserve.', detail:'Funded 12% of each deposit · next run Jun 30',
    history:[24000,25200,26800,27400,28400], project:'Target met' },
  { key:'inventory', name:'Inventory Reserve', amt:18200, color:'var(--ok)',       mode:'pct',    target:8,
    rule:'Reserve reorder cash when coverage drops below 21 days.', detail:'Funded 8% of sales',
    history:[12000,14500,16000,17100,18200], project:'Full by Jul 9' },
  { key:'tax',       name:'Tax Reserve',       amt:12800, color:'var(--warn)',     mode:'pct',    target:8.5,
    rule:'Auto-hold 8.5% of every deposit for quarterly tax obligations.', detail:'Quarterly obligation',
    history:[8200,9600,10900,11800,12800], project:'On pace for Q3' },
  { key:'marketing', name:'Marketing Budget',  amt:9600,  color:'var(--c-violet)', mode:'fixed',  target:9600,
    rule:'Fixed monthly allocation. Scales +10%/week while ROAS exceeds target.', detail:'Fixed monthly',
    history:[7000,8000,8600,9200,9600], project:'Refills monthly' },
  { key:'growth',    name:'Growth Reserve',    amt:15200, color:'var(--c-cyan)',   mode:'sweep',  target:20000,
    rule:'Surplus above operating needs is swept here weekly for deployment.', detail:'Weekly sweep',
    history:[9000,11000,12800,14000,15200], project:'Full by Aug 2' }
];

const NFReserves = (() => {
  const KEY = 'nf-reserves-v2';
  let list;
  try { list = JSON.parse(localStorage.getItem(KEY)); } catch (e) { list = null; }
  if (!Array.isArray(list) || !list.length) list = NF_RESERVE_DEFAULTS.map(r => ({ ...r }));
  const listeners = new Set();
  const emit = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} listeners.forEach(l => l()); };
  return {
    get: () => list,
    total: () => list.reduce((s, r) => s + (r.amt || 0), 0),
    update: (key, patch) => { list = list.map(r => r.key === key ? { ...r, ...patch } : r); emit(); },
    add: (r) => { list = [...list, r]; emit(); },
    remove: (key) => { list = list.filter(r => r.key !== key); emit(); },
    reset: () => { list = NF_RESERVE_DEFAULTS.map(r => ({ ...r })); emit(); },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); }
  };
})();
const useReserves = () => {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => NFReserves.subscribe(force), []);
  return NFReserves.get();
};

// Cash hook — every surface pulls from this, never hardcodes.
const useCash = () => {
  const reserves = useReserves();
  const totalConnected = NF_ACCOUNTS.reduce((s, a) => s + a.amt, 0);
  const protectedAmt = reserves.reduce((s, r) => s + (r.amt || 0), 0);
  const committed = NF_COMMITTED;
  const available = totalConnected - protectedAmt - committed;
  return { total: totalConnected, protected: protectedAmt, committed, available, reserves, accounts: NF_ACCOUNTS };
};

// ============ MOTION PREFERENCE ============
const NFMotion = (() => {
  const KEY = 'nf-motion';
  let on = localStorage.getItem(KEY) !== 'off';
  const listeners = new Set();
  return {
    get: () => on,
    set: (v) => { on = v; try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (e) {}
      document.documentElement.setAttribute('data-motion', v ? 'on' : 'off'); listeners.forEach(l => l()); },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); }
  };
})();
document.documentElement.setAttribute('data-motion', NFMotion.get() ? 'on' : 'off');
const useMotion = () => {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => NFMotion.subscribe(force), []);
  return NFMotion.get();
};

// ============ TOAST (confirmation micro-feedback) ============
const NFToast = (() => {
  let push = null;
  return { _register: (fn) => { push = fn; }, show: (msg, opts = {}) => { if (push) push(msg, opts); } };
})();
const ToastHost = () => {
  const [items, setItems] = useState([]);
  useEffect(() => {
    NFToast._register((msg, opts = {}) => {
      const id = Math.random().toString(36).slice(2);
      setItems(x => [...x, { id, msg, tone: opts.tone || 'ok', icon: opts.icon || 'check' }]);
      setTimeout(() => setItems(x => x.filter(i => i.id !== id)), opts.duration || 1900);
    });
  }, []);
  return (
    <div className="nf-toast-host">
      {items.map(t => (
        <div key={t.id} className={`nf-toast tone-${t.tone}`}><Icon name={t.icon} size={14} /> {t.msg}</div>
      ))}
    </div>
  );
};

// ============ MODAL ============
const Modal = ({ title, sub, onClose, children, foot, width = 720 }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ width, maxWidth: '94vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div><h2>{title}</h2>{sub && <div className="modal-sub">{sub}</div>}</div>
          <span className="close" onClick={onClose}>✕</span>
        </div>
        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>{children}</div>
        {foot && <div className="modal-foot">{foot}</div>}
      </div>
    </div>
  );
};

// ============ LIVE VALUE (flash on change) ============
const LiveValue = ({ value, className = '' }) => {
  const motion = useMotion();
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      if (motion) { setFlash(true); const t = setTimeout(() => setFlash(false), 700); return () => clearTimeout(t); }
    }
  }, [value, motion]);
  return <span className={`${className}${flash ? ' nf-flash' : ''}`}>{value}</span>;
};

// ============ CONFIDENCE BADGE (qualitative, no raw %) ============
const ConfidenceBadge = ({ level = 'moderate' }) => {
  const map = { high: { t: 'High confidence', c: 'ok' }, moderate: { t: 'Moderate confidence', c: 'warn' }, low: { t: 'Exploratory', c: 'danger' } };
  const m = map[level] || map.moderate;
  return <span className={`nf-conf nf-conf-${m.c}`}><span className="nf-conf-dot" />{m.t}</span>;
};

// ============ WHY-DISCLOSURE (explainability) ============
const WhyDisclosure = ({ rows = [], note }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`nf-why ${open ? 'open' : ''}`}>
      <button className="nf-why-bar" onClick={() => setOpen(o => !o)}>
        <span className="nf-why-lead">
          <span className="chev"><Icon name="arrow_right" size={13} /></span>
          {open ? 'Explanation' : 'Why am I seeing this?'}
        </span>
        <span className="nf-why-toggle-lbl">{open ? 'HIDE' : 'SHOW'}</span>
      </button>
      {open && (
        <div className="nf-why-body">
          {note && <div className="nf-why-note">{note}</div>}
          {rows.length > 0 && (
            <div className="nf-why-grid">
              {rows.map((r, i) => (
                <div key={i} className="nf-why-cell"><div className="k">{r.k}</div><div className="v">{r.v}</div></div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============ INLINE EDITABLE AMOUNT ============
const InlineAmount = ({ value, onChange, prefix = '$', suffix = '', step = 100, min = 0, max = Infinity, width = 64 }) => {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <span className="nf-inline-amt" style={{ '--w': width + 'px' }}>
      {prefix && <span className="pfx">{prefix}</span>}
      <input type="text" inputMode="numeric" value={value.toLocaleString('en-US')}
        onChange={e => { const n = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10); set(isNaN(n) ? 0 : n); }} />
      {suffix && <span className="pfx">{suffix}</span>}
      <button className="nf-step" onClick={() => set(value - step)}>−</button>
      <button className="nf-step" onClick={() => set(value + step)}>+</button>
    </span>
  );
};

// ============ MODEL-THIS PREVIEW (lightweight inline scenario) ============
// presets: [{label, factor}], compute(factor) -> {revenue, profit, cash, ...cells}
const ModelThis = ({ title = 'Model this', presets = [], compute, unit = '%', step = 5 }) => {
  const [pct, setPct] = useState(presets.length ? presets[Math.floor(presets.length / 2)].factor : 100);
  const out = compute(pct);
  return (
    <div className="nf-model">
      <div className="nf-model-head">
        <span className="nf-model-title">{title}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{pct}{unit}</span>
      </div>
      <div className="nf-preset-row">
        {presets.map(p => (
          <button key={p.label} className={`nf-preset ${pct === p.factor ? 'on' : ''}`} onClick={() => setPct(p.factor)}>{p.label}</button>
        ))}
      </div>
      <input className="nf-model-slider" type="range" min={presets[0] ? presets[0].factor : 0} max={presets.length ? presets[presets.length - 1].factor : 100} step={step} value={pct} onChange={e => setPct(+e.target.value)} />
      <div className="nf-model-out">
        {out.map((c, i) => (
          <div key={i} className="nf-model-cell">
            <div className="l">{c.l}</div>
            <div className="v">{c.v}</div>
            {c.d && <div className={`d ${c.dir || ''}`}>{c.d}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ CASH EQUATION (auditable breakdown) ============
const CashEquation = ({ cash }) => (
  <div className="nf-eq">
    <div className="nf-eq-title">How Available is calculated</div>
    <div className="nf-eq-row"><span className="op"></span><span className="k">Total connected balance</span><span className="v">{fmt$(cash.total)}</span></div>
    <div className="nf-eq-row"><span className="op">−</span><span className="k"><span className="sw" style={{ background: 'var(--ok)' }} />Protected in reserves</span><span className="v">{fmt$(cash.protected)}</span></div>
    <div className="nf-eq-row"><span className="op">−</span><span className="k"><span className="sw" style={{ background: 'var(--warn)' }} />Committed (next 14 days)</span><span className="v">{fmt$(cash.committed)}</span></div>
    <div className="nf-eq-row total"><span className="op">=</span><span className="k">Available to deploy</span><span className="v">{fmt$(cash.available)}</span></div>
  </div>
);

// Small "?" trigger that opens the equation in a modal.
const CashInfo = () => {
  const cash = useCash();
  const [open, setOpen] = useState(false);
  return (
    <>
      <span className="nf-cash-info" title="How is this calculated?" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>?</span>
      {open && (
        <Modal title="Cash breakdown" sub="Every surface in NoodleFlow reads these numbers from one shared calculation." width={460} onClose={() => setOpen(false)}>
          <CashEquation cash={cash} />
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 14, lineHeight: 1.55 }}>
            Available and Protected are mutually exclusive. Protected cash is committed to your reserves; Available is what's free to deploy today.
          </div>
        </Modal>
      )}
    </>
  );
};

// ============ COMING SOON (tier gating) ============
// Keeps a not-yet-launched surface visible but clearly deferred, per client:
// "don't remove it — add 'feature coming soon' on the tabulars."
const ComingSoon = ({ label = 'Coming soon', note = 'Launching in a later release.', children }) => (
  <div className="cs-wrap">
    <div className="cs-ribbon"><span className="cs-dot" /> {label}</div>
    <div className="cs-veil">
      <div className="cs-veil-pill">{note}</div>
    </div>
    <div className="cs-dim">{children}</div>
  </div>
);

Object.assign(window, {
  NF_ACCOUNTS, NF_COMMITTED, NFReserves, useReserves, useCash,
  NFMotion, useMotion, NFToast, ToastHost, Modal, LiveValue,
  ConfidenceBadge, WhyDisclosure, InlineAmount, ModelThis, CashEquation, CashInfo, ComingSoon
});
