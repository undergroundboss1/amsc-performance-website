import { getKochaSupabase } from '../../../../lib/supabase';
import { getCurrentScholar } from '../../../../lib/kocha/session';
import { isGateOpen } from '../../../../lib/kocha/release';
import { gateReason } from '../../../../lib/kocha/gate-reason';
import AccessGate from '../../../../components/kocha/AccessGate';
import KochaShell from '../../../../components/kocha/KochaShell';
import QuickCard from '../../../../components/kocha/QuickCard';

/**
 * /member-portal/kocha/quick-cards — the print-and-take-to-practice cards
 * (session RPE, readiness check, RAMP warm-up, landing cues, stop rules).
 * Stop rules come first. Cards behind a closed gate are not shown.
 */
export const dynamic = 'force-dynamic';

export default async function KochaQuickCardsPage({ searchParams }) {
  const scholar = await getCurrentScholar();
  if (!scholar) return <AccessGate reason={gateReason(searchParams)} />;

  const { data, error } = await getKochaSupabase()
    .from('quick_cards')
    .select('slug, title, body, gate, sort')
    .eq('cohort_id', scholar.cohort.id)
    .eq('published', true)
    .order('sort');
  if (error) throw error;

  const cards = (data || [])
    .filter((c) => isGateOpen(c.gate, { nutritionEnabled: scholar.cohort.nutrition_enabled }))
    .sort((a, b) => (a.slug === 'stop-rules' ? -1 : b.slug === 'stop-rules' ? 1 : 0));

  return (
    <KochaShell scholar={scholar}>
      <h1 className="font-display font-black text-3xl tracking-widest mb-2">Quick-reference cards</h1>
      <p className="font-body text-secondary text-sm mb-8">Short cards to use at practice.</p>
      <div className="space-y-4">
        {cards.map((c) => <QuickCard key={c.slug} card={c} emphasis={c.slug === 'stop-rules'} />)}
      </div>
    </KochaShell>
  );
}
