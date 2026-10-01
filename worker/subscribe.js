// Predivo status: email subscribe endpoint (Cloudflare Worker "predivo-status-subscribe").
//
// Why it exists: Statuspage's own email form only works on predivo.statuspage.io (it is locked to that
// address by Google reCAPTCHA), so status.predivo.ch could only send people there to click "Subscribe"
// a second time. This Worker lets the form on status.predivo.ch subscribe directly:
//   1. accepts POST {email, token} only from https://status.predivo.ch (CORS);
//   2. checks the email shape and the Cloudflare Turnstile token (bot protection);
//   3. creates the subscriber through the Statuspage API with skip_confirmation_notification=false,
//      so Statuspage itself mails the confirmation link (double opt-in) and manages unsubscribes.
// Runs on Cloudflare, not on our web host, so subscribing works while predivo.ch is down.
// Secrets (set as Worker secrets, never in this file): STATUSPAGE_API_KEY, TURNSTILE_SECRET.
// Plain vars: PAGE_ID, ALLOWED_ORIGIN.

const json = (body, status, headers) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const allowed = (env.ALLOWED_ORIGIN || 'https://status.predivo.ch').split(',').map(s => s.trim())
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cors)
    if (!allowed.includes(origin)) return json({ ok: false, error: 'origin' }, 403, cors)

    let body
    try { body = await request.json() } catch { return json({ ok: false, error: 'bad_request' }, 400, cors) }
    const email = String(body.email || '').trim().toLowerCase()
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, error: 'invalid_email' }, 400, cors)

    const ts = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: String(body.token || ''), remoteip: request.headers.get('CF-Connecting-IP') || '' }),
    })
    const tsj = await ts.json().catch(() => ({}))
    if (!tsj.success) return json({ ok: false, error: 'captcha' }, 403, cors)

    const r = await fetch(`https://api.statuspage.io/v1/pages/${env.PAGE_ID}/subscribers`, {
      method: 'POST',
      headers: { Authorization: `OAuth ${env.STATUSPAGE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriber: { email, skip_confirmation_notification: false } }),
    })
    if (r.status === 201) return json({ ok: true }, 200, cors)
    const text = await r.text()
    // An address that is already subscribed is not an error for the visitor.
    if (r.status === 422 && /already|taken|exist/i.test(text)) return json({ ok: true, already: true }, 200, cors)
    console.log('statuspage error', r.status, text.slice(0, 200))
    return json({ ok: false, error: 'upstream' }, 502, cors)
  },
}
