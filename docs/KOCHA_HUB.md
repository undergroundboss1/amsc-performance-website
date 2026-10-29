# Kocha Mwenzangu Coach Resource Hub — admin guide

Coaches: `/member-portal/kocha` (dashboard of 12 lessons → `/member-portal/kocha/lesson/3` etc.).
AMSC: the **Kocha** tab in `/admin`.

Each lesson page holds everything for that week, in this order: the study card PDF
(page 1 study card, page 2 homework sheet), the videos grouped by topic ("Start here" /
"Go deeper"), the homework with its submit form, and the online class.

## Importing lessons (manifest + PDFs)
1. `/admin` → **Kocha** → **Import**.
2. Tap **Choose manifest and PDFs** and select `lessons_manifest.json` and all the lesson PDFs together.
3. Wait for **Done**. The table shows row counts before and after.

Safe to run again at any time: nothing is duplicated, PDFs already uploaded are skipped,
and your publish switches, unlock dates, homework edits, video approvals, groups and order
are never overwritten. A changed PDF is uploaded as a new version; the old one is kept.

From a computer instead: `node scripts/kocha/import-lessons.mjs <folder>` with
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set.

Never commit lesson PDFs to this repository: it is public, and Lessons 7 and 8 are on hold.

## Approving videos
1. **Kocha** → **Lessons** → **Edit** on a lesson.
2. Under **Videos**, watch each one (Open on YouTube), then **Approve** or **Reject**.
   Videos marked **NOT CHECKED YET** were found but never reviewed: watch them first.
3. Set the **Group** and **Role** (Start here / Go deeper); use ↑ ↓ to change the order.

Only approved videos ever appear to coaches. Each lesson should have at least one approved
"Start here" video: the **Lesson readiness** table flags lessons that don't.

## Publishing a lesson
**Lessons** → **Publish** in the readiness table (or in the lesson editor). Unpublished
lessons are always hidden. The **Lesson access** setting decides the rest:
- **Open**: coaches can open any published lesson.
- **By week**: a published lesson also waits for its unlock date (00:00 Nairobi).

Lessons 7 and 8 (Sports Nutrition) are on hold: they stay hidden until they are published
AND "Sports Nutrition scope agreed" is switched on. Lessons 9 to 12 show "Coming soon"
until their PDFs are uploaded.

## Homework
**Kocha** → **Homework** lists every submission (filter by status, lesson, zone, coach).
Open photos and voice notes, set **Reviewed** or **Needs follow-up**, and write a note:
the coach sees the status and your note on their lesson page. To delete a coach's
homework (data deletion request), filter by that coach and use **Delete all homework from
this coach**: it removes their submissions and uploaded files.

**Completion** shows each coach per lesson: C = study card opened, V = video watched
(self-reported), H = homework sent. **Export CSV** for reports.

## Giving a coach access
1. **Coaches** → name, WhatsApp number and zone → **Add coach and create link**.
2. Tap **Send on WhatsApp**. The link is shown once only (it is not stored), so send it straight away.
3. Lost phone or forwarded link? **New link** replaces it (the old one stops working everywhere).
   **Turn off** removes access until you send a new link.

## Privacy rules built in
- Facilitator-only documents (Online Classes guide, Session 1 script, curriculum) are never
  uploaded to the hub and never committed to this repository.
- Athletes are minors: photos or video in homework need the coach's consent tick; coaches can
  mark "no athlete data". Submissions are visible only to the coach who sent them and to admins.
- Coaches see only their own progress. No rankings or comparisons.
- Downloads are logged as who, which file and when, nothing else.

## For developers
- Schema: `scripts/supabase-kocha-schema-v1.sql`, `scripts/supabase-kocha-schema-v2.sql` (lesson
  pages); content seed `scripts/supabase-kocha-seed-v1.sql`; lessons import `lib/kocha/lesson-import.js`.
- Tests: `npm test` (logic) and `npm run test:db` (database, local throwaway Postgres).
- Preview deployments need `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `ADMIN_SECRET_KEY` and `NEXT_PUBLIC_SITE_URL` enabled for the Preview environment in Vercel.
