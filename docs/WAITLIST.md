# Program waitlists (AMSC Off Pitch and future programs)

Public page: **`/offpitch`**, the Instagram bio link.
Admin: `/admin` → **Waitlist** tab (counts, sources, audience breakdown, CSV export).

## Go-live steps (one time)

1. **Database.** Supabase → SQL Editor → run `scripts/supabase-waitlist-schema-v1.sql`, then
   `scripts/supabase-waitlist-schema-v2.sql` (consent, unsubscribe, email tracking). Both are safe to re-run.
2. **Expose the schema.** Supabase → Settings → API (Data API) → Exposed schemas → add `waitlist`.
   Signups fail with a schema error until this is done.
3. **Check.** In the SQL editor:
   `SELECT has_schema_privilege('service_role','waitlist','USAGE');` should return `true`.
4. **Email.** Confirmation emails go through the existing Resend account (`RESEND_API_KEY`), from
   `offpitch@amscperformance.com` with replies going to `admin@amscperformance.com`. To use a different sender, set
   `WAITLIST_FROM_EMAIL` in Vercel (it must be on a domain verified in Resend).
5. Open `/offpitch` on a phone, join with your own email, and confirm (a) the confirmation email arrives,
   (b) the row appears in the admin Waitlist tab, and (c) the email's Unsubscribe link works.
6. Set the Instagram bio link. `amscperformance.com/offpitch` is enough: taps from the Instagram
   app are detected as Instagram automatically. For per-post tracking on stories and other channels, add
   `?src=` plus an optional `utm_campaign`, for example:
   - `/offpitch?src=ig&utm_campaign=meso2` (Instagram story link sticker)
   - `/offpitch?src=wa` (WhatsApp)
   - `/offpitch?src=tt` (TikTok)

No new environment variables are required. The page uses the existing `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY`.

## Day-to-day edits (all in `lib/waitlists.js`)

| Change | Field |
|---|---|
| Change the confirmation email's subject or intro | `email.subject` / `email.intro` |
| Close signups without removing the page | `open: false` |
| Change consent wording | edit `consent.marketing` / `consent.otherMarketing` / `consent.guardian` **and** bump `consent.version` |
| Turn off the Instagram or early-access questions | `form.askInstagram` / `form.askEarlyAccess` |

## Adding a future program (e.g. AMSC Off Court)

1. Copy the `off-pitch` entry in `lib/waitlists.js` to a new slug (`off-court`) with its own `path`,
   copy, phases and options (e.g. basketball positions).
2. Copy `app/offpitch/page.js` to `app/offcourt/page.js` and change the slug.

No database change is needed. The admin tab shows a program picker once there is more than one.

## Spam and duplicates

- One row per email per program (enforced by the database). A repeat signup gets the normal success
  screen and the original row is kept.
- Hidden honeypot field plus a minimum fill time. Bots get a fake success reply and nothing is stored.
- Rate limit: 10 signups per minute per IP (`middleware.js`). It is set higher than the site's other forms
  because Kenyan mobile networks put many phones behind one shared IP.
- Posts from other websites are refused.

## Consent and unsubscribing

- Joining requires ticking an unticked box agreeing to emails about the program. A second, optional box covers
  other AMSC programs. The wording version (`consent.version`) and time are stored on each row.
- Every email carries an Unsubscribe link (`/waitlist/unsubscribe?token=…`) and one-click unsubscribe headers,
  so Gmail and Yahoo show their own Unsubscribe button. Unsubscribing keeps the row and stamps `unsubscribed_at`;
  that person is never emailed again unless they re-join.
- **Who you may email:** `marketing_consent = true AND unsubscribed_at IS NULL`. The admin tab's "Emailable"
  count and the CSV's `marketing_consent` / `unsubscribed_at` columns give you this list. Only email people
  with `other_marketing_opt_in = true` about other AMSC programs.
- Any campaign you send later (launch, early access) must include an unsubscribe link too. Use each row's
  `unsubscribe_token` (`https://amscperformance.com/waitlist/unsubscribe?token=<token>`), or your email tool's own
  unsubscribe, and copy those opt-outs back.

## Personal data

- Stored: first name, email, position, level, age band, optional Instagram handle, early-access opt-in,
  consents and their wording version, guardian confirmation (under-18s), traffic source, UTM tags, referrer
  host and country. **Not stored:** IP address, full user agent, full referrer URL.
- Attribution needs no cookies and does not depend on Google Analytics consent.
- Deletion request (Kenya DPA right to erasure), run in the SQL editor:
  `DELETE FROM waitlist.signups WHERE email = lower('person@example.com');`
- No retention period is stated; rows are kept until deleted.
