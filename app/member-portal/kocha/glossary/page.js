import { getKochaSupabase } from '../../../../lib/supabase';
import { getCurrentScholar } from '../../../../lib/kocha/session';
import { isGateOpen } from '../../../../lib/kocha/release';
import { gateReason } from '../../../../lib/kocha/gate-reason';
import AccessGate from '../../../../components/kocha/AccessGate';
import KochaShell from '../../../../components/kocha/KochaShell';
import GlossaryList from '../../../../components/kocha/GlossaryList';

/** /member-portal/kocha/glossary — every course word, A to Z, searchable. */
export const dynamic = 'force-dynamic';

export default async function KochaGlossaryPage({ searchParams }) {
  const scholar = await getCurrentScholar();
  if (!scholar) return <AccessGate reason={gateReason(searchParams)} />;

  const { data, error } = await getKochaSupabase()
    .from('glossary')
    .select('term, meaning, gate')
    .eq('cohort_id', scholar.cohort.id);
  if (error) throw error;

  const terms = (data || [])
    .filter((t) => isGateOpen(t.gate, { nutritionEnabled: scholar.cohort.nutrition_enabled }))
    .map(({ term, meaning }) => ({ term, meaning }))
    .sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));

  return (
    <KochaShell scholar={scholar}>
      <h1 className="font-display font-black text-3xl tracking-widest mb-2">Glossary</h1>
      <p className="font-body text-secondary text-sm mb-8">The words we use in class, in plain language.</p>
      <GlossaryList terms={terms} />
    </KochaShell>
  );
}
