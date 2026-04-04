import ProgramDetail from '../../../components/ProgramDetail';
import { programsData } from '../../../lib/programs';

export const metadata = {
  title: 'Performance Group Training',
  description: 'Structured in-person training within a high-performance environment. Ksh 15,000/month at AMSC Performance.',
  openGraph: {
    title: 'Performance Group Training | AMSC Performance',
    description: 'High-performance training in a structured group environment.',
    images: [{ url: '/images/program-group.jpg' }],
  },
};

export default function GroupPage() {
  return <ProgramDetail program={{ ...programsData['group'], slug: 'group' }} />;
}
