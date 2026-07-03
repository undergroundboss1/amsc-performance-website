import ProgramDetail from '../../../components/ProgramDetail';
import { programsData } from '../../../lib/programs';

export const metadata = {
  title: 'Individualized Coaching',
  description: 'A programme built entirely around you, with hands-on coach-led sessions. Ksh 30,000/month at AMSC Performance.',
  openGraph: {
    title: 'Individualized Coaching | AMSC Performance',
    description: 'A programme built entirely around you, with hands-on coaching.',
    images: [{ url: '/images/program-one-on-one.jpg' }],
  },
};

export default function OneOnOnePage() {
  return <ProgramDetail program={{ ...programsData['one-on-one'], slug: 'one-on-one' }} />;
}
