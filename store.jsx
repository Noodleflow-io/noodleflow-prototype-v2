// store.jsx — shared automation store
// Embodies the doc's thesis: every insight can become a Rule, and rules are
// the operating system of NoodleFlow. Persisted so created automations stick.

const NFStore = (() => {
  const KEY = 'nf-automations';
  let automations = [];
  try { automations = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { automations = []; }
  const listeners = new Set();
  const emit = () => {
    try { localStorage.setItem(KEY, JSON.stringify(automations)); } catch (e) {}
    listeners.forEach(l => l());
  };
  return {
    get: () => automations,
    has: (id) => automations.some(a => a.id === id),
    add: (a) => { if (!automations.some(x => x.id === a.id)) { automations = [...automations, a]; emit(); } },
    remove: (id) => { automations = automations.filter(a => a.id !== id); emit(); },
    toggle: (a) => { automations.some(x => x.id === a.id) ? NFStore.remove(a.id) : NFStore.add(a); },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); }
  };
})();

// Hook: re-renders the calling component whenever automations change.
const useAutomations = () => {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => NFStore.subscribe(force), []);
  return NFStore.get();
};

Object.assign(window, { NFStore, useAutomations });
