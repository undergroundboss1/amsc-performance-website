import ProgramDetail from '../../../components/ProgramDetail';
import { programsData } from '../../../lib/programs';

export const metadata = {
  title: 'One-on-One Coaching | AMSC Performance',
  description: 'High-touch coaching for athletes requiring individualized oversight and precision progression.',
};

export default function OneOnOnePage() {
  return <ProgramDetail program={{ ...programsData['one-on-one'], slug: 'one-on-one' }} />;
}
