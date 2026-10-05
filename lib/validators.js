import { normalizeWhatsapp } from './waitlist-phone';

/**
 * Input validation and sanitization utilities.
 * Used by API routes to validate client-submitted data before storing.
 *
 * SECURITY: All user input MUST pass through these validators
 * before being written to the database.
 */

/**
 * Sanitize a string — trim whitespace, remove HTML tags.
 */
export function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/<[^>]*>/g, '');
}

/**
 * Validate email format.
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // RFC 5322 simplified — good enough for real-world use
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim()) && email.length <= 254;
}

/**
 * Validate phone number — allows international formats.
 * Accepts: +254712345678, 0712345678, +1-555-123-4567
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-().]/g, '');
  const re = /^\+?[0-9]{7,15}$/;
  return re.test(cleaned);
}

/**
 * Validate a full name — at least 2 characters, no numbers.
 */
export function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100 && !/[0-9]/.test(trimmed);
}

/**
 * Validate the registration form data.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateRegistration(data) {
  const errors = [];

  if (!isValidName(data.fullName)) {
    errors.push('Please enter a valid full name (at least 2 characters, no numbers).');
  }
  if (!isValidEmail(data.email)) {
    errors.push('Please enter a valid email address.');
  }
  if (!isValidPhone(data.phone)) {
    errors.push('Please enter a valid phone number.');
  }
  if (!data.planId || typeof data.planId !== 'string') {
    errors.push('Please select a training plan.');
  }

  const dobError = validateDateOfBirth(data.dateOfBirth);
  if (dobError) {
    errors.push(dobError);
  }

  // Required application fields
  if (!data.sport || typeof data.sport !== 'string' || data.sport.trim().length < 2) {
    errors.push('Please enter your sport or discipline.');
  }
  if (!data.goals || typeof data.goals !== 'string' || data.goals.trim().length < 5) {
    errors.push('Please tell us about your training goals.');
  }
  if (!data.availability || typeof data.availability !== 'string' || data.availability.trim().length < 3) {
    errors.push('Please enter your training availability.');
  }

  // Length limits
  if (data.sport && data.sport.length > 100) {
    errors.push('Sport/discipline must be under 100 characters.');
  }
  if (data.goals && data.goals.length > 500) {
    errors.push('Training goals must be under 500 characters.');
  }
  if (data.availability && data.availability.length > 300) {
    errors.push('Availability details must be under 300 characters.');
  }
  if (data.healthInfo && data.healthInfo.length > 500) {
    errors.push('Health information must be under 500 characters.');
  }
  if (data.experience && data.experience.length > 500) {
    errors.push('Training experience must be under 500 characters.');
  }
  if (data.referralSource && data.referralSource.length > 200) {
    errors.push('Referral source must be under 200 characters.');
  }

  return { valid: errors.length === 0, errors };
}

// Camp age eligibility is lenient by this many years on each side of the
// published range — see validateCampRegistration.
const AGE_TOLERANCE_YEARS = 1;

/**
 * Age in whole years as of a reference date (not today) — camp eligibility
 * is judged against the camp's start date, not the day someone registers.
 *
 * Exported so the admin portal derives a client's age with the same month/day
 * handling used here, rather than a second copy that rounds differently.
 */
export function calculateAgeAsOf(dob, referenceDate) {
  let age = referenceDate.getFullYear() - dob.getFullYear();
  const monthDiff = referenceDate.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// Outer bounds for a training client's age. Wide on purpose — AMSC trains
// school-age athletes through to adults, so these exist to catch a mistyped
// year (1092, or this year instead of their birth year), not to turn anyone
// away. Camp eligibility is a separate, much narrower check.
export const MIN_CLIENT_AGE = 5;
export const MAX_CLIENT_AGE = 100;

/**
 * Validate a date of birth from the application form.
 *
 * Shared by the browser and the API so both reject exactly the same input —
 * otherwise the form lets something through that the server then refuses with
 * a different message, or worse, the reverse.
 *
 * @param {string} value - ISO date string (YYYY-MM-DD) from a date input
 * @returns {string|null} an error message, or null when valid
 */
export function validateDateOfBirth(value) {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return 'Please enter your date of birth.';
  }

  const dob = new Date(value);
  if (isNaN(dob.getTime())) {
    return 'Please enter a valid date of birth.';
  }

  const today = new Date();
  if (dob > today) {
    return 'Date of birth cannot be in the future.';
  }

  const age = calculateAgeAsOf(dob, today);
  if (age < MIN_CLIENT_AGE) {
    return `Applicants must be at least ${MIN_CLIENT_AGE} years old.`;
  }
  if (age > MAX_CLIENT_AGE) {
    return 'Please check the date of birth entered.';
  }

  return null;
}

/**
 * Validate a camp registration form submission.
 *
 * @param {object} data - raw form data (see field list below)
 * @param {object} camp - the camp record being registered for; must include
 *   age_min, age_max, starts_on (ISO date string or Date) so eligibility is
 *   judged against THIS camp, not a hardcoded age band — keeps this reusable
 *   for future camps with different age ranges.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCampRegistration(data, camp) {
  const errors = [];

  // ── Athlete ──────────────────────────────────────────────────────────────
  if (!isValidName(data.athleteName)) {
    errors.push("Please enter the athlete's full name (at least 2 characters, no numbers).");
  }

  const dob = data.athleteDob ? new Date(data.athleteDob) : null;
  const earliestSaneDob = new Date('1990-01-01');
  if (!dob || isNaN(dob.getTime()) || dob < earliestSaneDob || dob > new Date()) {
    errors.push("Please enter a valid date of birth.");
  } else if (camp?.starts_on) {
    const campStart = new Date(camp.starts_on);
    const age = calculateAgeAsOf(dob, campStart);
    const ageMin = camp.age_min ?? 0;
    const ageMax = camp.age_max ?? 999;
    // Accept a 1-year buffer on each side of the published range (e.g. a
    // mature 12-year-old or a just-turned-19 athlete) without publicising
    // it — the error still cites the advertised band, not the padded one.
    if (age < ageMin - AGE_TOLERANCE_YEARS || age > ageMax + AGE_TOLERANCE_YEARS) {
      errors.push(`This camp is for athletes aged ${ageMin}–${ageMax} as of the camp start date. This athlete would be ${age}.`);
    }
  }

  if (data.athleteGender !== 'male' && data.athleteGender !== 'female') {
    errors.push('Please select the athlete\'s gender.');
  }

  if (data.school && data.school.length > 150) {
    errors.push('School / academy name must be under 150 characters.');
  }

  // ── Parent / guardian ────────────────────────────────────────────────────
  if (!isValidName(data.guardianName)) {
    errors.push("Please enter the parent/guardian's full name (at least 2 characters, no numbers).");
  }
  if (!isValidPhone(data.guardianPhone)) {
    errors.push("Please enter a valid parent/guardian phone number.");
  }
  if (!isValidEmail(data.guardianEmail)) {
    errors.push("Please enter a valid parent/guardian email address.");
  }

  // ── Emergency contact ────────────────────────────────────────────────────
  if (!isValidName(data.emergencyName)) {
    errors.push('Please enter an emergency contact name (at least 2 characters, no numbers).');
  }
  if (!isValidPhone(data.emergencyPhone)) {
    errors.push('Please enter a valid emergency contact phone number.');
  }

  // ── Medical ──────────────────────────────────────────────────────────────
  if (data.medicalNotes && data.medicalNotes.length > 500) {
    errors.push('Medical conditions / allergies must be under 500 characters.');
  }

  // ── Consent — one blanket agreement, checked server-side, not just in the UI ─
  if (data.consentAgreed !== true) {
    errors.push('Please confirm you\'ve read and agree to the camp consent terms.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a waitlist signup against its program's option lists.
 *
 * @param {object} data - raw form data
 * @param {object} program - entry from lib/waitlists.js; options are checked
 *   against THIS program's lists so a future program (e.g. Off Court, with
 *   different positions) reuses this validator unchanged.
 * @returns {{ valid: boolean, errors: string[], isMinor: boolean }}
 */
export function validateWaitlistSignup(data, program) {
  const errors = [];
  const { positions, levels, ageBands, askInstagram } = program.form;

  const firstName = typeof data.firstName === 'string' ? data.firstName.trim() : '';
  if (firstName.length < 1 || firstName.length > 60 || /[0-9<>]/.test(firstName)) {
    errors.push('Enter your first name.');
  }
  if (!isValidEmail(data.email)) {
    errors.push('Enter a valid email address.');
  }
  if (!positions.some((o) => o.value === data.position)) {
    errors.push('Pick your position.');
  }
  if (!levels.some((o) => o.value === data.level)) {
    errors.push('Pick your level.');
  }

  const band = ageBands.find((o) => o.value === data.ageBand);
  if (!band) {
    errors.push('Pick your age.');
  } else if (band.minor && data.guardianConsent !== true) {
    errors.push('Under 18: a parent or guardian needs to agree before you join.');
  }

  if (program.form.askWhatsapp && !normalizeWhatsapp(data.whatsapp, program.form.whatsappDefaultCountryCode)) {
    errors.push('Enter a valid WhatsApp number.');
  }

  // Marketing consent is the basis for every email we send this person, so
  // it must be an explicit tick — checked here, not just in the UI.
  if (data.marketingConsent !== true) {
    errors.push('Tick the box to agree to receive emails. The waitlist is an email list.');
  }

  if (askInstagram && data.instagram) {
    if (typeof data.instagram !== 'string' || !/^@?[A-Za-z0-9._]{1,30}$/.test(data.instagram.trim())) {
      errors.push('Instagram handle can only use letters, numbers, dots and underscores.');
    }
  }

  return { valid: errors.length === 0, errors, isMinor: !!band?.minor };
}
