import KochaNav from './KochaNav';
import { whatsappLink } from '../../lib/client-comms';
import { business } from '../../lib/business';
import { withText } from '../../lib/kocha/share';

/**
 * Page frame for every signed-in hub page: heading strip, sub-nav, and a
 * footer with help and "sign out of this phone".
 */
export default function KochaShell({ scholar, children }) {
  const help = withText(
    whatsappLink(business.telephone),
    `Hi AMSC, this is ${scholar.display_name} from Kocha Mwenzangu. I need help with: `
  );

  return (
    <div className="bg-background min-h-[80vh] pt-24 pb-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <p className="font-display text-xs font-bold tracking-widest uppercase text-secondary mb-3">
          Kocha Mwenzangu · Coach Resource Hub
        </p>
        <KochaNav />
        {children}
        <footer className="mt-16 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          {help && (
            <a
              href={help}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center min-h-[44px] text-sm font-body text-secondary hover:text-white underline underline-offset-4"
            >
              Need help? Message AMSC on WhatsApp
            </a>
          )}
          <form action="/api/kocha/sign-out" method="post">
            <button
              type="submit"
              className="min-h-[44px] text-sm font-body text-secondary hover:text-white underline underline-offset-4 bg-transparent border-0 hover:shadow-none hover:translate-y-0"
            >
              Sign out of this phone
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}
