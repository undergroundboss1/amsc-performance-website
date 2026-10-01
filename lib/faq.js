/**
 * Frequently asked questions — rendered visibly on /faq and emitted as
 * FAQPage JSON-LD. Written as the plain questions people ask search engines
 * and AI assistants, answered with facts from lib/programs.js, lib/plans.js and
 * lib/business.js.
 */
import { getPlanDisplayPrice as price } from './plans';

export const faqs = [
  {
    q: 'Where can I get sports performance or strength and conditioning training in Nairobi?',
    a: 'AMSC Performance is a sports performance and strength & conditioning institution at The Courtyard, Vanga Road, Nairobi, Kenya. It coaches professional, national-team, college-bound and youth athletes through a data-driven Assess → Develop → Transfer system. Apply at amscperformance.com/apply or join a plan at amscperformance.com/join.',
  },
  {
    q: 'What training programs does AMSC Performance offer and how much do they cost?',
    a: `Monthly programs: Exclusive One-on-One (${price('exclusive')}), Individualized Coaching (${price('one-on-one')}), Performance Group Training (${price('group')}), Online Performance Training (${price('online')}) and Youth Athletic Development for ages 10–15 (${price('youth')}). Team & School Performance Consulting is priced on request. Every program begins with an initial assessment and consultation.`,
  },
  {
    q: 'Which sports does AMSC Performance train athletes for?',
    a: 'Training is sport-specific. AMSC coaches athletes in football (soccer), basketball, rugby, tennis, padel, golf and sprinting — including Kenya national team players, Basketball Africa League players, pro golfers on the Sunshine Development Tour, and NCAA / NJCAA college athletes.',
  },
  {
    q: 'Do I need to be an elite athlete to train at AMSC?',
    a: 'No. Exclusive One-on-One is built for professional and elite athletes, but Individualized Coaching, Performance Group Training and Online Performance Training suit any committed athlete or driven individual, and Youth Athletic Development builds foundations for 10–15 year olds regardless of sport.',
  },
  {
    q: 'Can I train with AMSC online if I am not in Nairobi?',
    a: `Yes. Online Performance Training (${price('online')}/month) provides monthly structured training plans, video-guided exercise standards, capacity tracking and regular check-ins for athletes training independently anywhere in Kenya, East Africa or abroad.`,
  },
  {
    q: 'Does AMSC offer youth or kids athletic development training?',
    a: `Yes. Youth Athletic Development (${price('youth')}/month) is for young athletes aged 10–15 and covers age-appropriate strength and movement training, speed and coordination, and injury prevention through proper movement mechanics. AMSC also runs multi-day youth camps — see amscperformance.com/camps.`,
  },
  {
    q: 'Does AMSC work with teams, schools and academies?',
    a: 'Yes. Team & School Performance Consulting implements the AMSC Performance System in organizations: performance system design, coach education, athlete screening and assessment protocols, periodization for team schedules, and performance monitoring and reporting. Contact AMSC via amscperformance.com/apply?program=consulting.',
  },
  {
    q: 'Does AMSC offer athletic performance testing or combine testing?',
    a: 'Yes. The AMSC Combine benchmarks speed, power and athletic performance and produces a downloadable PDF performance report for each athlete (amscperformance.com/reports). Every program starts with an assessment, and combine testing is included in AMSC camps.',
  },
  {
    q: 'Can AMSC help me return from injury?',
    a: 'Exclusive One-on-One includes personalized nutrition, recovery and return-to-play guidance, and is designed for athletes facing a high-stakes return from injury as well as selection or competition preparation.',
  },
  {
    q: 'How do I pay for AMSC training?',
    a: 'Plans are billed monthly in Kenyan shillings via M-Pesa or card (through Paystack or IntaSend). The first payment is confirmed before your first session. Full details are in the payment policy at amscperformance.com/payment-policy.',
  },
  {
    q: 'How do I contact or sign up with AMSC Performance?',
    a: 'Sign up at amscperformance.com/join, apply at amscperformance.com/apply, call +254 751 048 777 (0751 048 777), email admin@amscperformance.com, or message @amscperformance on Instagram.',
  },
];
