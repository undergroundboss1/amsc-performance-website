import ProgramDetail from '../../../components/ProgramDetail';
import JsonLd from '../../../components/JsonLd';
import { programsData } from '../../../lib/programs';
import { getPlanDisplayPrice } from '../../../lib/plans';
import { programServiceSchema, breadcrumbSchema } from '../../../lib/structured-data';

export const metadata = {
  title: 'Youth Athletic Development',
  description: `Youth athletic development and kids strength & conditioning in Nairobi, Kenya for ages 10–15 — speed, coordination, movement and injury prevention. ${getPlanDisplayPrice('youth')}/month.`,
  alternates: { canonical: '/programs/youth' },
  openGraph: {
    title: 'Youth Athletic Development | AMSC Performance',
    description: 'Building athletic foundations for the next generation.',
    url: '/programs/youth',
    images: [{ url: '/images/program-youth.jpg' }],
  },
};

export default function YouthPage() {
  return (
    <>
      <JsonLd data={programServiceSchema('youth')} />
      <JsonLd data={breadcrumbSchema([['Home', '/'], ['Programs', '/programs'], [programsData['youth'].name, '/programs/youth']])} />
      <ProgramDetail program={{ ...programsData['youth'], slug: 'youth' }} />
    </>
  );
}
