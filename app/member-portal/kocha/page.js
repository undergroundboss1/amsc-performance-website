import { getKochaSupabase } from '../../../lib/supabase';
import { getCurrentScholar } from '../../../lib/kocha/session';
import { lessonProgress, loadCourse } from '../../../lib/kocha/data';
import { isGateOpen } from '../../../lib/kocha/release';
import { gateReason } from '../../../lib/kocha/gate-reason';
import { KOCHA_BASE, METRICS_URL } from '../../../lib/kocha/constants';
import { firstName } from '../../../lib/kocha/format';
import { whatsappLink } from '../../../lib/client-comms';
import { business } from '../../../lib/business';
import { withText } from '../../../lib/kocha/share';
import AccessGate from '../../../components/kocha/AccessGate';
import KochaShell from '../../../components/kocha/KochaShell';
import LessonTile from '../../../components/kocha/LessonTile';
import FileList from '../../../components/kocha/FileList';
import QuickCard from '../../../components/kocha/QuickCard';
import { ButtonLink, Card, Section } from '../../../components/kocha/ui';

/**
 * /member-portal/kocha — the coach's dashboard.
 *
 * Twelve lesson tiles first (tap one to open everything for that week),
 * then the optional full pack and other course files, quick links, the
 * standing AMSC Metrics task and the stop rules.
 */
export const dynamic = 'force-dynamic';

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function KochaDashboardPage({ searchParams }) {
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

  // Course-wide files (the optional full pack, the baseline sheet).
  const homeFiles = course.files.filter((f) => f.show_on_home);
  const help = withText(
    whatsappLink(business.telephone),
    `Hi AMSC, this is ${scholar.display_name} from Kocha Mwenzangu. I need help with: `
  );

  const quickLinks = [
    { href: `${KOCHA_BASE}/quick-cards`, label: 'Quick-reference cards' },
    { href: `${KOCHA_BASE}/glossary`, label: 'Glossary' },
    scholar.cohort.whatsapp_group_url && { href: scholar.cohort.whatsapp_group_url, label: 'AMSC WhatsApp group', external: true },
    help && { href: help, label: 'Ask AMSC for help', external: true },
  ].filter(Boolean);

  return (
    <KochaShell scholar={scholar}>
      <h1 className="font-display font-black text-3xl md:text-4xl tracking-widest mb-2">
        Welcome, {firstName(scholar.display_name)}
      </h1>
      <p className="font-body text-secondary mb-8">Tap a lesson to see its study card, videos and homework.</p>

      <Section id="lessons" title="Your lessons" className="mb-12">
        <ol className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-3 gap-3">
          {course.weeks.map((w) => (
            <LessonTile
              key={w.n}
              week={w}
              progress={lessonProgress(course, w.n)}
              isCurrent={w.n === course.currentN}
              // An onsite visit for this coach's zone during this lesson's week.
              visit={course.visits.find((v) => v.visit_on >= w.class_on && v.visit_on <= addDays(w.class_on, 6))}
            />
          ))}
        </ol>
      </Section>

      {homeFiles.length > 0 && (
        <Section id="course-files" title="Course files" className="mb-10">
          <p className="font-body text-sm text-secondary mb-4">
            Optional. Each lesson already has its own study card; the full pack has them all in one file.
          </p>
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
                <span aria-hidden="true" className="text-red-400">→</span>
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
