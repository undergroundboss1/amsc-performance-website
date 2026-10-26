import Link from 'next/link';

/**
 * Small presentational building blocks shared by the Kocha hub pages.
 * Server components; the site's existing Tailwind tokens (bg-surface,
 * text-secondary, accent, font-display) so the hub reads as part of the site.
 */

export function Eyebrow({ children }) {
  return (
    <p className="font-display text-xs font-bold tracking-widest uppercase text-accent mb-2">{children}</p>
  );
}

export function Section({ id, title, children, className = '' }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={`scroll-mt-24 ${className}`}>
      <h2 id={id ? `${id}-title` : undefined} className="font-display text-xl tracking-wider text-white mb-4 section-title-left">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`bg-surface border border-white/10 rounded-lg p-5 ${className}`}>{children}</div>;
}

export function Note({ children }) {
  return <p className="text-secondary text-sm font-body leading-relaxed">{children}</p>;
}

/** Primary action: the site's red pill button, at least 44 px tall. */
export function ButtonLink({ href, children, external = false, variant = 'primary', ...rest }) {
  const base =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full font-display font-bold ' +
    'text-sm tracking-wider uppercase transition-colors';
  const styles = {
    primary: 'bg-accent text-white hover:bg-accent-dark',
    secondary: 'border border-white/20 text-white hover:border-white/40',
  };
  const className = `${base} ${styles[variant]}`;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}

/** A plain anchor for API routes (downloads) — never prefetched by next/link. */
export function DownloadLink({ href, children, label }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full bg-accent text-white font-display font-bold text-sm tracking-wider uppercase hover:bg-accent-dark transition-colors"
    >
      <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {children}
    </a>
  );
}

export function ShareLink({ href, label = 'Share on WhatsApp' }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-full border border-white/20 text-white font-display font-bold text-xs tracking-wider uppercase hover:border-white/40 transition-colors"
    >
      {label}
    </a>
  );
}

export function Tag({ children }) {
  return (
    <span className="inline-block text-xs font-display font-bold tracking-wider uppercase px-3 py-1 rounded-full border border-white/15 text-muted">
      {children}
    </span>
  );
}

export function TickIcon({ done }) {
  return done ? (
    <svg aria-hidden="true" className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <span aria-hidden="true" className="w-5 h-5 rounded-full border-2 border-white/30 flex-shrink-0" />
  );
}
