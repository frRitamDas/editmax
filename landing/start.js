/* Compatibility shim: some serialized page data references /landing/start.js.
   The real bundle lives at /assets/49_start.js — load it exactly once. */
(function () {
  "use strict";
  if (window.__editmaxStartShim) return;
  window.__editmaxStartShim = true;
  if (document.querySelector('script[src*="49_start.js"]')) return;
  var s = document.createElement("script");
  s.src = "/assets/49_start.js";
  s.defer = true;
  document.head.appendChild(s);
})();
