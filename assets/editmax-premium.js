/* EditMax premium experience layer (frontend only, zero dependencies).
   Smooth scrolling, progress, back-to-top, header state, counters, tilt,
   magnetic CTAs, testimonial autoplay, media performance and FAQ accordion.
   Designed to complement landing.js / tour.js / editmax-app.js — never fight them. */
(() => {
  "use strict";
  if (window.__editmaxPremiumReady) return;
  window.__editmaxPremiumReady = true;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const prefersReduced = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = () =>
    window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  const reduced = prefersReduced();

  document.documentElement.classList.add("em-boot");

  /* ---------- Smooth anchor scrolling with header offset ----------
     landing.js already smooth-scrolls plain anchors; this layer only adds an
     offset-aware pass for pages where landing.js is absent (account/checkout/
     legal pages) so behavior is identical everywhere. */
  function initAnchors() {
    if (window.__editmaxLandingReady) return;
    $$('a[href^="#"]').forEach((link) => {
      if (link.dataset.emAnchorBound) return;
      link.dataset.emAnchorBound = "1";
      link.addEventListener("click", (event) => {
        const id = link.getAttribute("href").slice(1);
        const target = id && document.getElementById(id);
        if (!target) return;
        event.preventDefault();
        const pad = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue("--em-scroll-pad"),
          10
        ) || 84;
        const top = target.getBoundingClientRect().top + window.scrollY - pad;
        window.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });
        history.replaceState({}, "", "#" + encodeURIComponent(id));
        if (target.tabIndex < 0) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      });
    });
  }

  /* ---------- Scroll progress + back-to-top + header state ---------- */
  function initChrome() {
    const bar = document.createElement("div");
    bar.className = "em-progress";
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = "<i></i>";
    document.body.appendChild(bar);
    const fill = bar.firstElementChild;

    const top = document.createElement("button");
    top.className = "em-to-top";
    top.type = "button";
    top.setAttribute("aria-label", "Back to top");
    top.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(top);
    top.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
    );

    const headers = $$("header").slice(0, 2);
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY || 0;
      const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      fill.style.transform = `scaleX(${p.toFixed(4)})`;
      bar.classList.toggle("is-on", y > 40 && max > 0);
      top.classList.toggle("is-on", y > window.innerHeight * 0.9);
      headers.forEach((h) => h.classList.toggle("is-scrolled", y > 8));
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  /* ---------- Reveal stagger: cascade siblings ---------- */
  function initStagger() {
    $$(".reveal").forEach((el) => {
      if (el.dataset.stagger) return;
      const parent = el.parentElement;
      if (!parent) return;
      const siblings = Array.from(parent.children).filter(
        (c) => c.classList && c.classList.contains("reveal")
      );
      if (siblings.length > 1) {
        const i = siblings.indexOf(el) % 6;
        if (i > 0) el.dataset.stagger = String(i);
      }
    });
  }

  /* ---------- Animated counters ---------- */
  function initCounters() {
    const nodes = $$("[data-count]");
    if (!nodes.length || !("IntersectionObserver" in window)) return;
    const format = (value, decimals) =>
      Number(value).toLocaleString(undefined, {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals,
      });
    const run = (el) => {
      if (el.dataset.countDone) return;
      el.dataset.countDone = "1";
      const end = parseFloat(el.dataset.count);
      if (!Number.isFinite(end)) return;
      const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals, 10) || 0 : 0;
      const prefix = el.dataset.prefix || "";
      const suffix = el.dataset.suffix || "";
      if (reduced) { el.textContent = prefix + format(end, decimals) + suffix; return; }
      const duration = 1400;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = prefix + format(end * eased, decimals) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    nodes.forEach((n) => io.observe(n));
  }

  /* ---------- Reveal safety net ----------
     If landing.js ever fails to load, .reveal content must still appear. */
  function initRevealFallback() {
    const arm = () => {
      if (window.__editmaxLandingReady) return;
      const nodes = $$(".reveal:not(.is-visible):not(.in)");
      if (!nodes.length) return;
      if (!("IntersectionObserver" in window)) {
        nodes.forEach((n) => n.classList.add("is-visible", "in"));
        return;
      }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible", "in");
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: "0px 0px -5% 0px", threshold: 0.05 });
      nodes.forEach((n) => io.observe(n));
    };
    if (document.readyState === "complete") setTimeout(arm, 2500);
    else window.addEventListener("load", () => setTimeout(arm, 2500));
    // Ultimate fallback: never leave content hidden.
    setTimeout(() => {
      if (window.__editmaxLandingReady) return;
      $$(".reveal:not(.is-visible):not(.in)").forEach((n) =>
        n.classList.add("is-visible", "in")
      );
    }, 6000);
  }

  /* ---------- Subtle 3D tilt on hero / cards ---------- */
  function initTilt() {
    if (reduced || !finePointer()) return;
    const targets = $$("[data-tilt], .fx-card");
    if (!targets.length) return;
    const max = 7;
    targets.forEach((el) => {
      let raf = 0;
      el.addEventListener("pointermove", (event) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          const x = (event.clientX - r.left) / r.width - 0.5;
          const y = (event.clientY - r.top) / r.height - 0.5;
          el.style.transform =
            `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateY(-3px)`;
        });
      });
      el.addEventListener("pointerleave", () => {
        cancelAnimationFrame(raf);
        el.style.transform = "";
      });
    });
  }

  /* ---------- Magnetic primary CTAs ---------- */
  function initMagnetic() {
    if (reduced || !finePointer()) return;
    const ctas = $$(".btn-primary, .hero .btn-primary, .kit-btn--primary, .hl-go");
    ctas.forEach((el) => {
      if (el.dataset.emMagnetic) return;
      el.dataset.emMagnetic = "1";
      el.classList.add("em-magnetic");
      el.addEventListener("pointermove", (event) => {
        const r = el.getBoundingClientRect();
        const x = event.clientX - r.left;
        const y = event.clientY - r.top;
        el.style.setProperty("--em-mx", `${x.toFixed(1)}px`);
        el.style.setProperty("--em-my", `${y.toFixed(1)}px`);
        el.style.translate =
          `${((x / r.width - 0.5) * 6).toFixed(1)}px ${((y / r.height - 0.5) * 4).toFixed(1)}px`;
      });
      el.addEventListener("pointerleave", () => { el.style.translate = ""; });
    });
  }

  /* ---------- Testimonial autoplay ---------- */
  function initAutoplay() {
    const track = $(".tst-track");
    if (!track || reduced) return;
    if (typeof track.scrollTo !== "function" || typeof track.scrollBy !== "function") return;
    let timer = 0;
    let hovering = false;
    const step = () => {
      const card = $(".tst-card", track);
      return card ? card.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
    };
    const advance = () => {
      if (hovering || document.hidden) return;
      const end = track.scrollWidth - track.clientWidth - 8;
      if (track.scrollLeft >= end) track.scrollTo({ left: 0, behavior: "smooth" });
      else track.scrollBy({ left: step(), behavior: "smooth" });
    };
    const start = () => {
      stop();
      timer = window.setInterval(advance, 4500);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = 0; } };
    track.addEventListener("pointerenter", () => { hovering = true; });
    track.addEventListener("pointerleave", () => { hovering = false; });
    ["pointerdown", "wheel", "touchstart", "focusin"].forEach((evt) =>
      track.addEventListener(evt, start, { passive: true })
    );
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop(); else start();
    });
    start();
  }

  /* ---------- Media performance ---------- */
  function initMedia() {
    const fold = window.innerHeight * 1.2;
    $$("img").forEach((img, index) => {
      if (!img.hasAttribute("loading")) {
        const rect = img.getBoundingClientRect();
        const belowFold = rect.top > fold && rect.top !== 0;
        img.loading = belowFold || index > 2 ? "lazy" : "eager";
      }
      if (!img.hasAttribute("decoding")) img.decoding = "async";
      if (!img.hasAttribute("fetchpriority") && index === 0) img.fetchPriority = "high";
    });
    $$("video").forEach((video) => {
      if (!video.hasAttribute("preload")) video.preload = "metadata";
      video.setAttribute("playsinline", "");
      if (!video.hasAttribute("disablepictureinpicture")) {
        try { video.disablePictureInPicture = false; } catch (_) {}
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) return;
      $$("video").forEach((video) => {
        try { if (!video.paused) video.pause(); } catch (_) {}
      });
    });
  }

  /* ---------- FAQ accordion: one open at a time ---------- */
  function initFaq() {
    const items = $$(".faq-item");
    if (!items.length) return;
    items.forEach((item) => {
      if (item.tagName.toLowerCase() !== "details") return;
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        items.forEach((other) => {
          if (other !== item && other.tagName.toLowerCase() === "details") other.open = false;
        });
      });
    });
    const showAll = $(".faq-all");
    const faq = $("#faq");
    if (showAll && faq) {
      showAll.addEventListener("click", () => {
        const expanded = faq.classList.toggle("is-all");
        showAll.setAttribute("aria-expanded", String(expanded));
      });
    }
  }

  /* ---------- Active section highlighting ---------- */
  function initSpy() {
    const links = $$('a[href^="#"]').filter((a) => {
      const id = a.getAttribute("href").slice(1);
      return id && document.getElementById(id);
    });
    if (!links.length || !("IntersectionObserver" in window)) return;
    const byId = new Map();
    links.forEach((a) => {
      const id = a.getAttribute("href").slice(1);
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(a);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const list = byId.get(entry.target.id);
        if (!list) return;
        if (entry.isIntersecting) {
          links.forEach((a) => a.classList.remove("is-current"));
          list.forEach((a) => a.classList.add("is-current"));
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px", threshold: 0 });
    byId.forEach((_, id) => io.observe(document.getElementById(id)));
  }

  /* ---------- Hero scroll cue ---------- */
  function initScrollCue() {
    const hero = $(".hero-inner");
    if (!hero || $(".em-scroll-cue")) return;
    const cue = document.createElement("button");
    cue.className = "em-scroll-cue";
    cue.type = "button";
    cue.innerHTML = '<span class="em-wheel" aria-hidden="true"></span><span>Scroll to explore</span>';
    cue.setAttribute("aria-label", "Scroll down to explore more");
    const cta = hero.querySelector(".hero-cta");
    if (cta && cta.parentElement === hero) cta.after(cue);
    else hero.appendChild(cue);
    const section = hero.closest("section");
    const target = document.querySelector("#how-it-works")
      || (section && section.nextElementSibling);
    cue.addEventListener("click", () => {
      if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      } else {
        window.scrollBy({ top: window.innerHeight * 0.8, behavior: reduced ? "auto" : "smooth" });
      }
    });
    const onScroll = () =>
      cue.classList.toggle("is-gone", (window.scrollY || 0) > 120);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Auto year ---------- */
  function initYear() {
    const year = String(new Date().getFullYear());
    $$("[data-year]").forEach((el) => { el.textContent = year; });
  }

  function init() {
    initAnchors();
    initChrome();
    initRevealFallback();
    initStagger();
    initCounters();
    initTilt();
    initMagnetic();
    initAutoplay();
    initMedia();
    initFaq();
    initSpy();
    initScrollCue();
    initYear();
    document.documentElement.classList.add("em-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
  // Late widgets (client-rendered pages) get anchor + magnetic upgrades too.
  window.addEventListener("load", () => {
    setTimeout(() => { initAnchors(); initMagnetic(); }, 800);
  });
})();
