# EditMax frontend

The original EditMax website is kept as a static, frontend-only site. Its original page design and bundled assets are served directly; a small client-side layer fills in the previously missing account and checkout flows.

## Run locally

```sh
npm start
```

Open <http://localhost:4173>. The static development server also maps clean routes such as `/sign-in`, `/account`, `/checkout`, `/refund`, and `/welcome` to the corresponding HTML pages.

## Frontend demo behavior

- Sign-up, sign-in, password reset, and account settings use browser `localStorage` for this-device demo accounts.
- The checkout validates demo card input in the browser and stores a demo trial locally. It never sends or stores card details and does not charge money.
- Contact and refund forms save a local demo copy only; they do not send email or reach a support inbox.
- These flows are not production authentication, payment processing, or support delivery. A real launch needs a trusted auth provider, server-side payment integration, and a support-message service.

Vercel serves the same static frontend. `vercel.json` maps clean page URLs to the existing HTML files and supplies the added demo routes.
