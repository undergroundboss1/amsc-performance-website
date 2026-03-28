import ProgramDetail from '../../../components/ProgramDetail';
import { programsData } from '../../../lib/programs';

export const metadata = {
  title: 'Online Performance Training | AMSC Performance',
  description: 'Structured performance programming for athletes training remotely.',
};

export default function OnlinePage() {
  return <ProgramDetail program={{ ...programsData['online'], slug: 'online' }} />;
}
