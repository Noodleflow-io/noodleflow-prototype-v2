// command-center.jsx — overview / home (client-reviewed structure)

const CommandCenter = ({ setRoute }) => {
  const autos = useAutomations();
  const metrics = [
    { lbl: 'Cash Available', val: '$84,200', delta: '↑ $6,400 from last week', dir: 'up',
      accent: 'var(--accent)', spark: [4,5,4,6,5,7,6,8] },
    { lbl: 'Revenue This Month', val: '$142,800', delta: '↑ 12% vs. last month', dir: 'up',
      accent: 'var(--ok)', spark: [3,4,4,5,6,6,7,8] },
    { lbl: 'Upcoming Expenses', val: '$38,400', delta: '3 items need attention', dir: 'warn',
      accent: 'var(--warn)', spark: [6,5,7,4,6,5,7,5] },
    { lbl: 'Profit Forecast', val: '$22,100', delta: 'On track for June goal', dir: '',
      accent: 'var(--c-violet)', spark: [4,5,5,6,6,7,7,8] }
  ];

  const alerts = [
    { tone: 'warn',   title: 'Inventory projected to run out in 14 days based on current sales velocity.', cat: 'Inventory' },
    { tone: 'danger', title: 'Revenue for Product A declined 18% over the past 30 days.', cat: 'Products' },
    { tone: 'warn',   title: 'Vendor payments are being made 12 days early — consistently, every month.', cat: 'Payments' }
  ];

  return (
    <div className="col gap-6 fade-in">
      <div>
        <div className="cc-greet">Good morning. Here's where you stand.</div>
        <div className="cc-date">Thursday, June 12 — all data current as of 8:41 AM</div>
      </div>

      {/* Metric strip */}
      <section className="cc-metrics">
        {metrics.map((m, i) => (
          <div key={i} className="cc-metric" style={{ '--cc-accent': m.accent }}>
            <div className="cc-lbl">{m.lbl}</div>
            <div className="cc-val">{m.val}</div>
            <div className={`cc-delta ${m.dir}`}>{m.delta}</div>
            <div className="cc-spark"><Sparkline points={m.spark} color={m.accent} /></div>
          </div>
        ))}
      </section>

      {/* Alerts + Automations */}
      <section className="cc-two">
        <div className="cc-panel">
          <div className="cc-panel-head">
            <h3>Active Alerts</h3>
            <Pill tone="danger">2 need action</Pill>
          </div>
          <div>
            {alerts.map((a, i) => (
              <div key={i} className={`cc-alert ${a.tone}`}>
                <span className="sq" />
                <div>
                  <div className="a-title">{a.title}</div>
                  <div className="a-cat">{a.cat}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cc-panel">
          <div className="cc-panel-head">
            <h3>Active Automations</h3>
            {autos.length > 0 && <Pill tone="ok">{autos.length} active</Pill>}
          </div>
          {autos.length === 0 ? (
            <div className="cc-empty">No automations yet. Create one from any insight card.</div>
          ) : (
            <div>
              {autos.map(a => (
                <div key={a.id} className="cc-auto">
                  <span className="cc-auto-ico"><Icon name="bolt" size={13} /></span>
                  <div className="cc-auto-main">
                    <div className="cc-auto-cat">{a.area || a.category}</div>
                    <div className="cc-auto-rule">{a.rule}</div>
                  </div>
                  <button className="cc-auto-x" title="Turn off" onClick={() => NFStore.remove(a.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Manage entry cards */}
      <section className="cc-manage">
        <div className="cc-manage-card filled" onClick={() => setRoute('run')}>
          <span className="cm-icon"><Icon name="revenue" size={20} /></span>
          <div>
            <div className="cm-eyebrow">Operator</div>
            <div className="cm-title">Manage Business <Icon name="arrow_right" size={18} /></div>
          </div>
          <div className="cm-sub">Run · Plan · Grow · Analyze</div>
        </div>
        <div className="cc-manage-card outline" onClick={() => setRoute('bk-accounts')}>
          <span className="cm-icon"><Icon name="accounts" size={20} /></span>
          <div>
            <div className="cm-eyebrow" style={{ color: 'var(--ok)' }}>Banking</div>
            <div className="cm-title">Manage Money <Icon name="arrow_right" size={18} /></div>
          </div>
          <div className="cm-sub">Accounts · Allocations · Payments · Vendors</div>
        </div>
      </section>
    </div>
  );
};

window.CommandCenter = CommandCenter;
