'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * /admin — Internal dashboard for reviewing applications.
 *
 * Protected by a simple password prompt (ADMIN_SECRET_KEY).
 * You and your assistant can use this on any device — phone, laptop, tablet.
 */

function LoginScreen({ onLogin, error }) {
  const [password, setPassword] = useState('');

  return (
    <section className="py-12 px-6 bg-background min-h-screen flex items-center justify-center">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="font-display font-black text-2xl tracking-widest mb-2">AMSC ADMIN</h1>
          <p className="text-secondary font-body text-sm">Enter your admin password to continue.</p>
        </div>
        <div className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLogin(password)}
            placeholder="Admin password"
            className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white font-body text-sm placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm font-body">{error}</p>}
          <button
            onClick={() => onLogin(password)}
            className="w-full bg-accent text-white font-display font-bold text-sm tracking-wider uppercase py-3 rounded-full hover:bg-accent-dark transition-all cursor-pointer"
          >
            Log In
          </button>
        </div>
      </div>
    </section>
  );
}

function ApplicationCard({ client, adminKey, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleAction(action) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({ clientId: client.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Action failed.');
        return;
      }

      if (action === 'approve' && data.paymentUrl) {
        setPaymentLink(data.paymentUrl);
        // Don't refresh the list — card would disappear from pending_review filter
        // before the user can copy/send the link. They can refresh manually.
      } else {
        onUpdate();
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const statusColors = {
    pending_review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    approved: 'bg-green-500/20 text-green-400 border-green-500/30',
    declined: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const paymentColors = {
    pending: 'text-yellow-400',
    paid: 'text-green-400',
    failed: 'text-red-400',
  };

  return (
    <div className="bg-surface border border-white/5 rounded-xl p-6 mb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-lg text-white">{client.full_name}</h3>
          <p className="text-secondary text-sm font-body">{client.email} &middot; {client.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-display font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${statusColors[client.application_status] || statusColors.pending_review}`}>
            {client.application_status?.replace('_', ' ')}
          </span>
          {client.payment_status === 'paid' && (
            <span className="text-[10px] font-display font-bold tracking-widest uppercase px-3 py-1 rounded-full border bg-green-500/20 text-green-400 border-green-500/30">
              Paid
            </span>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="bg-surface-light rounded-lg p-3">
          <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Plan</span>
          <span className="text-white text-sm font-body">{client.selected_plan} &middot; KES {client.plan_price?.toLocaleString()}</span>
        </div>
        <div className="bg-surface-light rounded-lg p-3">
          <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Sport</span>
          <span className="text-white text-sm font-body">{client.sport || '—'}</span>
        </div>
        <div className="bg-surface-light rounded-lg p-3 sm:col-span-2">
          <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Training Goals</span>
          <span className="text-white text-sm font-body">{client.training_goals || '—'}</span>
        </div>
        <div className="bg-surface-light rounded-lg p-3">
          <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Availability</span>
          <span className="text-white text-sm font-body">{client.availability || '—'}</span>
        </div>
        <div className="bg-surface-light rounded-lg p-3">
          <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Health Info</span>
          <span className="text-white text-sm font-body">{client.health_info || 'None'}</span>
        </div>
        {client.notes && (
          <div className="bg-surface-light rounded-lg p-3 sm:col-span-2">
            <span className="text-[10px] font-display font-bold tracking-widest uppercase text-white/40 block mb-1">Notes</span>
            <span className="text-white text-sm font-body">{client.notes}</span>
          </div>
        )}
      </div>

      <div className="text-white/20 text-xs font-body mb-4">
        Applied {new Date(client.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>

      {/* Payment Link + Send Options (shown after approve) */}
      {paymentLink && (
        <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4 mb-4">
          <p className="text-green-400 text-xs font-display font-bold tracking-widest uppercase mb-3">Payment Link Generated — Send to Client</p>

          {/* Send Buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            <a
              href={`https://wa.me/${client.phone?.replace(/[\s\-()+ ]/g, '')}?text=${encodeURIComponent(
                `Hi ${client.full_name.split(' ')[0]},\n\nGreat news — you've been approved to join AMSC Performance!\n\nClick the link below to complete your payment and get started:\n${paymentLink}\n\nWelcome to the system.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[140px] bg-green-600 text-white px-4 py-2.5 rounded-lg font-display text-xs font-bold tracking-wider uppercase hover:bg-green-700 transition-colors cursor-pointer text-center"
            >
              Send via WhatsApp
            </a>
            <a
              href={`mailto:${client.email}?subject=${encodeURIComponent('AMSC Performance — You\'re Approved!')}&body=${encodeURIComponent(
                `Hi ${client.full_name.split(' ')[0]},\n\nGreat news — you've been approved to join AMSC Performance!\n\nClick the link below to complete your payment and get started:\n${paymentLink}\n\nOnce you've paid, we'll get you set up on Trainerize and share your first session details.\n\nWelcome to the system.\n\n— AMSC Performance`
              )}`}
              className="flex-1 min-w-[140px] bg-blue-600 text-white px-4 py-2.5 rounded-lg font-display text-xs font-bold tracking-wider uppercase hover:bg-blue-700 transition-colors cursor-pointer text-center"
            >
              Send via Email
            </a>
            <button
              onClick={copyLink}
              className="px-4 py-2.5 bg-surface border border-white/10 text-white rounded-lg font-display text-xs font-bold tracking-wider uppercase hover:border-white/30 transition-colors cursor-pointer"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          {/* Link preview */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={paymentLink}
              readOnly
              className="flex-1 bg-surface border border-white/10 rounded-lg px-3 py-2 text-white/50 font-body text-xs focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      {client.application_status === 'pending_review' && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleAction('approve')}
            disabled={loading}
            className="flex-1 bg-green-600 text-white font-display font-bold text-sm tracking-wider uppercase py-3 rounded-full hover:bg-green-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Approve & Get Payment Link'}
          </button>
          <button
            onClick={() => handleAction('decline')}
            disabled={loading}
            className="px-6 py-3 border border-white/10 text-secondary font-display font-bold text-sm tracking-wider uppercase rounded-full hover:border-red-500/50 hover:text-red-400 transition-all cursor-pointer disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}

      {/* Re-copy link for already approved */}
      {client.application_status === 'approved' && client.payment_status !== 'paid' && !paymentLink && (
        <button
          onClick={() => handleAction('approve')}
          disabled={loading}
          className="w-full bg-surface-light border border-white/10 text-white font-display font-bold text-sm tracking-wider uppercase py-3 rounded-full hover:border-green-500/30 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Get Payment Link Again'}
        </button>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending_review');
  const [activeSection, setActiveSection] = useState('applications');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDate, setUploadDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadAthleteErrors, setUploadAthleteErrors] = useState([]);

  function handleLogin(password) {
    if (!password.trim()) {
      setLoginError('Please enter a password.');
      return;
    }
    setAdminKey(password);
    setAuthenticated(true);
    setLoginError('');
  }

  async function fetchClients() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients?status=${filter}`, {
        headers: { Authorization: `Bearer ${adminKey}` },
      });

      if (res.status === 401) {
        setAuthenticated(false);
        setLoginError('Invalid password. Please try again.');
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setClients(data.clients || []);
      }
    } catch {
      console.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile || !uploadDate) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError('');
    setUploadAthleteErrors([]);

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });

      const res = await fetch('/api/admin/upload-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminKey}`,
        },
        body: JSON.stringify({ file: base64, filename: uploadFile.name, eventDate: uploadDate }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'Upload failed.');
        setUploadAthleteErrors(data.errors || []);
        return;
      }
      setUploadResult(data);
      setUploadFile(null);
      const fileInput = document.getElementById('excel-upload');
      if (fileInput) fileInput.value = '';
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function downloadAccessCodes(results) {
    const csv = [
      'Athlete Name,Access Code,Sport,Acceleration,Max Velocity,Power',
      ...results.map(r =>
        `"${r.athlete_name}",${r.access_code},"${r.sport || ''}","${r.acceleration_category || ''}","${r.max_velocity_category || ''}","${r.power_category || ''}"`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AMSC_access_codes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (authenticated) fetchClients();
  }, [authenticated, filter]);

  if (!authenticated) {
    return <LoginScreen onLogin={handleLogin} error={loginError} />;
  }

  const filterOptions = [
    { value: 'pending_review', label: 'Pending Review', count: null },
    { value: 'approved', label: 'Approved', count: null },
    { value: 'declined', label: 'Declined', count: null },
    { value: 'all', label: 'All', count: null },
  ];

  return (
    <section className="py-8 px-4 sm:px-6 bg-background min-h-screen pt-20">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-black text-2xl tracking-widest">APPLICATIONS</h1>
            <p className="text-secondary font-body text-sm mt-1">Review and manage client applications.</p>
          </div>
          <button
            onClick={fetchClients}
            className="bg-surface-light border border-white/10 text-white px-4 py-2 rounded-lg font-display text-xs font-bold tracking-wider uppercase hover:border-white/20 transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>

        {/* Section tabs */}
          <div className="flex gap-1 mb-8 bg-surface border border-white/5 rounded-full p-1 w-fit">
            <button
              onClick={() => setActiveSection('applications')}
              className={`px-5 py-2 rounded-full text-sm font-display font-semibold tracking-wider transition-all duration-200 ${
                activeSection === 'applications' ? 'bg-accent text-white' : 'text-secondary hover:text-white'
              }`}
            >
              Applications
            </button>
            <button
              onClick={() => setActiveSection('upload')}
              className={`px-5 py-2 rounded-full text-sm font-display font-semibold tracking-wider transition-all duration-200 ${
                activeSection === 'upload' ? 'bg-accent text-white' : 'text-secondary hover:text-white'
              }`}
            >
              Upload Results
            </button>
          </div>

        {activeSection === 'applications' && (
          <div>
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-2 rounded-full font-display text-xs font-bold tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${
                filter === opt.value
                  ? 'bg-accent text-white'
                  : 'bg-surface-light text-secondary border border-white/5 hover:border-white/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Client List */}
        {loading ? (
          <div className="text-center py-12">
            <span className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-secondary font-body text-sm">Loading applications...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12 bg-surface border border-white/5 rounded-xl">
            <p className="text-secondary font-body text-sm">No {filter === 'all' ? '' : filter.replace('_', ' ')} applications found.</p>
          </div>
        ) : (
          clients.map((client) => (
            <ApplicationCard
              key={client.id}
              client={client}
              adminKey={adminKey}
              onUpdate={fetchClients}
            />
          ))
        )}
          </div>
        )}

          {activeSection === 'upload' && (
            <div>
              {/* Template Download */}
              <div className="flex items-center justify-between bg-surface border border-white/5 rounded-lg px-5 py-4 mb-4">
                <div>
                  <p className="font-display font-semibold text-sm tracking-wider text-white">AMSC Combine Data Template</p>
                  <p className="text-secondary font-body text-xs mt-0.5">Fill this in after every session, then upload below.</p>
                </div>
                <a
                  href="/AMSC_Combine_Data_Template.xlsx"
                  download
                  className="flex items-center gap-2 bg-accent text-white font-display font-bold text-xs tracking-wider uppercase px-4 py-2 rounded-full hover:bg-accent-dark transition-all whitespace-nowrap"
                >
                  ↓ Download Template
                </a>
              </div>

              <form onSubmit={handleUpload} className="bg-surface border border-white/5 rounded-lg p-6 mb-6">
                <h2 className="font-display font-bold text-lg tracking-wider mb-6">UPLOAD COMBINE RESULTS</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-display font-semibold tracking-wider text-secondary mb-2">SESSION DATE</label>
                    <input
                      type="date"
                      value={uploadDate}
                      onChange={e => setUploadDate(e.target.value)}
                      required
                      className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-text font-body text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-display font-semibold tracking-wider text-secondary mb-2">EXCEL FILE (.xlsx)</label>
                    <input
                      id="excel-upload"
                      type="file"
                      accept=".xlsx"
                      onChange={e => setUploadFile(e.target.files[0] || null)}
                      required
                      className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-text font-body text-sm focus:outline-none focus:border-accent transition-all file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30"
                    />
                  </div>
                </div>
                {uploadFile && (
                  <p className="text-secondary text-xs font-body mb-4">{uploadFile.name} — {(uploadFile.size / 1024).toFixed(0)} KB</p>
                )}
                <button
                  type="submit"
                  disabled={uploading || !uploadFile || !uploadDate}
                  className="w-full bg-accent text-white py-3 rounded-full font-display font-bold text-sm tracking-wider uppercase hover:bg-accent-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Processing…' : 'Process & Upload'}
                </button>
                {uploading && (
                  <p className="text-secondary text-xs font-body text-center mt-3">
                    Running engine — this may take 10–30 seconds on first run…
                  </p>
                )}
              </form>

              {uploadError && (
                <div className="bg-red-900/20 border border-red-500/20 rounded-lg px-4 py-3 mb-6">
                  <p className="text-red-400 text-sm font-body font-semibold">{uploadError}</p>
                  {uploadAthleteErrors.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {uploadAthleteErrors.map((e, i) => (
                        <li key={i} className="text-red-300 text-xs font-body">
                          <span className="font-semibold">{e.name}:</span> {e.error}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {uploadResult && (
                <div className="bg-surface border border-white/5 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-display font-bold text-lg tracking-wider">
                        {uploadResult.inserted} athlete{uploadResult.inserted !== 1 ? 's' : ''} uploaded
                      </h3>
                      {uploadResult.errors?.length > 0 && (
                        <p className="text-yellow-400 text-xs font-body mt-1">
                          {uploadResult.errors.length} athlete(s) had errors and were skipped
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => downloadAccessCodes(uploadResult.results)}
                      className="bg-accent/10 border border-accent/30 text-accent px-4 py-2 rounded-lg font-display font-bold text-xs tracking-wider uppercase hover:bg-accent hover:text-white transition-all duration-200"
                    >
                      Download Access Codes CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm font-body">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left text-xs font-display tracking-wider text-secondary py-2 pr-4">ATHLETE</th>
                          <th className="text-left text-xs font-display tracking-wider text-secondary py-2 pr-4">ACCESS CODE</th>
                          <th className="text-left text-xs font-display tracking-wider text-secondary py-2 pr-4">ACCEL</th>
                          <th className="text-left text-xs font-display tracking-wider text-secondary py-2 pr-4">MAX V</th>
                          <th className="text-left text-xs font-display tracking-wider text-secondary py-2">POWER</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResult.results.map((r) => (
                          <tr key={r.id} className="border-b border-white/5">
                            <td className="py-2 pr-4 text-text">{r.athlete_name}</td>
                            <td className="py-2 pr-4">
                              <span className="font-mono text-accent text-xs bg-accent/10 px-2 py-1 rounded">{r.access_code}</span>
                            </td>
                            <td className={`py-2 pr-4 text-xs ${r.acceleration_category === 'Advanced' ? 'text-green-400' : r.acceleration_category === 'Competitive' ? 'text-yellow-400' : 'text-red-400'}`}>
                              {r.acceleration_category || '—'}
                            </td>
                            <td className={`py-2 pr-4 text-xs ${r.max_velocity_category === 'Advanced' ? 'text-green-400' : r.max_velocity_category === 'Competitive' ? 'text-yellow-400' : 'text-red-400'}`}>
                              {r.max_velocity_category || '—'}
                            </td>
                            <td className={`py-2 text-xs ${r.power_category === 'Advanced' ? 'text-green-400' : r.power_category === 'Competitive' ? 'text-yellow-400' : 'text-red-400'}`}>
                              {r.power_category || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {uploadResult.warnings?.length > 0 && (
                    <details className="mt-4">
                      <summary className="text-yellow-400/70 text-xs font-body cursor-pointer hover:text-yellow-400">
                        {uploadResult.warnings.length} data warning(s)
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {uploadResult.warnings.map((w, i) => (
                          <li key={i} className="text-yellow-400/60 text-xs font-body">• {w}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
      </div>
    </section>
  );
}
