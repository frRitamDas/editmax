/* The onboarding at /start (CUT-389): lp2's onboarding script from the dev site (sites/dev-site/public/lp2/start,
   as served at cutai-dev.vercel.app/lp2/start on 2026-10-26), moved into a file. Changes for usecutai.com:
   - Its figures come from lib/content.ts through the page root's data attributes (components/landing/start-page.tsx), never typed
     here. A figure still pending there arrives empty, and the screens built on it are left out: without the editor's
     price per video there is no money result on route A; without the minutes a video takes with CutAI, route A
     shows the time the visitor spends editing by hand instead of the time CutAI gives back.
   - The final plan picker uses a plain /checkout link for the selected plan and period. It starts with the address choice
     (/start?plan=<id>&period=<period>; Pro monthly otherwise, with an entry's mark on its copies). The homepage's
     plan cards go straight to checkout, and every other door (header, menu, hero, closing, footer, sticky bar)
     opens /start with no plan, so the picker starts on Pro monthly; an address that names a plan and period, as
     the parity suite and the entry screenshots build from the hero's door, gives that plan and period
     (tests/entry-parity.test.mjs, scripts/proof/shoot-entries.mjs). The plain picker confirms the choice as the tour sheet does; partners retain their code-screen doors.
     Back on the first screen and the logo go home: / on the plain page, and on an entry's copy (CUT-406) the
     entry's own link with `from=start` (CUT-417; "Home" below).
   - The review tools (screen jumper, start over, the preview's end sheet) are left out.
   - Prices show in the visit's currency (CUT-404), from the table the page carries; see "Local prices" below.
   It mounts once per page: a client-side visit, which no link makes today, would call window.cutaiStart.mount() again
   (components/landing/landing-mount.tsx). */
(() => {
  "use strict";
  if (window.cutaiStart) { window.cutaiStart.mount(); return; }

  /* Local prices (CUT-404). A column is one currency's entry in the table the page carries (#lp-prices, worked out
     at build from lib/billing/currency.ts by lib/landing/local-prices.ts). Pro's price and "due today" arrive
     printed, and Pro's price also as a number (`pro`). A figure we only quote (an editor's bill, a bracket) converts
     plainly at the column's frozen rate and prints in whole units: for a whole-dollar figure that is exactly
     lib/billing/currency.ts formatLocal(usd, cur, false); a figure with cents is rounded to a whole unit, as this page
     prints every quoted figure. No column, as on a USD visit: the dollars this page always printed.
     Also on window.cutaiStart for the tests. */
  const wholes = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const shownIn = (column) => (usd) => Math.round(usd * column.rate); // a quoted dollar figure, as printed
  const printIn = (column) => (v) => column.pre + wholes.format(Math.round(v)) + column.post;
  const moneyIn = (column) => (column
    ? (x) => printIn(column)(shownIn(column)(x))
    : (x) => "$" + wholes.format(Math.round(x)));
  const quoteIn = (text, column) => (column ? text.replace(/\$(\d[\d,]*)/g, (_, n) => moneyIn(column)(Number(n.replace(/,/g, "")))) : text);
  /* What one screen prints, fixed when the screen is built (go): its brackets, results, counting frames, graph labels
     (and their measuring), caption and "due today" all print through this one printer, so an /api/geo answer that
     lands while a screen is up never mixes two currencies on it; the next screen uses the new currency.
     - `money(usd)` prints a quoted dollar figure; `shown(usd)` is that figure as a number, as printed (whole units).
     - `pro` and `price`: CutAI Pro's price as the screen states it (the column's charm price, what Stripe bills).
     - `print(v)` writes an amount already in the screen's currency, such as a saving. A saving is worked from `shown`
       and `pro`, so it adds up from the figures printed beside it.
     No column: the dollars and the math this page always had (`shown` is the dollar figure itself). */
  const printerFor = (column, usdPrice, usdDue) => {
    const money = moneyIn(column);
    if (!column) {
      return { column: null, money, shown: (usd) => usd, pro: usdPrice, price: usdPrice == null ? "" : "$" + usdPrice.toFixed(2),
        due: usdDue, print: money, quote: (text) => text };
    }
    return { column, money, shown: shownIn(column), pro: column.pro, price: column.price, due: column.due,
      print: printIn(column), quote: (text) => quoteIn(text, column) };
  };

  const mount = () => {
  /* Typed without its null: the next line returns on it, and the function declarations below cannot see that check. */
  const ROOT = /** @type {HTMLElement} */ (document.querySelector('[data-lp="start"]'));
  if (!ROOT || ROOT.dataset.lpMounted) return;
  ROOT.dataset.lpMounted = "1";
  const figure = (k) => { const v = parseFloat(ROOT.dataset[k] || ""); return Number.isFinite(v) ? v : null; };
  /* The visit's column, once components/landing/landing-currency.tsx has written the currency on the root (null
     until then, and for USD). Read once per screen, in go(), into that screen's printer. */
  let PRICES = null;
  try { PRICES = JSON.parse((document.getElementById("lp-prices") || {}).textContent || "null"); } catch { PRICES = null; }
  const column = () => {
    const code = ROOT.dataset.currency;
    return PRICES && code && Object.prototype.hasOwnProperty.call(PRICES, code) ? PRICES[code] : null;
  };

  /* The numbers, from lib/content.ts (null: not confirmed yet) */
  const NUMBERS = {
    price: figure("price"),                   // CutAI Pro, dollars a month
    trialDays: figure("trialDays"),           // the free trial on every plan
    withCutAIMin: figure("withCutaiMin"),     // minutes per video with CutAI (pending)
    editorPerVideo: figure("editorPerVideo"), // dollars an editor charges per video (pending)
    videosPerWeek: [1, 2, 3, 4, 5, 6, 7, 14, 21, 28, 35, 42, 56, 70],  // screen 3A slider stops, left to right
    editMinutes: [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240],       // screen 4A slider stops: minutes to edit one video by hand
    editorBill: [250, 750, 1500, 3500, 5000]   // screen 3B answers, dollars a month
  };
  /* A day is a week / 7, a month is a week x 52 / 12, a year is a week x 52. */
  const periods = (week) => ({ day: week / 7, week: week, month: (week * 52) / 12, year: week * 52 });

  /* Route A works from its two sliders: videos a week (i) and the minutes each one takes to edit by hand (j). Money is
     in the screen's currency (pr, printerFor): the editor's price as printed, less Pro's price as printed. */
  function routeA(i, j, pr) {
    const v = NUMBERS.videosPerWeek[i], byHand = NUMBERS.editMinutes[j];
    /* A day holds 1,440 minutes. Answers that add up to more editing than that (only near the top of both sliders)
       fill the whole day, and the time back shrinks in the same proportion, so no share of the day passes 100%. */
    const fit = Math.min(1, (7 * 1440) / (v * byHand));
    const byHandWeek = v * byHand * fit;
    /* Time back never goes below zero: editing that already takes as long as CutAI does gets none. Without the
       minutes a video takes with CutAI (pending), there is no time back to show: the time is what editing by hand takes. */
    const hasTime = NUMBERS.withCutAIMin != null;
    const savedWeek = hasTime ? v * Math.max(0, byHand - /** @type {number} */ (NUMBERS.withCutAIMin)) * fit : byHandWeek;
    /* Nor does money: an editor who costs less than CutAI Pro saves nothing */
    const moneyMonth = NUMBERS.editorPerVideo != null ? Math.max(0, ((v * 52) / 12) * pr.shown(NUMBERS.editorPerVideo) - pr.pro) : null;
    return {
      time: periods(savedWeek),
      timeIsBack: hasTime,
      money: moneyMonth == null ? null : periods((moneyMonth * 12) / 52),
      moneyMonth: moneyMonth,
      byHandMin: byHand,
      byHandDay: byHandWeek / 7,
      /* The share of their life CutAI gives back: hours saved a year divided by the 8,760 hours in a year.
         It is time over all the time there is, so it never passes 100%. */
      lifeShare: hasTime ? (savedWeek * 52) / 60 / 8760 : null
    };
  }
  /* Route B: the editor's bill as printed, less Pro's price as printed, in the screen's currency (pr) */
  function routeB(i, pr) {
    const bill = NUMBERS.editorBill[i];
    const moneyMonth = pr.shown(bill) - pr.pro;
    return { money: periods((moneyMonth * 12) / 52) };
  }

  /* Words */
  const WHO = [
    { label: "TikTok Shop creator", icon: "bag" },
    { label: "UGC creator", icon: "video" },
    { label: "Influencer", icon: "star" },
    { label: "Just me", icon: "user" }
  ];
  const GOALS = [
    { label: "Post more videos", icon: "trend" },
    { label: "Save time", icon: "clock" },
    { label: "Have more freedom", icon: "sun" },
    { label: "Fire my editor", icon: "userx" }
  ];
  /* Screen 3A: the videos slider's stops, in the same order as NUMBERS.videosPerWeek. The number shows large, the unit smaller. */
  const VIDEO_STOPS = [
    { n: "1", u: "a week" }, { n: "2", u: "a week" }, { n: "3", u: "a week" }, { n: "4", u: "a week" }, { n: "5", u: "a week" }, { n: "6", u: "a week" },
    { n: "1", u: "a day" }, { n: "2", u: "a day" }, { n: "3", u: "a day" }, { n: "4", u: "a day" }, { n: "5", u: "a day" }, { n: "6", u: "a day" },
    { n: "8", u: "a day" },
    { n: "10", u: "or more a day" }
  ];
  const VIDEOS_DEFAULT = 6; // "1 a day"
  /* Screen 4A: the editing slider's stops, in the same order as NUMBERS.editMinutes */
  const EDIT_STOPS = [
    { n: "5", u: "minutes a video" }, { n: "10", u: "minutes a video" }, { n: "15", u: "minutes a video" },
    { n: "20", u: "minutes a video" }, { n: "30", u: "minutes a video" }, { n: "45", u: "minutes a video" },
    { n: "1", u: "hour a video" }, { n: "1.5", u: "hours a video" }, { n: "2", u: "hours a video" }, { n: "3", u: "hours a video" },
    { n: "4", u: "or more hours a video" }
  ];
  const EDIT_DEFAULT = 6; // "1 hour a video"
  /* Both sliders: Bo's headline, the stops, where the thumb starts and the small labels under the track's ends */
  const SLIDERS = {
    videos: { title: "How many videos are you currently posting?", stops: VIDEO_STOPS, def: VIDEOS_DEFAULT, ends: ["1 a week", "10+ a day"] },
    edit: { title: "How long do you spend editing?", stops: EDIT_STOPS, def: EDIT_DEFAULT, ends: ["5 minutes", "4+ hours"] }
  };
  const stopLabel = (key, i) => SLIDERS[key].stops[i].n + " " + SLIDERS[key].stops[i].u;
  const BILLS = [
    { label: "Under $500" },
    { label: "$500 to $1,000" },
    { label: "$1,000 to $2,000" },
    { label: "$2,000 to $5,000" },
    { label: "More than $5,000" }
  ];

  /* Icons, drawn in the Lucide style */
  const ic = (d) => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + d + "</svg>";
  const I = {
    bag: ic('<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'),
    video: ic('<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>'),
    star: ic('<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>'),
    user: ic('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
    trend: ic('<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>'),
    clock: ic('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
    sun: ic('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>'),
    userx: ic('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8 5 5M22 8l-5 5"/>'),
    /* Lucide's piggy bank: a saving with no currency sign, since it sits beside figures in the visit's currency */
    piggy: ic('<path d="M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z"/><path d="M16 10h.01"/><path d="M2 8v1a2 2 0 0 0 2 2h1"/>'),
    down: ic('<path d="m6 9 6 6 6-6"/>'),
    arrow: ic('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>')
  };

  /* Formatting: work from unrounded values, round only for display. Values never split across lines. */
  const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  const NB = " ";
  const tie = (s) => s.replace(/ /g, NB); // an answer inside a sentence stays on one line
  const pct = (f) => nf1.format(Math.round(f * 1000 + 1e-9) / 10) + "%";
  const hours = (h, end) => (end < 10 ? nf1.format(Math.round(h * 10) / 10) : nf0.format(Math.round(h)));
  const hm = (min) => {
    const m = Math.round(min), h = Math.floor(m / 60), r = m % 60;
    if (!h) return r + NB + "min";
    return r ? h + NB + "h" + NB + r + NB + "min" : h + NB + "h";
  };
  const FMT = {
    hours: (end) => (x) => hours(x, end),
    money: (end, pr) => pr.print, // the screen's printer: an amount already in its currency
    /* A share that is not zero but too small for one decimal shows two, so it never reads as 0% */
    pct: (end) => (end > 0 && end < 0.0005 ? (x) => nf2.format(x * 100) + "%" : pct)
  };

  /* Motion */
  const RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LINEAR_OK = typeof CSS !== "undefined" && CSS.supports && CSS.supports("transition-timing-function", "linear(0, 1)");
  function makeSpring(k, c) {
    const w0 = Math.sqrt(k), z = c / (2 * Math.sqrt(k)), wd = w0 * Math.sqrt(Math.max(0.0001, 1 - z * z));
    const x = (t) => 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
    let T = 1, calm = 0;
    for (let t = 0; t < 3; t += 1 / 240) {
      if (Math.abs(1 - x(t)) < 0.002) { calm += 1 / 240; if (calm > 0.06) { T = t; break; } } else calm = 0;
    }
    const pts = [];
    for (let i = 0; i <= 40; i++) pts.push(i === 40 ? 1 : +x((i / 40) * T).toFixed(4));
    return {
      x: (p) => (p >= 1 ? 1 : x(p * T)),
      dur: LINEAR_OK ? Math.round(T * 1000) : 520,
      css: LINEAR_OK ? "linear(" + pts.join(", ") + ")" : "cubic-bezier(0.34, 1.56, 0.64, 1)"
    };
  }
  const PRESS = makeSpring(420, 24);
  const POP = makeSpring(520, 20);
  if (LINEAR_OK) {
    document.documentElement.style.setProperty("--spring", PRESS.css);
    document.documentElement.style.setProperty("--spring-dur", PRESS.dur + "ms");
  }
  const easeOut = (p) => 1 - Math.pow(1 - p, 4);
  const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
  const easeOutExpo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
  const later = (ctx, ms, fn) => { ctx.timers.push(setTimeout(() => { if (ctx.alive) fn(); }, ms)); };
  function tween(ctx, o) {
    const t0 = performance.now() + (o.delay || 0), ease = o.ease || easeOut;
    const frame = (now) => {
      if (!ctx.alive) return;
      const p = Math.min(1, Math.max(0, (now - t0) / o.dur));
      o.step(ease(p), p);
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  function countUp(ctx, node, to, fmt, o) {
    if (RM) { node.textContent = fmt(to); return; }
    const from = o.from || 0;
    node.textContent = fmt(from);
    tween(ctx, { dur: o.dur, delay: o.delay, ease: o.ease || easeOutExpo, step: (k) => { node.textContent = fmt(from + (to - from) * k); } });
  }
  const buzz = () => { try { if (navigator.vibrate) navigator.vibrate(8); } catch { /* not on this phone */ } };

  /* The page root's attributes (components/landing/start-page.tsx). The final link takes the plan and period from this page's
     address when they are real ones (/start?plan=<id>&period=<period>); anything else keeps the default, Pro monthly with
     the entry's mark (data-final-href). */
  const rootAttr = (k) => ROOT.getAttribute(k) || "";
  /* Home: the logo, and Back on the first screen. The page says where, in data-home-href on the root
     (components/landing/start-page.tsx `startHomeHref`): on an entry's copy (CUT-406), the entry's own page (CUT-417).
     Going back is not a new landing: the link carries `from=start`, and with this page before it the root layout's
     AttrCapture keeps the visit's cutai_attr as its landing wrote it and ToltScript leaves tlt.js out, so the Back
     neither rewrites the visit's attribution nor counts a second Tolt click (components/analytics/start-return.ts).
     The plain page's `/` takes no marker. */
  const RETURN_MARK = "from=start";
  const homeHref = () => {
    const home = rootAttr("data-home-href");
    return !home || home === "/" ? home : home + (home.indexOf("?") < 0 ? "?" : "&") + RETURN_MARK;
  };
  const PLAN_IDS = ["starter", "pro", "ultimate"], PERIODS = ["monthly", "annual"];
  const finalHref = () => {
    const q = new URLSearchParams(window.location.search), base = rootAttr("data-final-href");
    /* Typed as strings: a null, an address without one, is simply in neither list. */
    const plan = /** @type {string} */ (q.get("plan")), period = /** @type {string} */ (q.get("period"));
    if (!base || (!PLAN_IDS.includes(plan) && !PERIODS.includes(period))) return base;
    const url = new URL(base, window.location.origin);
    if (PLAN_IDS.includes(plan)) url.searchParams.set("plan", plan);
    if (PERIODS.includes(period)) url.searchParams.set("period", period);
    return url.pathname + url.search;
  };
  const attr = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  /* State and routes. Each route is its screens in order: A asks about videos and editing time, B about the editor bill
     and goes straight on to the graph. Both end on the plan picker after the graph. Before a goal is picked, the flow counts as route A. */
  /* Each answer is the index picked on its screen: null until then, and a screen reads only the answers before it. */
  /** @type {Record<string, number>} */
  const S = /** @type {any} */ ({ who: null, goal: null, videos: null, edit: null, bill: null });
  const isB = () => S.goal === 3;
  const ROUTE_A = ["who", "goal", "videos", "edit", "numbers", "graph", "plan"];
  const ROUTE_B = ["who", "goal", "bill", "graph", "plan"];
  const steps = () => (isB() ? ROUTE_B : ROUTE_A);
  const stepOf = (id) => steps().indexOf(id) + 1; // 1 for the first screen, 0 for a screen this route does not have
  const next = (id) => (stepOf(id) ? steps()[stepOf(id)] : undefined);
  const prev = (id) => steps()[stepOf(id) - 2];

  /* Signals can precede React hydration. Keep them in memory until the analytics bridge is ready. */
  const pendingSignals = [];
  const tell = (type, detail = {}) => {
    const signal = { type, ...detail };
    if (ROOT.dataset.startAnalyticsReady === "1") document.dispatchEvent(new CustomEvent("cutai-start", { detail: signal }));
    else pendingSignals.push(signal);
  };
  document.addEventListener("cutai-start-ready", () => {
    pendingSignals.splice(0).forEach((detail) => document.dispatchEvent(new CustomEvent("cutai-start", { detail })));
  });
  const PLAN_DATA = JSON.parse(document.getElementById("start-plans")?.textContent || "null");
  const initial = new URL(finalHref(), window.location.origin).searchParams;
  const selection = { plan: initial.get("plan") || "pro", period: initial.get("period") || "monthly" };
  const entryQuery = new URLSearchParams(window.location.search);
  const ambiguousEntry = /%|\+/.test(window.location.search) || [...entryQuery].some(([key, value]) =>
    key !== key.toLowerCase() || !value || entryQuery.getAll(key).length !== 1);
  const entryKeys = ["ref", "partner_codes", "nocode", "offer", "pt"];
  const markedEntry = ambiguousEntry || entryKeys.some((key) => entryQuery.has(key));
  const pickerHref = (plan, confirmed) => {
    const url = new URL((confirmed && !markedEntry && plan.sheet[selection.period]) || plan.href[selection.period], window.location.origin);
    entryKeys.forEach((key) => {
      if (!url.searchParams.has(key)) entryQuery.getAll(key).forEach((value) => url.searchParams.append(key, value));
    });
    return url.pathname + url.search;
  };
  /* "Have a code?": the plan card's own door with `open=code`, which /checkout passes on to the code screen so its code
     field starts open (lib/content/links.ts `codeFieldHref`, the same address). Without it the field started closed and
     asked for the same tap again (Bo, 2026-11-11). */
  const codeFieldHref = (door) => (door.startsWith("/checkout?") ? door + "&open=code" : door);
  /* The plan step's trial button goes straight to Stripe only on a plain visit (`confirmed=sheet`, app/checkout/route.ts
     `sheetConfirms`). Where checkout would show the code screen first instead (a creator code saved in this browser or a
     Tolt referral, any mark on this address, or a plan with no sheet door), that screen is the visit's one "Pick your
     plan", with the code on it: the graph's button goes there, with the plan and period chosen, instead of showing the
     same choice twice (Bo, 2026-11-11: "it brings me to another pick your plan screen"). */
  const codeScreenFirst = () => {
    const p = selectedPlan();
    return markedEntry || !(p.sheet && p.sheet[selection.period]) || /(?:^|;\s*)(?:cutai_ref|tolt_referral)=/.test(document.cookie);
  };
  /* Back from Stripe or the code screen with the phone's back button reloads this page when the browser kept no copy of
     it, and it opened on the first question again (Bo, 2026-11-11). Leaving from the graph or the plan step records the
     answers, the plan and that step on this page's own history entry (history state: only this entry and its reloads see
     it, no cookie or storage key; Next's router keeps it beside its own), and a page that finds them, less than three
     hours old, opens on that step with them. */
  const RESUME_KEY = "cutaiStart", RESUME_MS = 3 * 60 * 60 * 1000, RESUME_STEPS = ["graph", "plan"];
  const ANSWERS = { who: WHO, goal: GOALS, videos: VIDEO_STOPS, edit: EDIT_STOPS, bill: BILLS };
  const remember = (step) => {
    try {
      const state = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
      window.history.replaceState({ ...state, [RESUME_KEY]: { step, S: { ...S }, plan: selection.plan, period: selection.period, at: Date.now() } }, "");
    } catch { /* no history state here: the page starts on the first question, as before */ }
  };
  /* The screen to open on: a recorded step with its answers and plan put back, or the first question. Every answer on the
     recorded route must be one of its screen's choices, or nothing is put back. */
  const resumeStep = () => {
    try {
      const saved = window.history.state && window.history.state[RESUME_KEY];
      if (!saved || typeof saved !== "object" || !saved.S || typeof saved.S !== "object") return "who";
      const age = Date.now() - Number(saved.at);
      if (!(age >= 0 && age < RESUME_MS) || !RESUME_STEPS.includes(saved.step) || !PLAN_IDS.includes(saved.plan) || !PERIODS.includes(saved.period)) return "who";
      const route = saved.S.goal === 3 ? ROUTE_B : ROUTE_A;
      const answered = (k) => Number.isInteger(saved.S[k]) && saved.S[k] >= 0 && saved.S[k] < ANSWERS[k].length;
      if (!route.every((k) => !(k in ANSWERS) || answered(k))) return "who";
      Object.keys(S).forEach((k) => { S[k] = route.includes(k) ? saved.S[k] : null; });
      selection.plan = saved.plan;
      selection.period = saved.period;
      // A code saved since then makes the code screen this visit's plan step (`codeScreenFirst`): the graph leads there.
      return saved.step === "plan" && codeScreenFirst() ? "graph" : saved.step;
    } catch { return "who"; }
  };

  /* Screens */
  const tickMark = '<span class="tick" aria-hidden="true"><span class="disc"></span><svg viewBox="0 0 26 26"><path d="M8 13.4l3.3 3.2 6.9-7"/></svg></span>';
  const iconGlyph = (it) => '<span class="ico" aria-hidden="true">' + I[it.icon] + "</span>";
  const levelGlyph = (it, i) => {
    let s = '<span class="lvl" aria-hidden="true">';
    for (let k = 0; k < 5; k++) s += k <= i ? '<i class="f"></i>' : "<i></i>";
    return s + "</span>";
  };
  function choice(key, title, sub, items, glyph) {
    const sel = S[key];
    const opts = items.map((it, i) =>
      '<button type="button" class="opt' + (sel === i ? " is-on" : "") + '" data-i="' + i + '" aria-pressed="' + (sel === i) + '" data-in>' +
        '<span class="clip" aria-hidden="true"><span class="fill"></span></span>' +
        glyph(it, i) + '<span class="lab">' + it.label + "</span>" + tickMark +
      "</button>").join("");
    return '<section class="screen" aria-labelledby="h-' + key + '"><div class="scroll">' +
      '<h1 class="h1" id="h-' + key + '" tabindex="-1" data-in>' + title + "</h1>" +
      (sub ? '<p class="sub" data-in>' + sub + "</p>" : "") +
      '<div class="opts" role="group" aria-labelledby="h-' + key + '">' + opts + "</div>" +
      '</div><div class="foot">' + (sel != null ? '<button type="button" class="btn" data-act="next" data-in>Next ' + I.arrow + "</button>" : "") + "</div></section>";
  }
  const num = (v, kind, cls, pr) => {
    const f = FMT[kind](v, pr), s = f(v);
    return '<span class="' + (cls || "num") + '"><span class="sz" aria-hidden="true">' + s + '</span><span class="live" data-to="' + v + '" data-fmt="' + kind + '">' + s + "</span></span>";
  };
  const how = (items) => '<details class="how" data-in><summary>How we calculated this ' + I.down + "</summary><ul>" + items.map((t) => "<li>" + t + "</li>").join("") + "</ul></details>";
  /* A result card: a label, a number and a unit, nothing else */
  const stat = (icon, label, v, kind, unit, pr) =>
    '<article class="stat" data-in>' +
      '<div class="stat-top"><span class="stat-k"><span class="kdot">' + icon + "</span>" + label + "</span></div>" +
      '<div class="stat-num">' + num(v, kind, undefined, pr) + '<span class="stat-u">' + unit + "</span></div>" +
    "</article>";
  /* Minutes as words for a sentence: "45 minutes", "1 hour", "1.5 hours" */
  const minWords = (m) => (m < 60 ? m + " minutes" : nf1.format(m / 60) + (m === 60 ? " hour" : " hours"));

  /* 3A and 4A are sliders: a real range input (keyboard and screen readers) under a glass track and a liquid fill.
     They always have a value, so their Next button is always there. */
  function slider(key) {
    const sl = SLIDERS[key], last = sl.stops.length - 1;
    if (S[key] == null) S[key] = sl.def;
    const i = S[key], st = sl.stops[i];
    let dots = "";
    for (let k = 0; k <= last; k++) dots += '<i style="--k:' + k + '"></i>';
    return '<section class="screen" aria-labelledby="h-' + key + '"><div class="scroll">' +
      '<h1 class="h1" id="h-' + key + '" tabindex="-1" data-in>' + sl.title + "</h1>" +
      '<div class="vs" data-in style="--n:' + last + ";--p:" + (i / last).toFixed(4) + '">' +
        '<div class="vs-read" aria-hidden="true"><span class="vs-n">' + st.n + '</span><span class="vs-u">' + st.u + "</span></div>" +
        '<div class="vs-ctl">' +
          '<div class="vs-track"><span class="vs-fill"></span></div>' +
          '<div class="vs-ticks" aria-hidden="true">' + dots + '</div><div class="vs-ticks on" aria-hidden="true">' + dots + "</div>" +
          '<input class="vs-input" type="range" min="0" max="' + last + '" step="1" value="' + i + '" aria-labelledby="h-' + key + '" aria-valuetext="' + stopLabel(key, i) + '">' +
          '<span class="vs-thumb" aria-hidden="true"><span class="vs-halo"></span></span>' +
        "</div>" +
        '<div class="vs-ends" aria-hidden="true"><span>' + sl.ends[0] + "</span><span>" + sl.ends[1] + "</span></div>" +
      "</div>" +
      '</div><div class="foot"><button type="button" class="btn" data-act="next" data-in>Next ' + I.arrow + "</button></div></section>";
  }

  const R = {};
  R.who = () => choice("who", "Who are you?", "", WHO, iconGlyph);
  R.goal = () => choice("goal", "What’s your goal?", "", GOALS, iconGlyph);
  R.videos = () => slider("videos");
  R.edit = () => slider("edit");
  R.bill = (pr) => choice("bill", "How much are you currently paying for your editor?", "Per month.", BILLS.map((b) => ({ label: pr.quote(b.label) })), levelGlyph);

  /* Route A only: route B goes from the bill question straight to the graph */
  R.numbers = (pr) => {
    const a = routeA(S.videos, S.edit, pr), label = stopLabel("videos", S.videos);
    return '<section class="screen" aria-labelledby="h-num"><div class="scroll">' +
      '<h1 class="h1" id="h-num" tabindex="-1" data-in>You spend ' + hm(a.byHandDay) + " a day editing.</h1>" +
      '<p class="sub" data-in>Based on posting ' + tie(label.charAt(0).toLowerCase() + label.slice(1)) + " and editing " + tie(stopLabel("edit", S.edit)) + ".</p>" +
      '<div class="stats">' +
        (a.timeIsBack
          ? stat(I.clock, "You get back", a.time.month / 60, "hours", "hours a month with CutAI")
          : stat(I.clock, "You spend", a.time.month / 60, "hours", "hours a month editing by hand")) +
        (a.moneyMonth != null ? stat(I.piggy, "You save", a.moneyMonth, "money", "a month vs. hiring an editor", pr) : "") +
      "</div>" +
      how([
        "Editing by hand takes about " + minWords(a.byHandMin) + " a video." + (a.timeIsBack ? " With CutAI, about " + NUMBERS.withCutAIMin + " minutes." : "")
      ].concat(a.moneyMonth != null ? [
        "An editor charges about " + pr.money(NUMBERS.editorPerVideo) + " a video.",
        "CutAI Pro is " + pr.price + " a month."
      ] : [])) +
      '</div><div class="foot"><button type="button" class="btn" data-act="next" data-in>See my year ' + I.arrow + "</button></div></section>";
  };

  /* The graph keeps its question route; one plan choice follows it. */
  const trialFoot = () => '<div class="foot"><button type="button" class="btn" data-act="next">' + attr(PLAN_DATA.words.title) + ' ' + I.arrow + '</button></div>';
  R.graph = () => {
    const b = isB();
    let vals = "";
    for (let i = 0; i < 4; i++) vals += '<span class="val"></span>';
    return '<section class="screen" aria-labelledby="h-gr"><div class="scroll">' +
      '<h1 class="h1" id="h-gr" tabindex="-1" data-in>It adds up.</h1>' +
      (b || NUMBERS.editorPerVideo == null ? "" : '<div class="segctl" data-v="time" role="group" aria-label="Show time or money" data-in><span class="thumb" aria-hidden="true"></span><button type="button" data-metric="time" aria-pressed="true">Time</button><button type="button" data-metric="money" aria-pressed="false">Money</button></div>') +
      '<figure class="chart" data-in><div class="plot"><div class="grid"></div>' + lineSVG() + vals + '<span class="val ruler" aria-hidden="true"></span></div>' +
        '<div class="xl"><span class="meta">Day</span><span class="meta">Week</span><span class="meta">Month</span><span class="meta">Year</span></div></figure>' +
      '<div class="cap" data-in></div>' +
      "</div>" + trialFoot() + "</section>";
  };

  R.plan = () => {
    const words = PLAN_DATA.words;
    return '<section class="screen plan-screen" aria-labelledby="h-plan"><div class="scroll">' +
      '<h1 class="h1" id="h-plan" tabindex="-1">' + attr(words.title) + '</h1>' +
      '<div class="plan-period" role="group" aria-label="Billing period"><button type="button" data-start-period="monthly">Monthly</button><button type="button" data-start-period="annual">Annual</button></div>' +
      '<div class="plan-rows" role="radiogroup" aria-label="Plans">' + PLAN_DATA.plans.map((p) =>
        '<button type="button" class="plan-row" role="radio" data-start-plan="' + p.id + '"><span class="plan-dot" aria-hidden="true"></span><span class="plan-name">' + attr(p.name) + '</span><span class="plan-edits">' + attr(p.edits) + '</span><span class="plan-price"></span></button>'
      ).join('') + '</div><a class="plan-code" data-cta="onboarding">' + attr(words.code) + '</a>' +
      '<div class="plan-includes" aria-live="polite"><p class="plan-feats-h"></p><ul class="plan-feats"></ul></div>' +
      '<div class="plan-after"><p class="plan-note">' + attr(words.devices) + '<br>' + attr(words.limit) + '</p><p class="plan-legal"><a href="/terms">' + attr(words.terms) + '</a><span aria-hidden="true"> · </span><a href="/privacy">' + attr(words.privacy) + '</a></p></div></div>' +
      // Only the button and its money line stay pinned (Bo, 2026-11-11: with "Have a code?", the devices note and the
      // Terms line the pinned foot was about 270px on a phone and covered the plans). They scroll with the plans now.
      '<div class="foot plan-foot"><a class="btn cta" data-cta="onboarding"></a><p class="fine plan-bill"></p></div></section>';
  };
  const selectedPlan = () => PLAN_DATA.plans.find((p) => p.id === selection.plan) || PLAN_DATA.plans[0];
  const planPrice = (p) => {
    const col = PLAN_DATA.prices[ROOT.dataset.currency || "USD"];
    return col ? col['plan-' + p.id][selection.period === 'annual' ? 1 : 0] : p[selection.period];
  };
  function paintPlan(ctx) {
    const p = selectedPlan(), words = PLAN_DATA.words, annual = selection.period === 'annual';
    const unit = annual ? 'year' : 'month';
    ctx.el.querySelectorAll('[data-start-period]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.startPeriod === selection.period)));
    ctx.el.querySelectorAll('[data-start-plan]').forEach((row) => {
      const plan = PLAN_DATA.plans.find((it) => it.id === row.dataset.startPlan), on = plan.id === p.id;
      row.setAttribute('aria-checked', String(on));
      row.tabIndex = on ? 0 : -1;
      row.querySelector('.plan-price').textContent = planPrice(plan) + (annual ? '/yr' : '/mo');
    });
    ctx.el.querySelector('.plan-feats-h').textContent = p.name + ' ' + words.includes;
    ctx.el.querySelector('.plan-feats').innerHTML = p.features.map((f) => '<li' + (f.included === false ? ' class="is-no"' : '') + '>' +
      (f.included === false ? '<s>' + attr(f.text) + '</s><span class="plan-sr-only"> (not included)</span>' : attr(f.text)) + '</li>').join('');
    const offer = !annual && p.offer;
    const go = ctx.el.querySelector('a.cta');
    go.href = pickerHref(p, true);
    go.dataset.plan = p.id;
    go.textContent = offer ? offer.cta : p.cta;
    ctx.el.querySelector('.plan-code').href = codeFieldHref(pickerHref(p, false));
    const day = new Date();
    day.setDate(day.getDate() + p.days);
    const col = PLAN_DATA.prices[ROOT.dataset.currency || "USD"];
    const due = col ? col['due-today'] : ROOT.dataset.dueToday;
    const receipt = words.receipt.replace('{due}', () => due).replace('{price}', () => planPrice(p))
      .replace('{unit}', () => unit).replace('{date}', () => new Intl.DateTimeFormat('en-US', {month:'short', day:'numeric'}).format(day));
    const bill = ctx.el.querySelector('.plan-bill');
    bill.textContent = offer ? offer.note : receipt;
    // A typed or stored creator code may change these terms. The code screen quotes it before payment.
    const codeVisit = entryQuery.has('ref') || /(?:^|;\s*)(?:cutai_ref|tolt_referral)=/.test(document.cookie);
    bill.hidden = !offer && codeVisit;
  }

  let uidN = 0;
  /* The graph's line, back to front: the area under it, a soft glow, the stroke, then the dots, Year's the largest.
     drawChart() fills in the shapes once it knows the plot's size. */
  function lineSVG() {
    const u = "ln" + ++uidN, url = (k) => "url(#" + u + k + ")";
    let dots = "";
    for (let i = 0; i < 3; i++) dots += '<g class="dot"><circle class="pt" r="5" fill="' + url("g") + '"/></g>';
    dots += '<g class="dot"><circle r="20" fill="' + url("h") + '"/><circle class="pt yr" r="7.5" fill="' + url("l") + '"/></g>';
    return '<svg class="trend" aria-hidden="true" focusable="false"><defs>' +
      '<linearGradient class="ln-paint" id="' + u + 's" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5DBBF6"/><stop offset="0.6" stop-color="#2E9BEA"/><stop offset="1" stop-color="#1B7FD3"/></linearGradient>' +
      '<linearGradient id="' + u + 'a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B98E8" stop-opacity="0.28"/><stop offset="0.6" stop-color="#5AB4F3" stop-opacity="0.1"/><stop offset="1" stop-color="#5AB4F3" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="' + u + 'g" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E2EFFB"/></radialGradient>' +
      '<radialGradient id="' + u + 'l" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="#9AD8FC"/><stop offset="0.6" stop-color="#2E9BEA"/><stop offset="1" stop-color="#1B7FD3"/></radialGradient>' +
      '<radialGradient id="' + u + 'h"><stop offset="0" stop-color="#2B98E8" stop-opacity="0.38"/><stop offset="1" stop-color="#2B98E8" stop-opacity="0"/></radialGradient>' +
      '<filter class="ln-blur" id="' + u + 'f" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="5"/></filter>' +
      '<clipPath id="' + u + 'c"><rect class="area-cut"/></clipPath></defs>' +
      '<path class="area" fill="' + url("a") + '" clip-path="' + url("c") + '"/>' +
      '<path class="ln-glow" filter="' + url("f") + '" transform="translate(0 4)"/>' +
      '<path class="ln" stroke="' + url("s") + '"/>' + dots + "</svg>";
  }
  /* What each screen does once it is on stage */
  const ENTER = {};

  ENTER.plan = (ctx) => {
    paintPlan(ctx);
    const choosePlan = (id) => {
      selection.plan = id;
      paintPlan(ctx);
      tell('plan_changed', { plan: selection.plan, period: selection.period });
    };
    const rows = [...ctx.el.querySelectorAll('[data-start-plan]')];
    rows.forEach((row, i) => {
      row.addEventListener('click', () => choosePlan(row.dataset.startPlan));
      row.addEventListener('keydown', (e) => {
        const step = {ArrowDown:1, ArrowRight:1, ArrowUp:-1, ArrowLeft:-1}[e.key];
        if (!step && e.key !== 'Home' && e.key !== 'End') return;
        e.preventDefault();
        const target = rows[e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : (i + step + rows.length) % rows.length];
        choosePlan(target.dataset.startPlan);
        target.focus();
      });
    });
    ctx.el.querySelectorAll('[data-start-period]').forEach((button) => button.addEventListener('click', () => {
      selection.period = button.dataset.startPeriod;
      paintPlan(ctx);
      tell('period_changed', { plan: selection.plan, period: selection.period });
    }));
    ctx.el.querySelector('a.cta').addEventListener('click', () => {
      paintPlan(ctx);
      tell('continue', { plan: selection.plan, period: selection.period });
      // Same key and value as markStripeTrip in lib/billing/exit-offer.ts and the tour sheet.
      try { window.sessionStorage.setItem('cutai_to_stripe', String(Date.now())); } catch { /* storage unavailable */ }
    });
    ctx.el.querySelector('.plan-code').addEventListener('click', () => tell('code', { plan: selection.plan, period: selection.period }));
    // Every way off this step (the trial button, "Have a code?", Terms, Privacy) brings the visitor back to it (`remember`).
    ctx.el.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => remember('plan')));
    const prices = new MutationObserver(() => { if (ctx.alive) paintPlan(ctx); else prices.disconnect(); });
    prices.observe(ROOT, { attributes: true, attributeFilter: ['data-currency'] });
  };

  /* A slider: drag anywhere on the track or tap to jump; arrow keys move the real range input.
     Every stop change pops the readout, pulses the thumb and ticks the phone. */
  ENTER.videos = ENTER.edit = (ctx) => {
    const key = ctx.id, stops = SLIDERS[key].stops, last = stops.length - 1;
    const box = ctx.el.querySelector(".vs"), ctl = box.querySelector(".vs-ctl"), input = box.querySelector(".vs-input");
    const read = box.querySelector(".vs-read"), nEl = read.querySelector(".vs-n"), uEl = read.querySelector(".vs-u");
    const halo = box.querySelector(".vs-halo");
    let pop = null, ring = null, dragId = null;
    const set = (i) => {
      i = Math.max(0, Math.min(last, Math.round(i)));
      if (+input.value !== i) input.value = String(i);
      if (i === S[key]) return;
      const dir = i > S[key] ? 1 : -1;
      S[key] = i;
      box.style.setProperty("--p", (i / last).toFixed(4));
      input.setAttribute("aria-valuetext", stopLabel(key, i));
      nEl.textContent = stops[i].n;
      uEl.textContent = stops[i].u;
      buzz();
      if (RM) return;
      if (pop) pop.cancel();
      pop = read.animate([{ transform: "translateY(" + dir * 7 + "px) scale(0.9)", opacity: 0.55 }, { transform: "none", opacity: 1 }], { duration: POP.dur, easing: POP.css });
      if (ring) ring.cancel();
      ring = halo.animate([{ transform: "scale(0.75)", opacity: 0.95 }, { transform: "scale(1.9)", opacity: 0 }], { duration: 460, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
    };
    const fromX = (x) => {
      const r = ctl.getBoundingClientRect(), tw = 36;
      return Math.max(0, Math.min(1, (x - r.left - tw / 2) / Math.max(1, r.width - tw))) * last;
    };
    ctl.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      try { input.focus({ preventScroll: true }); } catch { /* focus is a nicety */ }
      dragId = e.pointerId;
      try { ctl.setPointerCapture(e.pointerId); } catch { /* older browsers drag without capture */ }
      ctl.classList.add("is-drag");
      set(fromX(e.clientX));
    });
    ctl.addEventListener("pointermove", (e) => { if (e.pointerId === dragId) set(fromX(e.clientX)); });
    const end = (e) => { if (e.pointerId !== dragId) return; dragId = null; ctl.classList.remove("is-drag"); };
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((t) => ctl.addEventListener(t, end));
    input.addEventListener("input", () => set(+input.value));
    input.addEventListener("change", () => set(+input.value));
  };

  ENTER.numbers = (ctx) => {
    ctx.el.querySelectorAll(".stat").forEach((card, k) => {
      const n = card.querySelector(".live"), to = parseFloat(n.dataset.to), f = FMT[n.dataset.fmt](to, ctx.pr);
      if (RM) { card.classList.add("lit"); return; }
      const d = 420 + k * 460;
      countUp(ctx, n, to, f, { dur: 1300, delay: d });
      later(ctx, d + 1050, () => card.classList.add("lit"));
    });
  };

  function nice(max) {
    if (!(max > 0)) return { step: 1, top: 4 }; // nothing back: an empty scale, with the line flat on the baseline
    const e = Math.pow(10, Math.floor(Math.log10(max / 5)));
    for (const m of [1, 2, 2.5, 5, 10, 20]) {
      const step = m * e;
      if (Math.ceil(max / step) <= 5) return { step: step, top: step * Math.ceil(max / step) };
    }
    return { step: max, top: max };
  }
  /* Each point prints its own value: Day in minutes, the longer periods in hours, money in whole units of the screen's
     currency, through the screen's printer (pr) only */
  const KEYS = ["day", "week", "month", "year"];
  function chartData(metric, pr) {
    if (isB()) {
      const b = routeB(S.bill, pr);
      /* The basis is named: CutAI Pro's price (the one /start opens checkout on by default) and a bill from the
         answer, the middle of its range (the floor of the open-ended top one). */
      const open = S.bill === NUMBERS.editorBill.length - 1;
      return { vals: b.money, div: 1, fmts: KEYS.map(() => pr.print),
        cap: "About what you keep on CutAI Pro (" + pr.price + " a month), counting your editor at " + pr.money(NUMBERS.editorBill[S.bill]) + " a month, " + (open ? "the bottom" : "the middle") + " of the range you picked." };
    }
    const a = routeA(S.videos, S.edit, pr);
    if (metric === "money" && a.money) {
      return { vals: a.money, div: 1, fmts: KEYS.map(() => pr.print), cap: "What you save vs. hiring an editor." };
    }
    return {
      vals: a.time, div: 60, life: a.lifeShare,
      fmts: KEYS.map((k, i) => (i === 0 ? hm : (m) => hours(m / 60, a.time[k] / 60) + NB + "h")),
      cap: a.timeIsBack ? lifeBack(a.lifeShare) : '<p class="sub">Time you spend editing by hand.</p>'
    };
  }
  /* Under the Time view, the share of their life CutAI gives back: a big percent beside 100 squares, one per percent */
  function lifeBack(f) {
    let cells = "";
    for (let k = 0; k < 100; k++) {
      const part = Math.min(1, f * 100 - k);
      cells += part > 0.001 ? '<i><b style="--f:' + part.toFixed(3) + '"></b></i>' : "<i></i>";
    }
    return '<div class="lb"><div class="lb-txt">' + num(f, "pct") + '<span class="stat-u">of your life back</span></div>' +
      '<div class="lb-grid" aria-hidden="true">' + cells + "</div></div>";
  }
  /* The squares fill one after another as the line reaches Year, and the percent counts up with them */
  function fillLife(ctx, f) {
    const cells = Array.from(ctx.el.querySelectorAll(".lb-grid b")), n = cells.length, T0 = 1500, st = n ? Math.min(60, 900 / n) : 0;
    cells.forEach((c, i) => c.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: POP.dur, delay: T0 + i * st, easing: POP.css, fill: "backwards" }));
    countUp(ctx, ctx.el.querySelector(".lb .live"), f, FMT.pct(f), { dur: Math.max(600, n * st), delay: T0, ease: (p) => p });
  }
  /* The line: a monotone cubic through the points (Steffen's method, as in d3's curveMonotoneX), smooth but never
     dipping below a point or bulging above one. m is the slope at each point. */
  function slopes(P) {
    const n = P.length, s = [], m = [];
    for (let i = 0; i < n - 1; i++) s.push((P[i + 1][1] - P[i][1]) / (P[i + 1][0] - P[i][0]));
    for (let i = 1; i < n - 1; i++) {
      const h0 = P[i][0] - P[i - 1][0], h1 = P[i + 1][0] - P[i][0], p = (s[i - 1] * h1 + s[i] * h0) / (h0 + h1);
      m[i] = (Math.sign(s[i - 1]) + Math.sign(s[i])) * Math.min(Math.abs(s[i - 1]), Math.abs(s[i]), Math.abs(p) / 2) || 0;
    }
    m[0] = (3 * s[0] - m[1]) / 2;
    m[n - 1] = (3 * s[n - 2] - m[n - 2]) / 2;
    return m;
  }
  /* The line's y at x: each piece is a cubic Hermite whose x runs evenly with t */
  function lineY(ch, x) {
    const P = ch.P, m = ch.m;
    let i = 0;
    while (i < P.length - 2 && x > P[i + 1][0]) i++;
    const h = P[i + 1][0] - P[i][0], t = Math.max(0, Math.min(1, (x - P[i][0]) / h)), t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * P[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (3 * t2 - 2 * t3) * P[i + 1][1] + (t3 - t2) * h * m[i + 1];
  }
  /* The highest the line gets between x = a and x = b. Each piece only climbs or falls, so the two ends and any point between are enough. */
  function lineTop(ch, a, b) {
    const P = ch.P;
    a = Math.max(a, P[0][0]);
    b = Math.min(b, P[P.length - 1][0]);
    if (a > b) return Infinity;
    let y = Math.min(lineY(ch, a), lineY(ch, b));
    P.forEach((p) => { if (p[0] > a && p[0] < b) y = Math.min(y, p[1]); });
    return y;
  }
  const f2 = (v) => v.toFixed(2);
  const DOT_R = [6.25, 6.25, 6.25, 9]; // each dot's outer radius, ring included (lineSVG)

  /* Measures the plot. The points sit over the x labels, zero on the baseline and the top of the scale on the top grid line,
     each at the middle of its line's 1px border. */
  function chartBox(ch) {
    const W = ch.plot.clientWidth, H = ch.plot.clientHeight;
    if (!W || !H) return false;
    const left = ch.plot.getBoundingClientRect().left;
    ch.W = W;
    ch.H = H;
    ch.xs = ch.xl.map((s) => { const r = s.getBoundingClientRect(); return r.left + r.width / 2 - left; });
    ch.room = parseFloat(getComputedStyle(ch.plot).marginTop) - 14; // how far a value may rise above the plot, 14px clear of the switch or headline
    ch.svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    ch.stroke.setAttribute("x1", f2(ch.xs[0]));
    ch.stroke.setAttribute("x2", f2(ch.xs[3]));
    [["x", -40], ["y", -40], ["width", W + 80], ["height", H + 80]].forEach((a) => ch.blur.setAttribute(a[0], a[1]));
    [["x", -40], ["y", -60], ["height", H + 120]].forEach((a) => ch.cut.setAttribute(a[0], a[1]));
    return true;
  }
  function chartShape(ch) {
    const P = (ch.P = ch.frac.map((f, i) => [ch.xs[i], ch.H * (1 - f) - 0.5]));
    const m = (ch.m = slopes(P)), last = P.length - 1, base = f2(ch.H - 0.5);
    let d = "M" + f2(P[0][0]) + " " + f2(P[0][1]);
    for (let i = 0; i < last; i++) {
      const dx = (P[i + 1][0] - P[i][0]) / 3;
      d += "C" + [P[i][0] + dx, P[i][1] + dx * m[i], P[i + 1][0] - dx, P[i + 1][1] - dx * m[i + 1], P[i + 1][0], P[i + 1][1]].map(f2).join(" ");
    }
    ch.ln.setAttribute("d", d);
    ch.glow.setAttribute("d", d);
    ch.area.setAttribute("d", d + "L" + f2(P[last][0]) + " " + base + "L" + f2(P[0][0]) + " " + base + "Z");
    /* How far along the line each point is, for the draw */
    let len = 0, px = P[0][0], py = P[0][1];
    ch.walk = [[px, 0]];
    ch.at = [0];
    for (let i = 0; i < last; i++) {
      for (let k = 1; k <= 24; k++) {
        const x = P[i][0] + ((P[i + 1][0] - P[i][0]) * k) / 24, y = lineY(ch, x);
        len += Math.hypot(x - px, y - py);
        px = x;
        py = y;
        ch.walk.push([x, len]);
      }
      ch.at.push(len);
    }
    ch.len = len;
  }
  /* The draw: a dash as long as the line slides along it, and the area is uncovered behind its tip */
  function chartReveal(ch) {
    const k = ch.reveal, paths = [ch.ln, ch.glow];
    if (k >= 1) {
      paths.forEach((p) => { p.style.strokeDasharray = ""; p.style.strokeDashoffset = ""; });
      ch.cut.setAttribute("width", ch.W + 80);
      ch.area.style.opacity = "";
      return;
    }
    const L = ch.len + 4, v = L * k, w = ch.walk;
    paths.forEach((p) => { p.style.strokeDasharray = f2(L) + " " + f2(L); p.style.strokeDashoffset = f2(L - v); });
    let j = 1;
    while (j < w.length - 1 && w[j][1] < v) j++;
    const x = w[j - 1][0] + (w[j][0] - w[j - 1][0]) * Math.max(0, Math.min(1, (v - w[j - 1][1]) / (w[j][1] - w[j - 1][1] || 1)));
    ch.cut.setAttribute("width", f2(x + 40));
    ch.area.style.opacity = k.toFixed(3);
  }
  const setDot = (ch, i) => ch.dots[i].setAttribute("transform", "translate(" + f2(ch.P[i][0]) + " " + f2(ch.P[i][1]) + ") scale(" + Math.max(0, ch.pop[i]).toFixed(3) + ")");
  /* Each value sits just above its dot. Where the line climbs through that spot the value slides left, then lifts, until it
     clears the line and the value before it; one that would rise past the room above the plot sits beside its dot instead. */
  function placeVals(ch) {
    let prev = null;
    ch.vals.forEach((el, i) => {
      const w = ch.w[i], h = ch.vh, x = ch.P[i][0], y = ch.P[i][1], rest = y - DOT_R[i] - 5;
      /** @type {any} */
      let best = null; // set on the loop's first pass: s = 0 always runs
      for (let s = 0; s <= Math.max(0, w / 2 - 6); s += 2) {
        const cx = Math.min(ch.W - w / 2, Math.max(w / 2, x - s));
        let bot = Math.min(rest, lineTop(ch, cx - w / 2 - 3, cx + w / 2 + 3) - 7);
        if (prev && cx - w / 2 < prev.hi + 6 && cx + w / 2 > prev.lo - 6) bot = Math.min(bot, prev.top - 4);
        const cost = rest - bot + s * 0.4;
        if (!best || cost < best.cost - 0.01) best = { cx: cx, bot: bot, cost: cost };
      }
      if (best.bot - h < -ch.room) best = { cx: Math.max(w / 2, x - DOT_R[i] - 8 - w / 2), bot: y + h / 2 };
      el.style.left = f2(best.cx) + "px";
      el.style.top = f2(best.bot - h) + "px";
      prev = { lo: best.cx - w / 2, hi: best.cx + w / 2, top: best.bot - h };
    });
  }
  function chartVals(ch) {
    ch.vals.forEach((el, i) => { el.textContent = ch.fmts[i](Math.max(0, ch.num[i])); });
    placeVals(ch);
  }
  /* The widest each value gets between the number it starts from and the one it lands on */
  function sizeVals(ch) {
    const r = ch.ruler;
    ch.w = ch.span.map((pair, i) => Math.max.apply(null, pair.map((v) => { r.textContent = ch.fmts[i](Math.max(0, v)); return r.getBoundingClientRect().width; })));
    ch.vh = r.getBoundingClientRect().height;
  }
  function chartPaint(ch) {
    if (!ch.W || !ch.frac) return;
    chartShape(ch);
    chartReveal(ch);
    ch.dots.forEach((g, i) => setDot(ch, i));
    chartVals(ch);
  }
  /* A dot pops in with the spring as the line reaches it, and its value rises in and counts up */
  function popDot(ctx, i, to, gen) {
    const ch = ctx.ch, el = ch.vals[i];
    ch.on[i] = true;
    tween(ctx, { dur: POP.dur, ease: POP.x, step: (k) => { if (gen === ch.gen) { ch.pop[i] = k; setDot(ch, i); } } });
    el.style.opacity = "";
    /* The lift uses translate in px: a composited -50% would keep the width the value had when it was "0" */
    el.animate([{ opacity: 0, translate: "0 6px" }, { opacity: 1, translate: "0 0" }], { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
    tween(ctx, { dur: 1100, ease: easeOut, step: (k) => { if (gen === ch.gen) { ch.num[i] = to * k; el.textContent = ch.fmts[i](ch.num[i]); } } });
  }
  function drawChart(ctx, first) {
    const ch = ctx.ch, d = chartData(ctx.metric, ctx.pr);
    const vals = KEYS.map((k) => d.vals[k]);
    const sc = nice(vals[3] / d.div), top = sc.top * d.div;
    let g = '<div class="gl base" style="bottom:0"></div>';
    for (let t = sc.step; t <= sc.top + 1e-9; t += sc.step) g += '<div class="gl" style="bottom:' + ((t / sc.top) * 100).toFixed(3) + '%"></div>';
    const grid = ctx.el.querySelector(".grid"), cap = ctx.el.querySelector(".cap");
    if (first || RM) { grid.innerHTML = g; cap.innerHTML = d.cap; }
    else {
      grid.classList.add("fade");
      cap.style.opacity = "0";
      later(ctx, 180, () => { grid.innerHTML = g; grid.classList.remove("fade"); cap.innerHTML = d.cap; cap.style.opacity = ""; });
    }
    const to = vals.map((v) => v / top), gen = ++ch.gen;
    if (first) {
      ch.frac = to;
      ch.num = [0, 0, 0, 0];
    }
    ch.fmts = d.fmts;
    ch.span = vals.map((v, i) => [ch.num[i], v]);
    sizeVals(ch);
    if (RM || !ch.W) {
      ch.frac = to;
      ch.num = vals.slice();
      ch.reveal = 1;
      ch.pop = [1, 1, 1, 1];
      ch.on = [true, true, true, true];
      chartPaint(ch);
      return;
    }
    if (first) {
      /* The line draws from Day to Year while the area fades up behind it */
      ch.reveal = 0;
      ch.pop = [0, 0, 0, 0];
      ch.vals.forEach((el) => { el.style.opacity = "0"; });
      chartPaint(ch);
      tween(ctx, {
        dur: 1100, delay: 420, ease: easeOutCubic,
        step: (k, raw) => {
          if (gen !== ch.gen || !raw) return;
          ch.reveal = k;
          chartReveal(ch);
          ch.on.forEach((on, i) => { if (!on && (ch.len + 4) * k >= ch.at[i] - 1) popDot(ctx, i, vals[i], gen); });
        }
      });
      if (d.life != null) fillLife(ctx, d.life);
      return;
    }
    /* The switch morphs the points, the line and the values to the other numbers. One made mid-draw finishes the draw first. */
    ch.reveal = 1;
    ch.pop = [1, 1, 1, 1];
    ch.on = [true, true, true, true];
    ch.vals.forEach((el) => { el.style.opacity = ""; });
    const f0 = ch.frac.slice(), v0 = ch.num.slice();
    tween(ctx, {
      dur: 700, ease: easeOut,
      step: (k) => {
        if (gen !== ch.gen) return;
        ch.frac = f0.map((f, i) => f + (to[i] - f) * k);
        ch.num = v0.map((v, i) => v + (vals[i] - v) * k);
        chartPaint(ch);
      }
    });
  }
  ENTER.graph = (ctx) => {
    const q = (s) => ctx.el.querySelector(s), all = (s) => Array.from(ctx.el.querySelectorAll(s));
    /* The chart's state: these parts, and what chartBox, chartShape and drawChart add as the graph draws. */
    /** @type {Record<string, any>} */
    const ch = (ctx.ch = {
      plot: q(".plot"), svg: q(".trend"), area: q(".trend .area"), glow: q(".trend .ln-glow"), ln: q(".trend .ln"),
      stroke: q(".trend .ln-paint"), blur: q(".trend .ln-blur"), cut: q(".trend .area-cut"), ruler: q(".val.ruler"),
      dots: all(".trend .dot"), vals: all(".val:not(.ruler)"), xl: all(".xl span"), gen: 0, on: [false, false, false, false]
    });
    ctx.metric = isB() ? "money" : "time";
    chartBox(ch);
    drawChart(ctx, true);
    /* Redraws at the plot's new size, and measures the values again once the font has loaded */
    const fit = () => { if (chartBox(ch)) chartPaint(ch); };
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => { if (!ctx.alive) ro.disconnect(); else fit(); });
      ro.observe(ch.plot);
    } else {
      const onResize = () => { if (!ctx.alive) window.removeEventListener("resize", onResize); else fit(); };
      window.addEventListener("resize", onResize);
    }
    if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(() => { if (ctx.alive && ch.P) { sizeVals(ch); placeVals(ch); } });
  };

  /* Stage */
  /* The file's must(selector). Every element looked up with it is one this script cannot run without
     (components/landing/start.html): a page without it stops here with the element's name, where it stopped at a
     TypeError at its first use. It keeps the name $ for tests/entry-parity.test.mjs, which reads $("#brand") below. */
  const $ = (s) => {
    const el = /** @type {HTMLElement | null} */ (document.querySelector(s));
    if (!el) throw new Error("start.js: " + s + " is missing");
    return el;
  };
  const stage = $("#main"), rail = $("#rail");
  let current = null, busy = false, picking = false;

  /* The rail has a segment for each screen on the route, so it changes length when the goal picks route B.
     Its sky deepens segment by segment, from sky-300 to sky-500. */
  const shade = (t) => "rgb(" + [[147, 43], [205, 152], [247, 232]].map((c) => Math.round(c[0] + (c[1] - c[0]) * t)).join(", ") + ")";
  function buildRail(total, step) {
    let s = "";
    for (let k = 0; k < total; k++) s += "<span" + (k < step - 1 ? ' class="on"' : "") + ' style="--a:' + shade(k / total) + ";--b:" + shade((k + 1) / total) + '"><i></i></span>';
    rail.innerHTML = s;
    rail.setAttribute("aria-valuemax", String(total));
    /* The screens already behind show filled at once, and only this one fills in */
    if (current) void rail.offsetWidth;
  }

  function header(id) {
    const step = stepOf(id), total = steps().length;
    /* In site mode with a home link, Back stays on screen 1 and leads home */
    $("#nav").classList.toggle("off", step === 1 && !homeHref());
    if (rail.children.length !== total) buildRail(total, step);
    Array.from(rail.children).forEach((s, i) => s.classList.toggle("on", i < step));
    rail.setAttribute("aria-valuenow", String(step));
    rail.setAttribute("aria-valuetext", "Step " + step + " of " + total);
    $("#skyDrift").style.setProperty("--step", String(step - 1));
  }

  function go(id, dir) {
    const t = document.createElement("template");
    /* The screen's currency, read once: everything it prints uses this printer for as long as it is up */
    const pr = printerFor(column(), NUMBERS.price, ROOT.dataset.dueToday || "");
    t.innerHTML = R[id](pr).trim();
    const node = /** @type {HTMLElement} */ (t.content.firstElementChild);
    const old = current;
    stage.appendChild(node);
    header(id);
    busy = true;
    setTimeout(() => { busy = false; }, 380);
    picking = false;
    if (old) {
      old.alive = false;
      old.timers.forEach(clearTimeout);
      const o = old.el;
      o.style.pointerEvents = "none";
      o.setAttribute("aria-hidden", "true");
      const out = RM
        ? o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "forwards" })
        : o.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(" + -dir * 26 + "px)" }], { duration: 200, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" });
      out.onfinish = () => o.remove();
    }
    const ctx = { id: id, el: node, alive: true, timers: [], pr: pr };
    current = ctx;
    node.querySelectorAll("[data-in]").forEach((el, i) => {
      if (RM) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, delay: 60, fill: "backwards" });
      else el.animate([{ opacity: 0, transform: "translateX(" + dir * 30 + "px)" }, { opacity: 1, transform: "none" }],
        { duration: 560, delay: (old ? 110 : 80) + i * 45, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" });
    });
    if (ENTER[id]) ENTER[id](ctx);
    tell('view', { step: id, position: stepOf(id), total: steps().length, plan: selection.plan, period: selection.period });
    if (old) { const h = /** @type {HTMLElement | null} */ (node.querySelector(".h1")); if (h) h.focus({ preventScroll: true }); }
  }
  const advance = () => {
    const id = current.id, n = next(id);
    if (!n) return;
    tell('answer', { step: id, answer: S[id] == null ? 'continue' : String(S[id]), position: stepOf(id), total: steps().length });
    // The code screen is this visit's plan step (`codeScreenFirst`): a full page load to the plan card's own door.
    if (n === "plan" && codeScreenFirst()) {
      remember("graph");
      window.location.assign(pickerHref(selectedPlan(), false));
      return;
    }
    go(n, 1);
  };
  const back = () => {
    if (busy && current) return;
    if (current) tell('back', { step: current.id, position: stepOf(current.id), total: steps().length });
    const p = current && prev(current.id); // no screen: the plain link is up (the end of mount), and Back goes home
    if (p) { if (!busy) go(p, -1); return; }
    const home = homeHref();
    if (home) window.location.assign(home);
  };

  function choose(btn, e) {
    if (busy || picking) return;
    const key = current.id, i = +btn.dataset.i, ctx = current;
    picking = true;
    if (S[key] === i && btn.classList.contains("is-on")) { later(ctx, 160, () => { picking = false; advance(); }); return; }
    S[key] = i;
    buzz();
    ctx.el.querySelectorAll(".opt").forEach((o) => {
      if (o === btn) return;
      o.classList.remove("is-on");
      o.classList.add("is-dim");
      o.setAttribute("aria-pressed", "false");
    });
    btn.setAttribute("aria-pressed", "true");
    /* The liquid pools around the tap point; from the keyboard it starts at the center */
    const r = btn.getBoundingClientRect();
    let x = r.width / 2, y = r.height / 2;
    if (e && e.detail !== 0 && typeof e.clientX === "number" && e.clientX > 0) { x = e.clientX - r.left; y = e.clientY - r.top; }
    btn.style.setProperty("--fx", (x + 1).toFixed(1) + "px");
    btn.style.setProperty("--fy", (y + 1).toFixed(1) + "px");
    if (RM) btn.classList.add("is-on");
    else {
      const clip = btn.querySelector(".clip");
      const rad = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)) + 2;
      const s = document.createElement("span");
      s.className = "sweep";
      s.style.cssText = "left:" + (x - rad) + "px;top:" + (y - rad) + "px;width:" + 2 * rad + "px;height:" + 2 * rad + "px";
      clip.appendChild(s);
      btn.classList.add("sweeping", "is-on");
      s.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: 440, easing: "cubic-bezier(0.22, 0.8, 0.26, 1)", fill: "forwards" })
        .onfinish = () => { btn.classList.remove("sweeping"); s.remove(); };
      const g = document.createElement("span");
      g.className = "glint";
      clip.appendChild(g);
      g.animate([{ transform: "translateX(-110%)" }, { transform: "translateX(110%)" }], { duration: 560, delay: 230, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "both" })
        .onfinish = () => g.remove();
    }
    later(ctx, RM ? 260 : 640, () => { picking = false; advance(); });
  }

  /* Home: the logo, and Back on the first screen */
  function syncSite() {
    const brand = $("#brand"), home = homeHref();
    if (home) brand.setAttribute("href", home);
    if (current) header(current.id);
  }

  /* Input */
  document.addEventListener("pointerdown", (e) => {
    const t = /** @type {Element} */ (e.target).closest(".opt, .btn, .icon-btn, .text-btn");
    if (!t) return;
    t.classList.add("is-pressed");
    const up = () => {
      t.classList.remove("is-pressed");
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  });
  document.addEventListener("click", (e) => {
    const target = /** @type {Element} */ (e.target);
    const act = /** @type {HTMLElement | null} */ (target.closest("[data-act]"));
    if (act) {
      const a = act.dataset.act;
      if (a === "next") { if (!busy) advance(); }
      return;
    }
    const m = /** @type {HTMLElement | null} */ (target.closest("[data-metric]"));
    if (m && current && current.id === "graph" && current.metric !== m.dataset.metric) {
      current.metric = m.dataset.metric;
      const seg = /** @type {HTMLElement} */ (m.parentElement);
      seg.dataset.v = current.metric;
      seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === m)));
      drawChart(current, false);
      return;
    }
    const o = target.closest(".opt");
    if (o && current && o.closest(".screen") === current.el) choose(o, e);
  });
  $("#backBtn").addEventListener("click", back);

  /* A few specks of light drifting up through the sky */
  if (!RM) {
    let html = "";
    for (let k = 0; k < 8; k++) {
      const d = 18 + Math.random() * 16;
      html += '<span class="mote" style="--x:' + (Math.random() * 100).toFixed(1) + "%;--s:" + (4 + Math.random() * 7).toFixed(1) + "px;--d:" + d.toFixed(1) +
        "s;--dl:" + (-Math.random() * d).toFixed(1) + "s;--sway:" + Math.round((Math.random() * 2 - 1) * 60) + 'px"></span>';
    }
    $("#motes").innerHTML = html;
  }

  syncSite();
  /* The plain link (the no-script fallback in components/landing/start.html) gives way to the screens only once the
     first one is really up. Every screen moves with Web Animations, so a browser without them (Safari before 13.1)
     keeps the link, with the logo and Back going home. So does any other failure on the way: the half-built screen
     goes, and the error still reports. */
  if (typeof Element.prototype.animate !== "function") return;
  try {
    // Back from checkout or the code screen on this page's own history entry: that step again, with the answers.
    go(resumeStep(), 1);
  } catch (error) {
    stage.querySelectorAll(".screen:not([data-start-fallback])").forEach((n) => n.remove());
    current = null;
    throw error;
  }
  stage.querySelectorAll("[data-start-fallback]").forEach((n) => n.remove());
  };

  window.cutaiStart = { mount, moneyIn, quoteIn, printerFor };
  mount();
})();
