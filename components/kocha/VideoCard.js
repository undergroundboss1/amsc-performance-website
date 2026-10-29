import Image from 'next/image';

/**
 * One approved video. Links out to YouTube rather than embedding, so
 * nothing from YouTube loads until the coach chooses to watch — only a
 * small (~10 KB) lazy-loaded thumbnail. Thumbnails are served as-is
 * (unoptimized) so they cost no image-optimisation quota.
 *
 * The badge says whether to watch it first ("Start here") or only if
 * there is time ("Go deeper").
 */
export default function VideoCard({ video }) {
  const watchUrl = video.youtube_id ? `https://www.youtube.com/watch?v=${video.youtube_id}` : video.url;
  const meta = [video.channel, video.length_text].filter(Boolean).join(' · ');
  const start = video.audience_level !== 'deeper';

  return (
    <li className="bg-surface border border-white/10 rounded-lg overflow-hidden flex flex-col">
      {video.youtube_id && (
        <Image
          src={`https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`}
          alt=""
          width={320}
          height={180}
          unoptimized
          loading="lazy"
          className="w-full h-auto bg-surface-light"
        />
      )}
      <div className="p-4 flex flex-col flex-1">
        <span
          className={`self-start text-xs font-display font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-2 ${
            start ? 'bg-accent text-white' : 'border border-white/25 text-muted'
          }`}
        >
          {start ? 'Start here' : 'Go deeper (optional)'}
        </span>
        <h4 className="font-body font-semibold text-white normal-case tracking-normal text-base">{video.title}</h4>
        {meta && <p className="text-muted text-sm font-body mt-1">{meta}</p>}
        {video.why_watch && <p className="text-secondary text-sm font-body mt-2">{video.why_watch}</p>}
        {watchUrl && (
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 self-start inline-flex items-center justify-center min-h-[44px] px-5 rounded-full border border-white/20 text-white font-display font-bold text-sm tracking-wider uppercase hover:border-white/40 transition-colors"
          >
            {video.youtube_id ? 'Open on YouTube' : 'Watch'}
            <span className="sr-only">: {video.title} (opens in a new tab)</span>
          </a>
        )}
      </div>
    </li>
  );
}
