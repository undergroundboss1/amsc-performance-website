import ProgramDetail from '../../../components/ProgramDetail';
import JsonLd from '../../../components/JsonLd';
import { programsData } from '../../../lib/programs';
import { programServiceSchema, breadcrumbSchema } from '../../../lib/structured-data';

export const metadata = {
  title: 'Online Performance Training',
  description: 'Online strength & conditioning and sports performance programming from AMSC Performance — monthly plans, video guidance and check-ins for athletes training anywhere. Ksh 12,000/month.',
  alternates: { canonical: '/programs/online' },
  openGraph: {
    title: 'Online Performance Training | AMSC Performance',
    description: 'Structured programming for athletes training remotely.',
    url: '/programs/online',
    images: [{ url: '/images/program-online.jpg' }],
  },
};

export default function OnlinePage() {
  return (
    <>
      <JsonLd data={programServiceSchema('online')} />
      <JsonLd data={breadcrumbSchema([['Home', '/'], ['Programs', '/programs'], [programsData['online'].name, '/programs/online']])} />
      <ProgramDetail program={{ ...programsData['online'], slug: 'online' }} />
    </>
  );
}
