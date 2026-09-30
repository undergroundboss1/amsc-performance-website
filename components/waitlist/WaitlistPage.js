import Link from 'next/link';
import Image from 'next/image';
import WaitlistForm from './WaitlistForm';
import { oswald, antonio } from './fonts';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../../lib/waitlists';
import s from './waitlist.module.css';

/**
 * Shared waitlist landing page — every program in lib/waitlists.js renders
 * through this one component, so a future program is a data entry, not a
 * new page design.
 *
 * Built for one job: a player taps the Instagram bio link on a phone and
 * joins the list. No site navigation (see components/SiteChrome.js), form
 * near the top, and the program detail below it for anyone who scrolls.
 */
export default function WaitlistPage({ program }) {
  const { hero, briefs, phases, metrics, build } = program;

  return (
    <div className={`${s.root} ${oswald.variable} ${antonio.variable}`}>
      <div className={s.wrap}>
        <header className={s.header}>
          <Link href="/" aria-label="AMSC Performance home">
            <Image
              src="/images/amsc-icon-white.png"
              alt="AMSC Performance"
              width={72}
              height={72}
              className={s.logo}
              priority
            />
          </Link>
          <span className={s.headerTag}>{program.sport}</span>
        </header>

        <section className={s.hero} aria-labelledby="wl-headline">
          <p className={s.eyebrow}>{hero.eyebrow}</p>
          <h1 id="wl-headline" style={{ margin: 0 }}>
            <span className={s.bigNumber}>{hero.number}</span>
            <span className={s.headline} style={{ display: 'block' }}>{hero.headline}</span>
          </h1>
          {hero.lede.map((p) => (
            <p key={p} className={s.lede}>{p}</p>
          ))}
        </section>

        <section className={s.formBlock} id="join" aria-label="Join the waitlist">
          <WaitlistForm program={program} />
        </section>

        {briefs && (
          <section className={s.section} aria-labelledby="wl-briefs">
            <h2 id="wl-briefs" className={s.eyebrow}>{briefs.eyebrow}</h2>
            <ul className={s.rows}>
              {briefs.items.map((b) => (
                <li key={b.label} className={s.row}>
                  <span className={s.rowLabel}>{b.label}</span>
                  <span className={s.rowBody}>{b.body}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {phases && (
          <section className={s.section} aria-labelledby="wl-phases">
            <h2 id="wl-phases" className={s.eyebrow}>{phases.eyebrow}</h2>
            <ol className={s.rows}>
              {phases.items.map((ph) => (
                <li key={ph.name} className={s.row}>
                  <span className={s.rowWeeks}>
                    {ph.weeks}
                    <span className={s.rowUnit}>Weeks</span>
                  </span>
                  <span className={s.rowLabel}>{ph.name}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {metrics && (
          <section className={s.section} aria-label="AMSC Metrics">
            <span className={s.statNumber}>{metrics.number}</span>
            <span className={s.statLabel}>AMSC Metrics</span>
            <p className={s.statBody}>{metrics.body}</p>
          </section>
        )}

        {build && (
          <section className={s.section} aria-labelledby="wl-build">
            <h2 id="wl-build" className={s.eyebrow}>{build.eyebrow}</h2>
            <span className={s.statNumber}>
              {String(build.weeksBuilt).padStart(2, '0')}
              <span className={s.statOf}> / {build.weeksTotal}</span>
            </span>
            <span className={s.statLabel}>{build.label}</span>
            <div
              className={s.progress}
              style={{ gridTemplateColumns: `repeat(${build.weeksTotal}, 1fr)` }}
              role="img"
              aria-label={`${build.weeksBuilt} of ${build.weeksTotal} weeks written`}
            >
              {Array.from({ length: build.weeksTotal }, (_, i) => (
                <span
                  key={i}
                  className={`${s.progressCell} ${i < build.weeksBuilt ? s.progressCellDone : ''}`}
                />
              ))}
            </div>
            <p className={s.statBody}>{build.note}</p>
          </section>
        )}

        <footer className={s.footer}>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">@{INSTAGRAM_HANDLE}</a>
          <Link href="/privacy">Privacy</Link>
        </footer>
      </div>
    </div>
  );
}
