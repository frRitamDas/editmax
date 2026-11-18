#!/usr/bin/env python3
"""Generate the EditMax secondary pages from one consistent shell."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent

BRAND_SVG = """<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><g transform="rotate(-30 12 12)"><circle cx="7.3" cy="3.2" r="1.45"/><rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8"/><rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8"/><circle cx="16.7" cy="20.8" r="1.45"/></g></svg>"""

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#050506">
<meta name="robots" content="{robots}">
<link rel="icon" href="./assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="./inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="./assets/em26.css?v=1">
<style>{css}</style>
</head>
<body data-page="{page}" style="background:#050506;color:#fff">
<div class="grain" aria-hidden="true"></div>
"""

HEADER = """
<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="./index.html" aria-label="EditMax home">
      {brand}
      <span>EditMax<span class="suffix">.ai</span></span>
    </a>
    <nav class="nav-pills" aria-label="Primary">
      <a class="nav-pill" href="./index.html#product">Product</a>
      <a class="nav-pill" href="./index.html#showcase">Showcase</a>
      <a class="nav-pill" href="./index.html#pricing">Pricing</a>
      <a class="nav-pill" href="./index.html#faq">FAQ</a>
    </nav>
    <div class="header-actions">
      <a class="btn btn--ghost btn--sm" href="./sign-in.html">Sign in</a>
      <a class="btn btn--solid btn--sm" href="./start.html" data-session-cta>Start free</a>
      <button class="burger" type="button" aria-expanded="false" aria-controls="drawer" aria-label="Open menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>
<div class="menu-backdrop" aria-hidden="true"></div>
"""

FOOTER = """
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-top">
      <div class="footer-brand">
        <a class="brand" href="./index.html">{brand}<span>EditMax<span class="suffix">.ai</span></span></a>
        <p>AI video editing for TikTok Shop creators. Cut, caption and ship ads without a timeline.</p>
      </div>
      <div class="footer-col">
        <h4>Product</h4>
        <ul>
          <li><a href="./start.html">Start editing</a></li>
          <li><a href="./studio.html">Studio</a></li>
          <li><a href="./assistant.html">Assistant</a></li>
          <li><a href="./dashboard.html">AI Studio</a></li>
          <li><a href="./index.html#pricing">Pricing</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <ul>
          <li><a href="./support.html">Support</a></li>
          <li><a href="./contact.html">Contact</a></li>
          <li><a href="./account.html">Your account</a></li>
          <li><a href="./refund.html">Refunds</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Legal</h4>
        <ul>
          <li><a href="./privacy.html">Privacy</a></li>
          <li><a href="./terms.html">Terms</a></li>
          <li><a href="./cookies.html">Cookies</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <span data-year>2026</span> EditMax. All rights reserved.</span>
      <span>Made for people who ship.</span>
    </div>
  </div>
</footer>
<script src="./assets/em26.js?v=1"></script>
<script src="./assets/em26-app.js?v=1"></script>
</body>
</html>
"""

SHELL_CSS = """
.page-head { padding-block: clamp(30px, 4.4vw, 54px) clamp(20px, 2.6vw, 30px); }
.page-head h1 { font-size: clamp(1.9rem, 3.4vw, 2.7rem); font-weight: 500; letter-spacing: -.038em; line-height: 1.08; }
.page-head h1 em { font-family: var(--serif); font-style: italic; font-weight: 400; color: #b9b9c4; }
.page-head p { color: var(--muted); margin-top: 10px; max-width: 60ch; font-size: 14.5px; line-height: 1.6; }
"""


def page(slug, title, desc, page_id, body, css="", robots="index,follow"):
    html = HEAD.format(title=title, desc=desc, css=SHELL_CSS + css, page=page_id, robots=robots)
    html += HEADER.format(brand=BRAND_SVG)
    html += body
    html += FOOTER.format(brand=BRAND_SVG)
    (ROOT / slug).write_text(html)
    print("wrote", slug)


# ---------------------------------------------------------------- checkout
CO_ICON = """<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;color:#8fa6ff;flex:none"><path d="M20 6 9 17l-5-5"/></svg>"""

checkout_css = """
.co-grid { display: grid; grid-template-columns: minmax(0,1.15fr) minmax(0,.85fr); gap: 20px; align-items: start; }
.co-card { border-radius: var(--r-lg); border: 1px solid var(--line-soft); background: linear-gradient(170deg,#101014,#0a0a0c); padding: clamp(18px,2.4vw,28px); }
.co-card h2 { font-size: 16px; font-weight: 500; letter-spacing: -.02em; }
.co-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.order-line { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 0; font-size: 13.5px; border-bottom: 1px solid var(--line-soft); }
.order-line:last-of-type { border-bottom: 0; }
.order-line span { color: var(--dim); }
.order-line b { font-weight: 500; color: #ececf2; }
.order-total { display: flex; align-items: baseline; justify-content: space-between; margin-top: 10px; padding-top: 14px; border-top: 1px solid var(--line); }
.order-total .big { font-family: var(--ui-tight); font-size: 26px; font-weight: 600; letter-spacing: -.03em; }
.badge-trial { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: #9fe3cf; background: rgba(40,190,150,.1); box-shadow: inset 0 0 0 1px rgba(60,200,160,.24); padding: 4px 10px; border-radius: var(--r-pill); }
.demo-note { margin-top: 14px; font-size: 11.5px; color: var(--dim); line-height: 1.5; }
@media (max-width: 900px) { .co-grid { grid-template-columns: 1fr; } }
"""

checkout_body = """
<main class="app-main">
  <div class="wrap">
    <div class="page-head">
      <p class="eyebrow">Checkout</p>
      <h1>Start your free trial</h1>
      <p>3 days free, then <span data-co-price>$49.99</span> <span data-co-period>per month</span>. Cancel in two clicks any time.</p>
    </div>

    <div class="co-grid">
      <section class="co-card">
        <h2>Payment details</h2>
        <form data-checkout-form novalidate>
          <div class="field">
            <label for="co-email">Email for your receipt</label>
            <input class="input" id="co-email" name="email" type="email" autocomplete="email" placeholder="you@store.com" required>
          </div>
          <div class="field">
            <label for="co-name">Name on card</label>
            <input class="input" id="co-name" name="name" type="text" autocomplete="cc-name" placeholder="Alex Morgan" required>
          </div>
          <div class="field">
            <label for="co-card">Card number</label>
            <input class="input" id="co-card" name="card" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" required>
          </div>
          <div class="co-row">
            <div class="field">
              <label for="co-exp">Expiry</label>
              <input class="input" id="co-exp" name="exp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM / YY" required>
            </div>
            <div class="field">
              <label for="co-cvc">Security code</label>
              <input class="input" id="co-cvc" name="cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" required>
            </div>
          </div>

          <p class="form-error" role="alert"></p>

          <button class="btn btn--solid btn--lg btn--block mt-3" type="submit">Start free trial — $0.00 today</button>
          <p class="demo-note">Demo checkout: no card is charged and no payment data leaves this browser. Your trial is stored locally so you can walk the full flow.</p>
        </form>
      </section>

      <aside class="co-card">
        <h2>Order summary</h2>
        <p class="badge-trial mt-2"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>3-day free trial</p>

        <div class="mt-3">
          <div class="order-line"><span>Plan</span><b data-co-plan>Pro</b></div>
          <div class="order-line"><span>Included</span><b data-co-edits>300 AI edits a month</b></div>
          <div class="order-line"><span>Output</span><b data-co-videos>150 finished videos</b></div>
          <div class="order-line"><span>Billed</span><b data-co-period>per month</b></div>
          <div class="order-line"><span>Due today</span><b data-co-today>$0.00</b></div>
          <div class="order-line"><span>First charge</span><b data-co-due>—</b></div>
        </div>

        <div class="order-total">
          <span style="font-size:13px;color:var(--dim)">Then</span>
          <span class="big" data-co-total>$49.99</span>
        </div>

        <ul class="plan-list mt-3">
          <li>__CHECK__Cancel anytime, no email needed</li>
          <li>__CHECK__Keep every video you export</li>
          <li>__CHECK__Switch plans or pause when you need</li>
        </ul>
        <p class="demo-note">Questions before you start? <a class="link-arrow" href="./contact.html" style="font-size:12px">Talk to us</a></p>
      </aside>
    </div>
  </div>
</main>
""".replace("__CHECK__", CO_ICON)

page("checkout.html", "Checkout — EditMax", "Start your EditMax free trial. 3 days free, cancel anytime.",
     "checkout", checkout_body, checkout_css, robots="noindex,follow")

# ---------------------------------------------------------------- sign in
signin_css = """
.auth-brand { display: inline-flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 600; letter-spacing: -.03em; }
.auth-brand svg { width: 22px; height: 22px; }
.auth-alt { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 14px; font-size: 12.5px; }
.auth-alt a { color: #b9c6e6; }
.auth-alt a:hover { color: #fff; }
"""

signin_body = """
<div class="auth-wrap">
  <div class="ambient" aria-hidden="true"></div>
  <div class="auth-card">
    <a class="auth-brand" href="./index.html">__BRAND__<span>EditMax<span class="suffix" style="font-weight:400;color:#cfcfd6">.ai</span></span></a>
    <h1 data-auth-title>Welcome back</h1>
    <p class="sub" data-auth-sub>Sign in to pick up where your last cut left off.</p>

    <form data-auth-form novalidate>
      <div class="field" data-field-name hidden>
        <label for="au-name">Your name</label>
        <input class="input" id="au-name" name="name" type="text" autocomplete="name" placeholder="Alex Morgan">
      </div>
      <div class="field">
        <label for="au-email">Email</label>
        <input class="input" id="au-email" name="email" type="email" autocomplete="email" placeholder="you@store.com" required>
      </div>
      <div class="field">
        <label for="au-pass">Password</label>
        <input class="input" id="au-pass" name="password" type="password" autocomplete="current-password" placeholder="At least 6 characters" required>
      </div>
      <div class="field" data-field-confirm hidden>
        <label for="au-confirm">Confirm password</label>
        <input class="input" id="au-confirm" name="confirm" type="password" autocomplete="new-password" placeholder="Repeat your password">
      </div>

      <p class="form-error" role="alert"></p>

      <button class="btn btn--solid btn--lg btn--block mt-3" data-auth-submit type="submit">Sign in</button>

      <div class="auth-alt">
        <a href="./sign-in.html?mode=reset" data-auth-alt>Forgot password?</a>
        <span data-auth-switch style="color:var(--dim)">New here? <a class="link-arrow" href="./sign-in.html?mode=signup">Create an account</a></span>
      </div>
    </form>

    <p class="form-note">Demo build — accounts are stored in this browser only. Nothing is sent to a server.</p>
  </div>
</div>
<script src="./assets/em26.js?v=1"></script>
<script src="./assets/em26-app.js?v=1"></script>
</body>
</html>
""".replace("__BRAND__", BRAND_SVG)

# sign-in is a standalone (no header/footer) page
(ROOT / "sign-in.html").write_text(
    HEAD.format(title="Sign in — EditMax",
                desc="Sign in to your EditMax account, or create one free.",
                css=SHELL_CSS + signin_css, page="signin", robots="noindex,follow")
    + signin_body
)
print("wrote sign-in.html")

# ---------------------------------------------------------------- account
account_css = """
.acc-grid { display: grid; grid-template-columns: minmax(0,1.1fr) minmax(0,.9fr); gap: 16px; align-items: start; }
.acc-head { display: flex; align-items: center; gap: 14px; }
.acc-avatar { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; font-weight: 600; font-size: 17px; background: linear-gradient(135deg,#4a72ff,#7b5cf0); box-shadow: 0 0 0 2px rgba(255,255,255,.1); }
.acc-name { font-size: 16px; font-weight: 500; letter-spacing: -.02em; }
.acc-mail { font-size: 12.5px; color: var(--dim); }
.usage { margin-top: 14px; }
.usage .bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,.07); overflow: hidden; margin-top: 8px; }
.usage .bar span { display: block; height: 100%; border-radius: 3px; background: var(--grad); transition: width .6s var(--ease); }
.acc-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.quick-links { display: grid; gap: 8px; margin-top: 12px; }
.quick-links a { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 13px; border-radius: 11px; background: rgba(255,255,255,.025); border: 1px solid var(--line-soft); font-size: 13.5px; color: #dcdce6; transition: border-color .2s ease, background .2s ease; }
.quick-links a:hover { border-color: rgba(140,165,255,.3); background: rgba(255,255,255,.05); }
.quick-links span { color: var(--dim); font-size: 12px; }
@media (max-width: 880px) { .acc-grid { grid-template-columns: 1fr; } }
"""

account_body = """
<main class="app-main">
  <div class="wrap">
    <div class="page-head">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap">
        <div class="acc-head">
          <span class="acc-avatar" data-acc-initial>A</span>
          <div>
            <div class="acc-name" data-acc-name>Your account</div>
            <div class="acc-mail" data-acc-email>—</div>
          </div>
        </div>
        <div class="acc-actions" style="margin-top:0">
          <a class="btn btn--solid btn--sm" href="./start.html">New edit</a>
          <a class="btn btn--ghost btn--sm" href="./index.html#pricing">Change plan</a>
          <a class="btn btn--ghost btn--sm" href="#" data-signout>Sign out</a>
        </div>
      </div>
    </div>

    <div class="acc-grid">
      <section class="panel">
        <p class="eyebrow">Subscription</p>
        <h2 class="h2 mt-2" style="font-size:22px" data-acc-plan>No active plan</h2>

        <div class="usage">
          <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--dim)">
            <span>Monthly usage</span><span data-acc-status>Free</span>
          </div>
          <div class="bar"><span data-acc-bar style="width:0%"></span></div>
          <p class="small mt-2" data-acc-usage>Start a trial to unlock edits</p>
        </div>

        <div class="mt-3">
          <div class="kv"><dt>Renews / access ends</dt><dd data-acc-renewal>—</dd></div>
          <div class="kv"><dt>Your main goal</dt><dd data-acc-goal>Not set yet</dd></div>
          <div class="kv"><dt>Account type</dt><dd data-acc-role>Not set yet</dd></div>
        </div>

        <div class="acc-actions">
          <a class="btn btn--solid btn--sm" href="./start.html">Start a new batch</a>
          <button class="btn btn--ghost btn--sm" type="button" data-acc-cancel>Cancel plan</button>
        </div>
        <p class="form-note">Cancel keeps your access until the end of the current period. No emails, no retention calls.</p>
      </section>

      <aside class="panel">
        <p class="eyebrow">Jump back in</p>
        <div class="quick-links">
          <a href="./dashboard.html"><span style="color:#dcdce6">AI Studio dashboard</span><span>Orb assistant →</span></a>
          <a href="./studio.html"><span style="color:#dcdce6">Studio landing</span><span>Hero film →</span></a>
          <a href="./assistant.html"><span style="color:#dcdce6">Assistant workspace</span><span>Chat →</span></a>
          <a href="./support.html"><span style="color:#dcdce6">Support</span><span>Human reply →</span></a>
          <a href="./refund.html"><span style="color:#dcdce6">Request a refund</span><span>2 business days →</span></a>
        </div>
        <p class="form-note">Demo build: your plan, usage and answers live in this browser only.</p>
      </aside>
    </div>
  </div>
</main>
"""

page("account.html", "Your account — EditMax", "Manage your EditMax plan, usage and settings.",
     "account", account_body, account_css, robots="noindex,nofollow")

# ---------------------------------------------------------------- welcome
welcome_css = """
.welcome-wrap { min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding: 32px var(--pad); position: relative; }
.welcome-card { position: relative; z-index: 1; width: min(560px, 100%); text-align: center; padding: clamp(26px, 3.4vw, 40px); border-radius: var(--r-xl);
  background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,0)) #0a0a0c;
  border: 1px solid var(--line); box-shadow: 0 50px 100px -50px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,255,255,.05); }
.tick { width: 54px; height: 54px; margin: 0 auto 18px; border-radius: 50%; display: grid; place-items: center;
  background: linear-gradient(135deg, rgba(47,107,255,.9), rgba(90,76,245,.65));
  box-shadow: 0 0 0 1px rgba(160,180,255,.4), 0 16px 40px -16px rgba(70,100,255,.9); }
.welcome-card h1 { font-size: clamp(1.7rem, 3vw, 2.15rem); font-weight: 500; letter-spacing: -.035em; }
.welcome-card h1 em { font-family: var(--serif); font-style: italic; font-weight: 400; color: #b9b9c4; }
.welcome-steps { text-align: left; margin-top: 24px; display: grid; gap: 10px; }
.welcome-steps div { display: flex; gap: 11px; font-size: 13.5px; color: #c9c9d4; line-height: 1.5; }
.welcome-steps b { flex: none; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; background: rgba(47,107,255,.16); box-shadow: inset 0 0 0 1px rgba(120,150,255,.3); color: #cfd9ff; }
"""

welcome_body = """
<div class="welcome-wrap">
  <div class="ambient" aria-hidden="true"></div>
  <div class="welcome-card">
    <div class="tick" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    </div>
    <h1>You're in, <em data-w-name>creator</em></h1>
    <p class="lede mt-2">Your free trial is live. Nothing is charged until <b style="color:#fff" data-w-date>—</b>.</p>

    <div class="plan mt-3" style="text-align:left">
      <div class="kv"><dt>Plan</dt><dd data-w-plan>Pro · Monthly</dd></div>
      <div class="kv"><dt>Due today</dt><dd>$0.00</dd></div>
      <div class="kv"><dt>Then</dt><dd data-w-amount>$49.99</dd></div>
    </div>

    <div class="welcome-steps">
      <div><b>1</b><span>Drop a product link or your raw footage.</span></div>
      <div><b>2</b><span>EditMax cuts ten 9:16 variants with different hooks.</span></div>
      <div><b>3</b><span>Export the winners straight to TikTok Shop.</span></div>
    </div>

    <div class="hero-actions" style="margin-top:24px">
      <a class="btn btn--solid btn--lg" href="./start.html">Cut my first video</a>
      <a class="btn btn--ghost btn--lg" href="./account.html">Go to account</a>
    </div>
    <p class="form-note">Receipt and plan details are in your account. Demo build — no payment was processed.</p>
  </div>
</div>
<script src="./assets/em26.js?v=1"></script>
<script src="./assets/em26-app.js?v=1"></script>
</body>
</html>
"""

(ROOT / "welcome.html").write_text(
    HEAD.format(title="Welcome to EditMax", desc="Your EditMax trial is live.",
                css=SHELL_CSS + welcome_css, page="welcome", robots="noindex,nofollow")
    + welcome_body
)
print("wrote welcome.html")

# ---------------------------------------------------------------- support
support_css = """
.sup-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,.8fr); gap: 16px; align-items: start; }
.help-list { display: grid; gap: 8px; margin-top: 12px; }
.help-list a { display: block; padding: 12px 14px; border-radius: 11px; border: 1px solid var(--line-soft); background: rgba(255,255,255,.02); font-size: 13.5px; color: #dcdce6; }
.help-list a span { display: block; color: var(--dim); font-size: 12px; margin-top: 3px; }
.help-list a:hover { border-color: rgba(140,165,255,.3); }
@media (max-width: 880px) { .sup-grid { grid-template-columns: 1fr; } }
"""

support_body = """
<main class="app-main">
  <div class="wrap">
    <div class="page-head">
      <p class="eyebrow">Support</p>
      <h1>Tell us what's <em>broken</em></h1>
      <p>Real humans, one business day. Include the product and the step where it went wrong and we'll reproduce it fast.</p>
    </div>

    <div class="sup-grid">
      <section class="panel">
        <form data-contact-form novalidate>
          <div class="co-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="field">
              <label for="sp-name">Your name</label>
              <input class="input" id="sp-name" name="name" type="text" autocomplete="name" placeholder="Alex Morgan">
            </div>
            <div class="field">
              <label for="sp-email">Email</label>
              <input class="input" id="sp-email" name="email" type="email" autocomplete="email" placeholder="you@store.com" required>
            </div>
          </div>
          <div class="field">
            <label for="sp-topic">What's it about?</label>
            <select class="input" id="sp-topic" name="topic">
              <option>Rendering or export</option>
              <option>Hooks and captions</option>
              <option>Billing or plan</option>
              <option>Account access</option>
              <option>Something else</option>
            </select>
          </div>
          <div class="field">
            <label for="sp-msg">What happened?</label>
            <textarea class="input" id="sp-msg" name="message" placeholder="The render finished but the captions were missing words around 0:06…" required></textarea>
          </div>
          <p class="form-error" role="alert"></p>
          <button class="btn btn--solid btn--lg mt-3" type="submit">Send message</button>
          <p class="form-note">Demo build — messages are stored in this browser so you can test the flow.</p>
        </form>
      </section>

      <aside class="panel">
        <p class="eyebrow">Faster answers</p>
        <h2 class="h3 mt-1">Check these first</h2>
        <div class="help-list">
          <a href="./index.html#faq">Do I need editing experience?<span>FAQ · 30 seconds</span></a>
          <a href="./index.html#pricing">Which plan fits my volume?<span>Pricing · compare plans</span></a>
          <a href="./refund.html">Request a refund<span>Policy + form</span></a>
          <a href="./account.html">Cancel or change my plan<span>Account · two clicks</span></a>
          <a href="./contact.html">Sales or partnerships<span>Contact form</span></a>
        </div>
      </aside>
    </div>
  </div>
</main>
"""

page("support.html", "Support — EditMax", "Get help with rendering, billing or your account.",
     "support", support_body, support_css, robots="noindex,follow")

# ---------------------------------------------------------------- contact
contact_body = """
<main class="app-main">
  <div class="wrap" style="max-width:900px">
    <div class="page-head">
      <p class="eyebrow">Contact</p>
      <h1>Say hello</h1>
      <p>Partnerships, press, or a store that ships more than 500 videos a month — tell us what you need and we'll route it to the right person.</p>
    </div>

    <div class="grid grid-2">
      <section class="panel">
        <form data-contact-form novalidate>
          <div class="field">
            <label for="ct-name">Your name</label>
            <input class="input" id="ct-name" name="name" type="text" autocomplete="name" placeholder="Alex Morgan">
          </div>
          <div class="field">
            <label for="ct-email">Email</label>
            <input class="input" id="ct-email" name="email" type="email" autocomplete="email" placeholder="you@store.com" required>
          </div>
          <div class="field">
            <label for="ct-topic">Topic</label>
            <select class="input" id="ct-topic" name="topic">
              <option>Partnership</option>
              <option>Press</option>
              <option>High-volume store</option>
              <option>Careers</option>
              <option>Something else</option>
            </select>
          </div>
          <div class="field">
            <label for="ct-msg">Message</label>
            <textarea class="input" id="ct-msg" name="message" placeholder="We ship 800 product videos a quarter and want to cut production time…" required></textarea>
          </div>
          <p class="form-error" role="alert"></p>
          <button class="btn btn--solid btn--lg mt-3" type="submit">Send</button>
        </form>
      </section>

      <aside class="panel">
        <p class="eyebrow">Direct</p>
        <h2 class="h3 mt-2">Where to find us</h2>
        <div class="mt-2">
          <div class="kv"><dt>Support</dt><dd>support@editmax.ai</dd></div>
          <div class="kv"><dt>Partnerships</dt><dd>partners@editmax.ai</dd></div>
          <div class="kv"><dt>Press</dt><dd>press@editmax.ai</dd></div>
          <div class="kv"><dt>Hours</dt><dd>Mon–Fri · 9–18 IST</dd></div>
        </div>
        <p class="form-note">Prefer a form? <a class="link-arrow" href="./support.html" style="font-size:12px">Open support</a></p>
      </aside>
    </div>
  </div>
</main>
"""

page("contact.html", "Contact — EditMax", "Talk to the EditMax team about partnerships, press or high-volume stores.",
     "contact", contact_body, "", robots="index,follow")

# ---------------------------------------------------------------- refund
refund_body = """
<main class="app-main">
  <div class="wrap" style="max-width:940px">
    <div class="page-head">
      <p class="eyebrow">Refunds</p>
      <h1>14-day <em>no-drama</em> refunds</h1>
      <p>If a full render never worked for you, we refund the current period. No interrogations, no retention scripts.</p>
    </div>

    <div class="grid grid-2">
      <section class="panel">
        <form data-refund-form novalidate>
          <div class="field">
            <label for="rf-email">Account email</label>
            <input class="input" id="rf-email" name="email" type="email" autocomplete="email" placeholder="you@store.com" required>
          </div>
          <div class="field">
            <label for="rf-order">Order or receipt number <span style="color:var(--dim)">(optional)</span></label>
            <input class="input" id="rf-order" name="order" type="text" placeholder="EM-10428">
          </div>
          <div class="field">
            <label for="rf-reason">What went wrong?</label>
            <textarea class="input" id="rf-reason" name="reason" placeholder="Exports kept failing at 4K on my last three batches…" required></textarea>
          </div>
          <p class="form-error" role="alert"></p>
          <button class="btn btn--solid btn--lg mt-3" type="submit">Request refund</button>
          <p class="form-note">Demo build — requests are stored in this browser so you can test the flow.</p>
        </form>
      </section>

      <aside class="panel">
        <p class="eyebrow">The policy</p>
        <div class="doc" style="margin-top:6px">
          <p>Full refund within <b style="color:#fff">14 days</b> of your first charge if you exported fewer than 10 finished videos.</p>
          <p>Annual plans are refunded pro-rata after the first 14 days.</p>
          <p>Trials never charge, so there's nothing to refund — cancel from your account instead.</p>
          <p>Refunds land back on the original card in 5–10 business days.</p>
        </div>
        <div class="kv mt-2"><dt>Response time</dt><dd>2 business days</dd></div>
        <div class="kv"><dt>Contact</dt><dd>billing@editmax.ai</dd></div>
      </aside>
    </div>
  </div>
</main>
"""

page("refund.html", "Refunds — EditMax", "Request a refund for your EditMax plan. 14-day no-drama policy.",
     "refund", refund_body, "", robots="index,follow")

# ---------------------------------------------------------------- legal docs
def doc_page(slug, title, desc, heading, updated, sections):
    body = ['<main class="app-main"><div class="wrap" style="max-width:820px">',
            '<div class="page-head"><p class="eyebrow">Legal</p><h1>%s</h1><p>Last updated %s</p></div>' % (heading, updated),
            '<article class="doc panel">']
    for h, paragraphs in sections:
        body.append("<h2>%s</h2>" % h)
        for p in paragraphs:
            body.append("<p>%s</p>" % p)
    body.append("</article>")
    body.append('<p class="small mt-3">Questions? <a class="link-arrow" href="./contact.html" style="font-size:12px">Contact us</a></p>')
    body.append("</div></main>")
    page(slug, title, desc, "doc", "".join(body), "", robots="index,follow")


doc_page("privacy.html", "Privacy — EditMax", "How EditMax handles your footage, account data and analytics.",
         "Privacy policy", "17 November 2026", [
             ("What we collect", [
                 "Account details you give us: name, email, and the plan you pick. In this demo build they are stored in your browser's localStorage, not on a server.",
                 "Content you upload: product links, footage and the prompts you write. On a production deployment these are processed to render your videos and are never sold.",
                 "Usage data: which features you open and how long a render takes, so we can fix slow paths.",
             ]),
             ("How we use it", [
                 "To render your videos, remember your brand settings and show your usage against your plan.",
                 "To improve hook and pacing suggestions. Aggregated signals only — never another store's footage.",
                 "To send transactional email such as receipts and trial reminders. Marketing email is opt-in.",
             ]),
             ("What we never do", [
                 "We do not sell personal data, train third-party models on your footage, or use your videos in a public showcase without written permission.",
                 "We do not require a phone number, a social login or access to your TikTok account to edit a video.",
             ]),
             ("Your controls", [
                 "Export or delete everything from your account page. Deleting your account removes your footage and settings.",
                 "You can turn off analytics cookies from the cookie banner without losing any editor functionality.",
             ]),
             ("Contact", [
                 "Privacy questions: privacy@editmax.ai. We answer within 5 business days.",
             ]),
         ])

doc_page("terms.html", "Terms — EditMax", "The terms that apply when you use EditMax.",
         "Terms of service", "17 November 2026", [
             ("Using EditMax", [
                 "You need an account and a valid payment method to start a trial. You must be 18 or older, or have permission from a guardian.",
                 "You keep ownership of everything you upload and everything you export. We claim no rights over your footage or your ads.",
             ]),
             ("Plans, trials and billing", [
                 "Every plan starts with a 3-day free trial. You are charged when the trial ends unless you cancel first, from your account page.",
                 "Monthly plans renew monthly; yearly plans renew annually. Prices are shown before checkout and include applicable taxes at checkout.",
                 "If you cancel, access continues until the end of the period you already paid for. We do not pro-rate mid-period cancellations except on annual plans.",
             ]),
             ("Acceptable use", [
                 "Do not upload content you do not have rights to, or use EditMax to produce material that is unlawful, deceptive or infringes someone else's likeness.",
                 "Do not attempt to extract model weights, resell raw API access, or circumvent usage limits.",
             ]),
             ("Availability", [
                 "We aim for 99.9% monthly availability. Scheduled maintenance is announced in-app. Renders in progress are preserved across deploys.",
             ]),
             ("Liability", [
                 "EditMax is provided as-is. Our liability is limited to the amount you paid in the previous 12 months. We are not responsible for platform decisions, ad rejections or lost revenue.",
             ]),
             ("Changes", [
                 "We will email you at least 14 days before a material change to these terms or to pricing on an active plan.",
             ]),
         ])

doc_page("cookies.html", "Cookies — EditMax", "Which cookies EditMax uses and how to turn them off.",
         "Cookie policy", "17 November 2026", [
             ("Strictly necessary", [
                 "Session storage keeps you signed in and remembers your plan during checkout. Without it, checkout cannot complete.",
                 "These cannot be disabled because the site does not function without them.",
             ]),
             ("Preferences", [
                 "We store your billing period, caption style and brand kit locally so the editor opens the way you left it.",
                 "Clearing site data removes these; nothing breaks, you just re-pick your defaults.",
             ]),
             ("Analytics", [
                 "Anonymous page-view and render-time metrics help us spot slow steps. They are off until you accept them on the cookie banner.",
                 "We do not use advertising cookies, cross-site trackers, or third-party pixels for retargeting.",
             ]),
             ("Managing cookies", [
                 "Use the cookie banner or your browser settings to block or clear cookies. Blocking analytics has no effect on editing features.",
             ]),
         ])

# ---------------------------------------------------------------- 404
notfound_body = """
<div class="welcome-wrap">
  <div class="ambient" aria-hidden="true"></div>
  <div class="welcome-card">
    <p class="eyebrow">404</p>
    <h1 class="mt-2" style="font-size:clamp(2.4rem,6vw,3.4rem)">This cut hit the <em>floor</em></h1>
    <p class="lede mt-2">The page you wanted doesn't exist — or it got re-rendered into something better. Try one of these.</p>
    <div class="hero-actions" style="margin-top:24px">
      <a class="btn btn--solid btn--lg" href="./index.html">Back home</a>
      <a class="btn btn--ghost btn--lg" href="./start.html">Start an edit</a>
    </div>
    <div class="welcome-steps" style="text-align:left">
      <div><b>→</b><span><a href="./index.html#pricing">Pricing</a> — three plans, 3-day trial on all of them.</span></div>
      <div><b>→</b><span><a href="./dashboard.html">AI Studio</a> — the orb assistant that plans your week.</span></div>
      <div><b>→</b><span><a href="./support.html">Support</a> — a human replies in one business day.</span></div>
    </div>
  </div>
</div>
<script src="./assets/em26.js?v=1"></script>
<script src="./assets/em26-app.js?v=1"></script>
</body>
</html>
"""

(ROOT / "404.html").write_text(
    HEAD.format(title="Page not found — EditMax", desc="That page does not exist.",
                css=SHELL_CSS + welcome_css, page="404", robots="noindex,follow")
    + notfound_body
)
print("wrote 404.html")
print("done")
