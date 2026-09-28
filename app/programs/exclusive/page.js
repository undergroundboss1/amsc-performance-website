import ProgramDetail from '../../../components/ProgramDetail';
import JsonLd from '../../../components/JsonLd';
import { programsData } from '../../../lib/programs';
import { getPlanDisplayPrice } from '../../../lib/plans';
import { programServiceSchema, breadcrumbSchema } from '../../../lib/structured-data';

export const metadata = {
  title: 'Exclusive One-on-One',
  description: `Exclusive one-on-one strength & conditioning coaching in Nairobi, Kenya — a sports performance coach dedicated entirely to you, for elite and professional athletes. ${getPlanDisplayPrice('exclusive')}/month.`,
  alternates: { canonical: '/programs/exclusive' },
  openGraph: {
    title: 'Exclusive One-on-One Coaching | AMSC Performance',
    description: "Your coach's time and focus, committed entirely to you.",
    url: '/programs/exclusive',
    images: [{ url: '/images/program-one-on-one.jpg' }],
  },
};

export default function ExclusivePage() {
  return (
    <>
      <JsonLd data={programServiceSchema('exclusive')} />
      <JsonLd data={breadcrumbSchema([['Home', '/'], ['Programs', '/programs'], [programsData['exclusive'].name, '/programs/exclusive']])} />
      <ProgramDetail program={{ ...programsData['exclusive'], slug: 'exclusive' }} />
    </>
  );
}
