import ProgramDetail from '../../../components/ProgramDetail';
import { programsData } from '../../../lib/programs';

export const metadata = {
  title: 'Youth Athletic Development',
  description: 'Building athletic foundations for young athletes aged 10–17. Ksh 10,000/month at AMSC Performance.',
  openGraph: {
    title: 'Youth Athletic Development | AMSC Performance',
    description: 'Building athletic foundations for the next generation.',
    images: [{ url: '/images/program-youth.jpg' }],
  },
};

export default function YouthPage() {
  return <ProgramDetail program={{ ...programsData['youth'], slug: 'youth' }} />;
}
