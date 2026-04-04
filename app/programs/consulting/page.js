import ProgramDetail from '../../../components/ProgramDetail';
import { programsData } from '../../../lib/programs';

export const metadata = {
  title: 'Team & School Performance Consulting',
  description: 'Performance system implementation for teams and institutions. Contact AMSC Performance for pricing.',
  openGraph: {
    title: 'Team & School Consulting | AMSC Performance',
    description: 'Performance system implementation for teams and institutions.',
    images: [{ url: '/images/program-consulting.jpg' }],
  },
};

export default function ConsultingPage() {
  return <ProgramDetail program={{ ...programsData['consulting'], slug: 'consulting' }} />;
}
