(() => {
  function parseNumber(text) {
    const cleaned = String(text || '').replace(/[,NT$\s]/g, '').replace(/[^+\-\d.]/g, '');
    return Number(cleaned) || 0;
  }

  function formatSigned(text, value) {
    const raw = String(text || '').trim();
    const prefix = raw.match(/^NT\$|^\$/)?.[0] || (raw.includes('NT$') ? 'NT$' : '');
    const absText = Math.abs(value).toLocaleString('zh-TW', { maximumFractionDigits: 0 });
    if (value > 0) return `${prefix}+${absText}`;
    if (value < 0) return `${prefix}-${absText}`;
    return `${prefix}0`;
  }

  function injectStyle() {
    if (document.getElementById('tw-profit-color-style')) return;
    const style = document.createElement('style');
    style.id = 'tw-profit-color-style';
    style.textContent = `
      .tw-profit-up{color:#ff4d4f!important;text-shadow:0 0 10px #ff4d4f33}
      .tw-profit-down{color:#22c55e!important;text-shadow:0 0 10px #22c55e33}
      .tw-profit-flat{color:#dbeafe!important}
    `;
    document.head.appendChild(style);
  }

  function colorDailyPnl() {
    injectStyle();
    const stats = Array.from(document.querySelectorAll('.stat'));
    const daily = stats.find((el) => /今日損益|今日盈虧|日損益/.test(el.textContent || ''));
    if (!daily) return;
    const valueEl = daily.querySelector('b') || daily;
    const value = parseNumber(valueEl.textContent || '0');
    valueEl.classList.remove('tw-profit-up', 'tw-profit-down', 'tw-profit-flat');
    valueEl.classList.add(value > 0 ? 'tw-profit-up' : value < 0 ? 'tw-profit-down' : 'tw-profit-flat');
    if (!valueEl.dataset.twSignedValue || valueEl.dataset.twSignedValue !== String(value)) {
      valueEl.textContent = formatSigned(valueEl.textContent, value);
      valueEl.dataset.twSignedValue = String(value);
    }
  }

  window.addEventListener('load', colorDailyPnl);
  window.addEventListener('storage', colorDailyPnl);
  window.addEventListener('focus', colorDailyPnl);
  setInterval(colorDailyPnl, 15000);
})();
