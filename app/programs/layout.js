import { formatKES, minPlanPrice } from '../../lib/plans';

export const metadata = {
  title: 'Programs',
  description: `Sports performance and strength & conditioning programs at AMSC Performance in Nairobi, Kenya — exclusive one-on-one, individualized coaching, group training, online coaching, youth development (ages 10–15) and team consulting. From ${formatKES(minPlanPrice)}/month.`,
  alternates: { canonical: '/programs' },
  openGraph: {
    title: 'Training Programs | AMSC Performance',
    description: 'Choose the training pathway designed for your level of performance.',
  },
};

export default function ProgramsLayout({ children }) {
  return children;
}
