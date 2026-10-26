import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentScholar } from '../../../../../lib/kocha/session';
import { filesForWeek, loadCourse, nextVisit, videosForWeek } from '../../../../../lib/kocha/data';
import { gateReason } from '../../../../../lib/kocha/gate-reason';
import { nairobiDate } from '../../../../../lib/kocha/release';
import {
  COMPETENCIES, CONSENT_REMINDER, KOCHA_BASE, LOW_DATA_TIP, VIDEO_DISCLAIMER,
} from '../../../../../lib/kocha/constants';
import { formatDay, formatMomentTime, formatMoment } from '../../../../../lib/kocha/format';
import { waShareUrl, withText } from '../../../../../lib/kocha/share';
import { whatsappLink } from '../../../../../lib/client-comms';
import { business, SITE_URL } from '../../../../../lib/business';
import AccessGate from '../../../../../components/kocha/AccessGate';
import KochaShell from '../../../../../components/kocha/KochaShell';
import WeekMap from '../../../../../components/kocha/WeekMap';
import StepChecklist from '../../../../../components/kocha/StepChecklist';
import StudyCard from '../../../../../components/kocha/StudyCard';
import FileList from '../../../../../components/kocha/FileList';
import VideoCard from '../../../../../components/kocha/VideoCard';
import { ButtonLink, Card, Eyebrow, Note, Section, ShareLink, Tag } from '../../../../../components/kocha/ui';

/**
 * /member-portal/kocha/week/[n] — the week page.
 *
 * Every week uses the same layout in the same order, so coaches always know
 * where to look: header, "Do this week" checklist, online class, study card,
 * downloads, videos, homework, onsite visit, previous / next.
 */
export const dynamic = 'force-dynamic';

function WeekNav({ n }) {
  return (
    <nav aria-label="Previous and next week" className="flex justify-between gap-4 mt-12">
      {n > 1 ? (
        <Link href={`${KOCHA_BASE}/week/${n - 1}`} className="inline-flex items-center min-h-[44px] font-display font-bold tracking-wider uppercase text-sm text-secondary hover:text-white">
          ← Week {n - 1}
        </Link>
      ) : <span />}
      {n < 12 && (
        <Link href={`${KOCHA_BASE}/week/${n + 1}`} className="inline-flex items-center min-h-[44px] font-display font-bold tracking-wider uppercase text-sm text-secondary hover:text-white">
          Week {n + 1} →
        </Link>
      )}
    </nav>
  );
}

export default async function WeekPage({ params, searchParams }) {
  const n = Number(params.n);
  if (!Number.isInteger(n) || n < 1 || n > 12) notFound();

  const scholar = await getCurrentScholar();
  if (!scholar) return <AccessGate reason={gateReason(searchParams)} />;

  const course = await loadCourse(scholar);
  const week = course.weeks.find((w) => w.n === n);
  if (!week) notFound();

  const map = (
    <div className="mt-12">
      <h2 className="sr-only">All weeks</h2>
      <WeekMap weeks={course.weeks} currentN={course.currentN} progress={course.progress} activeN={n} />
    </div>
  );

  // Not open: say so calmly, keep the map and navigation.
  if (week.state !== 'open') {
    return (
      <KochaShell scholar={scholar}>
        <Eyebrow>Week {n} · {formatDay(week.class_on)}</Eyebrow>
        <h1 className="font-display font-black text-3xl tracking-widest mb-4">
          {week.state === 'tbc' ? 'To be confirmed' : week.title}
        </h1>
        <Card>
          <p className="font-body text-white">
            {week.state === 'tbc'
              ? 'AMSC will share the plan for this week soon.'
              : week.opens_at
                ? `This week opens on ${formatMoment(week.opens_at)}. You can look at past weeks any time.`
                : 'This week is not open yet. You can look at past weeks any time.'}
          </p>
        </Card>
        {map}
        <WeekNav n={n} />
      </KochaShell>
    );
  }

  const files = filesForWeek(course, n);
  const videos = videosForWeek(course, n);
  const assignment = course.assignments[n];
  const slides = files.filter((f) => f.kind === 'slides');
  const pack = course.files.find((f) => f.kind === 'study_card' && f.weeks.includes(n))
    || course.files.find((f) => f.kind === 'library');
  const meetUrl = week.meet_url || scholar.cohort.meet_url;
  const classTime = scholar.cohort.class_time;
  const visit = nextVisit(course, nairobiDate(new Date()));
  const weekUrl = `${SITE_URL}${KOCHA_BASE}/week/${n}`;
  const sendHomework = withText(
    whatsappLink(business.telephone),
    `Hi AMSC, this is ${scholar.display_name}. My Week ${n} homework (${assignment?.title || week.title}):\n`
  );

  const steps = [
    {
      key: 'download',
      label: 'Download',
      detail: files.length
        ? `${files.length === 1 ? '1 file' : `${files.length} files`} for this week. ${LOW_DATA_TIP}`
        : 'No files this week.',
      href: '#downloads',
      linkLabel: 'Go to downloads',
    },
    {
      key: 'watch',
      label: 'Watch',
      detail: videos.length ? 'Watch at least one video.' : 'Videos for this week are being checked by AMSC.',
      href: '#videos',
      linkLabel: 'Go to videos',
    },
    {
      key: 'submit',
      label: 'Submit homework',
      detail: assignment
        ? `${assignment.title}.${week.due_at ? ` Due ${formatMomentTime(week.due_at)}.` : ''}`
        : 'No homework this week.',
      href: '#homework',
      linkLabel: 'Go to homework',
    },
  ];

  return (
    <KochaShell scholar={scholar}>
      {/* 1. Header */}
      <header className="mb-10">
        <Eyebrow>
          Week {n} · {formatDay(week.class_on)}{week.joint ? ' · Joint session' : ''}
        </Eyebrow>
        <h1 className="font-display font-black text-3xl md:text-4xl tracking-widest">{week.title}</h1>
        {week.takeaway && (
          <p className="font-body text-lg text-white mt-4 border-l-2 border-accent pl-4">
            <span className="sr-only">Today&apos;s sentence: </span>{week.takeaway}
          </p>
        )}
        {week.competencies?.length > 0 && (
          <ul className="flex flex-wrap gap-2 mt-4" aria-label="Competencies">
            {week.competencies.map((c) => (
              <li key={c}><Tag>{c} · {COMPETENCIES[c]}</Tag></li>
            ))}
          </ul>
        )}
        <div className="mt-5">
          <ShareLink href={waShareUrl(`Kocha Mwenzangu, Week ${n}: ${week.title}\n${weekUrl}`)} label="Share this week on WhatsApp" />
        </div>
      </header>

      <div className="space-y-12">
        {/* 2. Do this week */}
        <Section id="do-this-week" title="Do this week">
          <StepChecklist weekN={n} steps={steps} initialDone={course.progress[n] || []} />
        </Section>

        {/* 3. Online class */}
        <Section id="class" title="Online class">
          <Card>
            <p className="font-body text-white">
              {formatDay(week.class_on)}, {classTime ? `${classTime} (Nairobi time)` : 'time to be confirmed'}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {meetUrl ? (
                <ButtonLink href={meetUrl} external>Join on Google Meet</ButtonLink>
              ) : (
                <Note>The class link will be shared here and in the WhatsApp group.</Note>
              )}
              {week.recording_url && (
                <ButtonLink href={week.recording_url} external variant="secondary">Watch the recording</ButtonLink>
              )}
            </div>
            {scholar.cohort.fallback_note && <p className="font-body text-sm text-secondary mt-3">{scholar.cohort.fallback_note}</p>}
            {slides.length > 0 && <div className="mt-4"><FileList files={slides} weekN={n} /></div>}
            {!week.recording_url && <p className="font-body text-sm text-secondary mt-3">The recording and slides are added here after class.</p>}
          </Card>
        </Section>

        {/* 4. Study card */}
        {week.study_card && (
          <Section id="study-card" title="Study card">
            <StudyCard week={week} />
            {pack && (
              <p className="font-body text-sm text-secondary mt-4">
                Want it on paper? <a className="text-white underline underline-offset-4" href={`/api/kocha/files/${pack.id}?week=${n}`}>Download the {pack.kind === 'library' ? 'full resource pack' : 'study card'} (PDF)</a>
              </p>
            )}
          </Section>
        )}

        {/* 5. Downloads */}
        <Section id="downloads" title="Downloads">
          <FileList files={files} weekN={n} />
        </Section>

        {/* 6. Videos */}
        <Section id="videos" title="Videos">
          {videos.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {videos.map((v) => <VideoCard key={v.id} video={v} />)}
            </ul>
          ) : (
            <Note>Videos for this week are being checked by AMSC. They will appear here soon.</Note>
          )}
          <p className="font-body text-xs text-secondary mt-4">{VIDEO_DISCLAIMER}</p>
        </Section>

        {/* 7. Homework */}
        <Section id="homework" title="Homework">
          {assignment ? (
            <Card>
              <h3 className="font-display text-lg tracking-wider text-white">
                {assignment.title}{assignment.optional ? ' (optional)' : ''}
              </h3>
              <dl className="mt-3 space-y-3 font-body text-sm">
                {assignment.time_needed && (
                  <div><dt className="text-secondary">Time needed</dt><dd className="text-white">{assignment.time_needed}</dd></div>
                )}
                {week.due_at && (
                  <div><dt className="text-secondary">Due</dt><dd className="text-white">{formatMomentTime(week.due_at)}</dd></div>
                )}
                <div><dt className="text-secondary">What to do</dt><dd className="text-white leading-relaxed">{assignment.brief}</dd></div>
                <div><dt className="text-secondary">What to send</dt><dd className="text-white">{assignment.submit_what}</dd></div>
              </dl>
              {assignment.done_checklist?.length > 0 && (
                <>
                  <h4 className="font-display text-sm font-bold tracking-widest uppercase text-accent mt-5 mb-2">Done looks like</h4>
                  <ul className="space-y-1 font-body text-sm text-white list-disc pl-5 marker:text-accent">
                    {assignment.done_checklist.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </>
              )}
              {assignment.example && (
                <>
                  <h4 className="font-display text-sm font-bold tracking-widest uppercase text-accent mt-5 mb-2">A good example</h4>
                  <p className="font-body text-sm text-white bg-surface-light rounded-lg p-4">{assignment.example}</p>
                </>
              )}
              <p role="note" className="font-body text-sm text-white border-l-2 border-accent pl-3 mt-5">{CONSENT_REMINDER}</p>
              <p className="font-body text-sm text-secondary mt-5">For now, send your homework to AMSC on WhatsApp.</p>
              {sendHomework && (
                <div className="mt-3"><ButtonLink href={sendHomework} external>Send to AMSC on WhatsApp</ButtonLink></div>
              )}
            </Card>
          ) : (
            <Note>No homework this week.</Note>
          )}
        </Section>

        {/* 8. Onsite visit */}
        <Section id="onsite" title="Next onsite visit">
          <Card>
            {visit ? (
              <>
                <p className="font-body text-white font-semibold">{visit.title} · {formatDay(visit.visit_on)}</p>
                {visit.pre_read && <p className="font-body text-sm text-secondary mt-2">{visit.pre_read}</p>}
              </>
            ) : (
              <p className="font-body text-white">AMSC will share the date of your next onsite visit soon.</p>
            )}
            {week.onsite_note && <p className="font-body text-sm text-secondary mt-3">{week.onsite_note}</p>}
          </Card>
        </Section>
      </div>

      {map}
      <WeekNav n={n} />
    </KochaShell>
  );
}
