import ProgramDetail from '../../../components/ProgramDetail';
import { programsData } from '../../../lib/programs';

export const metadata = {
  title: 'Exclusive One-on-One',
  description: "The highest level of coaching at AMSC — your coach's time and focus committed entirely to you. Ksh 50,000/month.",
  openGraph: {
    title: 'Exclusive One-on-One | AMSC Performance',
    description: "Your coach's time and focus, committed entirely to you.",
    images: [{ url: '/images/program-one-on-one.jpg' }],
  },
};

export default function ExclusivePage() {
  return <ProgramDetail program={{ ...programsData['exclusive'], slug: 'exclusive' }} />;
}
