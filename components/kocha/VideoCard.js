import Image from 'next/image';
import { PATTERN_LABELS } from '../../lib/kocha/constants';
import { Tag } from './ui';

/**
 * One approved video. Links out to YouTube rather than embedding, so
 * nothing from YouTube loads until the coach chooses to watch — only a
 * small (~10 KB) lazy-loaded thumbnail. Thumbnails are served as-is
 * (unoptimized) so they cost no image-optimisation quota.
 */
export default function VideoCard({ video }) {
  const watchUrl = video.youtube_id ? `https://www.youtube.com/watch?v=${video.youtube_id}` : video.url;
  const meta = [video.channel, video.length_text].filter(Boolean).join(' · ');
  const tag = PATTERN_LABELS[video.movement_pattern] || video.topic;

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
        <h3 className="font-body font-semibold text-white normal-case tracking-normal text-base">{video.title}</h3>
        {meta && <p className="text-muted text-sm font-body mt-1">{meta}</p>}
        {video.why_watch && <p className="text-secondary text-sm font-body mt-2">{video.why_watch}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          {tag && <Tag>{tag}</Tag>}
          {video.audience_level === 'deeper' && <Tag>Deeper dive</Tag>}
        </div>
        {watchUrl && (
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 self-start inline-flex items-center justify-center min-h-[44px] px-5 rounded-full border border-white/20 text-white font-display font-bold text-sm tracking-wider uppercase hover:border-white/40 transition-colors"
          >
            {video.youtube_id ? 'Open on YouTube' : 'Watch'}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </li>
  );
}
