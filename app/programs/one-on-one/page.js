import ProgramDetail from '../../../components/ProgramDetail';
import { programsData } from '../../../lib/programs';

export const metadata = {
  title: 'One-on-One Coaching',
  description: 'High-touch individualized coaching for athletes requiring precision progression. Ksh 30,000/month at AMSC Performance.',
  openGraph: {
    title: 'One-on-One Coaching | AMSC Performance',
    description: 'The highest level of individualized athletic development at AMSC.',
    images: [{ url: '/images/program-one-on-one.jpg' }],
  },
};

export default function OneOnOnePage() {
  return <ProgramDetail program={{ ...programsData['one-on-one'], slug: 'one-on-one' }} />;
}
