// shell.jsx — unified sidebar + topbar (client-reviewed structure, no mode toggle)

const NAV_GROUPS = [
  { group: 'OVERVIEW', items: [
    { key: 'command-center', label: 'Command Center', badge: '2' },
    { key: 'ask', label: 'Ask' }
  ]},
  { group: 'OPERATOR', items: [
    { key: 'run',     label: 'Run' },
    { key: 'plan',    label: 'Plan' },
    { key: 'grow',    label: 'Grow' },
    { key: 'analyze', label: 'Analyze' }
  ]},
  { group: 'BANKING', items: [
    { key: 'bk-accounts',    label: 'Accounts' },
    { key: 'bk-allocations', label: 'Allocations' },
    { key: 'bk-payments',    label: 'Payments' },
    { key: 'bk-vendors',     label: 'Vendors' }
  ]},
  { group: 'ADMIN', items: [
    { key: 'settings', label: 'Settings' }
  ]}
];

const Sidebar = ({ route, setRoute, onOpenOnboarding, onActivateBanking }) => (
  <aside className="sidebar">
    <div className="brand">
      <div className="brand-mark">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 18L19 6"/>
          <path d="M5 6c5 4 9 6 14 12"/>
        </svg>
      </div>
      <div>
        <div className="brand-name">NOODLEFLOW</div>
        <div className="brand-sub">OPERATOR INTEL</div>
      </div>
    </div>

    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 12, marginTop: 8 }}>
      {NAV_GROUPS.map(g => (
        <div key={g.group}>
          <div className="nav-section"><h4>{g.group}</h4></div>
          <div className="nav-list">
            {g.items.map(it => (
              <div
                key={it.key}
                className={`nav-item ${route === it.key ? 'active' : ''}`}
                onClick={() => setRoute(it.key)}>
                <span className="dot"></span>
                <span className="label">{it.label}</span>
                {it.badge && <span className="badge">{it.badge}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={onOpenOnboarding}>
        <Icon name="sparkle" size={12} /> Onboarding Process
      </button>
      {/* <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', color: 'var(--warn)', borderColor: 'rgba(245,184,77,0.32)' }} onClick={onActivateBanking}>
        <Icon name="bolt" size={12} /> Activate banking
      </button> */}
    </div>
    {/* Available footer */}
    <div className="nav-footer">
      <div className="nf-lbl">Available</div>
      <div className="nf-val">$84,200</div>
      <div className="nf-state"><Icon name="arrow_up" size={12} color="var(--ok)" /> Healthy</div>
    </div>
  </aside>
);

// ============ TOPBAR ============
const ThemeToggle = ({ theme, onSetTheme }) => (
  <button
    type="button"
    className="theme-toggle-icon"
    onClick={() => onSetTheme(theme === 'dark' ? 'light' : 'dark')}
    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
  >
    <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
  </button>
);

const Topbar = ({ title, chip, theme, onSetTheme }) => (
  <header className="topbar">
    <div className="tb-title">
      <h1>{title}</h1>
      {chip && <span className="tb-chip">{chip}</span>}
    </div>
    <div className="actions">
      <span className="tb-alerts">2 alerts</span>
      <ThemeToggle theme={theme} onSetTheme={onSetTheme} />
      <span className="tb-avatar">M</span>
    </div>
  </header>
);

Object.assign(window, { Sidebar, Topbar });
