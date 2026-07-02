// app.jsx — root app (client-reviewed structure)

const VALID_ROUTES = [
  'command-center', 'ask',
  'run', 'plan', 'grow', 'analyze',
  'bk-accounts', 'bk-allocations', 'bk-payments', 'bk-vendors',
  'settings'
];

const App = () => {
  const [route, setRoute] = useState(() => {
    const saved = localStorage.getItem('nf-route');
    return VALID_ROUTES.includes(saved) ? saved : 'command-center';
  });
  const [onbOpen, setOnbOpen] = useState(false);
  const [finOpen, setFinOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('nf-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => { localStorage.setItem('nf-route', route); }, [route]);
  useEffect(() => {
    localStorage.setItem('nf-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // --- topbar config per route ---
  const topbarConfig = {
    'command-center': { title: 'Command Center' },
    run:     { title: 'Operator', chip: 'Run' },
    plan:    { title: 'Operator', chip: 'Plan' },
    grow:    { title: 'Operator', chip: 'Grow' },
    analyze: { title: 'Operator', chip: 'Analyze' },
    'bk-accounts':    { title: 'Banking' },
    'bk-allocations': { title: 'Banking' },
    'bk-payments':    { title: 'Banking' },
    'bk-vendors':     { title: 'Banking' },
    ask:      { title: 'Ask NoodleFlow' },
    settings: { title: 'Settings' }
  };
  const tcfg = topbarConfig[route] || { title: 'NoodleFlow' };

  // --- route → screen ---
  const renderScreen = () => {
    if (route === 'command-center') return <CommandCenter setRoute={setRoute} />;
    if (route === 'ask') return <AskScreen />;
    if (route === 'settings') return <SettingsScreen onOpenOnboarding={() => setOnbOpen(true)} />;
    if (['run', 'plan', 'grow', 'analyze'].includes(route)) return <Operator route={route} setRoute={setRoute} />;
    if (route.startsWith('bk-')) return <Banking route={route} setRoute={setRoute} />;
    return <CommandCenter setRoute={setRoute} />;
  };

  return (
    <>
      <div className="app">
        <Sidebar route={route} setRoute={setRoute} onOpenOnboarding={() => setOnbOpen(true)} onActivateBanking={() => setFinOpen(true)} />
        <main>
          <Topbar title={tcfg.title} chip={tcfg.chip} theme={theme} onSetTheme={setTheme} />
          <div className="main">{renderScreen()}</div>
        </main>
      </div>
      {onbOpen && <Onboarding onClose={() => setOnbOpen(false)} onComplete={() => { setOnbOpen(false); setRoute('command-center'); }} onActivateBanking={() => { setOnbOpen(false); setTimeout(() => setFinOpen(true), 180); }} />}
      {finOpen && <FinancialActivation onClose={() => setFinOpen(false)} onComplete={() => { setFinOpen(false); setRoute('bk-accounts'); }} />}
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
