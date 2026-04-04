import ProgramDetail from '../../../components/ProgramDetail';
import { programsData } from '../../../lib/programs';

export const metadata = {
  title: 'Online Performance Training',
  description: 'Structured performance programming for athletes training remotely. Ksh 12,000/month at AMSC Performance.',
  openGraph: {
    title: 'Online Performance Training | AMSC Performance',
    description: 'Structured programming for athletes training remotely.',
    images: [{ url: '/images/program-online.jpg' }],
  },
};

export default function OnlinePage() {
  return <ProgramDetail program={{ ...programsData['online'], slug: 'online' }} />;
}
