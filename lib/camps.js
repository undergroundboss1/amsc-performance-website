/**
 * Camp content — marketing copy and display data, keyed by slug.
 *
 * This mirrors lib/programs.js: content lives here as plain data, while
 * operational truth (capacity, price, registration_open, spots remaining)
 * lives in camp.camps / camp.registrations (scripts/supabase-camp-schema-v1.sql),
 * fetched at request time via getCampSupabase(). Adding a future camp is a
 * new entry here + a new row in camp.camps — not a new page template.
 *
 * PLACEHOLDER CONTENT — see plan section "Needed from Arnold before Phase 1
 * finishes". Items marked TODO must be replaced with real assets/wording
 * before this camp's page goes live. Consent text specifically is stored
 * per-registration (consent_text_version) — bump the version string here
 * whenever the wording changes so old registrations keep their original
 * agreed-to text on record.
 */
export const campsData = {
  'next-level-camp': {
    slug: 'next-level-camp',
    name: 'The Next Level Camp',
    tagline: 'Stop Working Out, Start Leveling Up.',
    datesDisplay: 'August 19–21, 2026',
    venue: 'Parklands Sports Club, Nairobi (+ Ngong Hills, Day 2)',
    ageRangeDisplay: 'Ages 13–18 · Boys & Girls',
    priceDisplay: 'KES 15,000',

    // TODO(Arnold): replace with the real camp hero image once supplied.
    heroImage: '/images/camps/next-level-camp-hero.jpg',

    overview:
      'The Next Level Camp brings PBA Kenya and AMSC Performance together for three days of ' +
      'basketball-specific training, athletic development, and testing — for a selective group ' +
      'of 20 athletes aged 13–18.',

    // Co-branding: when present, camp pages render both brands at equal visual
    // weight (logos + accent colours) instead of AMSC-only styling with a
    // partner logo added on top. See amsc-brand-design skill, Section 5,
    // for the exception this camp's page is deliberately making.
    coHost: {
      name: 'PBA Kenya',
      // TODO(Arnold): logo files (light + dark, SVG or transparent PNG).
      logoLight: '/images/camps/pba-kenya-logo-light.png',
      logoDark: '/images/camps/pba-kenya-logo-dark.png',
      // TODO(Arnold): PBA Kenya's brand accent hex, for balanced dual-brand
      // presence on this page only (see Section 5 of the brand brief).
      accent: '#000000',
    },

    // Consent copy — stored verbatim into camp.registrations.consent_text_version
    // at submission time, per checkbox. TODO(Arnold): final wording; bump
    // `version` to 'v1' (from 'v1-draft') once confirmed so the distinction
    // between draft-era and final-era registrations stays visible in the data.
    consent: {
      version: 'v1-draft',
      participation:
        'I give permission for my child to participate in The Next Level Camp, including all ' +
        'scheduled activities at Parklands Sports Club and the Ngong Hills activity on Day 2.',
      media:
        'I give permission for photo and video of my child to be used by AMSC Performance and ' +
        'PBA Kenya in marketing and social media content related to this camp.',
    },

    // Takeaway materials — shown on the post-registration /materials page.
    // `availability: 'immediate'` items ship in the confirmation email and are
    // always downloadable. `availability: 'post-camp'` items (report cards)
    // only unlock once admin attaches athlete_result_id to the registration —
    // shown as "Available after Day 1 testing" until then, not hidden.
    materials: [
      { key: 'strength-routine', label: 'Strength Routine', availability: 'immediate', file: '/camps/next-level-camp/strength-routine.pdf' },
      { key: 'recovery-guide', label: 'Recovery Guide', availability: 'immediate', file: '/camps/next-level-camp/recovery-guide.pdf' },
      { key: 'nutrition-cheat-sheet', label: 'Nutrition Cheat Sheet', availability: 'immediate', file: '/camps/next-level-camp/nutrition-cheat-sheet.pdf' },
      { key: 'shopping-list', label: 'Shopping List', availability: 'immediate', file: '/camps/next-level-camp/shopping-list.pdf' },
      { key: 'recipes', label: 'Simple Recipes', availability: 'immediate', file: '/camps/next-level-camp/recipes.pdf' },
      { key: 'combine-report', label: 'Combine Report Card', availability: 'post-camp' },
    ],
  },
};

/**
 * Get camp content by slug.
 * @param {string} slug
 * @returns {object|undefined}
 */
export function getCampContentBySlug(slug) {
  return campsData[slug];
}
