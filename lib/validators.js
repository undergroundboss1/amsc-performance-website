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
 */
function calculateAgeAsOf(dob, referenceDate) {
  let age = referenceDate.getFullYear() - dob.getFullYear();
  const monthDiff = referenceDate.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < dob.getDate())) {
    age--;
  }
  return age;
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
