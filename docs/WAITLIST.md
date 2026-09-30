# Program waitlists (AMSC Off Pitch and future programs)

Public page: **`/offpitch`**, the Instagram bio link.
Admin: `/admin` → **Waitlist** tab (counts, sources, audience breakdown, CSV export).

## Go-live steps (one time)

1. **Database.** Supabase → SQL Editor → run `scripts/supabase-waitlist-schema-v1.sql`.
2. **Expose the schema.** Supabase → Settings → API (Data API) → Exposed schemas → add `waitlist`.
   Signups fail with a schema error until this is done.
3. **Check.** In the SQL editor:
   `SELECT has_schema_privilege('service_role','waitlist','USAGE');` should return `true`.
4. Open `/offpitch` on a phone, join with your own email, and confirm the row appears in the admin Waitlist tab.
5. Set the Instagram bio link. `amscperformance.com/offpitch` is enough: taps from the Instagram
   app are detected as Instagram automatically. For per-post tracking on stories and other channels, add
   `?src=` plus an optional `utm_campaign`, for example:
   - `/offpitch?src=ig&utm_campaign=meso2` (Instagram story link sticker)
   - `/offpitch?src=wa` (WhatsApp)
   - `/offpitch?src=tt` (TikTok)

No new environment variables are needed. The page uses the existing `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`.

## Day-to-day edits (all in `lib/waitlists.js`)

| Change | Field |
|---|---|
| Update build progress (weeks written) | `build.weeksBuilt` |
| Hide the build section | set `build` to `null` |
| Close signups without removing the page | `open: false` |
| Change consent wording | edit `consent.text` **and** bump `consent.version` |
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

## Personal data

- Stored: first name, email, position, level, age band, optional Instagram handle, early-access opt-in,
  consent wording version, guardian confirmation (under-18s), traffic source, UTM tags, referrer
  host and country. **Not stored:** IP address, full user agent, full referrer URL.
- No cookies are set, so the page works without the cookie banner, and attribution does not depend on
  Google Analytics consent.
- Deletion request (Kenya DPA right to erasure), run in the SQL editor:
  `DELETE FROM waitlist.signups WHERE email = lower('person@example.com');`
- Retention stated in the privacy policy: until launch plus up to 12 months, unless the person enrols.
