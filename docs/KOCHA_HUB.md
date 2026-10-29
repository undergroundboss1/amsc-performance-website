# Kocha Mwenzangu Coach Resource Hub — admin guide

Where it lives: `/member-portal/kocha` (coaches) and the **Kocha** tab in `/admin` (AMSC).

## Giving a coach access
1. `/admin` → **Kocha** → **Coaches** → enter name, WhatsApp number and zone → **Add coach and create link**.
2. Tap **Send on WhatsApp**. The link is shown once only (it is not stored), so send it straight away.
3. Lost phone or forwarded link? **New link** replaces it (the old one stops working everywhere). **Turn off** removes access until you send a new link.

## Adding or replacing a file
1. **Kocha** → **Files**. Use **Add a file** for a new one (title, type, weeks).
2. **Upload file** (or **Replace file** for a new version — the old version is kept).
3. **Publish**. Coaches only see published files, and only on weeks that are open.

## How weeks open
- Each week opens 7 days before its Saturday class (Nairobi time). Past weeks stay open.
- Weeks 7 and 8 (nutrition) are hidden and show "To be confirmed" until the nutrition scope is agreed.

## Privacy rules built in
- Facilitator-only documents (Online Classes guide, Session 1 script, curriculum) are never uploaded to the hub and never committed to this public repository.
- Coaches see only their own progress. No rankings or comparisons.
- Downloads are logged as who, which file and when — nothing else.

## For developers
- Schema: `scripts/supabase-kocha-schema-v1.sql`; content seed: `scripts/supabase-kocha-seed-v1.sql` (generated from `scripts/kocha/content.json` by `scripts/kocha/build_seed.py`).
- Tests: `npm test` (logic) and `npm run test:db` (database, local throwaway Postgres).
- Preview deployments need `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET_KEY` and `NEXT_PUBLIC_SITE_URL` enabled for the Preview environment in Vercel.
