'use client';

import { useState } from 'react';
import AnimatedSection from '../../components/AnimatedSection';

export default function ReportsPage() {
  const [mode, setMode] = useState('code'); // 'code' or 'email'
  const [accessCode, setAccessCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [downloading, setDownloading] = useState(null);

  async function handleLookup(e) {
    e.preventDefault();
    setError('');
    setResults(null);
    setLoading(true);

    try {
      const body = mode === 'code'
        ? { accessCode: accessCode.trim() }
        : { email: email.trim() };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setResults(data.results);
    } catch {
      setError('Unable to connect. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(resultId) {
    setDownloading(resultId);
    setError('');

    try {
      const res = await fetch('/api/reports/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unable to download report.');
        return;
      }

      // Decode base64 PDF and trigger browser download
      const bytes = Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0));
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
      setError('Download failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  function tierColor(tier) {
    if (!tier) return 'text-secondary';
    if (tier === 'Advanced' || tier === 'Efficient') return 'text-green-400';
    if (tier === 'Competitive' || tier === 'Moderate Drop-Off') return 'text-yellow-400';
    return 'text-red-400';
  }

  return (
    <section className="min-h-screen bg-background pt-24 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        <AnimatedSection>
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-surface-light rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="font-display font-black text-4xl md:text-5xl tracking-widest mb-3">
              PERFORMANCE REPORTS
            </h1>
            <p className="text-secondary text-sm font-body max-w-md mx-auto">
              Access your AMSC Combine performance report. Enter the access code provided at your session, or use your registered email.
            </p>
          </div>

          {/* Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-surface border border-white/5 rounded-full p-1 flex">
              <button
                onClick={() => { setMode('code'); setError(''); setResults(null); }}
                className={`px-6 py-2 rounded-full text-sm font-display font-semibold tracking-wider transition-all duration-200 ${
                  mode === 'code'
                    ? 'bg-accent text-white'
                    : 'text-secondary hover:text-white'
                }`}
              >
                Access Code
              </button>
              <button
                onClick={() => { setMode('email'); setError(''); setResults(null); }}
                className={`px-6 py-2 rounded-full text-sm font-display font-semibold tracking-wider transition-all duration-200 ${
                  mode === 'email'
                    ? 'bg-accent text-white'
                    : 'text-secondary hover:text-white'
                }`}
              >
                Email
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLookup} className="mb-8">
            <div className="bg-surface border border-white/5 rounded-lg p-6">
              {mode === 'code' ? (
                <div>
                  <label htmlFor="accessCode" className="block text-sm font-display font-semibold tracking-wider text-secondary mb-2">
                    ACCESS CODE
                  </label>
                  <input
                    id="accessCode"
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AMSC-2026-0042"
                    className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-text font-body text-sm placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    required
                    autoComplete="off"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="email" className="block text-sm font-display font-semibold tracking-wider text-secondary mb-2">
                    EMAIL ADDRESS
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-text font-body text-sm placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    required
                    autoComplete="email"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full bg-accent text-white py-3 rounded-full font-display font-bold text-sm tracking-wider uppercase hover:bg-accent-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Searching...' : 'Find My Report'}
              </button>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/20 rounded-lg px-4 py-3 mb-6 text-center">
              <p className="text-red-400 text-sm font-body">{error}</p>
            </div>
          )}

          {/* Results */}
          {results && results.length > 0 && (
            <AnimatedSection>
              <div className="space-y-4">
                <p className="text-secondary text-xs font-display tracking-wider uppercase text-center mb-2">
                  {results.length} report{results.length > 1 ? 's' : ''} found
                </p>

                {results.map((result) => (
                  <div
                    key={result.id}
                    className="bg-surface border border-white/5 rounded-lg p-5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-bold text-lg tracking-wide text-text truncate">
                          {result.athlete_name}
                        </h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <span className="text-secondary text-xs font-body">
                            {result.sport || '—'}
                          </span>
                          <span className="text-secondary text-xs font-body">
                            {formatDate(result.event_date)}
                          </span>
                        </div>

                        {/* Quick stats */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                          <span className="text-xs font-body">
                            <span className="text-white/40">Accel </span>
                            <span className={tierColor(result.acceleration_category)}>
                              {result.acceleration_category || '—'}
                            </span>
                          </span>
                          <span className="text-xs font-body">
                            <span className="text-white/40">Max V </span>
                            <span className={tierColor(result.max_velocity_category)}>
                              {result.max_velocity_category || '—'}
                            </span>
                          </span>
                          <span className="text-xs font-body">
                            <span className="text-white/40">Power </span>
                            <span className={tierColor(result.power_category)}>
                              {result.power_category || '—'}
                            </span>
                          </span>
                        </div>

                        {result.primary_imbalance_flag && result.primary_imbalance_flag !== 'Balanced Profile' && (
                          <p className="text-yellow-400/80 text-xs font-body mt-2">
                            {result.primary_imbalance_flag}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDownload(result.id)}
                        disabled={downloading === result.id}
                        className="flex-shrink-0 bg-accent/10 border border-accent/30 text-accent px-4 py-2.5 rounded-lg font-display font-bold text-xs tracking-wider uppercase hover:bg-accent hover:text-white transition-all duration-200 disabled:opacity-50"
                      >
                        {downloading === result.id ? (
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            PDF
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            PDF
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          )}

          {/* Help text */}
          <div className="mt-10 text-center">
            <p className="text-white/30 text-xs font-body">
              Reports are available after your AMSC Combine session has been processed.
              <br />
              If you need assistance, contact your coach or email us directly.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
