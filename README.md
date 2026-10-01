# Predivo Status — https://status.predivo.ch

Our public status page, laid out like status.claude.com, in Predivo's brand (German, with an English switch).

- **Hosted on GitHub Pages, not on our own web host**, so it stays up when predivo.ch is down.
  DNS: `status.predivo.ch` CNAME → `predivo-gmbh.github.io` (Metanet zone predivo.ch).
- **No build step, no backend.** `index.html` reads everything live in the visitor's browser:
  - current status, components, incidents, maintenance: Atlassian Statuspage public API
    (`https://predivo.statuspage.io/api/v2/*.json`, open to any origin). Incidents are written and
    subscriptions are managed there (free plan; its own page is https://predivo.statuspage.io).
  - the 90-day bars: the Upptime check history in
    [Predivo-GmbH/status-predivo](https://github.com/Predivo-GmbH/status-predivo) (`history/summary.json`,
    `dailyMinutesDown`), mapped to Statuspage components through its `statuspage.json`.
  - if Statuspage is unreachable, the page falls back to the Upptime verdicts and says so.
- Assets (logo mark, icons) are copied here on purpose: nothing is loaded from predivo.ch.

## Email subscribe (one step, on this page)

Statuspage's own email form only works on predivo.statuspage.io (Google reCAPTCHA locked to that
address), so linking there made people click "Subscribe" twice. Since 2026-10-01 the menu has its own form:

1. The visitor types an address; an invisible **Cloudflare Turnstile** check runs (widget
   "predivo status subscribe", site key `0x4AAAAAAFK_j6H2BTmJmifo`, domain status.predivo.ch only).
2. The page POSTs `{email, token}` to the **Cloudflare Worker** `predivo-status-subscribe`
   (`https://predivo-status-subscribe.restless-silence-9277.workers.dev`, code in `worker/subscribe.js`).
3. The Worker accepts only Origin `https://status.predivo.ch`, checks the address and the Turnstile
   token, then calls `POST https://api.statuspage.io/v1/pages/9th11ttn03gg/subscribers` with
   `skip_confirmation_notification: false`.
4. **Statuspage mails the confirmation link** (double opt-in) and handles unsubscribes. An address that
   is already subscribed is answered as "already subscribed".

Secrets (never in this repo): the Worker holds `STATUSPAGE_API_KEY` and `TURNSTILE_SECRET` as Worker
secrets; the originals are in `predivo/docs/Credentials.txt` (`STATUSPAGE_API_KEY`,
`STATUS_TURNSTILE_SECRET`, and `CLOUDFLARE_API_TOKEN` for deploying). Redeploy the Worker after editing
`worker/subscribe.js` with the Cloudflare API (`PUT /accounts/<id>/workers/scripts/predivo-status-subscribe`,
module upload, `keep_bindings: ["secret_text"]`). The Statuspage key expires 2027-09-29: renew it in both
places.

Slack, Atom and RSS stay plain links; they never needed a second click.
