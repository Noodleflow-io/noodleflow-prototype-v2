// command-center.jsx — business health overview + notable changes + automation
// digest. Distinct job from Run (Run = today's action queue).

const CommandCenter = ({ setRoute }) => {
  const autos = useAutomations();
  const cash = useCash();
  const metrics = [
    { lbl: 'Cash Available', val: fmt$(cash.available), delta: '↑ $6,400 from last week', dir: 'up',
      accent: 'var(--accent)', spark: [4,5,4,6,5,7,6,8], info: true },
    { lbl: 'Revenue This Month', val: '$142,800', delta: '↑ 12% vs. last month', dir: 'up',
      accent: 'var(--ok)', spark: [3,4,4,5,6,6,7,8] },
    { lbl: 'Upcoming Expenses', val: fmt$(cash.committed), delta: '3 items need attention', dir: 'warn',
      accent: 'var(--warn)', spark: [6,5,7,4,6,5,7,5] },
    { lbl: 'Profit Forecast', val: '$22,100', delta: 'On track for June goal', dir: '',
      accent: 'var(--c-violet)', spark: [4,5,5,6,6,7,7,8] }
  ];

  // "What changed" — notable changes since yesterday (overview job, not the action queue).
  const changes = [
    { tone: 'up',   title: 'Shopify revenue up 8% week-over-week', cat: 'Revenue', route: 'grow' },
    { tone: 'warn', title: 'Inventory coverage dropped to 14 days', cat: 'Inventory', route: 'run' },
    { tone: 'down', title: 'Product A revenue down 18% over 30 days', cat: 'Products', route: 'grow' },
    { tone: 'up',   title: 'SKU-113 margin improved 48% → 68%', cat: 'Insights', route: 'analyze' }
  ];

  // Weekly automation digest — what NoodleFlow did without you.
  const digest = [
    { t: 'Held 8.5% of 6 deposits for taxes', s: 'Tax Reserve · automated', v: '+$1,240' },
    { t: 'Swept operating surplus to Growth Reserve', s: 'Ran Monday 9:00 AM', v: '+$3,100' },
    { t: 'Deferred 2 early vendor payments to due date', s: 'Preserved liquidity', v: '+$2,800' }
  ];
  const digestTotal = '$7,140';

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
            <div className="cc-lbl">{m.lbl}{m.info && <CashInfo />}</div>
            <div className="cc-val"><LiveValue value={m.val} /></div>
            <div className={`cc-delta ${m.dir}`}>{m.delta}</div>
            <div className="cc-spark"><Sparkline points={m.spark} color={m.accent} /></div>
          </div>
        ))}
      </section>

      {/* Action nudge → Run owns the action queue */}
      <div className="card" style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--warn-soft)', color: 'var(--warn)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="bolt" size={16} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}>3 actions are waiting for you</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Reorder inventory, top up payroll reserve, review payment timing.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setRoute('run')}>Go to Run <Icon name="arrow_right" size={13} /></button>
      </div>

      {/* What changed + Automations */}
      <section className="cc-two">
        <div className="cc-panel">
          <div className="cc-panel-head">
            <h3>What changed</h3>
            <Pill tone="info" dot={false}>Since yesterday</Pill>
          </div>
          <div>
            {changes.map((a, i) => (
              <div key={i} className={`cc-alert ${a.tone === 'up' ? 'ok' : a.tone === 'down' ? 'danger' : 'warn'} row-clickable`} onClick={() => setRoute(a.route)}>
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

      {/* Weekly digest — reinforces "operating system that acts" */}
      <div className="cc-panel">
        <div className="cc-panel-head">
          <h3>This week, NoodleFlow handled</h3>
          <Pill tone="ok" dot={false}>{digestTotal} impact</Pill>
        </div>
        <div className="digest-list">
          {digest.map((d, i) => (
            <div key={i} className="digest-item">
              <span className="digest-ico"><Icon name="check" size={13} /></span>
              <div style={{ flex: 1 }}><div className="dt">{d.t}</div><div className="ds">{d.s}</div></div>
              <span className="dv">{d.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Manage entry cards */}
      <section className="cc-manage">
        <div className="cc-manage-card filled" onClick={() => setRoute('run')}>
          <span className="cm-icon"><Icon name="revenue" size={20} /></span>
          <div>
            <div className="cm-eyebrow">Business</div>
            <div className="cm-title">Manage Business <Icon name="arrow_right" size={18} /></div>
          </div>
          <div className="cm-sub">Run · Plan · Grow · Insights</div>
        </div>
        <div className="cc-manage-card outline" onClick={() => setRoute('bk-accounts')}>
          <span className="cm-icon"><Icon name="accounts" size={20} /></span>
          <div>
            <div className="cm-eyebrow" style={{ color: 'var(--ok)' }}>Money</div>
            <div className="cm-title">Manage Money <Icon name="arrow_right" size={18} /></div>
          </div>
          <div className="cm-sub">Accounts · Reserves · Payments · Vendors</div>
        </div>
      </section>
    </div>
  );
};

window.CommandCenter = CommandCenter;
