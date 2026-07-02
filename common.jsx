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
const Sparkline = ({ points, color = 'var(--accent)', w = 90, h = 32 }) => {
  const max = Math.max(...points), min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ display: 'block', overflow: 'visible' }}>
      <path d={d} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ============ INSIGHT CARD (Insight → Recommendation → Action → Rule) ============
// Backbone of Run / Grow / Analyze / Allocations / Payments.
// tone: 'warn' | 'ok' | 'danger' | 'info'  → left accent + status pill color.
// When `id` + `rule` are provided, "Automate" creates a persisted automation
// that surfaces in Command Center → Active Automations.
const InsightCard = ({ tone = 'info', id, category, status, statement, recommendation, rule, actions = [], automate = true, dismiss = true }) => {
  const autos = useAutomations();
  const isAuto = id ? autos.some(a => a.id === id) : false;
  const onAutomate = () => {
    if (!id || !rule) return;
    NFStore.toggle({ id, category, rule, statement, area: category });
  };
  return (
    <article className={`insight-card tone-${tone}`}>
      <div className="ic-top">
        <span className="ic-cat">{category}</span>
        {status && <Pill tone={tone}>{status}</Pill>}
        {isAuto && <span className="ic-auto-flag"><Icon name="bolt" size={11} /> Automated</span>}
      </div>
      <div className="ic-statement">{statement}</div>
      {recommendation && (
        <div className="ic-rec">
          <div className="ic-rec-lbl">Recommendation</div>
          <div className="ic-rec-text">{recommendation}</div>
        </div>
      )}
      {rule && (
        <div className="ic-rule">
          <span className="ic-rule-lbl">Rule</span>
          <span>{rule}</span>
        </div>
      )}
      <div className="ic-actions">
        {actions.map((a, i) => (
          <button key={i} className={`btn btn-sm ${a.primary ? 'btn-primary' : 'btn-ghost'}`}>{a.label}</button>
        ))}
        <span className="spacer" />
        {automate && rule && (
          <button className={`ic-automate ${isAuto ? 'is-on' : ''}`} onClick={onAutomate}>
            <Icon name={isAuto ? 'check' : 'bolt'} size={12} /> {isAuto ? 'Automated' : 'Automate'}
          </button>
        )}
        {automate && !rule && (
          <button className="ic-automate is-disabled" disabled><Icon name="bolt" size={12} /> Automate</button>
        )}
        {dismiss && <button className="ic-dismiss">Dismiss</button>}
      </div>
    </article>
  );
};

// ============ EXPORTS ============
Object.assign(window, { Icon, Pill, Metric, SectionHead, EmptyState, SubTabs, Sparkline, InsightCard, fmt$, fmt$short });
