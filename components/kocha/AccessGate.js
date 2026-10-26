import { whatsappLink } from '../../lib/client-comms';
import { business } from '../../lib/business';
import { withText } from '../../lib/kocha/share';

/**
 * Shown on any hub page when this phone is not signed in. Coaches get in
 * with the personal link AMSC sends them on WhatsApp; there is no password.
 */
const MESSAGES = {
  invalid: 'That link does not work any more. It may have been replaced with a new one. Ask AMSC on WhatsApp for your current link.',
  error: 'Something went wrong opening your link. Please try it again in a minute.',
  signed_out: 'You are signed out on this phone. Tap your personal link from AMSC to sign back in.',
};

export default function AccessGate({ reason }) {
  const ask = withText(
    whatsappLink(business.telephone),
    'Hi AMSC, I am a Kocha Mwenzangu coach. Please send me my link to the Coach Resource Hub.'
  );

  return (
    <div className="bg-background min-h-[80vh] pt-24 pb-20 px-4 sm:px-6">
      <div className="max-w-md mx-auto text-center">
        <p className="font-display text-xs font-bold tracking-widest uppercase text-accent mb-3">Kocha Mwenzangu</p>
        <h1 className="font-display font-black text-3xl tracking-widest mb-4">Coach Resource Hub</h1>
        {MESSAGES[reason] && (
          <p role="status" className="bg-surface border border-white/10 rounded-lg px-4 py-3 text-sm font-body text-white mb-6">
            {MESSAGES[reason]}
          </p>
        )}
        <p className="text-secondary font-body text-sm leading-relaxed mb-8">
          This is where Kocha Mwenzangu coaches find each week&apos;s files, videos and homework. Open it with the
          personal link AMSC sent you on WhatsApp. Keep that link to yourself: it is your key.
        </p>
        {ask && (
          <a
            href={ask}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-full bg-accent text-white font-display font-bold text-sm tracking-wider uppercase hover:bg-accent-dark transition-colors"
          >
            Ask AMSC for my link
          </a>
        )}
      </div>
    </div>
  );
}
