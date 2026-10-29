import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentScholar } from '../../../../../lib/kocha/session';
import {
  filesForWeek, groupVideos, lessonPdf, lessonProgress, loadCourse, videosForWeek,
} from '../../../../../lib/kocha/data';
import { gateReason } from '../../../../../lib/kocha/gate-reason';
import { CONSENT_REMINDER, KOCHA_BASE, VIDEO_DISCLAIMER } from '../../../../../lib/kocha/constants';
import { formatBytes, formatDay, formatMoment, formatMomentTime } from '../../../../../lib/kocha/format';
import { withText } from '../../../../../lib/kocha/share';
import { whatsappLink } from '../../../../../lib/client-comms';
import { business } from '../../../../../lib/business';
import AccessGate from '../../../../../components/kocha/AccessGate';
import KochaShell from '../../../../../components/kocha/KochaShell';
import FileList from '../../../../../components/kocha/FileList';
import VideoCard from '../../../../../components/kocha/VideoCard';
import PdfPreview from '../../../../../components/kocha/PdfPreview';
import ProgressTick from '../../../../../components/kocha/ProgressTick';
import HomeworkForm from '../../../../../components/kocha/HomeworkForm';
import {
  ButtonLink, Card, DownloadLink, Eyebrow, Note, Section, StatusChip,
} from '../../../../../components/kocha/ui';

/**
 * /member-portal/kocha/lesson/[n] — one lesson page holds everything for
 * that week, in the same order every time:
 *   header · study card PDF · watch · homework · online class · footer.
 */
export const dynamic = 'force-dynamic';

const SUBMISSION_STATUS = {
  submitted: 'Sent — waiting for review',
  reviewed: 'Reviewed',
  follow_up: 'Reviewed — please follow up',
};

function LessonFooter({ n }) {
  const link = 'inline-flex items-center min-h-[44px] font-display font-bold tracking-wider uppercase text-sm text-secondary hover:text-white';
  return (
    <nav aria-label="Lesson navigation" className="mt-12 pt-6 border-t border-white/10 grid grid-cols-3 gap-2 items-center">
      <span>{n > 1 && <Link href={`${KOCHA_BASE}/lesson/${n - 1}`} className={link}>← Lesson {n - 1}</Link>}</span>
      <Link href={KOCHA_BASE} className={`${link} justify-center text-center`}>Dashboard</Link>
      <span className="text-right">{n < 12 && <Link href={`${KOCHA_BASE}/lesson/${n + 1}`} className={`${link} justify-end`}>Lesson {n + 1} →</Link>}</span>
    </nav>
  );
}

export default async function LessonPage({ params, searchParams }) {
  const n = Number(params.n);
  if (!Number.isInteger(n) || n < 1 || n > 12) notFound();

  const scholar = await getCurrentScholar();
  if (!scholar) return <AccessGate reason={gateReason(searchParams)} />;

  const course = await loadCourse(scholar);
  const week = course.weeks.find((w) => w.n === n);
  if (!week) notFound();

  // Not open: title and date only — no files, videos or homework.
  if (week.state !== 'open') {
    const message = {
      tbc: 'AMSC will share the plan for this lesson soon.',
      soon: 'Coming soon. AMSC will open this lesson when it is ready.',
      locked: week.opens_at ? `This lesson opens on ${formatMoment(week.opens_at)}.` : 'This lesson is not open yet.',
    }[week.state];
    return (
      <KochaShell scholar={scholar}>
        <Eyebrow>Lesson {n} · Week {n} · {formatDay(week.class_on)}</Eyebrow>
        <h1 className="font-display font-black text-3xl tracking-widest mb-4">
          {week.state === 'tbc' ? 'To be confirmed' : week.title}
        </h1>
        <Card><p className="font-body text-white">{message} You can open the lessons that are ready from the dashboard.</p></Card>
        <LessonFooter n={n} />
      </KochaShell>
    );
  }

  const pdf = lessonPdf(course, n);
  const otherFiles = filesForWeek(course, n).filter((f) => f.id !== pdf?.id && f.kind !== 'library' && f.kind !== 'slides');
  const slides = filesForWeek(course, n).filter((f) => f.kind === 'slides');
  const groups = groupVideos(videosForWeek(course, n));
  const hasStart = groups.some((g) => g.videos.some((v) => v.audience_level !== 'deeper'));
  const assignment = course.assignments[n];
  const mySubmissions = course.submissions[n] || [];
  const progress = lessonProgress(course, n);
  const meetUrl = week.meet_url || scholar.cohort.meet_url;
  const classTime = scholar.cohort.class_time;
  const sendOnWhatsApp = withText(
    whatsappLink(business.telephone),
    `Hi AMSC, this is ${scholar.display_name}. My Lesson ${n} homework (${assignment?.title || week.title}):\n`
  );

  return (
    <KochaShell scholar={scholar}>
      {/* 1. Header */}
      <header className="mb-10">
        <Eyebrow>Lesson {n} · Week {n} · {formatDay(week.class_on)}{week.joint ? ' · Joint session' : ''}</Eyebrow>
        <h1 className="font-display font-black text-3xl md:text-4xl tracking-widest">{week.title}</h1>
        <div className="mt-3"><StatusChip status={progress.status} /></div>
        {week.takeaway && (
          <p className="font-body text-lg text-white mt-4 border-l-2 border-accent pl-4">
            <span className="sr-only">One sentence to remember: </span>{week.takeaway}
          </p>
        )}
      </header>

      <div className="space-y-12">
        {/* 2. Study card */}
        <Section id="study-card" title="Study card">
          {pdf ? (
            <Card>
              <p className="font-body text-white">Page 1 is the study card. Page 2 is the homework sheet to print.</p>
              <p className="font-body text-sm text-muted mt-1">
                PDF{pdf.size_bytes ? ` · ${formatBytes(pdf.size_bytes)}` : ''}
                {pdf.version_label ? ` · ${pdf.version_label}` : ` · Version ${pdf.version}`}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <DownloadLink href={`/api/kocha/files/${pdf.id}?week=${n}`} label={`Download the Lesson ${n} PDF${pdf.size_bytes ? `, ${formatBytes(pdf.size_bytes)}` : ''}`}>
                  Download PDF{pdf.size_bytes ? ` (${formatBytes(pdf.size_bytes)})` : ''}
                </DownloadLink>
              </div>
              <div className="mt-4">
                <PdfPreview src={`/api/kocha/files/${pdf.id}?week=${n}&inline=1`} title={`Lesson ${n} study card and homework sheet`} />
              </div>
            </Card>
          ) : (
            <Note>The study card for this lesson will be added here soon.</Note>
          )}
          {otherFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="font-display text-sm font-bold tracking-widest uppercase text-secondary mb-3">Also for this lesson</h3>
              <FileList files={otherFiles} weekN={n} />
            </div>
          )}
        </Section>

        {/* 3. Watch */}
        <Section id="watch" title="Watch">
          {groups.length > 0 ? (
            <>
              {hasStart && <p className="font-body text-white mb-6">Watch at least one <strong>Start here</strong> video.</p>}
              <div className="space-y-8">
                {groups.map((g) => (
                  <div key={g.name}>
                    <h3 className="font-display text-lg tracking-wider text-white mb-3">{g.name}</h3>
                    <ul className="grid gap-4 sm:grid-cols-2">
                      {g.videos.map((v) => <VideoCard key={v.id} video={v} />)}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <ProgressTick weekN={n} step="watch" label="I watched at least one Start here video" initial={progress.watched} />
              </div>
            </>
          ) : (
            <Note>Videos for this lesson are being checked by AMSC. They will appear here soon.</Note>
          )}
          <p className="font-body text-xs text-secondary mt-4">{VIDEO_DISCLAIMER}</p>
        </Section>

        {/* 4. Homework */}
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
                  <div><dt className="text-secondary">Hand in</dt><dd className="text-white">Before the next online class ({formatMomentTime(week.due_at)})</dd></div>
                )}
                <div><dt className="text-secondary">What to do</dt><dd className="text-white leading-relaxed">{assignment.brief}</dd></div>
                <div><dt className="text-secondary">Send</dt><dd className="text-white">{assignment.submit_what}</dd></div>
              </dl>
              {pdf && (
                <p className="font-body text-sm text-secondary mt-4">
                  The steps and a log to fill in are on page 2 of the{' '}
                  <a className="text-white underline underline-offset-4" href={`/api/kocha/files/${pdf.id}?week=${n}`}>lesson PDF</a>.
                </p>
              )}
              {assignment.done_checklist?.length > 0 && (
                <ul className="mt-4 space-y-1 font-body text-sm text-white list-disc pl-5 marker:text-accent">
                  {assignment.done_checklist.map((c) => <li key={c}>{c}</li>)}
                </ul>
              )}

              {mySubmissions.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-display text-sm font-bold tracking-widest uppercase text-red-400 mb-2">What you sent</h4>
                  <ul className="space-y-3">
                    {mySubmissions.map((s) => (
                      <li key={s.id} className="bg-surface-light rounded-lg p-4 font-body text-sm">
                        <p className="text-white font-semibold">{SUBMISSION_STATUS[s.status] || s.status}</p>
                        <p className="text-secondary text-xs mt-1">
                          Sent {formatMomentTime(s.created_at)}
                          {s.submission_media?.length ? ` · ${s.submission_media.length} attachment${s.submission_media.length > 1 ? 's' : ''}` : ''}
                          {s.link_url ? ' · video link' : ''}
                        </p>
                        {s.feedback && <p className="text-white mt-2 border-l-2 border-accent pl-3"><span className="sr-only">Feedback from AMSC: </span>{s.feedback}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6">
                <h4 className="font-display text-sm font-bold tracking-widest uppercase text-red-400 mb-3">
                  {mySubmissions.length ? 'Send another' : 'Send your homework'}
                </h4>
                <HomeworkForm weekN={n} consentText={CONSENT_REMINDER} />
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="font-body text-sm text-secondary">Cannot upload? Send it on WhatsApp instead, then tick below.</p>
                {sendOnWhatsApp && (
                  <div className="mt-3"><ButtonLink href={sendOnWhatsApp} external variant="secondary">Send to AMSC on WhatsApp</ButtonLink></div>
                )}
                <div className="mt-3">
                  <ProgressTick weekN={n} step="submit" label="I sent my homework on WhatsApp" initial={progress.sent && !mySubmissions.length} />
                </div>
              </div>
            </Card>
          ) : (
            <Note>No homework for this lesson.</Note>
          )}
        </Section>

        {/* 5. Online class */}
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
              {week.recording_url && <ButtonLink href={week.recording_url} external variant="secondary">Watch the recording</ButtonLink>}
            </div>
            {scholar.cohort.fallback_note && <p className="font-body text-sm text-secondary mt-3">{scholar.cohort.fallback_note}</p>}
            {slides.length > 0 && <div className="mt-4"><FileList files={slides} weekN={n} /></div>}
            {!week.recording_url && <p className="font-body text-sm text-secondary mt-3">The recording and slides are added here after class.</p>}
          </Card>
        </Section>
      </div>

      {/* 6. Footer */}
      <LessonFooter n={n} />
    </KochaShell>
  );
}
