// extras.jsx — Ask (AI chat), Settings, and Onboarding flow
// Rebuilt into the client/doc structure, reusing existing CSS (.ask-*, .onb-*,
// .conn-tile, .framework-grid/.fw-card, .tabs, .modal*) and NF_DATA.

// ============ ASK NOODLEFLOW ============
const ASK_ANSWERS = {
  default: {
    lead: 'Here is the operator-language read on that.',
    body: 'Grounded in your connected data — deposits, reserves, obligations, and the last 90 days of activity. Ask a follow-up to go deeper on any number.',
    cites: ['Available', 'Reserves', 'Activity']
  },
  spend: {
    lead: 'You can safely deploy about $43,000 this week.',
    body: 'Available is $84,200. After this week’s protected obligations — $28,400 payroll reserve and $12,800 tax hold — roughly $43,000 is free without touching any reserve. Waiting for the Jun 24 deposit lifts that to ~$52,000.',
    cites: ['Available $84,200', 'Payroll $28,400', 'Taxes $12,800']
  },
  partners: {
    lead: 'Two vendors are due in the next 4 days.',
    body: 'Pacific Freight LLC ($1,850, due Jun 14) and StoragePro ($980, due Jun 12) are scheduled early — both qualify for a due-date shift that preserves ~$2,800 in liquidity. Apex Supplies ($4,200) is on time.',
    cites: ['Payments', 'Vendors']
  },
  inventory: {
    lead: 'Coverage is 14 days — below your 21-day threshold.',
    body: 'Current sales velocity depletes stock before the next restock window. Reserving $8,200 now closes the gap; automating it keeps coverage above 21 days going forward.',
    cites: ['Inventory Coverage 14d', 'Run · Inventory']
  },
  taxes: {
    lead: '8.5% of every Amazon deposit is auto-held for taxes.',
    body: 'That feeds the Tax Reserve ($12,800) automatically on each settlement, so quarterly obligations stay funded without manual transfers.',
    cites: ['Tax Reserve', 'Allocations']
  }
};
const pickAnswer = (q) => {
  const s = q.toLowerCase();
  if (s.includes('spend')) return ASK_ANSWERS.spend;
  if (s.includes('partner') || s.includes('paid')) return ASK_ANSWERS.partners;
  if (s.includes('inventory')) return ASK_ANSWERS.inventory;
  if (s.includes('tax') || s.includes('amazon')) return ASK_ANSWERS.taxes;
  return ASK_ANSWERS.default;
};

const AskScreen = () => {
  const D = window.NF_DATA;
  const suggestions = (D.askQuestions && D.askQuestions[0] && D.askQuestions[0].items) || [];
  const [messages, setMessages] = useState([
    { role: 'ai', lead: 'Ask me anything about your cash, reserves, or operations.',
      body: 'I answer in operator language and cite the numbers behind every response. Try one of the prompts on the right.',
      cites: [], quick: suggestions.slice(0, 3) }
  ]);
  const [draft, setDraft] = useState('');
  const send = (text) => {
    const q = (text || '').trim();
    if (!q) return;
    const a = pickAnswer(q);
    setMessages(m => [...m, { role: 'user', text: q }, { role: 'ai', ...a }]);
    setDraft('');
  };
  return (
    <div className="ask-grid fade-in">
      <div className="ask-thread">
        {messages.map((m, i) => m.role === 'user' ? (
          <div key={i} className="ask-msg-user">{m.text}</div>
        ) : (
          <div key={i} className="ask-msg-ai">
            <div className="label">NoodleFlow</div>
            <div className="content">
              {m.lead && <div className="answer-lead">{m.lead}</div>}
              {m.body}
              {m.cites && m.cites.length > 0 && (
                <div className="citations">{m.cites.map((c, j) => <span key={j} className="cite">{c}</span>)}</div>
              )}
              {m.quick && m.quick.length > 0 && (
                <div className="quick">{m.quick.map((q, j) => <button key={j} className="q" onClick={() => send(q)}>{q}</button>)}</div>
              )}
            </div>
          </div>
        ))}
        <div className="ask-input-row">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(draft); }}
            placeholder="Ask about cash, reserves, partners, or what to do next…" />
          <button className="btn btn-primary btn-sm" onClick={() => send(draft)}><Icon name="arrow_right" size={14} /> Ask</button>
        </div>
      </div>

      <div className="ask-side">
        {(D.askQuestions || []).map((grp, i) => (
          <div key={i}>
            <h4>{grp.cat}</h4>
            <div className="col gap-2" style={{ marginTop: 8 }}>
              {grp.items.map((q, j) => (
                grp.cat === 'Best for'
                  ? <div key={j} style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5, padding: '4px 0' }}>· {q}</div>
                  : <div key={j} className="q-item" onClick={() => send(q)}>{q}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ SETTINGS ============
const SET_TABS = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'team', label: 'Team' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'billing', label: 'Billing' },
  { key: 'security', label: 'Security' }
];

const Toggle = ({ on, onClick }) => (
  <button onClick={onClick} aria-pressed={on} style={{
    width: 40, height: 22, borderRadius: 99, padding: 2, flexShrink: 0,
    background: on ? 'var(--accent)' : 'var(--progress-track)', transition: 'background .15s var(--ease)'
  }}>
    <span style={{ display: 'block', width: 18, height: 18, borderRadius: 99, background: '#fff',
      transform: on ? 'translateX(18px)' : 'translateX(0)', transition: 'transform .15s var(--ease)' }} />
  </button>
);

const SetRow = ({ title, sub, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--border-faint)' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-1)' }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

const SettingsScreen = ({ onOpenOnboarding }) => {
  const [tab, setTab] = useState('workspace');
  const [toggles, setToggles] = useState({ alerts: true, weekly: true, automations: true, twofa: true });
  const t = k => setToggles(s => ({ ...s, [k]: !s[k] }));
  const D = window.NF_DATA;

  return (
    <div className="col gap-6 fade-in">
      <SubTabs items={SET_TABS} active={tab} onChange={setTab} />

      {tab === 'workspace' && (
        <div className="card" style={{ padding: '6px 24px 18px' }}>
          <SetRow title="Business name" sub={(D.brand && D.brand.name) || 'Ridgepoint Goods'} right={<button className="btn btn-ghost btn-sm">Edit</button>} />
          <SetRow title="Operating framework" sub={(D.brand && D.brand.framework) || 'Ecommerce Operator'} right={<button className="btn btn-ghost btn-sm" onClick={onOpenOnboarding}>Change</button>} />
          <SetRow title="Default currency" sub="USD · $" right={<button className="btn btn-ghost btn-sm">Edit</button>} />
          <SetRow title="Setup & activation" sub="Re-run connection, framework, and banking activation." right={<button className="btn btn-primary btn-sm" onClick={onOpenOnboarding}><Icon name="sparkle" size={12} /> Run setup</button>} />
        </div>
      )}

      {tab === 'team' && (
        <div className="card" style={{ padding: '6px 24px 18px' }}>
          <SetRow title="M. Ridge" sub="Owner · full access" right={<span className="pill pill-neutral">Owner</span>} />
          <SetRow title="A. Chen" sub="Operations · can approve payments" right={<span className="pill pill-neutral">Admin</span>} />
          <SetRow title="Invite a teammate" sub="Add bookkeepers or operators with scoped access." right={<button className="btn btn-primary btn-sm"><Icon name="plus" size={12} /> Invite</button>} />
        </div>
      )}

      {tab === 'integrations' && (
        <div className="card" style={{ padding: '6px 24px 18px' }}>
          <SetRow title="Shopify" sub="Connected · synced 2 min ago" right={<span className="bk-status">Active</span>} />
          <SetRow title="Amazon Seller" sub="Connected · synced 18 min ago" right={<span className="bk-status">Active</span>} />
          <SetRow title="QuickBooks" sub="Connected · ledger sync on" right={<span className="bk-status">Active</span>} />
          <SetRow title="Add integration" sub="Stripe, Square, Plaid, and more." right={<button className="btn btn-ghost btn-sm" onClick={onOpenOnboarding}>Browse</button>} />
        </div>
      )}

      {tab === 'notifications' && (
        <div className="card" style={{ padding: '6px 24px 18px' }}>
          <SetRow title="Critical alerts" sub="Reserve shortfalls, payment risks, inventory depletion." right={<Toggle on={toggles.alerts} onClick={() => t('alerts')} />} />
          <SetRow title="Weekly cash summary" sub="Monday morning recap of position and opportunities." right={<Toggle on={toggles.weekly} onClick={() => t('weekly')} />} />
          <SetRow title="Automation activity" sub="Notify when a rule fires or adjusts cash behavior." right={<Toggle on={toggles.automations} onClick={() => t('automations')} />} />
        </div>
      )}

      {tab === 'billing' && (
        <div className="card" style={{ padding: '6px 24px 18px' }}>
          <SetRow title="Plan" sub="Operator Pro · $99/mo" right={<button className="btn btn-ghost btn-sm">Manage</button>} />
          <SetRow title="Payment method" sub="Visa ···· 1188" right={<button className="btn btn-ghost btn-sm">Update</button>} />
          <SetRow title="Next invoice" sub="Jul 12, 2026 · $99.00" right={<span className="pill pill-ok">On file</span>} />
        </div>
      )}

      {tab === 'security' && (
        <div className="card" style={{ padding: '6px 24px 18px' }}>
          <SetRow title="Two-factor authentication" sub="Required for payments and account changes." right={<Toggle on={toggles.twofa} onClick={() => t('twofa')} />} />
          <SetRow title="Active sessions" sub="2 devices · last login today" right={<button className="btn btn-ghost btn-sm">Review</button>} />
          <SetRow title="Data & export" sub="Download your data or revoke connections." right={<button className="btn btn-ghost btn-sm"><Icon name="download" size={12} /> Export</button>} />
        </div>
      )}
    </div>
  );
};

// ============ ONBOARDING ============
const ONB_CONNECTORS = [
  { id: 'shopify', name: 'Shopify', sub: 'Commerce' },
  { id: 'amazon', name: 'Amazon Seller', sub: 'Marketplace' },
  { id: 'wholesale', name: 'Wholesale', sub: 'B2B orders' },
  { id: 'quickbooks', name: 'QuickBooks', sub: 'Accounting' },
  { id: 'stripe', name: 'Stripe', sub: 'Payments' },
  { id: 'bank', name: 'Bank (Plaid)', sub: 'Accounts' }
];

// Shared multi-step shell (numbered rail + track pill) — matches the original.
const OnbShell = ({ track, stepIndex, stepCount, eyebrow, badge, title, lede, onClose, children, footLeft, footRight }) => (
  <div className="onb2-scrim" onClick={onClose}>
    <div className="onb2-panel" onClick={e => e.stopPropagation()}>
      <div className="onb2-head"><span className={`onb2-track ${track.cls}`}>{track.label}</span></div>
      <div className="onb2-rail">
        {Array.from({ length: stepCount }).map((_, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className={`onb2-rail-line ${i <= stepIndex ? 'done' : ''}`} />}
            <span className={`onb2-rail-step ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}`}>{i < stepIndex ? '✓' : i + 1}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="onb2-body">
        <div className="onb2-eyebrow">{eyebrow}</div>
        {badge && <div className="onb2-badge">{badge}</div>}
        <div className="onb2-title">{title}</div>
        {lede && <div className="onb2-lede">{lede}</div>}
        {children}
      </div>
      <div className="onb2-foot">
        <div>{footLeft}</div>
        <div className="onb2-foot-right">{footRight}</div>
      </div>
    </div>
  </div>
);

const Field = ({ label, req, ...rest }) => (
  <div className="onb2-field">
    <label className="onb2-label">{label}{req && <span className="onb2-req">Required</span>}</label>
    <input className="onb2-input" {...rest} />
  </div>
);

// ============ TRACK A · PLATFORM ONBOARDING (8 steps) ============
const A_CHANNELS = [
  { id: 'shopify', name: 'Shopify', sub: 'Commerce' },
  { id: 'amazon', name: 'Amazon Seller', sub: 'Marketplace' },
  { id: 'woocommerce', name: 'WooCommerce', sub: 'Commerce' },
  { id: 'etsy', name: 'Etsy', sub: 'Marketplace' },
  { id: 'ebay', name: 'eBay', sub: 'Marketplace' },
  { id: 'walmart', name: 'Walmart', sub: 'Marketplace' }
];
const A_BANKS = [
  { name: 'Chase', sub: 'Business · Personal' },
  { name: 'Bank of America', sub: 'Business · Personal' },
  { name: 'Wells Fargo', sub: 'Business · Personal' },
  { name: 'Capital One', sub: 'Spark Business · 360' },
  { name: 'Citi', sub: 'Business · Personal' },
  { name: 'SVB', sub: 'Startup business' }
];
const A_ROLES = [
  { name: 'Owner / admin', tag: 'Full access', desc: 'Manage banking, payments, rules, billing, team. Required: at least one.' },
  { name: 'Finance', tag: 'Money + rules', desc: 'Approve payments, edit allocation rules, view all bank activity. Cannot manage team.' },
  { name: 'Ops', tag: 'Operations', desc: 'View operational insights, manage commerce connections, run simulations. No banking visibility.' },
  { name: 'Read-only / advisor', tag: 'Insights only', desc: 'View dashboards and reports. No edit access. Useful for accountants, investors, advisors.' }
];
const A_STEPS = [
  { k: 'Sign-up',          t: 'Create your NoodleFlow workspace.' },
  { k: 'Business profile', t: 'Tell us about the business.' },
  { k: 'Team & roles',     t: 'Invite your team.', optional: true, optInTitle: true },
  { k: 'Sales channels',   t: 'Connect your sales channels.' },
  { k: 'Bank aggregator',  t: 'Connect external bank accounts via Plaid.', optional: true },
  { k: 'Accounting',       t: 'Connect accounting', optional: true, optInTitle: true },
  { k: 'Backfill',         t: 'Backfilling your commerce history.' },
  { k: 'Ready',            t: "You're in. Operational insights are live." }
];
const A_LEDES = [
  "One workspace per business. You can invite teammates and assign roles in a moment. Banking activation happens later — for now you'll explore operational insights.",
  "Legal name and identifiers — used inside NoodleFlow only at this stage. Full KYB verification (including beneficial owners) happens separately during financial activation.",
  "Role-based permissions control who sees banking data, edits allocation rules, approves payments, or only views insights. You can skip now and invite teammates anytime from Settings — every action is always logged with actor identity.",
  "Where your revenue comes from. NoodleFlow reads orders, SKUs, line items, refunds, and payouts from each channel to build your operating picture. Connect all that apply.",
  "Read-only access to your existing business bank accounts. NoodleFlow uses these transactions to enrich reconciliation, forecast Available across all accounts, and surface cash compression earlier. This is different from the merchant financial account — that's provisioned later, during financial activation.",
  "QuickBooks materially improves reconciliation logic and automation — but you can skip and add it later. Recommended for any merchant already using QuickBooks for bookkeeping.",
  "NoodleFlow is pulling the last 90 days of orders, SKUs, line items, taxes, discounts, refunds, and (if linked) external bank activity. This runs in the background — you can move on as soon as the first source completes.",
  "1 commerce platform connected. Your home screen shows what's running through NoodleFlow — read-only until banking is activated."
];
const A_SKIP = ['Skip for now', 'Skip for now', 'Skip team setup', 'Skip for now', 'Skip Plaid', 'Skip accounting', 'Skip for now', null];

const Onboarding = ({ onClose, onComplete, onActivateBanking }) => {
  const D = window.NF_DATA;
  const [step, setStep] = useState(0);
  const [channels, setChannels] = useState(['woocommerce']);
  const [banks, setBanks] = useState([]);
  const [acct, setAcct] = useState('quickbooks');
  const toggleCh = id => setChannels(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  const toggleBank = n => setBanks(b => b.includes(n) ? b.filter(x => x !== n) : [...b, n]);
  const next = () => setStep(s => Math.min(s + 1, 7));
  const back = () => setStep(s => Math.max(s - 1, 0));
  const meta = A_STEPS[step];

  const eyebrow = (
    <>Step {step + 1} of 8 · {meta.k}{meta.optional && <span className="onb2-optional">Optional</span>}</>
  );
  const title = meta.optInTitle
    ? <>{meta.t} <span className="opt">(optional)</span></>
    : meta.t;

  const footLeft = A_SKIP[step]
    ? <span className="onb2-skip" onClick={onClose}>{A_SKIP[step]}</span>
    : null;
  const footRight = step < 7
    ? <>
        {step > 0 && <button className="btn btn-ghost btn-sm" onClick={back}>Back</button>}
        <button className="btn btn-primary" onClick={next}>Continue <Icon name="arrow_right" size={14} /></button>
      </>
    : <>
        <button className="btn btn-ghost" onClick={onComplete}>Done</button>
        {/* <button className="btn btn-primary" onClick={onActivateBanking}><Icon name="bolt" size={14} /> Activate banking</button> */}
      </>;

  return (
    <OnbShell
      track={{ cls: 'track-a', label: 'Track A · Platform Onboarding' }}
      stepIndex={step} stepCount={8}
      eyebrow={eyebrow}
      badge={step === 7 ? 'Platform onboarding complete' : null}
      title={title} lede={A_LEDES[step]}
      onClose={onClose} footLeft={footLeft} footRight={footRight}>

      {/* 1 · Sign-up */}
      {step === 0 && (
        <>
          <Field label="Workspace name" req defaultValue={(D.brand && D.brand.name) || 'Ridgepoint Goods'} />
          <div className="onb2-hint" style={{ marginTop: -10, marginBottom: 20 }}>Shown on every screen. Editable later from Settings.</div>
          <div className="onb2-row">
            <Field label="Work email" req defaultValue="morgan@ridgepoint.co" type="email" />
            <div className="onb2-field">
              <label className="onb2-label">Password <span className="onb2-req">Required</span></label>
              <input className="onb2-input" type="password" defaultValue="ridgepoint01" />
              <div className="onb2-hint">12+ characters · 2FA enabled by default.</div>
            </div>
          </div>
        </>
      )}

      {/* 2 · Business profile */}
      {step === 1 && (
        <>
          <Field label="Legal business name" req defaultValue={((D.brand && D.brand.name) || 'Ridgepoint Goods') + ', LLC'} />
          <div className="onb2-row">
            <Field label="EIN" req defaultValue="83-4421907" />
            <div className="onb2-field">
              <label className="onb2-label">Entity type</label>
              <select className="onb2-select" defaultValue="llc-dtc">
                <option value="llc-dtc">LLC · Direct-to-consumer</option>
                <option value="llc-whl">LLC · Wholesale</option>
                <option value="ccorp">C-Corp</option>
                <option value="scorp">S-Corp</option>
                <option value="sole">Sole proprietor</option>
              </select>
            </div>
          </div>
          <Field label="Business address" defaultValue="244 NW 12th Ave" />
          <div className="onb2-row">
            <Field label="City" defaultValue="Portland" />
            <Field label="State" defaultValue="OR" />
            <Field label="ZIP" defaultValue="97209" />
          </div>
        </>
      )}

      {/* 3 · Team & roles */}
      {step === 2 && (
        <>
          <div className="role-grid">
            {A_ROLES.map(r => (
              <div key={r.name} className="role-card">
                <div className="role-card-top">
                  <span className="role-card-name">{r.name}</span>
                  <span className="role-card-tag">{r.tag}</span>
                </div>
                <div className="role-card-desc">{r.desc}</div>
              </div>
            ))}
          </div>
          <div className="onb-member-row">
            <span className="m-name">Morgan Ridge</span>
            <span className="m-email">morgan@ridgepoint.co</span>
            <span className="onb-member-badge">Owner / admin</span>
          </div>
          <button className="onb-add-member"><Icon name="plus" size={13} /> Add team member</button>
        </>
      )}

      {/* 4 · Sales channels */}
      {step === 3 && (
        <div className="bank-grid">
          {A_CHANNELS.map(c => {
            const on = channels.includes(c.id);
            return (
              <div key={c.id} className={`bank-tile ${on ? 'on' : ''}`} onClick={() => toggleCh(c.id)}>
                <div className="bt-name">{c.name}{on && <span style={{ color: 'var(--ok)', fontSize: 11, fontWeight: 600, float: 'right' }}>● Connected</span>}</div>
                <div className="bt-sub">{c.sub}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5 · Bank aggregator */}
      {step === 4 && (
        <>
          <div className="bank-search">
            <span className="bs-ico"><Icon name="accounts" size={16} /></span>
            <span className="bs-ph">Search 10,000+ banks and credit unions…</span>
            <span className="bs-tag">Via Plaid</span>
          </div>
          <div className="bank-grid">
            {A_BANKS.map(b => {
              const on = banks.includes(b.name);
              return (
                <div key={b.name} className={`bank-tile ${on ? 'on' : ''}`} onClick={() => toggleBank(b.name)}>
                  <div className="bt-name">{b.name}</div>
                  <div className="bt-sub">{b.sub}</div>
                </div>
              );
            })}
          </div>
          <div className="onb-note">
            <b>How this differs from financial activation.</b> Plaid gives NoodleFlow a <b>read-only</b> view of your existing accounts to improve insights. Financial activation provisions a <b>new merchant account</b> in NoodleFlow's sponsor-bank where deposits, payouts, and reserves actually live.
          </div>
        </>
      )}

      {/* 6 · Accounting */}
      {step === 5 && (
        <>
          <div className="bank-grid">
            {[
              { id: 'quickbooks', name: 'QuickBooks Online', sub: 'Accounting · Recommended', connected: true },
              { id: 'xero', name: 'Xero', sub: 'Accounting' },
              { id: 'wave', name: 'Wave', sub: 'Accounting · Free tier' }
            ].map(a => {
              const on = acct === a.id;
              return (
                <div key={a.id} className={`bank-tile ${on ? 'on' : ''}`} onClick={() => setAcct(on ? '' : a.id)}>
                  <div className="bt-name">{a.name}{a.connected && on && <span style={{ color: 'var(--ok)', fontSize: 11, fontWeight: 600, float: 'right' }}>● Connected</span>}</div>
                  <div className="bt-sub">{a.sub}</div>
                </div>
              );
            })}
          </div>
          <div className="onb-note">
            <b>Why we recommend it.</b> Reconciliation accuracy improves by ~14% when accounting categories are available at deposit time. Automatically syncs allocations back so your books match NoodleFlow's reserve state.
          </div>
        </>
      )}

      {/* 7 · Backfill */}
      {step === 6 && (
        <div style={{ marginTop: 6 }}>
          {[{ name: 'WooCommerce', status: 'Complete' }, { name: 'QuickBooks · Chart of accounts', status: 'Imported' }].map(b => (
            <div key={b.name} className="bf-row">
              <div className="bf-top">
                <span className="bf-name">{b.name}</span>
                <span className="bf-status"><Icon name="check" size={13} /> {b.status}</span>
              </div>
              <div className="bf-track"><i style={{ width: '100%' }} /></div>
            </div>
          ))}
        </div>
      )}

      {/* 8 · Ready */}
      {step === 7 && (
        <>
          <div className="onb-stats">
            <div className="onb-stat" style={{ '--os-accent': 'var(--accent)' }}>
              <div className="os-lbl">Commerce connected</div>
              <div className="os-val">{channels.length}</div>
              <div className="os-sub">Backfilled · normalized</div>
            </div>
            <div className="onb-stat" style={{ '--os-accent': 'var(--c-cyan)' }}>
              <div className="os-lbl">Banks linked</div>
              <div className="os-val">{banks.length}</div>
              <div className="os-sub">Read-only · via Plaid</div>
            </div>
            <div className="onb-stat" style={{ '--os-accent': 'var(--ok)' }}>
              <div className="os-lbl">Insights surface</div>
              <div className="os-val">Live</div>
              <div className="os-sub">Command Center · Operator</div>
            </div>
          </div>
          <div className="onb-next">
            <span className="on-ico"><Icon name="bolt" size={16} /></span>
            {/* <span className="on-text"><b>Next: activate banking.</b> A separate flow (KYB → financial account → reserves &amp; rules) unlocks allocations, payments, and ledger. Available anytime from the sidebar.</span> */}
          </div>
        </>
      )}
    </OnbShell>
  );
};

// ============ TRACK B · BANKING ACTIVATION ============
const FIN_RESERVES = [
  { name: 'Payroll', color: 'var(--accent)', pct: '34%' },
  { name: 'Inventory', color: 'var(--ok)', pct: '22%' },
  { name: 'Taxes', color: 'var(--warn)', pct: '15%' },
  { name: 'Marketing', color: 'var(--c-violet)', pct: '11%' },
  { name: 'Growth', color: 'var(--c-cyan)', pct: '18%' }
];
const B_STEPS = [
  { k: 'Business', t: 'Activate NoodleFlow Banking.', l: 'Open your FDIC-insured account to unlock allocations, payments, and cards. First, a quick business verification (KYB) through our sponsor-bank partner.' },
  { k: 'Owner', t: 'Verify the account owner.', l: 'Federal regulation requires verifying the identity of the primary account owner before opening your account.' },
  { k: 'Agreements', t: 'Review and accept.', l: 'A few agreements from our sponsor bank. Review and accept all three to continue.' },
  { k: 'Account', t: 'Your account is open.', l: 'FDIC-insured up to $250K. Deposits land here first, then flow into your reserves automatically.' },
  { k: 'Reserves', t: 'Set up your reserves.', l: 'Your Ecommerce Operator framework creates these protected reserves. Cash auto-allocates into each from every deposit.' },
  { k: 'Done', t: 'Banking is live.', l: 'Your account is open and reserves are protecting payroll, inventory, and taxes. Allocations, payments, and cards are now unlocked.' }
];

const FinancialActivation = ({ onClose, onComplete }) => {
  const D = window.NF_DATA;
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState({ deposit: false, esign: false, privacy: false });
  const allAgreed = agreed.deposit && agreed.esign && agreed.privacy;
  const tg = k => setAgreed(s => ({ ...s, [k]: !s[k] }));
  const next = () => step < 5 ? setStep(step + 1) : onComplete();
  const back = () => step > 0 && setStep(step - 1);
  const meta = B_STEPS[step];
  const blocked = step === 2 && !allAgreed;

  const footLeft = step > 0
    ? <button className="btn btn-ghost btn-sm" onClick={back}>Back</button>
    : <span className="onb2-skip" onClick={onClose}>Skip for now</span>;
  const footRight = (
    <button className="btn btn-primary" onClick={next} disabled={blocked} style={blocked ? { opacity: 0.45, cursor: 'not-allowed' } : {}}>
      {['Continue', 'Continue', 'Accept & continue', 'Continue', 'Create reserves', 'Go to Banking'][step]}
      {step < 5 && <Icon name="arrow_right" size={14} />}
    </button>
  );

  return (
    <OnbShell
      track={{ cls: 'track-b', label: 'Track B · Banking Activation' }}
      stepIndex={step} stepCount={6}
      eyebrow={`Step ${step + 1} of 6 · ${meta.k}`}
      title={meta.t} lede={meta.l}
      onClose={onClose} footLeft={footLeft} footRight={footRight}>

      {step === 0 && (
        <>
          <Field label="Legal business name" req defaultValue={((D.brand && D.brand.name) || 'Ridgepoint Goods') + ' LLC'} />
          <div className="onb2-row">
            <Field label="EIN" req defaultValue="88-3940231" />
            <Field label="Business type" defaultValue="LLC · Ecommerce" />
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <Field label="Full legal name" req defaultValue="Morgan Ridge" />
          <div className="onb2-row">
            <Field label="Date of birth" req defaultValue="04 / 18 / 1989" />
            <Field label="SSN (last 4)" req defaultValue="••• •• 4821" />
          </div>
          <Field label="Home address" defaultValue="2140 Cedar Ave, Portland, OR 97201" />
        </>
      )}

      {step === 2 && (
        <div className="col gap-2">
          {[['deposit', 'Deposit Account Agreement', 'Terms for your sponsor-bank deposit account.'],
            ['esign', 'E-Sign Consent', 'Agree to receive disclosures electronically.'],
            ['privacy', 'Privacy Notice', 'How your information is used and protected.']].map(([k, t, s]) => (
            <div key={k} className={`onb2-checkrow ${agreed[k] ? 'on' : ''}`} onClick={() => tg(k)}>
              <span className="onb2-checkbox"><Icon name="check" size={13} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-1)' }}>{t}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{s}</div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--accent)' }}>Read</span>
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <>
          <div className="bk-account primary" style={{ maxWidth: 420 }}>
            <div className="bk-account-top"><span className="bk-l">Checking · Primary</span></div>
            <div className="bk-name">Operating · NoodleFlow</div>
            <div className="bk-val">$0.00</div>
            <div className="bk-meta"><span>••8412 · ••4412</span><span className="bk-status">Active</span></div>
          </div>
          <div className="link-liquidity-note" style={{ marginTop: 16, maxWidth: 560 }}>
            <span className="link-liquidity-icon"><Icon name="check" size={14} /></span>
            <span className="link-liquidity-text"><b>FDIC-insured</b> up to $250,000 via sponsor-bank partner. No monthly fees, no minimums.</span>
          </div>
        </>
      )}

      {step === 4 && (
        <div className="col gap-2">
          {FIN_RESERVES.map(r => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'var(--surface-row)', border: '1px solid var(--border-faint)', borderRadius: 12 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: r.color }} />
              <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text-1)' }}>{r.name} Reserve</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.pct}</span>
              <span style={{ fontSize: 11, color: 'var(--ok)' }}>Auto-allocated</span>
            </div>
          ))}
        </div>
      )}

      {step === 5 && (
        <div className="col gap-2">
          {['FDIC-insured account is open', 'Reserves mirror your operating framework', 'Allocations, Payments, and Cards unlocked', 'Deposits now auto-allocate on arrival'].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: 'var(--text-2)' }}>
              <Icon name="check" size={15} color="var(--ok)" /> {s}
            </div>
          ))}
        </div>
      )}
    </OnbShell>
  );
};

Object.assign(window, { AskScreen, SettingsScreen, Onboarding, FinancialActivation });
