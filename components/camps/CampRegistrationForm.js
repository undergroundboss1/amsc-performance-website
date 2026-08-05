'use client';

import { useState } from 'react';

/**
 * CampRegistrationForm
 *
 * Single-page registration form (no plan-choice step — camps are a flat fee)
 * that submits in two calls:
 *   1. POST /api/camp/register  -> { registrationId }   (creates a 'pending' row)
 *   2. POST /api/camp/pay       -> { checkoutUrl }        (Paystack, card + M-Pesa)
 * then redirects the browser to Paystack. Slot vs waitlist is decided later,
 * atomically, by the webhook — this form never claims a spot itself.
 *
 * registrationId is kept in state after step 1 succeeds, so if step 2 fails
 * (e.g. the camp filled in the few seconds between form submit and checkout
 * init) the guardian can retry payment without re-entering the whole form —
 * /api/camp/pay accepts the same registrationId again as long as it's still
 * 'pending'.
 *
 * No GSAP / Framer Motion — this page is optimized for a mobile audience
 * arriving from Instagram/WhatsApp links, so only plain CSS transitions.
 */
const inputClass =
  'w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white font-body text-sm ' +
  'placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent ' +
  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const labelClass = 'block font-display text-xs font-semibold tracking-widest uppercase text-white/80 mb-2';

const EMPTY_FORM = {
  athleteName: '',
  athleteDob: '',
  athleteGender: '',
  school: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  emergencyName: '',
  emergencyPhone: '',
  medicalNotes: '',
  consentAgreed: false,
};

export default function CampRegistrationForm({ campSlug, content, priceDisplay }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [emergencySameAsGuardian, setEmergencySameAsGuardian] = useState(false);
  const [errors, setErrors] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | registering | paying
  const [registrationId, setRegistrationId] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Keep emergency contact mirrored live while the toggle is on.
      if (emergencySameAsGuardian && name === 'guardianName') next.emergencyName = value;
      if (emergencySameAsGuardian && name === 'guardianPhone') next.emergencyPhone = value;
      return next;
    });
  }

  function toggleEmergencySame() {
    setEmergencySameAsGuardian((prev) => {
      const next = !prev;
      if (next) {
        setForm((f) => ({ ...f, emergencyName: f.guardianName, emergencyPhone: f.guardianPhone }));
      }
      return next;
    });
  }

  function toggleConsent() {
    setForm((prev) => ({ ...prev, consentAgreed: !prev.consentAgreed }));
  }

  function validateClientSide() {
    const errs = [];
    if (!form.athleteName.trim()) errs.push("Please enter the athlete's full name.");
    if (!form.athleteDob) errs.push("Please enter the athlete's date of birth.");
    if (!form.athleteGender) errs.push("Please select the athlete's gender.");
    if (!form.guardianName.trim()) errs.push("Please enter the parent/guardian's full name.");
    if (!form.guardianPhone.trim()) errs.push('Please enter a parent/guardian phone number.');
    if (!form.guardianEmail.trim()) errs.push('Please enter a parent/guardian email address.');
    if (!form.emergencyName.trim()) errs.push('Please enter an emergency contact name.');
    if (!form.emergencyPhone.trim()) errs.push('Please enter an emergency contact phone number.');
    if (!form.consentAgreed) errs.push('Please confirm you\'ve read and agree to the camp consent terms.');
    return errs;
  }

  async function handleRegisterAndPay() {
    setErrors([]);

    const clientErrs = validateClientSide();
    if (clientErrs.length > 0) {
      setErrors(clientErrs);
      return;
    }

    let idToPay = registrationId;

    // Step 1: create the registration (skip if we already have one from a
    // previous attempt — e.g. retrying after a failed payment step).
    if (!idToPay) {
      setPhase('registering');
      try {
        const res = await fetch('/api/camp/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campSlug, ...form }),
        });
        const data = await res.json();

        if (!res.ok) {
          setErrors(data.errors || [data.error || 'Something went wrong.']);
          setPhase('idle');
          return;
        }

        idToPay = data.registrationId;
        setRegistrationId(idToPay);
      } catch {
        setErrors(['Network error. Please check your connection and try again.']);
        setPhase('idle');
        return;
      }
    }

    // Step 2: initialize payment and redirect to Paystack.
    setPhase('paying');
    try {
      const res = await fetch('/api/camp/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: idToPay }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrors([data.error || 'Payment initialization failed.']);
        setPhase('idle');
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setErrors(['Network error. Please check your connection and try again.']);
      setPhase('idle');
    }
  }

  const submitting = phase !== 'idle';
  const buttonLabel =
    phase === 'registering' ? 'Saving your details…'
    : phase === 'paying' ? 'Redirecting to payment…'
    : registrationId ? `Try Payment Again — ${priceDisplay}`
    : `Register & Pay ${priceDisplay}`;

  return (
    <div className="space-y-6">
      {/* Athlete */}
      <div>
        <h3 className="font-display font-bold text-sm tracking-widest uppercase text-white/60 mb-4">
          Athlete Details
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="athleteName" className={labelClass}>
              Athlete Full Name <span className="text-accent">*</span>
            </label>
            <input
              id="athleteName" name="athleteName" type="text" required
              value={form.athleteName} onChange={handleChange} disabled={submitting}
              placeholder="e.g. Amani Otieno" className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="athleteDob" className={labelClass}>
                Date of Birth <span className="text-accent">*</span>
              </label>
              <input
                id="athleteDob" name="athleteDob" type="date" required
                value={form.athleteDob} onChange={handleChange} disabled={submitting}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="athleteGender" className={labelClass}>
                Gender <span className="text-accent">*</span>
              </label>
              <select
                id="athleteGender" name="athleteGender" required
                value={form.athleteGender} onChange={handleChange} disabled={submitting}
                className={inputClass}
              >
                <option value="" disabled>Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="school" className={labelClass}>School / Academy</label>
            <input
              id="school" name="school" type="text"
              value={form.school} onChange={handleChange} disabled={submitting}
              placeholder="Optional" className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Guardian */}
      <div>
        <h3 className="font-display font-bold text-sm tracking-widest uppercase text-white/60 mb-4">
          Parent / Guardian
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="guardianName" className={labelClass}>
              Full Name <span className="text-accent">*</span>
            </label>
            <input
              id="guardianName" name="guardianName" type="text" required
              value={form.guardianName} onChange={handleChange} disabled={submitting}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="guardianPhone" className={labelClass}>
                Phone Number <span className="text-accent">*</span>
              </label>
              <input
                id="guardianPhone" name="guardianPhone" type="tel" required
                value={form.guardianPhone} onChange={handleChange} disabled={submitting}
                placeholder="+254 712 345 678" className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="guardianEmail" className={labelClass}>
                Email Address <span className="text-accent">*</span>
              </label>
              <input
                id="guardianEmail" name="guardianEmail" type="email" required
                value={form.guardianEmail} onChange={handleChange} disabled={submitting}
                placeholder="you@example.com" className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Emergency contact */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-sm tracking-widest uppercase text-white/60">
            Emergency Contact
          </h3>
          <button
            type="button"
            onClick={toggleEmergencySame}
            disabled={submitting}
            className="flex items-center gap-2 text-xs font-body text-secondary hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                emergencySameAsGuardian ? 'bg-accent border-accent' : 'border-white/30'
              }`}
            >
              {emergencySameAsGuardian && (
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            Same as guardian
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="emergencyName" className={labelClass}>
              Name <span className="text-accent">*</span>
            </label>
            <input
              id="emergencyName" name="emergencyName" type="text" required
              value={form.emergencyName} onChange={handleChange}
              disabled={submitting || emergencySameAsGuardian}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="emergencyPhone" className={labelClass}>
              Phone Number <span className="text-accent">*</span>
            </label>
            <input
              id="emergencyPhone" name="emergencyPhone" type="tel" required
              value={form.emergencyPhone} onChange={handleChange}
              disabled={submitting || emergencySameAsGuardian}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Medical */}
      <div>
        <label htmlFor="medicalNotes" className={labelClass}>
          Medical Conditions / Allergies
        </label>
        <textarea
          id="medicalNotes" name="medicalNotes" rows={3}
          value={form.medicalNotes} onChange={handleChange} disabled={submitting}
          placeholder="Anything we should know to keep the athlete safe? Optional."
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Consent */}
      {content.consent && (
        <div className="bg-surface-light border border-white/5 rounded-lg p-5">
          <h3 className="font-display font-bold text-sm tracking-widest uppercase text-white mb-3">
            {content.consent.title}
          </h3>
          <p className="text-secondary text-sm font-body leading-relaxed mb-4">{content.consent.intro}</p>
          <div className="space-y-4 mb-5">
            {content.consent.sections.map((section) => (
              <div key={section.heading}>
                <h4 className="font-display font-bold text-xs tracking-wider uppercase text-white/70 mb-1.5">
                  {section.heading}
                </h4>
                <p className="text-secondary text-sm font-body leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            role="checkbox"
            aria-checked={form.consentAgreed}
            onClick={toggleConsent}
            disabled={submitting}
            className="w-full text-left flex items-start gap-3 p-4 bg-surface border border-white/10 rounded-lg hover:border-white/20 transition-colors cursor-pointer group disabled:cursor-not-allowed"
          >
            <span
              className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-all ${
                form.consentAgreed ? 'bg-accent border-accent' : 'border-white/30 group-hover:border-white/50'
              }`}
            >
              {form.consentAgreed && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            <p className="text-secondary text-sm font-body leading-relaxed">
              {content.consent.checkboxLabel}
            </p>
          </button>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
          <ul className="space-y-1">
            {errors.map((err) => (
              <li key={err} className="text-red-400 text-sm font-body flex items-start gap-2">
                <span className="mt-0.5">{'⚠'}</span> {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleRegisterAndPay}
        disabled={submitting}
        className="w-full bg-accent text-white font-display font-bold text-sm tracking-wider uppercase px-10 py-4 rounded-full hover:bg-accent-dark transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {submitting && (
          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {buttonLabel}
      </button>
      <p className="text-center text-white/30 text-xs font-body">
        Your payment is processed securely by Paystack. AMSC never stores your card or M-Pesa PIN.
      </p>
    </div>
  );
}
