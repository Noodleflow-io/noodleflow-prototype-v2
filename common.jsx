// common.jsx — shared components

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ============ FORMATTERS ============
const fmt$ = (n, opts={}) => {
  if (n == null) return '—';
  const { d = 0 } = opts;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
};
const fmt$short = (n) => {
  if (n >= 1e6) return '$' + (n/1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + n;
};

// ============ ICONS ============
// Lightweight inline SVG icons — no external dependencies
const Icon = ({ name, size = 16, stroke = 1.6, color = 'currentColor' }) => {
  const s = size;
  const paths = {
    home:   <><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10v10h14V10"/></>,
    revenue:<><path d="M3 17l5-5 4 4 8-8"/><path d="M16 8h5v5"/></>,
    partners:<><circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3 2.8-5 6-5s6 2 6 5"/><circle cx="17" cy="7" r="2.4"/><path d="M14 14c2.4 0 7 1.4 7 4"/></>,
    spend:  <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h3"/></>,
    plan:   <><path d="M4 5h16"/><path d="M4 12h10"/><path d="M4 19h16"/><circle cx="18" cy="12" r="2.4"/></>,
    growth: <><path d="M4 18l5-5 3 3 4-4 4 4"/><path d="M16 16h4v-4"/></>,
    ask:    <><path d="M21 11c0 4.5-4 8-9 8a9.9 9.9 0 0 1-3.3-.6L4 20l1.4-3.9A8 8 0 0 1 3 11c0-4.5 4-8 9-8s9 3.5 9 8z"/></>,
    accounts:<><rect x="3" y="6" width="18" height="13" rx="1.5"/><path d="M3 11h18"/><path d="M7 16h3"/></>,
    payments:<><path d="M12 3v18"/><path d="M16 7c-1-1.5-2.5-2-4-2-2 0-3.5 1.2-3.5 3 0 4.5 7.5 2.5 7.5 7 0 1.8-1.5 3-3.5 3-1.6 0-3-.6-4-2"/></>,
    cards:  <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 11h18"/></>,
    invoices:<><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 14h7"/><path d="M9 17h5"/></>,
    activity:<><path d="M4 12h4l2-7 4 14 2-7h4"/></>,
    sparkle:<><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"/></>,
    bolt:   <><path d="M13 3L4 14h6l-1 7 9-11h-6z"/></>,
    arrow_right:<><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></>,
    arrow_left:<><path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/></>,
    search:<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></>,
    arrow_up:<><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></>,
    arrow_dr:<><path d="M5 19l14-14"/><path d="M9 5h10v10"/></>,
    check:  <><path d="M5 12l4 4 10-10"/></>,
    plus:   <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    link:   <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></>,
    receipt:<><path d="M5 3v18l3-2 2 2 2-2 2 2 2-2 3 2V3z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h3"/></>,
    qr:     <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/><path d="M20 14v3"/><path d="M14 20h7"/></>,
    download:<><path d="M12 3v13"/><path d="M5 12l7 7 7-7"/><path d="M5 21h14"/></>,
    upload: <><path d="M12 21V8"/><path d="M5 12l7-7 7 7"/><path d="M5 3h14"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    bell:   <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21h4"/></>,
    sun:    <><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.9 4.9l1.4 1.4"/><path d="M17.7 17.7l1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.9 19.1l1.4-1.4"/><path d="M17.7 6.3l1.4-1.4"/></>,
    moon:   <><path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z"/></>
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {paths[name] || null}
    </svg>
  );
};

// ============ STATUS PILL ============
const Pill = ({ tone='neutral', children, dot=true }) => (
  <span className={`pill pill-${tone}`} style={!dot ? { paddingLeft: 10 } : {}}>
    {!dot && <style>{'.pill::before{display:none}'}</style>}
    {children}
  </span>
);

// ============ METRIC CARD ============
const Metric = ({ label, value, delta, deltaDir }) => (
  <div className="metric">
    <div className="lbl">{label}</div>
    <div className="val">{value}</div>
    {delta && <div className={`delta ${deltaDir || ''}`}>{delta}</div>}
  </div>
);

// ============ SECTION HEAD ============
const SectionHead = ({ title, sub, right }) => (
  <div className="sec-head">
    <div>
      <h3>{title}</h3>
      {sub && <div className="sub">{sub}</div>}
    </div>
    {right && <div className="right">{right}</div>}
  </div>
);

// ============ EMPTY STATE ============
const EmptyState = ({ icon='sparkle', title, sub, action }) => (
  <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
    <div style={{ width:56, height:56, borderRadius: 16, background:'rgba(127,140,255,0.10)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'var(--accent)', marginBottom: 14 }}>
      <Icon name={icon} size={22} />
    </div>
    <div style={{ fontFamily:'var(--font-serif)', fontSize: 22, color:'var(--text-1)', marginBottom: 6 }}>{title}</div>
    {sub && <div style={{ fontSize: 13, color:'var(--text-2)', maxWidth: 420, margin: '0 auto', lineHeight: 1.55 }}>{sub}</div>}
    {action && <div style={{ marginTop: 18 }}>{action}</div>}
  </div>
);

// ============ SUB-TABS (segmented in-content nav) ============
// Reuses the existing .tabs pill component.
const SubTabs = ({ items, active, onChange }) => (
  <div className="tabs">
    {items.map(it => (
      <button
        key={it.key}
        className={active === it.key ? 'active' : ''}
        onClick={() => onChange(it.key)}>
        {it.label}
      </button>
    ))}
  </div>
);

// ============ SPARKLINE (mini inline trend) ============
// Monotone-cubic curve with a gradient area fill, soft glow, animated draw-on
// and a pulsing endpoint. Monotone (not Catmull-Rom) because a financial trend
// must never overshoot its own data — a smoothed curve that dips below the
// lowest real point would be showing a number the business never had.
// API is unchanged; the richer treatment is opt-out via props.
const sparkPath = (pts) => {
  const n = pts.length;
  if (n < 2) return '';
  const dx = [], dy = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    dy[i] = pts[i + 1].y - pts[i].y;
    m[i] = dx[i] === 0 ? 0 : dy[i] / dx[i];
  }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  t[n - 1] = m[n - 2];
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const c = dx[i] / 3;
    d += `C${(pts[i].x + c).toFixed(1)} ${(pts[i].y + t[i] * c).toFixed(1)} ` +
         `${(pts[i + 1].x - c).toFixed(1)} ${(pts[i + 1].y - t[i + 1] * c).toFixed(1)} ` +
         `${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
};

const Sparkline = ({ points, color = 'var(--accent)', w = 90, h = 32,
    area = true, dot = true, glow = true, animate = true }) => {
  const uid = useRef('sp' + Math.random().toString(36).slice(2, 9)).current;
  if (!points || points.length < 2) return null;
  const max = Math.max(...points), min = Math.min(...points);
  const range = max - min || 1;
  // The endpoint halo pulses to 2.4x its 4.5px radius, so it paints ~11px past
  // the last point. Map the last point to (w - padR) rather than w, otherwise
  // the dot and its pulse always sit outside the viewBox and get clipped by any
  // overflow:hidden container. Inset on the right only — nothing overhangs left.
  const padR = dot ? Math.min(11, w * 0.14) : 0;
  const innerW = w - padR;
  const step = innerW / (points.length - 1);
  const pad = 3;
  const pts = points.map((p, i) => ({
    x: i * step,
    y: h - ((p - min) / range) * (h - pad * 2) - pad
  }));
  const d = sparkPath(pts);
  const last = pts[pts.length - 1];
  const motion = document.documentElement.getAttribute('data-motion') !== 'off';
  const anim = animate && motion;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none"
      className={`nf-spark${anim ? ' is-anim' : ''}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${uid}-s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="55%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path className="sp-area" d={`${d}L${innerW.toFixed(1)} ${h}L0 ${h}Z`} fill={`url(#${uid}-a)`} />}
      {glow && <path className="sp-glow" d={d} stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeLinejoin="round" opacity="0.22" style={{ filter: 'blur(3px)' }} />}
      <path className="sp-line" d={d} stroke={`url(#${uid}-s)`} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
      {dot && (
        <g className="sp-end">
          <circle className="sp-halo" cx={last.x} cy={last.y} r="4.5" fill={color} opacity="0.28" />
          <circle cx={last.x} cy={last.y} r="2.4" fill={color} />
        </g>
      )}
    </svg>
  );
};

// ============ INSIGHT CARD (Insight → Recommendation → Action → Rule) ============
// Backbone of Run / Grow / Analyze / Allocations / Payments.
// tone: 'warn' | 'ok' | 'danger' | 'info'  → left accent + status pill color.
// When `id` + `rule` are provided, "Automate" creates a persisted automation
// that surfaces in Command Center → Active Automations.
// Shared recommendation component. New per client feedback:
//  - why: { rows:[{k,v}], note }         → "Why am I seeing this?" disclosure
//  - confidence: 'high'|'moderate'|'low'  → qualitative badge (no raw %)
//  - editable: { value, onChange, label, prefix, suffix, step }  → inline amount
//  - model: props for <ModelThis>         → lightweight inline outcome preview
//  - snooze: bool                         → "Remind me later" alongside Dismiss
//  - actions[i].onClick                   → real flow; falls back to a toast (no dead clicks)
const InsightCard = ({ tone = 'info', id, category, status, statement, recommendation, rule,
    actions = [], automate = true, dismiss = true, why, confidence, editable, model, snooze = true, spark, className }) => {
  const autos = useAutomations();
  const isAuto = id ? autos.some(a => a.id === id) : false;
  const [snoozed, setSnoozed] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [burst, setBurst] = useState(false);
  const onAutomate = () => {
    if (!id || !rule) return;
    if (!isAuto) { setBurst(true); setTimeout(() => setBurst(false), 400); NFStore.add({ id, category, rule, statement, area: category }); NFToast.show('Automation created', { icon: 'bolt', tone: 'accent' }); }
    else { NFStore.remove(id); }
  };
  const runAction = (a) => {
    if (a.onClick) a.onClick();
    else NFToast.show((a.label || 'Action') + ' — done', { icon: 'check' });
  };
  const doSnooze = (label) => { setSnoozed(true); setSnoozeOpen(false); NFToast.show('Snoozed · resurfaces in ' + label, { icon: 'bell', tone: 'warn' }); };
  return (
    <article id={id || undefined} className={`insight-card tone-${tone}${snoozed ? ' is-snoozed' : ''}${className ? ' ' + className : ''}`}>
      <div className="ic-top">
        <span className="ic-cat">{category}</span>
        {status && <Pill tone={tone}>{status}</Pill>}
        {confidence && <span style={{ marginLeft: 4 }}><ConfidenceBadge level={confidence} /></span>}
        {isAuto && <span className="ic-auto-flag"><Icon name="bolt" size={11} /> Automated</span>}
      </div>
      <div className="ic-statement">{statement}</div>
      {spark && (
        <div className="ic-spark">
          <Sparkline points={spark.points} color={spark.color || 'var(--accent)'} w={spark.w || 240} h={40} />
          <span className="ic-spark-lbl">
            {spark.delta && <span className={`ic-spark-delta ${spark.dir || 'up'}`}>
              <Icon name={spark.dir === 'down' ? 'arrow_down' : 'arrow_up'} size={11} />{spark.delta}
            </span>}
            {spark.label}
          </span>
        </div>
      )}
      {recommendation && (
        <div className="ic-rec">
          <div className="ic-rec-lbl">Recommendation</div>
          <div className="ic-rec-text">
            {recommendation}
            {editable && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{editable.label || 'Amount'}</span>
                <InlineAmount value={editable.value} onChange={editable.onChange} prefix={editable.prefix} suffix={editable.suffix} step={editable.step} width={editable.width} />
              </span>
            )}
          </div>
        </div>
      )}
      {rule && (
        <div className="ic-rule">
          <span className="ic-rule-lbl">Rule</span>
          <span>{rule}</span>
        </div>
      )}
      {model && showModel && <ModelThis {...model} />}
      {why && <WhyDisclosure rows={why.rows} note={why.note} />}
      <div className="ic-actions">
        {actions.map((a, i) => (
          <button key={i} className={`btn btn-sm ${a.primary ? 'btn-primary' : 'btn-ghost'}`} onClick={() => runAction(a)}>{a.label}</button>
        ))}
        {model && (
          <button className={`btn btn-sm btn-ghost ${showModel ? 'is-on' : ''}`} onClick={() => setShowModel(s => !s)}>
            <Icon name="activity" size={12} /> {showModel ? 'Hide model' : 'Model this'}
          </button>
        )}
        <span className="spacer" />
        {automate && rule && (
          <button className={`ic-automate ${isAuto ? 'is-on' : ''} ${burst ? 'nf-burst' : ''}`} onClick={onAutomate}>
            <Icon name={isAuto ? 'check' : 'bolt'} size={12} /> {isAuto ? 'Automated' : 'Automate'}
          </button>
        )}
        {automate && !rule && (
          <button className="ic-automate is-disabled" disabled><Icon name="bolt" size={12} /> Automate</button>
        )}
        {snooze && !snoozed && (
          <span className="nf-snooze-wrap">
            <button className="ic-dismiss" onClick={() => setSnoozeOpen(o => !o)}>Remind me later</button>
            {snoozeOpen && (
              <div className="nf-snooze-menu">
                {['3 days', '1 week', '2 weeks'].map(l => <button key={l} onClick={() => doSnooze(l)}>In {l}</button>)}
              </div>
            )}
          </span>
        )}
        {dismiss && <button className="ic-dismiss" onClick={() => setSnoozed(true)}>Dismiss</button>}
      </div>
    </article>
  );
};

// ============ EXPORTS ============
Object.assign(window, { Icon, Pill, Metric, SectionHead, EmptyState, SubTabs, Sparkline, InsightCard, fmt$, fmt$short });
