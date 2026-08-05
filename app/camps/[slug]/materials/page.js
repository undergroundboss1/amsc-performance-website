'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { getCampContentBySlug } from '../../../../lib/camps';

/**
 * /camps/[slug]/materials?token=xxx
 *
 * Reached from the confirmation email — access_token is the durable
 * credential (same magic-link model as /join/pay?token=), so this page
 * needs no login and keeps working long after the camp ends.
 *
 * Materials come in two kinds:
 *   - 'immediate': static PDFs in /public/camps/<slug>/ — plain links,
 *     no extra auth beyond having reached this page at all. Generic
 *     educational content (strength routine, nutrition sheet), nothing
 *     personal, so this is proportionate — not gated the way the
 *     personalized report card is.
 *   - 'post-camp' (the combine report card): only exists once Day 1
 *     testing has happened AND admin has attached it via the Camp tab.
 *     Shown as "Available after Day 1 testing" until then — not hidden —
 *     so a parent isn't left wondering what happened to something they
 *     paid for. Once available, reuses the exact download mechanics
 *     already proven on /reports (base64 PDF -> Blob -> browser download).
 */

function MaterialsContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('This link is missing a token. Please use the link from your confirmation email.');
      setLoading(false);
      return;
    }

    fetch(`/api/camp/materials-status?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'This link is invalid.');
          return;
        }
        setInfo(data);
      })
      .catch(() => setError('Failed to load your materials. Please try again.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleReportDownload() {
    setDownloading(true);
    setDownloadError('');
    try {
      const res = await fetch('/api/reports/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId: info.athleteResultId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setDownloadError(data.error || 'Unable to download report.');
        return;
      }

      const bytes = Uint8Array.from(atob(data.pdf), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <section className="py-12 px-6 bg-background min-h-[80vh] flex items-center justify-center pt-24">
        <span className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12 px-6 bg-background min-h-[80vh] pt-24 pb-20">
        <div className="max-w-md mx-auto text-center">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600/20 border-2 border-red-500/40 mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
          <h1 className="font-display font-black text-2xl tracking-widest mb-4">INVALID LINK</h1>
          <p className="text-secondary font-body text-sm mb-8">{error}</p>
          <Link href="/" className="inline-block font-display text-sm font-semibold tracking-wider text-secondary hover:text-white transition-colors">
            {'←'} Back to Home
          </Link>
        </div>
      </section>
    );
  }

  const content = getCampContentBySlug(info.campSlug);

  // Not a confirmed spot — materials are part of what a paid registration
  // includes, so explain the actual state rather than showing an empty list.
  if (info.status !== 'paid') {
    const messages = {
      waitlist: "You're currently on the waitlist. Materials unlock as soon as a spot opens up and your registration is confirmed.",
      pending: "We're still confirming your payment — materials will be available here once that's done.",
      cancelled: 'This registration was cancelled, so materials for it are no longer available.',
    };
    return (
      <section className="py-12 px-6 bg-background min-h-[80vh] pt-24 pb-20">
        <div className="max-w-md mx-auto text-center">
          <h1 className="font-display font-black text-2xl tracking-widest mb-4">
            {info.athleteFirstName ? `${info.athleteFirstName.toUpperCase()}'S MATERIALS` : 'MATERIALS'}
          </h1>
          <p className="text-secondary font-body text-sm mb-8">
            {messages[info.status] || 'Materials are not currently available for this registration.'}
          </p>
          <Link href="/" className="inline-block font-display text-sm font-semibold tracking-wider text-secondary hover:text-white transition-colors">
            {'←'} Back to Home
          </Link>
        </div>
      </section>
    );
  }

  const materials = content?.materials || [];
  const immediateItems = materials.filter((m) => m.availability === 'immediate');
  const reportItem = materials.find((m) => m.key === 'combine-report');

  return (
    <section className="py-12 px-6 bg-background min-h-[80vh] pt-24 pb-20">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-display font-black text-3xl md:text-4xl tracking-widest mb-3">
            {info.athleteFirstName ? `${info.athleteFirstName.toUpperCase()}'S MATERIALS` : 'YOUR MATERIALS'}
          </h1>
          <p className="text-secondary font-body text-sm">{content?.name || 'Camp'}</p>
        </div>

        <div className="space-y-3 mb-6">
          {immediateItems.map((item) => (
            <a
              key={item.key}
              href={item.file}
              download
              className="flex items-center justify-between bg-surface border border-white/5 rounded-lg px-5 py-4 hover:border-white/20 transition-colors group"
            >
              <span className="text-white font-body text-sm">{item.label}</span>
              <span className="text-accent font-display text-xs font-bold tracking-wider uppercase flex items-center gap-2">
                Download
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </span>
            </a>
          ))}
        </div>

        {reportItem && (
          <div className="bg-surface border border-white/5 rounded-lg px-5 py-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-body text-sm">{reportItem.label}</span>
              {info.athleteResultId ? (
                <button
                  type="button"
                  onClick={handleReportDownload}
                  disabled={downloading}
                  className="text-accent font-display text-xs font-bold tracking-wider uppercase flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {downloading ? (
                    <span className="inline-block w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Download'
                  )}
                </button>
              ) : (
                <span className="text-white/30 font-display text-xs font-bold tracking-wider uppercase">
                  After Day 1 Testing
                </span>
              )}
            </div>
            {downloadError && <p className="text-red-400 text-xs font-body mt-2">{downloadError}</p>}
          </div>
        )}

        <p className="text-center text-white/30 text-xs font-body mt-8">
          Bookmark this page — this link stays active after camp, so you can come back for your report card.
        </p>
      </div>
    </section>
  );
}

export default function MaterialsPage() {
  return (
    <Suspense
      fallback={
        <section className="py-12 px-6 bg-background min-h-[80vh] flex items-center justify-center pt-24">
          <span className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </section>
      }
    >
      <MaterialsContent />
    </Suspense>
  );
}
