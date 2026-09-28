import ProgramDetail from '../../../components/ProgramDetail';
import { programsData } from '../../../lib/programs';
import { getPlanDisplayPrice } from '../../../lib/plans';

export const metadata = {
  title: 'Performance Group Training',
  description: `Structured in-person training within a high-performance environment. ${getPlanDisplayPrice('group')}/month at AMSC Performance.`,
  openGraph: {
    title: 'Performance Group Training | AMSC Performance',
    description: 'High-performance training in a structured group environment.',
    images: [{ url: '/images/program-group.jpg' }],
  },
};

export default function GroupPage() {
  return <ProgramDetail program={{ ...programsData['group'], slug: 'group' }} />;
}
