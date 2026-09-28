import ProgramDetail from '../../../components/ProgramDetail';
import { programsData } from '../../../lib/programs';
import { getPlanDisplayPrice } from '../../../lib/plans';

export const metadata = {
  title: 'Youth Athletic Development',
  description: `Building athletic foundations for young athletes aged 10–15. ${getPlanDisplayPrice('youth')}/month at AMSC Performance.`,
  openGraph: {
    title: 'Youth Athletic Development | AMSC Performance',
    description: 'Building athletic foundations for the next generation.',
    images: [{ url: '/images/program-youth.jpg' }],
  },
};

export default function YouthPage() {
  return <ProgramDetail program={{ ...programsData['youth'], slug: 'youth' }} />;
}
