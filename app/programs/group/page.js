import ProgramDetail from '../../../components/ProgramDetail';
import JsonLd from '../../../components/JsonLd';
import { programsData } from '../../../lib/programs';
import { programServiceSchema, breadcrumbSchema } from '../../../lib/structured-data';

export const metadata = {
  title: 'Performance Group Training',
  description: 'Small-group sports performance and strength & conditioning training in Nairobi, Kenya — periodized, coach-led sessions for athletes. Ksh 15,000/month.',
  alternates: { canonical: '/programs/group' },
  openGraph: {
    title: 'Performance Group Training | AMSC Performance',
    description: 'High-performance training in a structured group environment.',
    url: '/programs/group',
    images: [{ url: '/images/program-group.jpg' }],
  },
};

export default function GroupPage() {
  return (
    <>
      <JsonLd data={programServiceSchema('group')} />
      <JsonLd data={breadcrumbSchema([['Home', '/'], ['Programs', '/programs'], [programsData['group'].name, '/programs/group']])} />
      <ProgramDetail program={{ ...programsData['group'], slug: 'group' }} />
    </>
  );
}
