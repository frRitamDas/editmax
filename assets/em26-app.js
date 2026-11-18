/* EditMax — data layer + page controllers (demo persistence in localStorage) */
(function () {
  "use strict";

  var KEY = {
    users: "editmax.demo.users.v1",
    session: "editmax.demo.session.v1",
    subs: "editmax.demo.subscriptions.v1",
    contact: "editmax.demo.contact-messages.v1",
    refunds: "editmax.demo.refund-requests.v1",
    quiz: "editmax.demo.quiz.v1"
  };

  var PLANS = {
    starter: { id: "starter", name: "Starter", monthly: 19.99, annual: 159.99, edits: "100 AI edits a month", videos: "30 finished videos" },
    pro: { id: "pro", name: "Pro", monthly: 49.99, annual: 399.99, edits: "300 AI edits a month", videos: "150 finished videos" },
    ultimate: { id: "ultimate", name: "Ultimate", monthly: 89.99, annual: 719.99, edits: "Unlimited AI edits", videos: "Unlimited exports" }
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function money(n) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);
  }

  /* -------- session (tolerant of legacy shapes) -------- */
  function getSession() {
    var raw = read(KEY.session, null);
    if (!raw) return null;
    if (typeof raw === "string") {
      var value = raw;
      try { value = JSON.parse(raw); } catch (e) {}
      if (typeof value === "string") return { email: value, name: value.split("@")[0] };
      if (value && typeof value === "object") return value;
      return null;
    }
    if (typeof raw === "object") {
      if (raw.email) return raw;
      if (raw.user && raw.user.email) return raw.user;
    }
    return null;
  }
  function setSession(user) {
    write(KEY.session, { email: user.email, name: user.name || user.email.split("@")[0], at: Date.now() });
  }
  function signOut() { try { localStorage.removeItem(KEY.session); } catch (e) {} }

  function users() {
    var list = read(KEY.users, []);
    return Array.isArray(list) ? list : Object.values(list || {});
  }
  function signUp(email, password, name) {
    email = String(email || "").trim().toLowerCase();
    var list = users();
    if (list.some(function (u) { return String(u.email).toLowerCase() === email; })) {
      return { ok: false, error: "An account with that email already exists. Sign in instead." };
    }
    var user = { email: email, name: name || email.split("@")[0], password: password, createdAt: new Date().toISOString() };
    list.push(user);
    write(KEY.users, list);
    setSession(user);
    return { ok: true, user: user };
  }
  function signIn(email, password) {
    email = String(email || "").trim().toLowerCase();
    var found = users().find(function (u) { return String(u.email).toLowerCase() === email; });
    if (!found) return { ok: false, error: "We couldn't find that account. Create one instead." };
    if (found.password && password && found.password !== password) {
      return { ok: false, error: "That password doesn't match. Try again." };
    }
    setSession(found);
    return { ok: true, user: found };
  }

  /* -------- subscriptions -------- */
  function allSubs() {
    var list = read(KEY.subs, []);
    if (Array.isArray(list)) return list;
    return Object.keys(list || {}).map(function (k) {
      var v = list[k] || {};
      v.email = v.email || k;
      return v;
    });
  }
  function subscriptionFor(email) {
    if (!email) return null;
    var list = allSubs().filter(function (s) { return String(s.email || "").toLowerCase() === String(email).toLowerCase(); });
    if (!list.length) return null;
    return list[list.length - 1];
  }
  function saveSubscription(sub) {
    var list = allSubs().filter(function (s) {
      return String(s.email || "").toLowerCase() !== String(sub.email).toLowerCase();
    });
    list.push(sub);
    write(KEY.subs, list);
    return sub;
  }
  function cancelSubscription(email) {
    var sub = subscriptionFor(email);
    if (!sub) return null;
    sub.status = "canceled";
    sub.canceledAt = new Date().toISOString();
    saveSubscription(sub);
    return sub;
  }

  var QUIZ_DEFAULTS = {
    role: "", goal: "", videos: "", editing: "", spend: "", plan: "pro", brief: ""
  };
  function getQuiz() {
    var q = read(KEY.quiz, null);
    return Object.assign({}, QUIZ_DEFAULTS, q || {});
  }
  function saveQuiz(patch) {
    var next = Object.assign(getQuiz(), patch || {});
    write(KEY.quiz, next);
    return next;
  }

  function submitContact(payload) {
    var list = read(KEY.contact, []);
    if (!Array.isArray(list)) list = [];
    var entry = Object.assign({ createdAt: new Date().toISOString() }, payload);
    list.push(entry);
    write(KEY.contact, list);
    return entry;
  }
  function submitRefund(payload) {
    var list = read(KEY.refunds, []);
    if (!Array.isArray(list)) list = [];
    var entry = Object.assign({ createdAt: new Date().toISOString() }, payload);
    list.push(entry);
    write(KEY.refunds, list);
    return entry;
  }

  function query(name, fallback) {
    var value = new URLSearchParams(location.search).get(name);
    return value === null ? fallback : value;
  }
  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(value || "").trim());
  }
  function toast(message) {
    if (window.EditMaxUI && window.EditMaxUI.toast) window.EditMaxUI.toast(message);
  }
  function errorNode(form) {
    return form ? form.querySelector(".form-error") : null;
  }
  function showError(form, message) {
    var node = errorNode(form);
    if (!node) return;
    node.textContent = message;
    node.classList.add("is-on");
  }
  function clearError(form) {
    var node = errorNode(form);
    if (node) { node.classList.remove("is-on"); node.textContent = ""; }
  }

  /* ================= page controllers ================= */
  var page = document.body.dataset.page;

  /* ---------- sign in / sign up / reset ---------- */
  if (page === "signin") {
    var mode = (query("mode", "signin") || "signin").toLowerCase();
    var form = document.querySelector("[data-auth-form]");
    var titleEl = document.querySelector("[data-auth-title]");
    var subEl = document.querySelector("[data-auth-sub]");
    var nameField = document.querySelector("[data-field-name]");
    var confirmField = document.querySelector("[data-field-confirm]");
    var submitEl = document.querySelector("[data-auth-submit]");
    var switchEl = document.querySelector("[data-auth-switch]");
    var altEl = document.querySelector("[data-auth-alt]");
    var next = query("next", "./account.html");

    if (mode === "signup") {
      document.title = "Create your EditMax account";
      if (titleEl) titleEl.textContent = "Create your account";
      if (subEl) subEl.textContent = "3 days free. No charge today. Cancel anytime.";
      if (nameField) nameField.hidden = false;
      if (confirmField) confirmField.hidden = false;
      if (submitEl) submitEl.textContent = "Create account";
      if (switchEl) switchEl.innerHTML = 'Already have an account? <a class="link-arrow" href="./sign-in.html">Sign in</a>';
      if (altEl) altEl.hidden = true;
    } else if (mode === "reset") {
      document.title = "Reset your password — EditMax";
      if (titleEl) titleEl.textContent = "Reset your password";
      if (subEl) subEl.textContent = "Enter your email and we'll send a reset link.";
      if (confirmField) confirmField.hidden = true;
      if (submitEl) submitEl.textContent = "Send reset link";
      if (switchEl) switchEl.innerHTML = 'Remembered it? <a class="link-arrow" href="./sign-in.html">Back to sign in</a>';
      if (altEl) altEl.hidden = true;
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        clearError(form);
        var data = new FormData(form);
        var email = data.get("email");
        var password = data.get("password");
        var name = data.get("name");

        if (!validEmail(email)) { showError(form, "Enter a valid email address."); return; }
        if (mode === "reset") {
          toast("If that email exists, a reset link is on its way.");
          form.reset();
          return;
        }
        if (!password || String(password).length < 6) {
          showError(form, "Passwords need at least 6 characters."); return;
        }
        if (mode === "signup") {
          var confirm = data.get("confirm");
          if (confirm !== password) { showError(form, "Those passwords don't match."); return; }
          var created = signUp(email, password, name);
          if (!created.ok) { showError(form, created.error); return; }
          toast("Account created — welcome aboard.");
        } else {
          var result = signIn(email, password);
          if (!result.ok) { showError(form, result.error); return; }
          toast("Signed in.");
        }
        location.href = next;
      });
    }
  }

  /* ---------- checkout ---------- */
  if (page === "checkout") {
    var planId = (query("plan", getQuiz().plan) || "pro").toLowerCase();
    var period = (query("period", "monthly") || "monthly").toLowerCase() === "annual" ? "annual" : "monthly";
    var plan = PLANS[planId] || PLANS.pro;
    var price = period === "annual" ? plan.annual : plan.monthly;
    var session = getSession();

    var set = function (sel, value) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) { el.textContent = value; });
    };
    set("[data-co-plan]", plan.name);
    set("[data-co-price]", money(price));
    set("[data-co-period]", period === "annual" ? "per year" : "per month");
    set("[data-co-edits]", plan.edits);
    set("[data-co-videos]", plan.videos);
    set("[data-co-total]", money(price));
    set("[data-co-today]", "$0.00");
    set("[data-co-due]", new Date(Date.now() + 3 * 864e5).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));

    var coForm = document.querySelector("[data-checkout-form]");
    if (coForm) {
      var emailInput = coForm.querySelector("[name='email']");
      if (emailInput && session && session.email) emailInput.value = session.email;

      // card formatting
      var cardInput = coForm.querySelector("[name='card']");
      if (cardInput) {
        cardInput.addEventListener("input", function () {
          var digits = cardInput.value.replace(/\D/g, "").slice(0, 16);
          cardInput.value = digits.replace(/(.{4})/g, "$1 ").trim();
        });
      }
      var expInput = coForm.querySelector("[name='exp']");
      if (expInput) {
        expInput.addEventListener("input", function () {
          var digits = expInput.value.replace(/\D/g, "").slice(0, 4);
          expInput.value = digits.length > 2 ? digits.slice(0, 2) + " / " + digits.slice(2) : digits;
        });
      }

      coForm.addEventListener("submit", function (e) {
        e.preventDefault();
        clearError(coForm);
        var data = new FormData(coForm);
        var email = String(data.get("email") || "").trim();
        var card = String(data.get("card") || "").replace(/\s/g, "");
        var exp = String(data.get("exp") || "");
        var cvc = String(data.get("cvc") || "").replace(/\D/g, "");
        var nameOnCard = String(data.get("name") || "").trim();

        if (!validEmail(email)) { showError(coForm, "Enter a valid email — your receipt goes there."); return; }
        if (!nameOnCard) { showError(coForm, "Add the name on the card."); return; }
        if (card.length < 15) { showError(coForm, "That card number looks incomplete."); return; }
        if (!/^\d{2}\s?\/\s?\d{2}$/.test(exp)) { showError(coForm, "Use MM / YY for the expiry."); return; }
        if (cvc.length < 3) { showError(coForm, "The security code needs 3 digits."); return; }

        var user = null;
        if (!getSession()) {
          var existing = users().find(function (u) { return String(u.email).toLowerCase() === email.toLowerCase(); });
          user = existing || { email: email, name: nameOnCard };
          if (!existing) {
            var list = users();
            list.push({ email: email, name: nameOnCard, createdAt: new Date().toISOString() });
            write(KEY.users, list);
          }
          setSession(user);
        } else {
          user = getSession();
        }

        var sub = saveSubscription({
          email: email.toLowerCase(),
          plan: plan.id,
          planName: plan.name,
          period: period,
          price: price,
          status: "trialing",
          trialEndsAt: new Date(Date.now() + 3 * 864e5).toISOString(),
          startedAt: new Date().toISOString(),
          cardLast4: card.slice(-4)
        });
        write("editmax.demo.lastReceipt.v1", sub);
        location.href = "./welcome.html";
      });
    }
  }

  /* ---------- welcome ---------- */
  if (page === "welcome") {
    var wSub = read("editmax.demo.lastReceipt.v1", null) || subscriptionFor((getSession() || {}).email);
    if (wSub) {
      var wPlan = PLANS[wSub.plan] || PLANS.pro;
      Array.prototype.forEach.call(document.querySelectorAll("[data-w-plan]"), function (el) { el.textContent = wPlan.name + " · " + (wSub.period === "annual" ? "Yearly" : "Monthly"); });
      Array.prototype.forEach.call(document.querySelectorAll("[data-w-amount]"), function (el) { el.textContent = money(wSub.price); });
      var wDate = new Date(wSub.trialEndsAt || Date.now() + 3 * 864e5);
      Array.prototype.forEach.call(document.querySelectorAll("[data-w-date]"), function (el) {
        el.textContent = wDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
      });
    }
    var wName = (getSession() || {}).name || "creator";
    Array.prototype.forEach.call(document.querySelectorAll("[data-w-name]"), function (el) { el.textContent = wName; });
  }

  /* ---------- account ---------- */
  if (page === "account") {
    var acc = getSession();
    if (!acc) {
      location.replace("./sign-in.html?next=" + encodeURIComponent("./account.html"));
      return;
    }
    var accSub = subscriptionFor(acc.email);
    var quiz = getQuiz();
    Array.prototype.forEach.call(document.querySelectorAll("[data-acc-name]"), function (el) { el.textContent = acc.name || acc.email; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-acc-email]"), function (el) { el.textContent = acc.email; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-acc-initial]"), function (el) {
      el.textContent = (acc.name || acc.email || "E").trim().charAt(0).toUpperCase();
    });

    var planNameEl = document.querySelector("[data-acc-plan]");
    var statusEl = document.querySelector("[data-acc-status]");
    var renewalEl = document.querySelector("[data-acc-renewal]");
    var usageEl = document.querySelector("[data-acc-usage]");
    var usageBar = document.querySelector("[data-acc-bar]");
    var cancelBtn = document.querySelector("[data-acc-cancel]");

    if (accSub) {
      var accPlan = PLANS[accSub.plan] || PLANS.pro;
      if (planNameEl) planNameEl.textContent = accPlan.name + " — " + money(accSub.price) + (accSub.period === "annual" ? "/year" : "/month");
      if (statusEl) statusEl.textContent = accSub.status === "trialing" ? "Free trial" : accSub.status === "canceled" ? "Canceled" : "Active";
      if (renewalEl) {
        var when = new Date(accSub.status === "trialing" ? accSub.trialEndsAt : Date.now() + 30 * 864e5);
        renewalEl.textContent = accSub.status === "canceled" ? "Access ends " + when.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : when.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      }
      var limit = accSub.plan === "starter" ? 100 : accSub.plan === "pro" ? 300 : 1000;
      var used = Math.min(limit, Math.round(limit * 0.38));
      if (usageEl) usageEl.textContent = used + " of " + (accSub.plan === "ultimate" ? "unlimited" : limit) + " edits used";
      if (usageBar) usageBar.style.width = (accSub.plan === "ultimate" ? 18 : Math.round((used / limit) * 100)) + "%";
      if (cancelBtn) {
        cancelBtn.hidden = accSub.status === "canceled";
        cancelBtn.addEventListener("click", function () {
          if (!window.confirm("Cancel your plan? You'll keep access until the end of the period.")) return;
          cancelSubscription(acc.email);
          toast("Plan canceled — access continues until the end of your period.");
          setTimeout(function () { location.reload(); }, 900);
        });
      }
    } else {
      if (planNameEl) planNameEl.textContent = "No active plan";
      if (statusEl) statusEl.textContent = "Free";
      if (renewalEl) renewalEl.textContent = "—";
      if (usageEl) usageEl.textContent = "Start a trial to unlock edits";
      if (usageBar) usageBar.style.width = "0%";
      if (cancelBtn) cancelBtn.hidden = true;
    }

    var quizRow = document.querySelector("[data-acc-goal]");
    if (quizRow) quizRow.textContent = quiz.goal ? quiz.goal : "Not set yet";
    var quizRole = document.querySelector("[data-acc-role]");
    if (quizRole) quizRole.textContent = quiz.role ? quiz.role : "Not set yet";

    Array.prototype.concat(
      Array.prototype.slice.call(document.querySelectorAll("[data-signout]"))
    ).forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        signOut();
        location.href = "./index.html";
      });
    });
  }

  /* ---------- support / contact ---------- */
  if (page === "support" || page === "contact") {
    var contactForm = document.querySelector("[data-contact-form]");
    if (contactForm) {
      var cSession = getSession();
      var cEmail = contactForm.querySelector("[name='email']");
      var cName = contactForm.querySelector("[name='name']");
      if (cSession) {
        if (cEmail && !cEmail.value) cEmail.value = cSession.email;
        if (cName && !cName.value) cName.value = cSession.name || "";
      }
      contactForm.addEventListener("submit", function (e) {
        e.preventDefault();
        clearError(contactForm);
        var data = new FormData(contactForm);
        var email = String(data.get("email") || "").trim();
        var message = String(data.get("message") || "").trim();
        if (!validEmail(email)) { showError(contactForm, "Enter a valid email so we can reply."); return; }
        if (message.length < 12) { showError(contactForm, "Add a little more detail (12+ characters)."); return; }
        submitContact({
          name: String(data.get("name") || "").trim(),
          email: email,
          topic: String(data.get("topic") || "General"),
          message: message
        });
        contactForm.reset();
        toast("Message sent — we reply within one business day.");
      });
    }
  }

  /* ---------- refund ---------- */
  if (page === "refund") {
    var refundForm = document.querySelector("[data-refund-form]");
    if (refundForm) {
      var rSession = getSession();
      var rEmail = refundForm.querySelector("[name='email']");
      if (rSession && rEmail && !rEmail.value) rEmail.value = rSession.email;
      refundForm.addEventListener("submit", function (e) {
        e.preventDefault();
        clearError(refundForm);
        var data = new FormData(refundForm);
        var email = String(data.get("email") || "").trim();
        var reason = String(data.get("reason") || "").trim();
        if (!validEmail(email)) { showError(refundForm, "Enter the email on the account."); return; }
        if (reason.length < 10) { showError(refundForm, "Tell us what went wrong (10+ characters)."); return; }
        submitRefund({
          email: email,
          order: String(data.get("order") || "").trim(),
          reason: reason
        });
        refundForm.reset();
        toast("Request received — you'll hear from us within 2 business days.");
      });
    }
  }

  /* ---------- trial chips on marketing pages ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-session-cta]"), function (el) {
    var s = getSession();
    if (s) {
      el.textContent = "Open dashboard";
      el.setAttribute("href", "./account.html");
    }
  });

  window.EditMax = {
    PLANS: PLANS, KEY: KEY, money: money,
    getSession: getSession, signIn: signIn, signUp: signUp, signOut: signOut,
    subscriptionFor: subscriptionFor, saveSubscription: saveSubscription,
    cancelSubscription: cancelSubscription, getQuiz: getQuiz, saveQuiz: saveQuiz,
    validEmail: validEmail, toast: toast,
    read: read, write: write
  };
})();
