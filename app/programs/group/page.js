import ProgramDetail from '../../../components/ProgramDetail';
import { programsData } from '../../../lib/programs';

export const metadata = {
  title: 'Group Performance Training | AMSC Performance',
  description: 'Structured in-person training within a high-performance environment.',
};

export default function GroupPage() {
  return <ProgramDetail program={{ ...programsData['group'], slug: 'group' }} />;
}
