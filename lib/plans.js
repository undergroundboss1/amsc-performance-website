/**
 * Format a KES amount for display, e.g. 50000 → "KES 50,000".
 * @param {number} amount
 * @returns {string}
 */
export function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString('en-KE')}`;
}

/**
 * Training subscription plans available for signup.
 * These map to the actual Paystack subscription plans.
 *
 * This is the single source of truth for programme prices — the programmes
 * pages, page metadata and structured data in app/layout.js all read from
 * here. `displayPrice` is derived from `price`.
 *
 * IMPORTANT: When adding/removing plans or changing a price, also update the
 * Paystack and IntaSend dashboards to match.
 */
const plans = [
  {
    id: 'exclusive',
    paystackPlanCode: 'PLN_qw20ss9ou0pryp2',
    name: 'Exclusive One-on-One',
    shortDesc: "Your coach's time and focus, committed entirely to you.",
    price: 50000,
    interval: 'month',
    features: [
      "Your coach's undivided time and attention for the entire session",
      'Fully individualized programming built from your assessment & data',
      'Real-time coaching, correction & load adjustment on every rep',
      'Priority scheduling and complete session flexibility',
      'Comprehensive movement screening & force profiling',
      'Personalized nutrition, recovery & return-to-play guidance',
    ],
    highlight: true,
    premium: true,
    badge: 'Elite',
    category: 'premium',
  },
  {
    id: 'one-on-one',
    paystackPlanCode: 'PLN_2bvf19zkc2b3m15',
    name: 'Individualized Coaching',
    shortDesc: 'A programme built entirely around you, with hands-on coaching.',
    price: 30000,
    interval: 'month',
    features: [
      'Fully individualized programming based on your assessment',
      'Hands-on, coach-led sessions with direct guidance',
      'Regular performance reviews & programme adjustments',
      'Flexible scheduling within coached training windows',
      'Movement screening & force profiling',
      'Recovery & progression guidance',
    ],
    highlight: false,
    premium: true,
    badge: null,
    category: 'premium',
  },
  {
    id: 'group',
    paystackPlanCode: 'PLN_y20ctw3tulrbzlq',
    name: 'Performance Group Training',
    shortDesc: 'High-performance training in a structured group environment.',
    price: 15000,
    interval: 'month',
    features: [
      'Periodized training cycles',
      'Small group sizes for quality coaching',
      'Structured performance benchmarks',
      'Professional training environment',
    ],
    highlight: true,
    premium: false,
    badge: 'Most Popular',
    category: 'group',
  },
  {
    id: 'online',
    paystackPlanCode: 'PLN_56nwee4bqjzw2bc',
    name: 'Online Performance Training',
    shortDesc: 'Structured programming for athletes training remotely.',
    price: 12000,
    interval: 'month',
    features: [
      'Monthly structured training plans',
      'Video-guided exercise standards',
      'Regular check-ins & program updates',
      'AMSC exercise library access',
    ],
    highlight: false,
    premium: false,
    badge: null,
    category: 'remote',
  },
  {
    id: 'youth',
    paystackPlanCode: 'PLN_badqr7xp8n6ry17',
    name: 'Youth Athletic Development',
    shortDesc: 'Building athletic foundations for ages 10–15.',
    price: 10000,
    interval: 'month',
    features: [
      'Age-appropriate strength & movement training',
      'Speed and coordination development',
      'Injury prevention through proper mechanics',
      'Fun, engaging training environment',
    ],
    highlight: false,
    premium: false,
    badge: null,
    category: 'youth',
  },
];

export const trainingPlans = plans.map((plan) => ({
  ...plan,
  displayPrice: formatKES(plan.price),
}));

/** Lowest and highest monthly plan prices, e.g. for "From KES 10,000/month". */
export const minPlanPrice = Math.min(...trainingPlans.map((p) => p.price));
export const maxPlanPrice = Math.max(...trainingPlans.map((p) => p.price));

/**
 * Get a plan by its ID.
 * @param {string} planId
 * @returns {object|undefined}
 */
export function getPlanById(planId) {
  return trainingPlans.find((p) => p.id === planId);
}

/**
 * Display price for a plan, e.g. "KES 50,000".
 * Throws if the plan doesn't exist so a renamed/removed plan fails the build
 * instead of silently showing a blank price.
 * @param {string} planId
 * @returns {string}
 */
export function getPlanDisplayPrice(planId) {
  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Unknown training plan: ${planId}`);
  return plan.displayPrice;
}

/**
 * The actual monthly amount (KES) a client should be charged.
 *
 * Single source of truth for billing amount — used by the payment-init routes,
 * the pay page, the reminder cron, and the admin dashboard. Precedence:
 *   1. custom_monthly_rate (partnership/negotiated flat rate)
 *   2. plan_price with discount_percent applied
 *   3. plan_price (standard)
 *
 * @param {object} client - client record with custom_monthly_rate, discount_percent, plan_price
 * @returns {number} integer KES
 */
export function getEffectiveMonthlyRate(client) {
  if (client.custom_monthly_rate) return Math.round(Number(client.custom_monthly_rate));
  if (Number(client.discount_percent) > 0)
    return Math.round(client.plan_price * (1 - Number(client.discount_percent) / 100));
  return client.plan_price;
}
