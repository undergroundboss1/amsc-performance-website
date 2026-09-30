'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { INSTAGRAM_URL } from '../../lib/waitlists';
import s from './waitlist.module.css';

const EMPTY = {
  firstName: '',
  email: '',
  position: '',
  level: '',
  ageBand: '',
  instagram: '',
  earlyAccess: false,
  guardianConsent: false,
  website: '', // honeypot — real people never see or fill this
};

// Client-side checks mirror validateWaitlistSignup (lib/validators.js) so
// most mistakes are caught before a round trip; the server re-checks all.
function validate(values, program) {
  const e = {};
  if (!values.firstName.trim()) e.firstName = 'Enter your first name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) e.email = 'Enter a valid email address.';
  if (!values.position) e.position = 'Pick your position.';
  if (!values.level) e.level = 'Pick your level.';
  const band = program.form.ageBands.find((b) => b.value === values.ageBand);
  if (!band) e.ageBand = 'Pick your age.';
  else if (band.minor && !values.guardianConsent) e.guardianConsent = 'A parent or guardian needs to agree first.';
  if (values.instagram && !/^@?[A-Za-z0-9._]{1,30}$/.test(values.instagram.trim())) {
    e.instagram = 'Letters, numbers, dots and underscores only.';
  }
  return e;
}

function ChipGroup({ name, legend, options, value, onChange, error, grid }) {
  return (
    <fieldset className={s.field} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${name}-err` : undefined}>
      <legend className={s.label} style={{ marginBottom: 8 }}>{legend}</legend>
      <div className={grid ? s.chipsGrid : s.chips}>
        {options.map((o) => (
          <div key={o.value} className={s.chip}>
            <input
              type="radio"
              id={`${name}-${o.value}`}
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className={s.chipInput}
            />
            <label htmlFor={`${name}-${o.value}`} className={s.chipLabel}>{o.label}</label>
          </div>
        ))}
      </div>
      {error && <p id={`${name}-err`} className={s.fieldError}>{error}</p>}
    </fieldset>
  );
}

export default function WaitlistForm({ program }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // { firstName, earlyAccess } once joined

  const mountedAt = useRef(0);
  const attribution = useRef({});
  const confirmHeading = useRef(null);

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
    if (done && confirmHeading.current) {
      confirmHeading.current.focus();
      confirmHeading.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [done]);

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
      setFormError('Check the highlighted fields.');
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
          position: values.position,
          level: values.level,
          ageBand: values.ageBand,
          instagram: values.instagram.trim() || null,
          earlyAccess: values.earlyAccess,
          guardianConsent: isMinor ? values.guardianConsent : false,
          website: values.website,
          elapsedMs: Date.now() - mountedAt.current,
          attribution: attribution.current,
        }),
      });

      if (res.ok) {
        setDone({ firstName: values.firstName.trim(), earlyAccess: values.earlyAccess });
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) setFormError('Too many attempts from this connection. Wait a minute and try again.');
      else if (data.errors?.length) setFormError(data.errors.join(' '));
      else setFormError(data.error || 'Something went wrong. Try again.');
    } catch {
      setFormError('No connection. Check your signal and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const c = program.confirmation;

  if (done) {
    return (
      <div className={s.confirm} role="status">
        <p className={s.eyebrow}>{c.eyebrow}</p>
        <h2 ref={confirmHeading} tabIndex={-1} className={s.headline}>{c.headline}</h2>
        <p className={s.confirmBody}>
          {done.firstName}, {c.body.charAt(0).toLowerCase() + c.body.slice(1)}
        </p>
        {done.earlyAccess && c.earlyAccessNote && <p className={s.confirmNote}>{c.earlyAccessNote}</p>}
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={s.cta}>
          {c.followLabel}
        </a>
      </div>
    );
  }

  if (!program.open) {
    return (
      <div>
        <p className={s.eyebrow}>Waitlist</p>
        <p className={s.lede}>This waitlist is closed. Follow the build on Instagram for what comes next.</p>
      </div>
    );
  }

  const { form, consent } = program;

  return (
    <form className={s.form} onSubmit={handleSubmit} noValidate>
      <div className={s.field}>
        <label htmlFor="wl-first" className={s.label}>First name</label>
        <input
          id="wl-first"
          className={s.input}
          type="text"
          autoComplete="given-name"
          autoCapitalize="words"
          maxLength={60}
          value={values.firstName}
          onChange={(e) => set('firstName', e.target.value)}
          aria-invalid={errors.firstName ? 'true' : undefined}
          aria-describedby={errors.firstName ? 'wl-first-err' : undefined}
        />
        {errors.firstName && <p id="wl-first-err" className={s.fieldError}>{errors.firstName}</p>}
      </div>

      <div className={s.field}>
        <label htmlFor="wl-email" className={s.label}>Email</label>
        <input
          id="wl-email"
          className={s.input}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={254}
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          aria-invalid={errors.email ? 'true' : undefined}
          aria-describedby={errors.email ? 'wl-email-err' : undefined}
        />
        {errors.email && <p id="wl-email-err" className={s.fieldError}>{errors.email}</p>}
      </div>

      <ChipGroup
        name="position"
        legend="Position"
        options={form.positions}
        value={values.position}
        onChange={(v) => set('position', v)}
        error={errors.position}
        grid
      />

      <ChipGroup
        name="level"
        legend="Level"
        options={form.levels}
        value={values.level}
        onChange={(v) => set('level', v)}
        error={errors.level}
      />

      <ChipGroup
        name="ageBand"
        legend="Age"
        options={form.ageBands}
        value={values.ageBand}
        onChange={(v) => set('ageBand', v)}
        error={errors.ageBand}
      />

      {isMinor && (
        <div className={`${s.field} ${s.guardian}`}>
          <label className={s.check}>
            <input
              type="checkbox"
              className={s.checkBox}
              checked={values.guardianConsent}
              onChange={(e) => set('guardianConsent', e.target.checked)}
              aria-invalid={errors.guardianConsent ? 'true' : undefined}
            />
            <span>{consent.guardianText}</span>
          </label>
          {errors.guardianConsent && <p className={s.fieldError}>{errors.guardianConsent}</p>}
        </div>
      )}

      {form.askInstagram && (
        <div className={s.field}>
          <label htmlFor="wl-ig" className={s.label}>
            Instagram <span className={s.optional}>· Optional</span>
          </label>
          <input
            id="wl-ig"
            className={s.input}
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={31}
            placeholder="@yourhandle"
            value={values.instagram}
            onChange={(e) => set('instagram', e.target.value)}
            aria-invalid={errors.instagram ? 'true' : undefined}
            aria-describedby={errors.instagram ? 'wl-ig-err' : undefined}
          />
          {errors.instagram && <p id="wl-ig-err" className={s.fieldError}>{errors.instagram}</p>}
        </div>
      )}

      {form.askEarlyAccess && (
        <label className={s.check}>
          <input
            type="checkbox"
            className={s.checkBox}
            checked={values.earlyAccess}
            onChange={(e) => set('earlyAccess', e.target.checked)}
          />
          <span>{form.earlyAccessLabel}</span>
        </label>
      )}

      <div className={s.honeypot} aria-hidden="true">
        <label htmlFor="wl-website">Leave this empty</label>
        <input
          id="wl-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => set('website', e.target.value)}
        />
      </div>

      {formError && <p className={s.formError} role="alert">{formError}</p>}

      <button type="submit" className={s.cta} disabled={submitting}>
        {submitting ? 'Joining…' : program.cta}
      </button>

      <p className={s.consent}>
        {consent.text} <Link href="/privacy">Privacy policy</Link>.
      </p>
    </form>
  );
}
