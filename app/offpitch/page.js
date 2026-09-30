import WaitlistPage from '../../components/waitlist/WaitlistPage';
import { getWaitlistProgram } from '../../lib/waitlists';

// AMSC Off Pitch waitlist — the Instagram bio link (@amscperformance).
// Copy, options and consent wording live in lib/waitlists.js.
const program = getWaitlistProgram('off-pitch');

export const metadata = {
  title: { absolute: program.meta.title },
  description: program.meta.description,
  alternates: { canonical: program.path },
  openGraph: {
    title: program.meta.title,
    description: program.meta.description,
    url: program.path,
  },
  twitter: {
    title: program.meta.title,
    description: program.meta.description,
  },
};

export const viewport = {
  themeColor: '#000000',
};

export default function OffPitchWaitlistPage() {
  return <WaitlistPage program={program} />;
}
