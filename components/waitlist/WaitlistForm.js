'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { business } from '../../lib/business';
import { normalizeWhatsapp } from '../../lib/waitlist-phone';

/**
 * WaitlistForm — join form + confirmation state for a program waitlist.
 *
 * Visual language matches the site's other forms: inputs from
 * CampRegistrationForm / join, pill selectors like the join page's plan
 * selection, the camp consent checkbox, and the accent submit button with
 * spinner. Framer Motion adds tap/hover feedback, an error shake and the
 * animated confirmation.
 */

const EASE = [0.16, 1, 0.3, 1];

const inputClass =
  'w-full bg-background border rounded-lg px-4 py-3.5 text-white font-body text-base ' +
  'placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent ' +
  'transition-colors disabled:opacity-50';
const labelClass = 'block font-display text-xs font-semibold tracking-widest uppercase text-white/80 mb-2';

const EMPTY = {
  firstName: '',
  email: '',
  whatsapp: '',
  position: '',
  level: '',
  ageBand: '',
  instagram: '',
  earlyAccess: false,
  marketingConsent: false,
  otherMarketing: false,
  guardianConsent: false,
  website: '', // honeypot — real people never see or fill this
};

// Client-side checks mirror validateWaitlistSignup (lib/validators.js) so
// most mistakes are caught before a round trip; the server re-checks all.
function validate(values, program) {
  const e = {};
  if (!values.firstName.trim()) e.firstName = 'Enter your first name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) e.email = 'Enter a valid email address.';
  if (program.form.askWhatsapp && !normalizeWhatsapp(values.whatsapp, program.form.whatsappDefaultCountryCode)) {
    e.whatsapp = values.whatsapp.trim() ? 'Check your WhatsApp number.' : 'Enter your WhatsApp number.';
  }
  if (!values.position) e.position = 'Pick your position.';
  if (!values.level) e.level = 'Pick your level.';
  const band = program.form.ageBands.find((b) => b.value === values.ageBand);
  if (!band) e.ageBand = 'Pick your age.';
  else if (band.minor && !values.guardianConsent) e.guardianConsent = 'A parent or guardian needs to agree before you join.';
  if (values.instagram && !/^@?[A-Za-z0-9._]{1,30}$/.test(values.instagram.trim())) {
    e.instagram = 'Letters, numbers, dots and underscores only.';
  }
  if (!values.marketingConsent) e.marketingConsent = 'Tick this box to join. The waitlist is an email list.';
  return e;
}

function FieldError({ id, children }) {
  return (
    <AnimatePresence>
      {children && (
        <motion.p
          id={id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="text-red-400 text-xs font-body mt-2 overflow-hidden"
        >
          {children}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function PillGroup({ name, legend, options, value, onChange, error }) {
  return (
    <fieldset aria-describedby={error ? `${name}-err` : undefined}>
      <legend className={labelClass}>
        {legend} <span className="text-accent">*</span>
      </legend>
      <div role="radiogroup" aria-label={legend} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <motion.button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(o.value)}
              whileTap={{ scale: 0.94 }}
              animate={{ scale: selected ? 1.04 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className={`min-h-[44px] px-5 py-2.5 rounded-full border font-display text-xs font-bold tracking-wider uppercase cursor-pointer transition-colors duration-200 ${
                selected
                  ? 'bg-accent border-accent text-white shadow-lg shadow-red-900/30'
                  : `bg-background text-secondary hover:border-white/30 hover:text-white ${error ? 'border-red-500/50' : 'border-white/10'}`
              }`}
            >
              {o.label}
            </motion.button>
          );
        })}
      </div>
      <FieldError id={`${name}-err`}>{error}</FieldError>
    </fieldset>
  );
}

function Checkbox({ checked, onChange, children, error, required }) {
  return (
    <div>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-required={required || undefined}
        onClick={() => onChange(!checked)}
        className={`w-full text-left flex items-start gap-3 p-4 bg-background border rounded-lg hover:border-white/20 transition-colors cursor-pointer group ${
          error ? 'border-red-500/50' : checked ? 'border-accent/40' : 'border-white/10'
        }`}
      >
        <motion.span
          animate={{ scale: checked ? [1, 1.2, 1] : 1 }}
          transition={{ duration: 0.25 }}
          className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors ${
            checked ? 'bg-accent border-accent' : 'border-white/30 group-hover:border-white/50'
          }`}
        >
          <AnimatePresence>
            {checked && (
              <motion.svg
                key="tick"
                className="w-3 h-3 text-white"
                viewBox="0 0 20 20"
                fill="currentColor"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.span>
        <span className="text-secondary text-sm font-body leading-relaxed">
          {children}
          {required && <span className="text-accent"> *</span>}
        </span>
      </button>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function Confirmation({ program, done }) {
  const reduce = useReducedMotion();
  const steps = [
    { title: 'Check your inbox', body: `We've sent a confirmation to ${done.email}. If it isn't there in a few minutes, check your spam or promotions folder.` },
    { title: 'Follow the journey', body: `${program.name} is being built in public. The methodology, the sessions and the build all go up on Instagram first.` },
    { title: 'Be first in', body: program.form.askWhatsapp
      ? `Early access community invites and launch news come to your WhatsApp and inbox before anyone else hears.`
      : `When ${program.name} opens, the waitlist hears first.` },
  ];

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="text-center"
      role="status"
    >
      <motion.span
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
        className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-600/20 border-2 border-green-500/40 mb-8"
      >
        <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <motion.path
            strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
          />
        </svg>
      </motion.span>

      <h3 className="font-display font-black text-3xl md:text-4xl tracking-widest mb-4">{program.confirmation.title}</h3>
      <p className="text-secondary font-body text-base max-w-md mx-auto mb-10">
        Thanks, {done.firstName}. You&apos;re on the {program.name} waitlist.
      </p>

      {done.earlyAccess && program.confirmation.earlyAccessNote && (
        <p className="bg-accent/10 border border-accent/30 rounded-lg p-4 text-sm text-white/80 font-body mb-8 text-left">
          {program.confirmation.earlyAccessNote}
        </p>
      )}

      <div className="bg-background border border-white/5 rounded-xl p-6 md:p-8 text-left mb-8">
        <h4 className="font-display font-bold text-sm tracking-widest uppercase text-white/60 mb-6">What Happens Next</h4>
        <div className="space-y-5">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              className="flex gap-4"
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.12, ease: EASE }}
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-display font-bold text-sm">
                {i + 1}
              </span>
              <div>
                <h5 className="font-display font-bold text-white tracking-wide text-sm">{s.title}</h5>
                <p className="text-secondary text-sm font-body mt-1">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.a
        href={business.instagram}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        className="inline-block bg-accent text-white px-10 py-4 rounded-full font-display text-sm font-bold tracking-wider uppercase hover:bg-accent-dark transition-colors duration-200 hover:shadow-lg hover:shadow-red-900/30"
      >
        Follow @amscperformance
      </motion.a>
    </motion.div>
  );
}

export default function WaitlistForm({ program }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [shake, setShake] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // { firstName, email, earlyAccess } once joined

  const mountedAt = useRef(0);
  const attribution = useRef({});
  const topRef = useRef(null);

  // Capture where this visit came from on landing — UTM / ?src= params and
  // the referrer — so attribution survives even if the URL changes later.
  useEffect(() => {
    mountedAt.current = Date.now();
    try {
      const q = new URLSearchParams(window.location.search);
      attribution.current = {
        utmSource: q.get('utm_source'),
        utmMedium: q.get('utm_medium'),
        utmCampaign: q.get('utm_campaign'),
        utmContent: q.get('utm_content'),
        src: q.get('src') || q.get('ref'),
        referrer: document.referrer || null,
      };
    } catch {
      attribution.current = {};
    }
  }, []);

  useEffect(() => {
    if (done && topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [done]);

  const waPreview = program.form.askWhatsapp
    ? normalizeWhatsapp(values.whatsapp, program.form.whatsappDefaultCountryCode)
    : null;
  const selectedBand = program.form.ageBands.find((b) => b.value === values.ageBand);
  const isMinor = !!selectedBand?.minor;

  function set(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
    if (formError) setFormError('');
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (submitting) return;
    setFormError('');

    const found = validate(values, program);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError(`Fix ${Object.keys(found).length === 1 ? 'the highlighted field' : 'the highlighted fields'} to join.`);
      setShake((n) => n + 1);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program: program.slug,
          firstName: values.firstName.trim(),
          email: values.email.trim(),
          whatsapp: values.whatsapp.trim(),
          position: values.position,
          level: values.level,
          ageBand: values.ageBand,
          instagram: values.instagram.trim() || null,
          earlyAccess: values.earlyAccess,
          marketingConsent: values.marketingConsent,
          otherMarketing: values.otherMarketing,
          guardianConsent: isMinor ? values.guardianConsent : false,
          website: values.website,
          elapsedMs: Date.now() - mountedAt.current,
          attribution: attribution.current,
        }),
      });

      if (res.ok) {
        setDone({ firstName: values.firstName.trim(), email: values.email.trim(), earlyAccess: values.earlyAccess });
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) setFormError('Too many attempts from this connection. Wait a minute and try again.');
      else if (data.errors?.length) setFormError(data.errors.join(' '));
      else setFormError(data.error || 'Something went wrong. Please try again.');
      setShake((n) => n + 1);
    } catch {
      setFormError('No connection. Check your signal and try again.');
      setShake((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  }

  const { form, consent } = program;

  return (
    <div ref={topRef} className="scroll-mt-24">
      <AnimatePresence mode="wait">
        {done ? (
          <Confirmation key="done" program={program} done={done} />
        ) : !program.open ? (
          <motion.p key="closed" className="text-center text-secondary font-body">
            This waitlist is closed. Follow the journey on Instagram for what comes next.
          </motion.p>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            noValidate
            exit={{ opacity: 0, y: -16, transition: { duration: 0.3 } }}
            className="bg-background/60 border border-white/5 rounded-xl p-6 md:p-8 space-y-7"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="wl-first" className={labelClass}>
                  First Name <span className="text-accent">*</span>
                </label>
                <input
                  id="wl-first"
                  type="text"
                  autoComplete="given-name"
                  autoCapitalize="words"
                  maxLength={60}
                  value={values.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  disabled={submitting}
                  aria-invalid={errors.firstName ? 'true' : undefined}
                  aria-describedby={errors.firstName ? 'wl-first-err' : undefined}
                  className={`${inputClass} ${errors.firstName ? 'border-red-500/50' : 'border-white/10'}`}
                />
                <FieldError id="wl-first-err">{errors.firstName}</FieldError>
              </div>
              <div>
                <label htmlFor="wl-email" className={labelClass}>
                  Email <span className="text-accent">*</span>
                </label>
                <input
                  id="wl-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="off"
                  spellCheck={false}
                  maxLength={254}
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={(e) => set('email', e.target.value)}
                  disabled={submitting}
                  aria-invalid={errors.email ? 'true' : undefined}
                  aria-describedby={errors.email ? 'wl-email-err' : undefined}
                  className={`${inputClass} ${errors.email ? 'border-red-500/50' : 'border-white/10'}`}
                />
                <FieldError id="wl-email-err">{errors.email}</FieldError>
              </div>
            </div>

            {form.askWhatsapp && (
              <div>
                <label htmlFor="wl-wa" className={labelClass}>
                  WhatsApp Number <span className="text-accent">*</span>
                </label>
                <input
                  id="wl-wa"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={20}
                  placeholder="0712 345 678"
                  value={values.whatsapp}
                  onChange={(e) => set('whatsapp', e.target.value)}
                  disabled={submitting}
                  aria-invalid={errors.whatsapp ? 'true' : undefined}
                  aria-describedby={errors.whatsapp ? 'wl-wa-err' : 'wl-wa-hint'}
                  className={`${inputClass} ${errors.whatsapp ? 'border-red-500/50' : 'border-white/10'}`}
                />
                {!errors.whatsapp && (
                  <p id="wl-wa-hint" className="text-white/40 text-xs font-body mt-2">
                    {waPreview
                      ? <>We&apos;ll message <span className="text-white/70">{waPreview}</span> on WhatsApp.</>
                      : 'Outside Kenya? Start with + and your country code.'}
                  </p>
                )}
                <FieldError id="wl-wa-err">{errors.whatsapp}</FieldError>
              </div>
            )}

            <PillGroup name="position" legend="Position" options={form.positions} value={values.position} onChange={(v) => set('position', v)} error={errors.position} />
            <PillGroup name="level" legend="Level" options={form.levels} value={values.level} onChange={(v) => set('level', v)} error={errors.level} />
            <PillGroup name="ageBand" legend="Age" options={form.ageBands} value={values.ageBand} onChange={(v) => set('ageBand', v)} error={errors.ageBand} />

            <AnimatePresence initial={false}>
              {isMinor && (
                <motion.div
                  key="guardian"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="overflow-hidden"
                >
                  <Checkbox checked={values.guardianConsent} onChange={(v) => set('guardianConsent', v)} error={errors.guardianConsent} required>
                    {consent.guardian}
                  </Checkbox>
                </motion.div>
              )}
            </AnimatePresence>

            {form.askInstagram && (
              <div>
                <label htmlFor="wl-ig" className={labelClass}>
                  Instagram <span className="text-white/30 normal-case tracking-normal font-body font-normal">(optional)</span>
                </label>
                <input
                  id="wl-ig"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  maxLength={31}
                  placeholder="@yourhandle"
                  value={values.instagram}
                  onChange={(e) => set('instagram', e.target.value)}
                  disabled={submitting}
                  aria-invalid={errors.instagram ? 'true' : undefined}
                  aria-describedby={errors.instagram ? 'wl-ig-err' : undefined}
                  className={`${inputClass} ${errors.instagram ? 'border-red-500/50' : 'border-white/10'}`}
                />
                <FieldError id="wl-ig-err">{errors.instagram}</FieldError>
              </div>
            )}

            <div className="space-y-3">
              {form.askEarlyAccess && (
                <Checkbox checked={values.earlyAccess} onChange={(v) => set('earlyAccess', v)}>
                  {form.earlyAccessLabel}
                </Checkbox>
              )}
              <Checkbox checked={values.marketingConsent} onChange={(v) => set('marketingConsent', v)} error={errors.marketingConsent} required>
                {consent.marketing}
              </Checkbox>
              <Checkbox checked={values.otherMarketing} onChange={(v) => set('otherMarketing', v)}>
                {consent.otherMarketing}
              </Checkbox>
            </div>

            <div className="absolute -left-[10000px] w-px h-px overflow-hidden" aria-hidden="true">
              <label htmlFor="wl-website">Leave this empty</label>
              <input id="wl-website" type="text" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set('website', e.target.value)} />
            </div>

            <AnimatePresence>
              {formError && (
                <motion.div
                  key={shake}
                  initial={{ opacity: 0, x: 0 }}
                  animate={{ opacity: 1, x: [0, -10, 10, -6, 6, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm font-body flex items-start gap-2"
                  role="alert"
                >
                  <span className="mt-0.5">{'⚠'}</span> {formError}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={submitting ? undefined : { y: -2 }}
              whileTap={submitting ? undefined : { scale: 0.97 }}
              className="w-full bg-accent text-white font-display font-bold text-sm tracking-wider uppercase px-10 py-4 rounded-full hover:bg-accent-dark transition-colors duration-200 cursor-pointer hover:shadow-lg hover:shadow-red-900/30 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-3"
            >
              {submitting && (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {submitting ? 'Joining…' : program.join.cta}
            </motion.button>

            <p className="text-center text-white/30 text-xs font-body">
              See our{' '}
              <Link href="/privacy" className="text-white/50 underline hover:text-white transition-colors">
                Privacy Policy
              </Link>{' '}
              for how we use your details.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
