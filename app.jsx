// app.jsx — root app (client-reviewed structure)

const VALID_ROUTES = [
  'command-center', 'ask',
  'run', 'plan', 'grow', 'analyze',
  'bk-accounts', 'bk-allocations', 'bk-payments', 'bk-vendors',
  'rc-overview', 'rc-orders', 'rc-exceptions',
  'automate',
  'settings'
];

const App = () => {
  const [route, setRoute] = useState(() => {
    const saved = localStorage.getItem('nf-route');
    if (saved === 'rc-deposits') return 'rc-overview';
    return VALID_ROUTES.includes(saved) ? saved : 'command-center';
  });
  const [onbOpen, setOnbOpen] = useState(false);
  const [finOpen, setFinOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('nf-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light'; // client: light is the default; dark is opt-in
  });

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setAskOpen(o => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    localStorage.setItem('nf-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // --- topbar config per route ---
  const topbarConfig = {
    'command-center': { title: 'Command Center' },
    run:     { title: 'Business', chip: 'Run' },
    plan:    { title: 'Business', chip: 'Plan' },
    grow:    { title: 'Business', chip: 'Grow' },
    analyze: { title: 'Business', chip: 'Insights' },
    'bk-accounts':    { title: 'Money' },
    'bk-allocations': { title: 'Money' },
    'bk-payments':    { title: 'Money' },
    'bk-vendors':     { title: 'Money' },
    ask:      { title: 'Ask NoodleFlow' },
    settings: { title: 'Settings' },
    'rc-overview':   { title: 'Money', chip: 'Reconcile · Overview' },
    'rc-orders':     { title: 'Money', chip: 'Reconcile · Orders' },
    'rc-exceptions': { title: 'Money', chip: 'Reconcile · Exceptions' },
    automate: { title: 'Automate' }
  };
  const tcfg = topbarConfig[route] || { title: 'NoodleFlow' };

  // --- route → screen ---
  const renderScreen = () => {
    if (route === 'command-center') return <CommandCenter setRoute={setRoute} />;
    if (route === 'ask') return <AskScreen setRoute={setRoute} />;
    if (route === 'settings') return <SettingsScreen onOpenOnboarding={() => setOnbOpen(true)} />;
    if (['run', 'plan', 'grow', 'analyze'].includes(route)) return <Operator route={route} setRoute={setRoute} />;
    if (route.startsWith('bk-')) return <Banking route={route} setRoute={setRoute} />;
    if (route === 'automate') return <AutomateScreen setRoute={setRoute} />;
    if (route.startsWith('rc-')) return <Reconcile route={route} setRoute={setRoute} />;
    return <CommandCenter setRoute={setRoute} />;
  };

  return (
    <>
      <div className="app">
        <Sidebar route={route} setRoute={setRoute} onOpenOnboarding={() => setOnbOpen(true)} onActivateBanking={() => setFinOpen(true)} />
        <main>
          <Topbar title={tcfg.title} chip={tcfg.chip} theme={theme} onSetTheme={setTheme} onAlerts={() => setRoute('run')} />
          <div className="main">{renderScreen()}</div>
        </main>
      </div>
      <button className="ask-fab" onClick={() => setAskOpen(true)} title="Ask NoodleFlow (⌘K)">
        <Icon name="ask" size={16} /> Ask <span className="kbd">⌘K</span>
      </button>
      {askOpen && <AskCommandBar route={route} setRoute={setRoute} onClose={() => setAskOpen(false)} />}
      <ToastHost />
      {onbOpen && <Onboarding onClose={() => setOnbOpen(false)} onComplete={() => { setOnbOpen(false); setRoute('command-center'); }} onActivateBanking={() => { setOnbOpen(false); setTimeout(() => setFinOpen(true), 180); }} />}
      {finOpen && <FinancialActivation onClose={() => setFinOpen(false)} onComplete={() => { setFinOpen(false); setRoute('bk-accounts'); }} />}
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
