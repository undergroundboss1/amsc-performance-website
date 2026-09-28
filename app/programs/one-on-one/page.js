import ProgramDetail from '../../../components/ProgramDetail';
import JsonLd from '../../../components/JsonLd';
import { programsData } from '../../../lib/programs';
import { getPlanDisplayPrice } from '../../../lib/plans';
import { programServiceSchema, breadcrumbSchema } from '../../../lib/structured-data';

export const metadata = {
  title: 'Individualized Coaching',
  description: `Individualized strength & conditioning coaching in Nairobi, Kenya — a programme built around your assessment and data, with hands-on coach-led sessions. ${getPlanDisplayPrice('one-on-one')}/month.`,
  alternates: { canonical: '/programs/one-on-one' },
  openGraph: {
    title: 'Individualized Coaching | AMSC Performance',
    description: 'A programme built entirely around you, with hands-on coaching.',
    url: '/programs/one-on-one',
    images: [{ url: '/images/program-one-on-one.jpg' }],
  },
};

export default function OneOnOnePage() {
  return (
    <>
      <JsonLd data={programServiceSchema('one-on-one')} />
      <JsonLd data={breadcrumbSchema([['Home', '/'], ['Programs', '/programs'], [programsData['one-on-one'].name, '/programs/one-on-one']])} />
      <ProgramDetail program={{ ...programsData['one-on-one'], slug: 'one-on-one' }} />
    </>
  );
}
