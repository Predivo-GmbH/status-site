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
