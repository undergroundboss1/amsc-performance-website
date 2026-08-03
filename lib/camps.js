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

    // Consent copy — final, confirmed wording. One blanket checkbox covering
    // participation/risk/medical, AMSC Combine testing + AMSC Metrics
    // recording, and photo/video use in marketing. `version` snapshots into
    // camp.registrations.consent_text_version at submission time — bump this
    // string whenever the wording changes so past registrations keep their
    // original agreed-to text distinguishable from later ones.
    consent: {
      version: 'v1',
      title: 'Camp Consent & Agreement',
      intro:
        "A quick note before you register: this camp involves physical activity, performance " +
        "testing, and content we're proud to share — so we want you to know exactly what that " +
        "means for your child before you sign up.",
      sections: [
        {
          heading: 'Participation',
          body:
            'The Next Level Camp runs Aug 19–21, 2026, and includes basketball training, physical ' +
            'conditioning, athletic testing, and a Day 2 activity at Ngong Hills. As with any sport ' +
            "or physical activity, there's a normal risk of injury — please let us know about any " +
            'medical conditions, allergies, or physical limitations we should be aware of so we can ' +
            "keep your child safe. If a medical situation comes up and we can't reach you right away, " +
            "we'll get your child appropriate care immediately.",
        },
        {
          heading: 'Performance Testing',
          body:
            'Every athlete goes through the AMSC Combine — our performance testing system that ' +
            "measures things like speed, jump height, and agility. Your child's results are recorded " +
            "in AMSC Metrics so we can coach them well and show you real progress. We'd also love to " +
            'feature standout results and improvement stories — with names, scores, or footage — in ' +
            'our coaching materials and on our social channels, as part of how we show what this camp ' +
            'achieves.',
        },
        {
          heading: 'Photos & Videos',
          body:
            "We'll be capturing photos and video throughout the camp, and may use these in our " +
            'marketing, social media, and future camp materials.',
        },
      ],
      checkboxLabel:
        "I'm my child's parent or guardian, I've read the above, and I'm happy to register them on this basis.",
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
