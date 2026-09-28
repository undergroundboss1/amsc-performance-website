import ProgramDetail from '../../../components/ProgramDetail';
import JsonLd from '../../../components/JsonLd';
import { programsData } from '../../../lib/programs';
import { programServiceSchema, breadcrumbSchema } from '../../../lib/structured-data';

export const metadata = {
  title: 'Team & School Performance Consulting',
  description: 'Sports performance consulting for teams, schools and academies in Kenya and East Africa — strength & conditioning system design, coach education, athlete screening and monitoring.',
  alternates: { canonical: '/programs/consulting' },
  openGraph: {
    title: 'Team & School Consulting | AMSC Performance',
    description: 'Performance system implementation for teams and institutions.',
    url: '/programs/consulting',
    images: [{ url: '/images/program-consulting.jpg' }],
  },
};

export default function ConsultingPage() {
  return (
    <>
      <JsonLd data={programServiceSchema('consulting')} />
      <JsonLd data={breadcrumbSchema([['Home', '/'], ['Programs', '/programs'], [programsData['consulting'].name, '/programs/consulting']])} />
      <ProgramDetail program={{ ...programsData['consulting'], slug: 'consulting' }} />
    </>
  );
}
