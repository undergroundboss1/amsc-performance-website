import ProgramDetail from '../../../components/ProgramDetail';
import { programsData } from '../../../lib/programs';

export const metadata = {
  title: 'Team & School Consulting | AMSC Performance',
  description: 'Performance system implementation for teams and institutions.',
};

export default function ConsultingPage() {
  return <ProgramDetail program={{ ...programsData['consulting'], slug: 'consulting' }} />;
}
