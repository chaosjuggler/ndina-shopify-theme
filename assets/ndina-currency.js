/* NDINA Shop currency tab.
   DISPLAY ONLY: the shop prices and charges in USD. Other currencies are
   indicative conversions for reference; checkout is always in USD.
   Update RATES (units of currency per 1 USD) and RATES_DATE when needed. */
(function () {
  'use strict';
  var RATES_DATE = '6 Nov 2026';
  var C = {
    USD: { r: 1,      sym: '$',   step: 0 },
    NZD: { r: 1.7921, sym: 'NZ$', step: 5 },   /* 1 / 0.558, matches Artwaka catalogue */
    AUD: { r: 1.4429, sym: 'A$',  step: 5 },
    GBP: { r: 0.7432, sym: '£',   step: 1 },
    FJD: { r: 2.26,   sym: 'FJ$', step: 5 },   /* matches Artwaka catalogue */
    JPY: { r: 157.49, sym: '¥',   step: 100 },
    CNY: { r: 6.673,  sym: 'CN¥', step: 5 },
    THB: { r: 33.46,  sym: '฿',   step: 10 }
  };
  var KEY = 'ndina_shop_cur';
  var cur = 'USD';
  try { var s = localStorage.getItem(KEY); if (s && C[s]) cur = s; } catch (e) {}

  var RX = /\$\s?([\d,]+(?:\.\d+)?)(?:\s?USD)?/g;
  var store = new WeakMap();
  var busy = false;

  function fmt(usd) {
    var c = C[cur];
    if (cur === 'USD') {
      return '$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD';
    }
    var v = usd * c.r;
    v = c.step ? Math.ceil(v / c.step) * c.step : v;
    return c.sym + v.toLocaleString('en-US') + ' ' + cur;
  }
  function conv(text) {
    return text.replace(RX, function (m, n) { return fmt(parseFloat(n.replace(/,/g, ''))); });
  }
  function skip(el) {
    return !el || /^(SCRIPT|STYLE|NOSCRIPT|SELECT|OPTION|TEXTAREA|INPUT)$/.test(el.tagName) ||
      (el.closest && el.closest('[data-no-currency]'));
  }
  function run(root) {
    busy = true;
    try {
      var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, null);
      var n;
      while ((n = w.nextNode())) {
        if (skip(n.parentElement)) continue;
        var rec = store.get(n), orig;
        if (rec && n.data === rec.written) orig = rec.orig;   /* unchanged by Shopify */
        else orig = n.data;                                   /* new or re-rendered */
        RX.lastIndex = 0;
        if (!RX.test(orig)) { if (rec) store.delete(n); continue; }
        RX.lastIndex = 0;
        var out = conv(orig);
        store.set(n, { orig: orig, written: out });
        if (n.data !== out) n.data = out;
      }
    } finally { busy = false; }
    notice();
  }
  function notice() {
    var el = document.getElementById('ndina-cur-notice');
    if (!el) return;
    if (cur === 'USD') { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = 'Prices shown in ' + cur + ' are indicative (rate ' + RATES_DATE +
      '). Shop prices and checkout are in US dollars (USD).';
  }
  function setCur(c) {
    if (!C[c]) return;
    cur = c;
    try { localStorage.setItem(KEY, c); } catch (e) {}
    var sel = document.getElementById('ndina-cur-select');
    if (sel && sel.value !== c) sel.value = c;
    run();
  }
  function init() {
    var sel = document.getElementById('ndina-cur-select');
    if (sel) { sel.value = cur; sel.addEventListener('change', function () { setCur(sel.value); }); }
    run();
    var t;
    new MutationObserver(function () {
      if (busy) return;
      clearTimeout(t);
      t = setTimeout(function () { run(); }, 60);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
