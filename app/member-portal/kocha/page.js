import { getKochaSupabase } from '../../../lib/supabase';
import { getCurrentScholar } from '../../../lib/kocha/session';
import { loadCourse, filesForWeek } from '../../../lib/kocha/data';
import { isGateOpen } from '../../../lib/kocha/release';
import { gateReason } from '../../../lib/kocha/gate-reason';
import { KOCHA_BASE, METRICS_URL, WEEK_STEPS } from '../../../lib/kocha/constants';
import { firstName, formatDay } from '../../../lib/kocha/format';
import { whatsappLink } from '../../../lib/client-comms';
import { business } from '../../../lib/business';
import { withText } from '../../../lib/kocha/share';
import AccessGate from '../../../components/kocha/AccessGate';
import KochaShell from '../../../components/kocha/KochaShell';
import WeekMap from '../../../components/kocha/WeekMap';
import FileList from '../../../components/kocha/FileList';
import QuickCard from '../../../components/kocha/QuickCard';
import { ButtonLink, Card, Eyebrow, Section, TickIcon } from '../../../components/kocha/ui';

/**
 * /member-portal/kocha — Course home.
 *
 * "This week" first (what to download, watch and submit, one tap to the
 * week page), then the 12-week map, this week's files, quick links, the
 * standing Metrics task and the stop rules.
 */
export const dynamic = 'force-dynamic';

export default async function KochaHomePage({ searchParams }) {
  const scholar = await getCurrentScholar();
  if (!scholar) return <AccessGate reason={gateReason(searchParams)} />;

  const [course, stopRules] = await Promise.all([
    loadCourse(scholar),
    getKochaSupabase()
      .from('quick_cards')
      .select('slug, title, body, gate')
      .eq('cohort_id', scholar.cohort.id)
      .eq('slug', 'stop-rules')
      .eq('published', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) throw error;
        return data && isGateOpen(data.gate, { nutritionEnabled: scholar.cohort.nutrition_enabled }) ? data : null;
      }),
  ]);

  const week = course.weeks.find((w) => w.n === course.currentN);
  const isOpen = week?.state === 'open';
  const doneSteps = course.progress[course.currentN] || [];
  const weekFiles = isOpen ? filesForWeek(course, week.n) : [];
  const homeFiles = course.files.filter((f) => f.show_on_home && !weekFiles.includes(f));
  const baseline = course.files.find((f) => f.kind === 'data_sheet');
  const help = withText(
    whatsappLink(business.telephone),
    `Hi AMSC, this is ${scholar.display_name} from Kocha Mwenzangu. I need help with: `
  );

  const quickLinks = [
    { href: `${KOCHA_BASE}/quick-cards`, label: 'Quick-reference cards' },
    { href: `${KOCHA_BASE}/glossary`, label: 'Glossary' },
    baseline && { href: `/api/kocha/files/${baseline.id}`, label: 'Baseline Data Sheet', download: true },
    scholar.cohort.whatsapp_group_url && { href: scholar.cohort.whatsapp_group_url, label: 'AMSC WhatsApp group', external: true },
    help && { href: help, label: 'Ask AMSC for help', external: true },
  ].filter(Boolean);

  return (
    <KochaShell scholar={scholar}>
      <h1 className="font-display font-black text-3xl md:text-4xl tracking-widest mb-8">
        Welcome, {firstName(scholar.display_name)}
      </h1>

      {week && (
        <Card className="mb-8 border-accent/60">
          <Eyebrow>
            This week · Week {week.n} · {formatDay(week.class_on)}
          </Eyebrow>
          {isOpen ? (
            <>
              <h2 className="font-display text-2xl tracking-wider text-white">{week.title}</h2>
              {week.takeaway && <p className="font-body text-white mt-2">{week.takeaway}</p>}
              <ul className="mt-5 space-y-2" aria-label="This week's steps">
                {WEEK_STEPS.map((s, i) => {
                  const done = doneSteps.includes(s.key);
                  return (
                    <li key={s.key} className="flex items-center gap-3 font-body text-sm">
                      <TickIcon done={done} />
                      <span className="text-white">
                        Step {i + 1}: {s.label}
                        <span className="sr-only">{done ? ' (done)' : ' (not done yet)'}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-6">
                <ButtonLink href={`${KOCHA_BASE}/week/${week.n}`}>Open Week {week.n}</ButtonLink>
              </div>
            </>
          ) : (
            <p className="font-body text-secondary">The course opens soon. Check back here.</p>
          )}
        </Card>
      )}

      <Section id="map" title="12-week map" className="mb-10">
        <WeekMap weeks={course.weeks} currentN={course.currentN} progress={course.progress} />
      </Section>

      {isOpen && (
        <Section id="this-week-files" title={`Download for Week ${week.n}`} className="mb-10">
          <FileList files={weekFiles} weekN={week.n} />
        </Section>
      )}

      {homeFiles.length > 0 && (
        <Section id="course-files" title="Course files" className="mb-10">
          <FileList files={homeFiles} />
        </Section>
      )}

      <Section id="quick-links" title="Quick links" className="mb-10">
        <ul className="grid gap-3 sm:grid-cols-2">
          {quickLinks.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="flex items-center justify-between min-h-[52px] bg-surface border border-white/10 rounded-lg px-4 font-body text-white hover:border-white/30 transition-colors"
              >
                {l.label}
                <span aria-hidden="true" className="text-accent">{l.download ? '↓' : '→'}</span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="metrics" title="After each onsite visit" className="mb-10">
        <Card>
          <p className="font-body text-white leading-relaxed">
            Copy your athletes&apos; results from the Baseline Data Sheet into AMSC Metrics. Then tick
            &ldquo;In Metrics&rdquo; for each athlete on the sheet.
          </p>
          <p className="font-body text-secondary text-sm mt-2">
            Only enter an athlete by name if their guardian has given consent. Otherwise use their code.
          </p>
          <div className="mt-4">
            <ButtonLink href={METRICS_URL} external variant="secondary">
              Open AMSC Metrics<span className="sr-only"> (opens in a new tab)</span>
            </ButtonLink>
          </div>
        </Card>
      </Section>

      {stopRules && (
        <Section id="stop-rules" title="Safety first">
          <QuickCard card={stopRules} emphasis />
        </Section>
      )}
    </KochaShell>
  );
}
