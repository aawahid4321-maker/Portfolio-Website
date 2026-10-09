/* Shared rAF scheduler — one requestAnimationFrame for the whole page.
   Callbacks register via window.__raf.add(cb) and unregister via
   window.__raf.remove(cb). The single rAF runs while at least one
   callback is registered and stops when the set is empty. */
(function () {
  if (typeof window === "undefined" || window.__raf) return;
  var cbs = new Set();
  var running = false;
  function tick(now) {
    if (cbs.size === 0) { running = false; return; }
    requestAnimationFrame(tick);
    cbs.forEach(function (cb) { cb(now); });
  }
  window.__raf = {
    add: function (cb) {
      cbs.add(cb);
      if (!running) { running = true; requestAnimationFrame(tick); }
    },
    remove: function (cb) { cbs.delete(cb); },
  };
})();
