# EditMax

AI video editing for TikTok Shop creators. Static site — plain HTML, CSS and vanilla JS, no build step.

Live: https://editmaxai.vercel.app

## Structure

| File | Route | Purpose |
|---|---|---|
| `index.html` | `/` | Flagship home — editorial hero with product mock, metric band, workflow, tabbed capabilities, reasoning, proof, pricing, FAQ |
| `home.html` | `/home` | Cinematic home — asymmetric hero, floating live cards, rotating word, variant marquee |
| `tour.html` | `/tour` | Long-form product tour — hero composer, feature grid, full reasoning panel, showcase |
| `start.html` | `/start` | 5-step onboarding quiz → recommends a plan → checkout |
| `checkout.html` | `/checkout` | Demo checkout, writes a 3-day trial subscription |
| `welcome.html` | `/welcome` | Post-checkout confirmation |
| `sign-in.html` | `/sign-in`, `/sign-up`, `/forgot-password` | Sign in / sign up / reset (mode via query) |
| `account.html` | `/account` | Plan, usage, answers, cancel, sign out |
| `studio.html` | `/studio` | Single-viewport black experience page with a looping hero film |
| `assistant.html` | `/assistant` | Two-section hero + gradient "live reasoning" panel |
| `dashboard.html` | `/dashboard` | One-screen AI studio with the glass orb |
| `support.html` / `contact.html` | `/support`, `/contact` | Contact forms |
| `refund.html` | `/refund` | Refund policy + request form |
| `privacy.html` / `terms.html` / `cookies.html` | legal | Policy pages |
| `404.html` | any miss | Branded not-found page |

## Design system

`assets/em26.css` — tokens, liquid-metal nav pills, buttons, glass orb, gradient panel, pricing, FAQ, forms, toasts, doc layout.
`assets/em26.js` — header state, drawer, masked headline reveals, scroll reveals, pricing toggle, counters, hero composer handoff.
`assets/em26-app.js` — demo data layer (users, session, subscriptions, quiz, contact, refunds) and per-page controllers.

Fonts are self-hosted: `assets/fonts/inter-var.woff2`, `assets/fonts/inter-tight-latin-wght.woff2`, `instrument-serif-italic.woff2`.

## Demo persistence

All flow state lives in `localStorage` under `editmax.demo.*` keys. No network calls, no real payments — checkout accepts any 15+ digit card number to walk the flow.

## Local dev

```bash
npm start   # http://localhost:4173
npm run check
```

Regenerate the secondary pages after editing the shell: `python3 tools/build_pages.py`.

Three front pages are intentionally different: `/` is the professional flagship, `/home` is the cinematic variant, `/tour` is the long-form walkthrough.
