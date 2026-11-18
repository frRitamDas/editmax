/* EditMax — shared UI behaviour (nav, reveals, pricing, composer, toasts)*/
(function () {
  "use strict";
  var doc = document;
  var root = doc.documentElement;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- toasts ---------------- */
  var toastEl = null;
  var toastTimer = 0;
  function toast(message) {
    if (!message) return;
    if (!toastEl) {
      toastEl = doc.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      doc.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    requestAnimationFrame(function () { toastEl.classList.add("is-on"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 3400);
  }

  /* ---------------- header + drawer ---------------- */
  var header = doc.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var burger = doc.querySelector(".burger");
  var backdrop = doc.querySelector(".menu-backdrop");
  function setMenu(open) {
    doc.body.classList.toggle("menu-open", open);
    if (burger) {
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
  }
  if (burger) burger.addEventListener("click", function () {
    setMenu(!doc.body.classList.contains("menu-open"));
  });
  if (backdrop) backdrop.addEventListener("click", function () { setMenu(false); });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* ---------------- masked line reveals ---------------- */
  var lines = doc.querySelectorAll(".line-inner");
  if (lines.length) {
    if (reduced) {
      Array.prototype.forEach.call(lines, function (l) { l.classList.add("is-in"); });
    } else {
      root.classList.add("js-reveal");
      var delay = 0;
      Array.prototype.forEach.call(lines, function (line) {
        delay += 90;
        setTimeout(function () { line.classList.add("is-in"); }, 120 + delay);
      });
      // safety: never leave a headline hidden
      setTimeout(function () {
        Array.prototype.forEach.call(lines, function (l) { l.classList.add("is-in"); });
      }, 2600);
    }
  }

  /* ---------------- scroll reveals ---------------- */
  var revealables = doc.querySelectorAll(".will-reveal");
  if (revealables.length) {
    if (reduced || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(revealables, function (el) { el.classList.add("revealed"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
      Array.prototype.forEach.call(revealables, function (el, i) {
        el.style.transitionDelay = Math.min(i % 6, 5) * 55 + "ms";
        io.observe(el);
      });
      setTimeout(function () {
        Array.prototype.forEach.call(revealables, function (el) { el.classList.add("revealed"); });
      }, 3200);
    }
  }

  /* ---------------- pricing toggle ---------------- */
  var priceToggle = doc.querySelector("[data-price-toggle]");
  if (priceToggle) {
    var buttons = priceToggle.querySelectorAll("button");
    var apply = function (period) {
      Array.prototype.forEach.call(buttons, function (b) {
        b.setAttribute("aria-pressed", b.dataset.period === period ? "true" : "false");
      });
      Array.prototype.forEach.call(doc.querySelectorAll("[data-monthly]"), function (el) {
        el.textContent = period === "annual" ? el.dataset.annual : el.dataset.monthly;
      });
      Array.prototype.forEach.call(doc.querySelectorAll("[data-bill]"), function (el) {
        el.textContent = period === "annual"
          ? "Billed yearly — " + el.dataset.annualTotal + " · save " + el.dataset.save
          : "Billed monthly · cancel anytime";
      });
      Array.prototype.forEach.call(doc.querySelectorAll("[data-plan-cta]"), function (a) {
        var url = new URL(a.getAttribute("href"), location.origin);
        url.searchParams.set("period", period);
        a.setAttribute("href", url.pathname + url.search);
      });
      try { localStorage.setItem("editmax.period", period); } catch (e) {}
    };
    Array.prototype.forEach.call(buttons, function (b) {
      b.addEventListener("click", function () { apply(b.dataset.period); });
    });
    var saved = "monthly";
    try { saved = localStorage.getItem("editmax.period") || "monthly"; } catch (e) {}
    apply(saved === "annual" ? "annual" : "monthly");
  }

  /* ---------------- counters ---------------- */
  var counters = doc.querySelectorAll("[data-count]");
  if (counters.length && !reduced && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        cio.unobserve(el);
        var end = parseFloat(el.dataset.count);
        var suffix = el.dataset.suffix || "";
        var dec = (String(el.dataset.count).split(".")[1] || "").length;
        var start = performance.now();
        var step = function (now) {
          var t = Math.min(1, (now - start) / 1400);
          var value = end * (1 - Math.pow(1 - t, 3));
          el.textContent = value.toLocaleString("en-US", {
            minimumFractionDigits: dec, maximumFractionDigits: dec
          }) + suffix;
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    Array.prototype.forEach.call(counters, function (el) { cio.observe(el); });
  }

  /* ---------------- hero composer ---------------- */
  var composer = doc.querySelector("[data-composer]");
  if (composer) {
    var input = composer.querySelector("textarea, input");
    var send = composer.querySelector("[data-composer-send]");
    var go = function () {
      var value = input && input.value ? input.value.trim() : "";
      var params = new URLSearchParams();
      if (value) params.set("brief", value.slice(0, 220));
      var chip = composer.querySelector(".chip[aria-pressed='true']");
      if (chip && chip.dataset.mode) params.set("mode", chip.dataset.mode);
      location.href = "./start.html" + (params.toString() ? "?" + params.toString() : "");
    };
    if (send) send.addEventListener("click", go);
    if (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(); }
      });
    }
    Array.prototype.forEach.call(composer.querySelectorAll(".chip[data-mode]"), function (chip) {
      chip.addEventListener("click", function () {
        var on = chip.getAttribute("aria-pressed") === "true";
        Array.prototype.forEach.call(composer.querySelectorAll(".chip[data-mode]"), function (c) {
          c.setAttribute("aria-pressed", "false");
          c.classList.remove("is-on");
        });
        if (!on) { chip.setAttribute("aria-pressed", "true"); chip.classList.add("is-on"); }
      });
    });
  }

  /* ---------------- year ---------------- */
  Array.prototype.forEach.call(doc.querySelectorAll("[data-year]"), function (el) {
    el.textContent = new Date().getFullYear();
  });

  window.EditMaxUI = { toast: toast, setMenu: setMenu };
})();
