(() => {
  "use strict";

  const STORE = {
    users: "editmax.demo.users.v1",
    session: "editmax.demo.session.v1",
    subscriptions: "editmax.demo.subscriptions.v1",
    contact: "editmax.demo.contact-messages.v1",
    refunds: "editmax.demo.refund-requests.v1"
  };
  const PLANS = {
    starter: { name: "Starter", monthly: 19.99, annual: 159.99, edits: "100 AI edits a month" },
    pro: { name: "Pro", monthly: 49.99, annual: 399.99, edits: "300 AI edits a month" },
    ultimate: { name: "Ultimate", monthly: 89.99, annual: 719.99, edits: "Unlimited AI edits" }
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const safeRead = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_) { return fallback; }
  };
  const safeWrite = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  };
  const getUsers = () => safeRead(STORE.users, {});
  const saveUsers = (users) => safeWrite(STORE.users, users);
  const getSubscriptions = () => safeRead(STORE.subscriptions, {});
  const saveSubscriptions = (subscriptions) => safeWrite(STORE.subscriptions, subscriptions);
  const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
  const getSessionEmail = () => normalizeEmail(safeRead(STORE.session, ""));
  const setSession = (email) => safeWrite(STORE.session, normalizeEmail(email));
  const clearSession = () => { try { localStorage.removeItem(STORE.session); } catch (_) {} };
  const currentUser = () => {
    const email = getSessionEmail();
    return email ? (getUsers()[email] || null) : null;
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const formatDate = (date) => {
    const parsed = date ? new Date(date) : null;
    return parsed && Number.isFinite(parsed.getTime())
      ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" }).format(parsed)
      : "—";
  };
  const money = (amount) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount);
  const safeNext = (candidate) => {
    if (!candidate) return "";
    try {
      const url = new URL(candidate, window.location.origin);
      if (url.origin !== window.location.origin || url.username || url.password) return "";
      return url.pathname + url.search + url.hash;
    } catch (_) { return ""; }
  };
  const getPath = () => {
    try { return decodeURIComponent(window.location.pathname).replace(/\/+$/, "") || "/"; }
    catch (_) { return window.location.pathname.replace(/\/+$/, "") || "/"; }
  };
  const getMode = () => new URLSearchParams(window.location.search).get("mode") || "";
  const authHref = (mode = "signin", next = "") => {
    const query = new URLSearchParams();
    if (mode === "signup") query.set("mode", "signup");
    if (mode === "reset") query.set("mode", "reset");
    if (next) query.set("next", next);
    return "./sign-in.html" + (query.size ? "?" + query.toString() : "");
  };
  const routeHref = (path) => path;
  const setStatus = (element, message, kind = "info") => {
    if (!element) return;
    element.textContent = message;
    element.dataset.kind = kind;
    element.hidden = !message;
    element.setAttribute("role", kind === "error" ? "alert" : "status");
  };
  const showToast = (message, kind = "info") => {
    let toast = $("#editmax-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "editmax-toast";
      toast.className = "em-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.dataset.kind = kind;
    toast.classList.add("is-visible");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("is-visible"), 4200);
  };
  const makeField = ({ label, id, name, type = "text", autocomplete = "off", placeholder = "", required = true, minlength = "", hint = "", showToggle = false, inputmode = "" }) => {
    const attrs = [
      `id="${id}"`, `name="${name}"`, `type="${type}"`, `autocomplete="${autocomplete}"`,
      `class="kit-input"`, `placeholder="${escapeHtml(placeholder)}"`, required ? "required" : "",
      minlength ? `minlength="${minlength}"` : "", inputmode ? `inputmode="${inputmode}"` : ""
    ].filter(Boolean).join(" ");
    return `<div class="em-field"><label class="kit-label" for="${id}">${label}</label>${showToggle
      ? `<div class="em-input-wrap"><input ${attrs}><button class="em-input-action" type="button" data-toggle-password="${id}" aria-label="Show password">Show</button></div>`
      : `<input ${attrs}>`}${hint ? `<p class="em-field-hint">${hint}</p>` : ""}</div>`;
  };

  async function passwordHash(password, saltHex) {
    if (!window.crypto || !crypto.subtle || !crypto.getRandomValues) {
      throw new Error("Secure browser storage is unavailable. Open this site over HTTPS or on localhost and try again.");
    }
    const bytesToHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const hexToBytes = (hex) => new Uint8Array((hex.match(/.{2}/g) || []).map((part) => parseInt(part, 16)));
    const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
    return { salt: bytesToHex(salt), hash: bytesToHex(new Uint8Array(bits)) };
  }
  const constantTimeEqual = (left, right) => {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
    return difference === 0;
  };
  async function createLocalUser({ name, email, password }) {
    const normalized = normalizeEmail(email);
    const users = getUsers();
    if (users[normalized]) throw new Error("An account with that email already exists. Sign in instead.");
    const credentials = await passwordHash(password);
    const user = {
      name: String(name || "").trim(),
      email: normalized,
      salt: credentials.salt,
      passwordHash: credentials.hash,
      createdAt: new Date().toISOString()
    };
    users[normalized] = user;
    if (!saveUsers(users)) throw new Error("This browser could not save the demo account. Check your storage settings and try again.");
    setSession(normalized);
    return user;
  }
  async function verifyLocalUser(email, password) {
    const normalized = normalizeEmail(email);
    const user = getUsers()[normalized];
    if (!user) throw new Error("We couldn't find an EditMax demo account with that email.");
    const candidate = await passwordHash(password, user.salt);
    if (!constantTimeEqual(candidate.hash, user.passwordHash)) throw new Error("That email and password don't match.");
    setSession(normalized);
    return user;
  }
  async function resetLocalPassword(email, password) {
    const normalized = normalizeEmail(email);
    const users = getUsers();
    const user = users[normalized];
    if (!user) throw new Error("There is no demo account for that email in this browser.");
    const credentials = await passwordHash(password);
    users[normalized] = { ...user, salt: credentials.salt, passwordHash: credentials.hash, updatedAt: new Date().toISOString() };
    if (!saveUsers(users)) throw new Error("This browser couldn't save the new password. Try again.");
    setSession(normalized);
    return users[normalized];
  }

  function updateNavigation() {
    const user = currentUser();
    $$('[data-when="in"]').forEach((element) => { element.hidden = !user; });
    $$('[data-when="out"]').forEach((element) => { element.hidden = !!user; });
    document.documentElement.dataset.signedIn = user ? "1" : "0";
  }

  function renderAuthPage() {
    const path = getPath();
    const isAccount = /(?:^|\/)account(?:\.html)?$/.test(path);
    const main = $("main#main");
    if (!main) return;
    const params = new URLSearchParams(window.location.search);
    const next = safeNext(params.get("next"));
    const user = currentUser();
    if (isAccount) {
      renderAccountPage(main, user);
      return;
    }

    const modeFromPath = /(?:^|\/)sign-up(?:\.html)?$/.test(path) ? "signup"
      : /(?:^|\/)forgot-password(?:\.html)?$/.test(path) ? "reset" : "";
    const mode = modeFromPath || getMode();
    if (user && mode !== "signup" && mode !== "reset") {
      main.innerHTML = `<div class="mx-auto w-full" style="max-width:560px"><div class="em-flow"><section class="kit-card em-card"><div class="em-confirm-mark" aria-hidden="true">✓</div><div class="em-center"><p class="em-kicker">EDITMAX ACCOUNT</p><h1 class="kit-title">You're signed in</h1><p class="kit-text em-lead">Signed in as <strong>${escapeHtml(user.email)}</strong>.</p><div class="em-app-actions"><a class="kit-btn kit-btn--primary kit-btn--block" href="./account.html">Go to your account</a><button class="kit-btn kit-btn--secondary kit-btn--block" type="button" data-action="sign-out">Sign out</button></div></div></section><p class="em-demo-note"><strong>Frontend demo.</strong> This account is saved only in this browser; no server is connected.</p></div></div>`;
      bindAccountActions(main);
      return;
    }

    const resetMode = mode === "reset" || mode === "recover";
    const signupMode = mode === "signup";
    const title = resetMode ? "Reset your password" : signupMode ? "Create your EditMax account" : "Welcome back";
    const description = resetMode
      ? "Choose a new password for a demo account saved in this browser."
      : signupMode
        ? "Create an account to save your plan and manage it here."
        : "Sign in to manage your EditMax plan and account.";
    const formFields = resetMode
      ? `${makeField({ label: "Email address", id: "auth-email", name: "email", type: "email", autocomplete: "email", placeholder: "you@example.com" })}${makeField({ label: "New password", id: "auth-password", name: "password", type: "password", autocomplete: "new-password", minlength: "8", placeholder: "At least 8 characters", showToggle: true })}${makeField({ label: "Confirm new password", id: "auth-confirm", name: "confirm", type: "password", autocomplete: "new-password", minlength: "8", placeholder: "Enter it again" })}`
      : signupMode
        ? `${makeField({ label: "Your name", id: "auth-name", name: "name", autocomplete: "name", placeholder: "Full name" })}${makeField({ label: "Email address", id: "auth-email", name: "email", type: "email", autocomplete: "email", placeholder: "you@example.com" })}${makeField({ label: "Password", id: "auth-password", name: "password", type: "password", autocomplete: "new-password", minlength: "8", placeholder: "At least 8 characters", showToggle: true })}${makeField({ label: "Confirm password", id: "auth-confirm", name: "confirm", type: "password", autocomplete: "new-password", minlength: "8", placeholder: "Enter it again" })}`
        : `${makeField({ label: "Email address", id: "auth-email", name: "email", type: "email", autocomplete: "email", placeholder: "you@example.com" })}${makeField({ label: "Password", id: "auth-password", name: "password", type: "password", autocomplete: "current-password", minlength: "8", placeholder: "Your password", showToggle: true })}`;
    const submitText = resetMode ? "Save new password" : signupMode ? "Create account" : "Sign in";
    const switchLinks = resetMode
      ? `<p class="em-auth-switch"><a class="em-link" href="${authHref("signin", next)}">Back to sign in</a></p>`
      : signupMode
        ? `<p class="em-auth-switch">Already have an account? <a class="em-link" href="${authHref("signin", next)}">Sign in</a></p>`
        : `<div class="em-auth-links"><a href="${authHref("reset", next)}">Forgot password?</a></div><p class="em-auth-switch">New to EditMax? <a class="em-link" href="${authHref("signup", next)}">Create an account</a></p>`;

    main.innerHTML = `<div class="mx-auto w-full" style="max-width:560px"><div class="em-flow"><div class="em-card-heading"><div><p class="em-kicker">YOUR EDITMAX ACCOUNT</p><h1 class="kit-title">${title}</h1><p class="kit-text em-lead">${description}</p></div></div><section class="kit-card em-card"><div class="em-status" data-auth-status role="status" aria-live="polite" hidden></div><form class="em-auth-form" data-auth-form novalidate>${formFields}${resetMode ? `<p class="em-smallprint">This front-end demo cannot send password-reset emails. The password changes only for the account saved in this browser.</p>` : ""}<button class="kit-btn kit-btn--primary kit-btn--block" type="submit">${submitText}</button></form>${switchLinks}</section><p class="em-demo-note"><strong>Frontend demo.</strong> Accounts are stored in this browser only. There is no server, email verification, or cross-device sign-in.</p></div></div>`;
    bindPasswordToggles(main);
    const form = $("[data-auth-form]", main);
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = $("[data-auth-status]", main);
      const button = $("button[type=submit]", form);
      const data = new FormData(form);
      const email = normalizeEmail(data.get("email"));
      const password = String(data.get("password") || "");
      const confirm = String(data.get("confirm") || "");
      if (!form.reportValidity()) return;
      if ((signupMode || resetMode) && password !== confirm) {
        setStatus(status, "The passwords do not match.", "error");
        $("#auth-confirm", form)?.focus();
        return;
      }
      button.disabled = true;
      button.textContent = resetMode ? "Saving…" : signupMode ? "Creating account…" : "Signing in…";
      try {
        if (resetMode) await resetLocalPassword(email, password);
        else if (signupMode) await createLocalUser({ name: data.get("name"), email, password });
        else await verifyLocalUser(email, password);
        updateNavigation();
        const destination = next || "./account.html";
        window.location.assign(destination);
      } catch (error) {
        setStatus(status, error?.message || "Something went wrong. Please try again.", "error");
        button.disabled = false;
        button.textContent = submitText;
      }
    });
  }

  function bindPasswordToggles(root) {
    $$('[data-toggle-password]', root).forEach((button) => {
      button.addEventListener("click", () => {
        const input = $("#" + CSS.escape(button.dataset.togglePassword), root);
        if (!input) return;
        const reveal = input.type === "password";
        input.type = reveal ? "text" : "password";
        button.textContent = reveal ? "Hide" : "Show";
        button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
        input.focus();
      });
    });
  }

  function getSubscription(email) {
    return getSubscriptions()[normalizeEmail(email)] || null;
  }
  function setSubscription(email, subscription) {
    const subscriptions = getSubscriptions();
    subscriptions[normalizeEmail(email)] = subscription;
    return saveSubscriptions(subscriptions);
  }
  function renderAccountPage(main, user) {
    if (!user) {
      main.innerHTML = `<div class="mx-auto w-full" style="max-width:560px"><div class="em-flow"><div class="em-card-heading"><div><p class="em-kicker">YOUR EDITMAX ACCOUNT</p><h1 class="kit-title">Manage your plan</h1><p class="kit-text em-lead">Sign in or create an account to view your plan and settings.</p></div></div><section class="kit-card em-card"><div class="em-demo-note" style="margin-top:0"><strong>Frontend demo.</strong> Demo accounts and plan details are saved only on this browser.</div><div class="em-app-actions"><a class="kit-btn kit-btn--primary kit-btn--block" href="${authHref("signin", "./account.html")}">Sign in</a><a class="kit-btn kit-btn--secondary kit-btn--block" href="${authHref("signup", "./account.html")}">Create account</a></div><p class="em-app-note">Need help with a real purchase? Visit <a class="em-link" href="./support.html">Support</a>.</p></section></div></div>`;
      return;
    }
    const subscription = getSubscription(user.email);
    const plan = subscription && PLANS[subscription.plan] ? PLANS[subscription.plan] : null;
    const statusLabel = !subscription ? "No active plan" : subscription.status === "cancelled" ? "Cancelled" : subscription.status === "trial" ? "Free trial active" : "Active";
    const state = !subscription ? "none" : subscription.status === "cancelled" ? "cancelled" : "active";
    const initials = (user.name || user.email).trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
    const planSummary = subscription && plan
      ? `<span class="em-pill" data-state="${state}">${statusLabel}</span><div class="em-plan-box"><dl><dt>Plan</dt><dd>${plan.name}</dd><dt>Billing</dt><dd>${subscription.period === "annual" ? "Annual" : "Monthly"}</dd><dt>Price after trial</dt><dd>${money(subscription.price)} per ${subscription.period === "annual" ? "year" : "month"}</dd><dt>Trial ends</dt><dd>${formatDate(subscription.trialEndsAt)}</dd></dl></div>`
      : `<span class="em-pill" data-state="none">${statusLabel}</span><div class="em-plan-box"><p class="kit-text" style="margin:0">Choose a plan to begin a 3-day free trial.</p><a class="em-link" href="./index.html#pricing">View plans</a></div>`;
    const cancelAction = subscription && subscription.status !== "cancelled"
      ? `<button class="kit-btn kit-btn--secondary" type="button" data-action="cancel-plan">Cancel demo plan</button>`
      : "";
    main.innerHTML = `<div class="mx-auto w-full" style="max-width:620px"><div class="em-flow em-flow--wide"><div class="em-card-heading"><div><p class="em-kicker">YOUR EDITMAX ACCOUNT</p><h1 class="kit-title">Account</h1><p class="kit-text em-lead">Your profile and plan, saved in this browser.</p></div></div><section class="kit-card em-card"><div class="em-account-top"><span class="em-avatar" aria-hidden="true">${escapeHtml(initials)}</span><div class="em-account-meta"><h2 class="kit-heading">${escapeHtml(user.name || "EditMax member")}</h2><p class="kit-small">${escapeHtml(user.email)}</p></div></div><div class="em-status" data-account-status role="status" aria-live="polite" hidden></div><h2 class="kit-heading">Your plan</h2>${planSummary}<div class="em-app-actions"><a class="kit-btn kit-btn--primary" href="${subscription && plan ? `/checkout?plan=${encodeURIComponent(subscription.plan)}&period=${encodeURIComponent(subscription.period || "monthly")}` : "./index.html#pricing"}">${subscription && plan ? "Manage plan" : "Choose a plan"}</a>${cancelAction}<button class="kit-btn kit-btn--quiet" type="button" data-action="sign-out">Sign out</button></div><div class="em-app-note"><a href="./support.html">Support</a> · <a href="./contact.html">Contact</a> · <a class="em-danger-link" href="#delete-account" data-action="delete-account">Delete this demo account</a></div></section><p class="em-demo-note"><strong>Frontend demo only.</strong> The account and plan above are stored on this device. No payment was taken, and there is no server to sync changes to another device.</p></div></div>`;
    bindAccountActions(main);
  }

  function bindAccountActions(root) {
    $$('[data-action="sign-out"]', root).forEach((button) => button.addEventListener("click", () => {
      clearSession();
      updateNavigation();
      const path = getPath();
      if (/(?:^|\/)account(?:\.html)?$/.test(path)) renderAccountPage($("main#main"), null);
      else renderAuthPage();
    }));
    $$('[data-action="cancel-plan"]', root).forEach((button) => button.addEventListener("click", () => {
      const user = currentUser();
      const subscription = user && getSubscription(user.email);
      if (!subscription) return;
      subscription.status = "cancelled";
      subscription.cancelledAt = new Date().toISOString();
      subscription.renewsAt = null;
      setSubscription(user.email, subscription);
      renderAccountPage($("main#main"), user);
      setStatus($("[data-account-status]"), "Your demo plan has been cancelled in this browser. No live billing is connected.", "success");
    }));
    $$('[data-action="delete-account"]', root).forEach((link) => link.addEventListener("click", (event) => {
      event.preventDefault();
      const user = currentUser();
      if (!user || !window.confirm("Delete this demo account and its plan from this browser?")) return;
      const users = getUsers();
      delete users[user.email];
      saveUsers(users);
      const subscriptions = getSubscriptions();
      delete subscriptions[user.email];
      saveSubscriptions(subscriptions);
      clearSession();
      updateNavigation();
      renderAccountPage($("main#main"), null);
    }));
  }

  function planFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    const period = params.get("period");
    return {
      plan: Object.prototype.hasOwnProperty.call(PLANS, plan) ? plan : "pro",
      period: period === "annual" ? "annual" : "monthly"
    };
  }
  function renderCheckout() {
    const mount = $("[data-checkout-root]");
    if (!mount) return;
    const selection = planFromQuery();
    const user = currentUser();
    const params = new URLSearchParams(window.location.search);
    const codeInitiallyOpen = params.get("open") === "code";
    const accountBlock = user
      ? `<div class="em-account-top"><span class="em-avatar" aria-hidden="true">${escapeHtml((user.name || user.email).slice(0,1).toUpperCase())}</span><div class="em-account-meta"><strong>${escapeHtml(user.name || "EditMax member")}</strong><p class="kit-small">${escapeHtml(user.email)}</p></div></div><p class="em-smallprint">This demo trial will be saved to this browser account.</p><button class="kit-btn kit-btn--quiet" type="button" data-action="checkout-sign-out">Use a different account</button>`
      : `${makeField({ label: "Full name", id: "checkout-name", name: "name", autocomplete: "name", placeholder: "Full name" })}${makeField({ label: "Email address", id: "checkout-email", name: "email", type: "email", autocomplete: "email", placeholder: "you@example.com" })}${makeField({ label: "Create a password", id: "checkout-password", name: "password", type: "password", autocomplete: "new-password", minlength: "8", placeholder: "At least 8 characters", showToggle: true, hint: "Your demo account is stored on this device only." })}${makeField({ label: "Confirm password", id: "checkout-confirm", name: "confirm", type: "password", autocomplete: "new-password", minlength: "8", placeholder: "Enter it again" })}<p class="em-smallprint">Already have an account? <a class="em-link" href="${authHref("signin", "/checkout?plan=" + selection.plan + "&period=" + selection.period)}">Sign in</a></p>`;
    const planOptions = Object.entries(PLANS).map(([id, plan]) => `<option value="${id}"${selection.plan === id ? " selected" : ""}>${plan.name} — ${plan.edits}</option>`).join("");
    mount.innerHTML = `<div class="em-checkout-layout"><div class="em-checkout-main"><div class="em-checkout-title"><p class="em-kicker">EDITMAX CHECKOUT</p><h1 class="kit-title">Start your 3-day free trial</h1><p class="kit-text em-lead">Review your plan and enter the details to continue.</p></div><div class="em-status" data-checkout-status role="status" aria-live="polite" hidden></div><form class="em-form-stack" data-checkout-form novalidate><section class="kit-card em-card"><h2 class="em-section-title"><span class="em-section-number">1</span>Your account</h2><div data-checkout-account>${accountBlock}</div></section><section class="kit-card em-card"><h2 class="em-section-title"><span class="em-section-number">2</span>Payment details</h2><p class="kit-small" style="margin:0 0 16px">Test form only. Use <strong>4242 4242 4242 4242</strong>, any future expiry, and any 3-digit CVC. Never enter a real card number here.</p><div class="em-form-stack">${makeField({ label: "Name on card", id: "checkout-card-name", name: "cardName", autocomplete: "cc-name", placeholder: "Name on card" })}<div class="em-field"><label class="kit-label" for="checkout-card-number">Card number</label><input class="kit-input" id="checkout-card-number" name="cardNumber" type="text" autocomplete="cc-number" inputmode="numeric" maxlength="23" placeholder="4242 4242 4242 4242" required></div><div class="em-payment-grid"><div class="em-field"><label class="kit-label" for="checkout-expiry">Expiry date</label><input class="kit-input" id="checkout-expiry" name="expiry" type="text" inputmode="numeric" autocomplete="cc-exp" maxlength="5" placeholder="MM/YY" required></div><div class="em-field"><label class="kit-label" for="checkout-cvc">Security code</label><input class="kit-input" id="checkout-cvc" name="cvc" type="password" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="CVC" required></div></div><div class="em-grid-2"><div class="em-field"><label class="kit-label" for="checkout-country">Country/region</label><select class="kit-input" id="checkout-country" name="country" autocomplete="country-name" required><option value="">Select country</option><option>India</option><option>United States</option><option>United Kingdom</option><option>Canada</option><option>Australia</option><option>Other</option></select></div>${makeField({ label: "Postal code", id: "checkout-postal", name: "postal", autocomplete: "postal-code", placeholder: "Postal code" })}</div></div><p class="em-smallprint">Payment details are only checked in your browser. This demo does not send or store card information.</p></section><section class="kit-card em-card"><h2 class="em-section-title"><span class="em-section-number">3</span>Confirm your trial</h2><label class="em-checkbox"><input name="agree" type="checkbox" required><span>I agree to the <a class="em-link" href="./terms.html">Terms of Use</a> and <a class="em-link" href="./privacy.html">Privacy Policy</a>.</span></label><div class="em-demo-note"><strong>No payment is processed.</strong> This is a frontend demonstration; no real subscription is created and no card data leaves your device.</div><button class="kit-btn kit-btn--primary kit-btn--block" type="submit" style="margin-top:18px">Start my 3-day free trial</button><p class="em-smallprint">No charge today. In this demo, trial status remains local and will not renew.</p></section></form></div><aside class="em-checkout-side"><section class="kit-card em-card"><p class="em-kicker">YOUR PLAN</p><h2 class="kit-heading" data-summary-plan></h2><p class="kit-small" data-summary-edits></p><div class="em-plan-fields"><div class="em-field"><label class="kit-label" for="checkout-plan">Plan</label><select id="checkout-plan" class="kit-input" name="plan">${planOptions}</select></div><div class="em-field"><label class="kit-label" for="checkout-period">Billing</label><select id="checkout-period" class="kit-input" name="period"><option value="monthly"${selection.period === "monthly" ? " selected" : ""}>Monthly</option><option value="annual"${selection.period === "annual" ? " selected" : ""}>Annual</option></select></div></div><div class="em-summary-line"><span>Trial today</span><strong>$0.00</strong></div><div class="em-summary-line"><span>After 3-day trial</span><strong data-summary-price></strong></div><div class="em-summary-total"><span>Due today</span><strong>$0.00</strong></div><button class="kit-btn kit-btn--quiet" type="button" data-toggle-code aria-expanded="${codeInitiallyOpen ? "true" : "false"}">Have a code?</button><div data-code-box ${codeInitiallyOpen ? "" : "hidden"}><label class="kit-label" for="checkout-code">Promo code</label><div class="em-code-row"><input class="kit-input" id="checkout-code" name="code" type="text" autocomplete="off" placeholder="Enter code"><button class="kit-btn kit-btn--secondary" type="button" data-apply-code>Apply</button></div><p class="em-smallprint" data-code-result>Promo codes are not validated or applied in this frontend demo.</p></div><p class="em-smallprint">One free trial per account, cancel anytime. Plan settings are saved only in this browser.</p></section></aside></div>`;

    const form = $("[data-checkout-form]", mount);
    const status = $("[data-checkout-status]", mount);
    const planSelect = $("#checkout-plan", mount);
    const periodSelect = $("#checkout-period", mount);
    const updateSummary = () => {
      const planId = planSelect.value;
      const period = periodSelect.value;
      const plan = PLANS[planId] || PLANS.pro;
      const price = plan[period];
      $("[data-summary-plan]", mount).textContent = plan.name;
      $("[data-summary-edits]", mount).textContent = plan.edits;
      $("[data-summary-price]", mount).textContent = money(price) + (period === "annual" ? " / year" : " / month");
      const url = new URL(window.location.href);
      url.searchParams.set("plan", planId);
      url.searchParams.set("period", period);
      history.replaceState({}, "", url.pathname + url.search + url.hash);
    };
    planSelect.addEventListener("change", updateSummary);
    periodSelect.addEventListener("change", updateSummary);
    updateSummary();
    bindPasswordToggles(mount);
    $('[data-action="checkout-sign-out"]', mount)?.addEventListener("click", () => {
      clearSession(); updateNavigation(); renderCheckout();
    });
    $("[data-toggle-code]", mount)?.addEventListener("click", (event) => {
      const box = $("[data-code-box]", mount);
      const open = box.hidden;
      box.hidden = !open;
      event.currentTarget.setAttribute("aria-expanded", String(open));
      if (open) $("#checkout-code", mount)?.focus();
    });
    $("[data-apply-code]", mount)?.addEventListener("click", () => {
      const code = $("#checkout-code", mount).value.trim();
      const result = $("[data-code-result]", mount);
      result.textContent = code
        ? "Code saved for this demo. It cannot change pricing until a live checkout is connected."
        : "Enter a code first.";
      result.setAttribute("role", "status");
    });
    const numberInput = $("#checkout-card-number", mount);
    numberInput?.addEventListener("input", () => {
      const digits = numberInput.value.replace(/\D/g, "").slice(0, 19);
      numberInput.value = digits.replace(/(.{4})/g, "$1 ").trim();
    });
    const expiryInput = $("#checkout-expiry", mount);
    expiryInput?.addEventListener("input", () => {
      const digits = expiryInput.value.replace(/\D/g, "").slice(0, 4);
      expiryInput.value = digits.length > 2 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits;
    });
    const cvc = $("#checkout-cvc", mount);
    cvc?.addEventListener("input", () => { cvc.value = cvc.value.replace(/\D/g, "").slice(0, 4); });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const activeUser = currentUser();
      const email = activeUser ? activeUser.email : normalizeEmail(data.get("email"));
      const password = String(data.get("password") || "");
      const confirm = String(data.get("confirm") || "");
      if (!activeUser && password !== confirm) {
        setStatus(status, "The account passwords do not match.", "error");
        $("#checkout-confirm", mount)?.focus(); return;
      }
      const cardDigits = String(data.get("cardNumber") || "").replace(/\D/g, "");
      if (!passesLuhn(cardDigits)) {
        setStatus(status, "Enter the demo card number 4242 4242 4242 4242 (or another valid test number).", "error");
        $("#checkout-card-number", mount)?.focus(); return;
      }
      if (!validExpiry(String(data.get("expiry") || ""))) {
        setStatus(status, "Enter an expiry date in MM/YY format that hasn't passed.", "error");
        $("#checkout-expiry", mount)?.focus(); return;
      }
      if (!/^\d{3,4}$/.test(String(data.get("cvc") || ""))) {
        setStatus(status, "Enter a 3- or 4-digit demo security code.", "error");
        $("#checkout-cvc", mount)?.focus(); return;
      }
      const submit = $("button[type=submit]", form);
      submit.disabled = true;
      submit.textContent = "Preparing your demo trial…";
      try {
        let account = activeUser;
        if (!account) account = await createLocalUser({ name: data.get("name"), email, password });
        const planId = planSelect.value;
        const period = periodSelect.value;
        const startedAt = new Date();
        const trialEndsAt = new Date(startedAt.getTime() + 3 * 24 * 60 * 60 * 1000);
        const saved = setSubscription(account.email, {
          email: account.email,
          plan: planId,
          period,
          status: "trial",
          price: PLANS[planId][period],
          startedAt: startedAt.toISOString(),
          trialEndsAt: trialEndsAt.toISOString(),
          createdAt: startedAt.toISOString(),
          demo: true
        });
        if (!saved) throw new Error("This browser couldn't save the trial. Check your storage settings and try again.");
        updateNavigation();
        window.location.assign("/welcome?plan=" + encodeURIComponent(planId));
      } catch (error) {
        setStatus(status, error?.message || "We couldn't save the demo trial. Please try again.", "error");
        submit.disabled = false;
        submit.textContent = "Start my 3-day free trial";
      }
    });
  }
  function passesLuhn(value) {
    if (!/^\d{13,19}$/.test(value)) return false;
    let sum = 0, double = false;
    for (let index = value.length - 1; index >= 0; index--) {
      let digit = Number(value[index]);
      if (double) { digit *= 2; if (digit > 9) digit -= 9; }
      sum += digit;
      double = !double;
    }
    return sum % 10 === 0;
  }
  function validExpiry(value) {
    const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value.trim());
    if (!match) return false;
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    const now = new Date();
    return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
  }

  function renderRefund() {
    const mount = $("[data-refund-root]");
    if (!mount) return;
    const user = currentUser();
    mount.innerHTML = `<div class="em-flow"><div class="em-card-heading"><div><p class="em-kicker">EDITMAX SUPPORT</p><h1 class="kit-title">Refund request</h1><p class="kit-text em-lead">Share the details of your purchase and our support team can review it.</p></div></div><section class="kit-card em-card"><div class="em-status" data-refund-status role="status" aria-live="polite" hidden></div><form class="em-form-stack" data-refund-form novalidate>${makeField({ label: "Email used for the purchase", id: "refund-email", name: "email", type: "email", autocomplete: "email", placeholder: "you@example.com" })}<div class="em-field"><label class="kit-label" for="refund-source">Where did you subscribe?</label><select class="kit-input" id="refund-source" name="source" required><option value="">Choose one</option><option>On the EditMax website</option><option>Apple App Store</option><option>Google Play</option><option>Other</option></select></div>${makeField({ label: "Order or receipt number (optional)", id: "refund-order", name: "order", required: false, placeholder: "Receipt number" })}<div class="em-field"><label class="kit-label" for="refund-reason">Reason for your request</label><select class="kit-input" id="refund-reason" name="reason" required><option value="">Choose one</option><option>Accidental purchase</option><option>Service issue</option><option>Duplicate charge</option><option>Other</option></select></div><div class="em-field"><label class="kit-label" for="refund-details">Anything else we should know?</label><textarea class="kit-input" id="refund-details" name="details" rows="4" maxlength="2000" placeholder="Add details to help us review your request" required></textarea></div><div class="em-demo-note"><strong>Frontend demo.</strong> This request is saved only in this browser. It is not sent to EditMax support.</div><button class="kit-btn kit-btn--primary kit-btn--block" type="submit">Save request</button></form></section></div>`;
    if (user) $("#refund-email", mount).value = user.email;
    $("[data-refund-form]", mount)?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const requests = safeRead(STORE.refunds, []);
      requests.unshift({
        email: normalizeEmail(data.get("email")),
        source: String(data.get("source")),
        order: String(data.get("order") || "").trim(),
        reason: String(data.get("reason")),
        details: String(data.get("details") || "").trim(),
        submittedAt: new Date().toISOString(),
        demo: true
      });
      if (!safeWrite(STORE.refunds, requests)) {
        setStatus($("[data-refund-status]", mount), "This browser couldn't save the request. Check your storage settings and try again.", "error");
        return;
      }
      form.reset();
      setStatus($("[data-refund-status]", mount), "Refund request saved in this browser demo. Nothing was sent; connect a support service for real requests.", "success");
    });
  }

  function renderWelcome() {
    const mount = $("[data-welcome-root]");
    if (!mount) return;
    const user = currentUser();
    const subscription = user && getSubscription(user.email);
    const plan = subscription && PLANS[subscription.plan] ? PLANS[subscription.plan] : null;
    const params = new URLSearchParams(window.location.search);
    const fallbackPlan = PLANS[params.get("plan")] || null;
    const displayPlan = plan || fallbackPlan;
    mount.innerHTML = `<div class="em-flow"><section class="kit-card em-card em-center"><div class="em-confirm-mark" aria-hidden="true">✓</div><p class="em-kicker">${displayPlan ? escapeHtml(displayPlan.name.toUpperCase()) + " PLAN" : "EDITMAX"}</p><h1 class="kit-title">${displayPlan ? "You're all set" : "Welcome to EditMax"}</h1><p class="kit-text em-lead">${user ? "Your demo account is ready." : "Explore EditMax and choose a plan when you're ready."}</p>${subscription && plan ? `<div class="em-plan-box em-center"><span class="em-pill">Free trial active</span><p class="kit-small" style="margin:0">${escapeHtml(plan.name)} · ${subscription.period === "annual" ? "Annual" : "Monthly"}<br>Trial ends ${formatDate(subscription.trialEndsAt)}</p></div>` : ""}<div class="em-demo-note"><strong>No payment was processed.</strong> This frontend demo saved its trial locally in this browser. It will not renew or charge you.</div><div class="em-app-actions"><a class="kit-btn kit-btn--primary kit-btn--block" href="./account.html">Go to your account</a><a class="kit-btn kit-btn--secondary kit-btn--block" href="./index.html">Back to EditMax</a></div></section></div>`;
  }

  function initContactForm() {
    const form = $("main form");
    if (!form || !$("input[name=name]", form) || !$("textarea[name=message]", form)) return;
    const status = document.createElement("div");
    status.className = "em-status";
    status.hidden = true;
    status.setAttribute("aria-live", "polite");
    form.prepend(status);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const honeypot = String(data.get("msg_blank") || "").trim();
      if (honeypot) { form.reset(); setStatus(status, "Thanks. Your message has been recorded.", "success"); return; }
      const messages = safeRead(STORE.contact, []);
      messages.unshift({
        name: String(data.get("name") || "").trim(),
        email: normalizeEmail(data.get("email")),
        topic: String(data.get("topic") || ""),
        message: String(data.get("message") || "").trim(),
        submittedAt: new Date().toISOString(),
        demo: true
      });
      if (!safeWrite(STORE.contact, messages)) {
        setStatus(status, "This browser couldn't save the message. Check your storage settings and try again.", "error");
        return;
      }
      form.reset();
      const topicSelect = $("select[name=topic]", form);
      const topicLabel = topicSelect && $("span[aria-hidden=true]", topicSelect.parentElement);
      if (topicLabel) topicLabel.textContent = "Choose one";
      setStatus(status, "Message saved in this browser demo. It has not been sent; connect a support service to receive messages.", "success");
    });
  }

  function initMobileMenus() {
    const trigger = $('header button[aria-label="Open menu"]');
    if (!trigger || $("#drawer") || $("#editmax-mobile-nav")) return;
    const overlay = document.createElement("div");
    overlay.className = "em-mobile-nav";
    overlay.id = "editmax-mobile-nav";
    overlay.hidden = true;
    overlay.innerHTML = `<div class="em-mobile-nav-panel" role="dialog" aria-modal="true" aria-label="Site menu"><div class="em-mobile-nav-head"><a class="kit-logo" href="./index.html" aria-label="EditMax home"><img src="./assets/18_editmax-app-icon.svg" alt="" width="28" height="28"><span class="kit-logo-word">Edit<span>Max</span></span></a><button class="em-mobile-nav-close" type="button" aria-label="Close menu">×</button></div><nav><a href="/#creators">Creators</a><a href="/#pricing">Pricing</a><a href="/#faq">FAQ</a><a href="./account.html">Your plan</a><a href="./support.html">Support</a><a href="./contact.html">Contact</a><a data-when="out" href="./sign-in.html">Sign in</a><a data-when="in" href="./account.html">Account</a><a href="./start.html">Get EditMax</a></nav></div>`;
    document.body.appendChild(overlay);
    const close = () => { overlay.hidden = true; trigger.setAttribute("aria-expanded", "false"); };
    trigger.setAttribute("aria-controls", overlay.id);
    trigger.addEventListener("click", (event) => { event.stopPropagation(); overlay.hidden = false; trigger.setAttribute("aria-expanded", "true"); $(".em-mobile-nav-close", overlay)?.focus(); });
    $(".em-mobile-nav-close", overlay).addEventListener("click", (event) => { event.stopPropagation(); close(); });
    overlay.addEventListener("click", (event) => { if (event.target === overlay || event.target.closest("a")) close(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !overlay.hidden) { close(); trigger.focus(); } });
  }

  function initPage() {
    updateNavigation();
    initMobileMenus();
    const path = getPath();
    if (/(?:^|\/)(?:account|sign-in|sign-up|forgot-password)(?:\.html)?$/.test(path)) renderAuthPage();
    if ($("[data-app-page=checkout]")) renderCheckout();
    if ($("[data-app-page=refund]")) renderRefund();
    if ($("[data-app-page=welcome]")) renderWelcome();
    if (/contact(?:\.html)?$/.test(path)) initContactForm();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPage, { once: true });
  else initPage();
  window.addEventListener("storage", updateNavigation);
  window.EditMaxDemo = Object.freeze({
    version: 1,
    get currentUser() { return currentUser(); },
    getSubscription,
    signOut() { clearSession(); updateNavigation(); },
    mode: "local-browser-demo"
  });
})();
