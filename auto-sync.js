(() => {
  const isPreview = document.querySelector('meta[name="universal-rebalance-deployment-environment"]')?.content === 'preview';
  const STORAGE_KEYS = [isPreview ? 'family-universal-rebalance-preview-v100-state' : 'family-universal-rebalance-v100-state'];
  const REMOVED_SYMBOLS = new Set();
  const DEFAULT_HOLDINGS = [
    { symbol: '00662', name: '富邦NASDAQ', shares: 0, avgCost: 0, targetWeight: 40, assetClass: 'growth' },
    { symbol: '00670L', name: '富邦NASDAQ正2', shares: 0, avgCost: 0, targetWeight: 38, assetClass: 'growth' },
    { symbol: '00865B', name: '國泰US短期公債', shares: 0, avgCost: 0, targetWeight: 20, assetClass: 'defensive' },
    { symbol: '00631L', name: '元大台灣50正2', shares: 0, avgCost: 0, targetWeight: 1, assetClass: 'growth' }
  ];
  const REMOVED_RECORD_KEY = ['tra', 'des'].join('');
  const STALE_KEYS = ['strategy', 'strategies', 'targetAllocation', 'assetAllocation', 'portfolioSummary', 'strategyTotal', 'defaultHoldings', ['default', 'Tr', 'ades'].join(''), 'monthlyContribution', 'simCagr', 'simDividend', 'simYears', REMOVED_RECORD_KEY];
  const DEFAULT_GROWTH_TARGET = 1;
  const MIN_GROWTH_TARGET = 0;
  const MAX_GROWTH_TARGET = 100;

  function clampTarget(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.min(MAX_GROWTH_TARGET, Math.max(MIN_GROWTH_TARGET, numeric));
  }

  function safeNumber(value) {
    const numeric = Number(value) || 0;
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function safeHoldings(holdings) {
    return Array.isArray(holdings) ? holdings.filter(Boolean) : [];
  }

  function normalizeSymbol(value) {
    return String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
  }

  function rawTargetOf(asset) {
    return asset?.targetWeight ?? asset?.targetPercent ?? asset?.targetRatio ?? asset?.allocation ?? 0;
  }

  function normalizeAssetClass(value, symbol) {
    if (value === 'defensive') return 'defensive';
    if (value === 'growth') return 'growth';
    return normalizeSymbol(symbol) === '00865B' ? 'defensive' : 'growth';
  }

  function normalizeHolding(asset) {
    const symbol = normalizeSymbol(asset?.symbol);
    if (!symbol || REMOVED_SYMBOLS.has(symbol)) return null;
    return {
      ...asset,
      symbol,
      shares: Math.max(0, safeNumber(asset?.shares)),
      avgCost: Math.max(0, safeNumber(asset?.avgCost)),
      targetWeight: clampTarget(rawTargetOf(asset)),
      assetClass: normalizeAssetClass(asset?.assetClass, symbol)
    };
  }

  function sanitizeState(value) {
    if (!value || typeof value !== 'object') return {};
    const state = { ...value };
    STALE_KEYS.forEach((key) => delete state[key]);
    const hasHoldingsData = Array.isArray(state.holdings);
    const sourceHoldings = hasHoldingsData ? state.holdings : (localStorage.getItem(STORAGE_KEYS[0]) ? [] : DEFAULT_HOLDINGS);
    state.holdings = safeHoldings(sourceHoldings).map(normalizeHolding).filter(Boolean);
    const removedSymbol = Array.from(REMOVED_SYMBOLS)[0];
    state.cash = Array.isArray(state.cash) ? state.cash.filter((c) => !removedSymbol || ![c?.id, c?.name, c?.note].some((v) => String(v ?? '').includes(removedSymbol))) : [];
    state.loans = Array.isArray(state.loans) ? state.loans.map((loan) => {
      const savedLoan = { ...(loan || {}) };
      delete savedLoan[['paid', 'Months'].join('')];
      const totalMonths = savedLoan.totalMonths === undefined || savedLoan.totalMonths === null ? undefined : Math.max(0, Number(savedLoan.totalMonths) || 0);
      return { ...savedLoan, totalMonths };
    }) : [];
    return state;
  }

  function migrateLocalStorageOnce() {
    for (const key of STORAGE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const sanitized = sanitizeState(JSON.parse(raw));
        localStorage.setItem(key, JSON.stringify(sanitized));
      } catch (_) {}
    }
  }

  window.addEventListener('load', () => {
    migrateLocalStorageOnce();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations?.().then((registrations) => registrations.forEach((registration) => registration.unregister())).catch(() => {});
    }
    if ('caches' in window) {
      caches.keys().then((keys) => keys.filter((key) => key.includes('00631l-pro') || key.includes('family-universal-rebalance')).forEach((key) => caches.delete(key))).catch(() => {});
    }
  });
})();
