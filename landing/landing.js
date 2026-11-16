(() => {
  "use strict";
  if (window.__editmaxLandingReady) return;
  window.__editmaxLandingReady = true;
  window.editmaxReady = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function initMenu() {
    const trigger = $(".burger");
    const drawer = $("#drawer");
    if (!trigger || !drawer) return;
    const closeButtons = $$('[data-close-drawer]', drawer);
    const close = () => {
      drawer.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus({ preventScroll: true });
    };
    trigger.addEventListener("click", () => {
      const opening = drawer.hidden;
      drawer.hidden = !opening;
      trigger.setAttribute("aria-expanded", String(opening));
      if (opening) $(".drawer-close", drawer)?.focus();
    });
    closeButtons.forEach((button) => button.addEventListener("click", (event) => {
      if (event.currentTarget.matches("a") || event.currentTarget.matches(".drawer-overlay") || event.currentTarget.matches(".drawer-close")) close();
    }));
    drawer.addEventListener("click", (event) => { if (event.target === drawer) close(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !drawer.hidden) close(); });
  }

  function initPricing() {
    const tabs = $$('#pricing .tab[data-period]');
    if (!tabs.length) return;
    const panel = $("#plans-panel");
    const update = (period, focusTab = false) => {
      const active = tabs.find((tab) => tab.dataset.period === period) || tabs[0];
      tabs.forEach((tab) => {
        const selected = tab === active;
        tab.classList.toggle("is-active", selected);
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      if (panel) panel.setAttribute("aria-labelledby", active.id);
      $$(".tier-amount", panel || document).forEach((amount) => {
        amount.textContent = amount.dataset[period] || amount.dataset.monthly || amount.textContent;
      });
      $$(".tier-save", panel || document).forEach((save) => {
        save.textContent = save.dataset[period] || "";
      });
      $$(".tier-billed", panel || document).forEach((billed) => {
        billed.textContent = billed.dataset[period] || billed.textContent;
      });
      $$("a[data-plan]", panel || document).forEach((link) => {
        try {
          const url = new URL(link.getAttribute("href"), window.location.origin);
          url.searchParams.set("plan", link.dataset.plan);
          url.searchParams.set("period", period);
          link.setAttribute("href", url.pathname + url.search);
        } catch (_) {}
      });
      if (focusTab) active.focus();
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => update(tab.dataset.period));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        update(tabs[next].dataset.period, true);
      });
    });
    const chosen = tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0];
    update(chosen.dataset.period);
  }

  function initReveals() {
    const elements = $$(".reveal");
    if (!elements.length) return;
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible", "in"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible", "in");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -7% 0px", threshold: 0.05 });
    elements.forEach((element) => observer.observe(element));
  }

  function initReviews() {
    const track = $(".tst-track");
    if (!track) return;
    const carousel = track.closest(".tst-carousel");
    if (!carousel) return;
    const step = () => {
      const card = $(".tst-card", track);
      return card ? card.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
    };
    $$(".tst-arrow", carousel.parentElement || document).forEach((button) => {
      button.addEventListener("click", () => {
        const direction = Number(button.dataset.dir) || 1;
        track.scrollBy({ left: direction * step(), behavior: "smooth" });
      });
    });
    track.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        track.scrollBy({ left: (event.key === "ArrowRight" ? 1 : -1) * step(), behavior: "smooth" });
      }
    });
    const dots = $(".tst-dots");
    if (dots && "IntersectionObserver" in window) {
      const cards = $$(".tst-card", track);
      const observer = new IntersectionObserver((entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = cards.indexOf(visible.target);
        $$("i", dots).forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === index));
      }, { root: track, threshold: [0.35, 0.6, 0.85] });
      cards.forEach((card) => observer.observe(card));
    }
  }

  function initScrollLinks() {
    $$('a[href^="#"]').forEach((link) => link.addEventListener("click", (event) => {
      const id = link.getAttribute("href").slice(1);
      const target = id && document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState({}, "", "#" + encodeURIComponent(id));
    }));
  }

  function init() {
    initMenu();
    initPricing();
    initReveals();
    initReviews();
    initScrollLinks();
    document.documentElement.classList.add("js");
    document.documentElement.classList.add("landing-ready");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
