'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { trainingPlans, getPlanById } from '../../lib/plans';

/* ─── Step indicator ──────────────────────────────────── */
const STEPS = [
  { num: 1, label: 'Choose Plan' },
  { num: 2, label: 'Application' },
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-12">
      {STEPS.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-bold transition-all duration-300 ${
                current === step.num
                  ? 'bg-accent text-white scale-110'
                  : current > step.num
                  ? 'bg-green-600 text-white'
                  : 'bg-surface-light text-secondary border border-white/10'
              }`}
            >
              {current > step.num ? '\u2713' : step.num}
            </span>
            <span
              className={`hidden sm:inline font-display text-xs tracking-wider uppercase transition-colors duration-300 ${
                current === step.num ? 'text-white' : 'text-secondary'
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-8 sm:w-16 h-[2px] transition-colors duration-300 ${
                current > step.num ? 'bg-green-600' : 'bg-white/10'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Plan Card ───────────────────────────────────────── */
function PlanCard({ plan, selected, onSelect }) {
  const isSelected = selected === plan.id;

  if (plan.premium) {
    // Premium card — visually distinct
    return (
      <button
        type="button"
        onClick={() => onSelect(plan.id)}
        className={`relative text-left w-full p-8 rounded-xl border-2 transition-all duration-300 cursor-pointer md:col-span-2 lg:col-span-1 ${
          isSelected
            ? 'bg-gradient-to-br from-gold/15 to-accent/10 border-gold shadow-xl shadow-gold/10 scale-[1.02]'
            : 'bg-gradient-to-br from-gold/5 to-surface border-gold/30 hover:border-gold/60 hover:shadow-lg hover:shadow-gold/5'
        }`}
      >
        {/* Recommended badge */}
        <span className="absolute -top-3 left-6 bg-gold text-black text-[10px] font-display font-bold tracking-widest uppercase px-4 py-1 rounded-full">
          {plan.badge}
        </span>

        {/* Selection indicator */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-gold text-[10px] font-display font-bold tracking-[0.3em] uppercase">Premium</span>
            <h3 className="font-display font-bold text-xl tracking-wide text-white mt-1">
              {plan.name}
            </h3>
          </div>
          <span
            className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-1 transition-all duration-200 flex items-center justify-center ${
              isSelected ? 'border-gold bg-gold' : 'border-gold/40'
            }`}
          >
            {isSelected && (
              <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </span>
        </div>

        <p className="text-white/60 text-sm mb-5 font-body">{plan.shortDesc}</p>

        <ul className="space-y-2.5 mb-6">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-white/80 font-body">
              <span className="text-gold mt-0.5 text-xs font-bold">{'\u2713'}</span>
              {f}
            </li>
          ))}
        </ul>

        <div className="border-t border-gold/20 pt-5 flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="font-display font-bold text-3xl text-white">{plan.displayPrice}</span>
            <span className="text-white/40 text-sm font-body">/ {plan.interval}</span>
          </div>
          <span className={`font-display text-xs font-bold tracking-wider uppercase px-4 py-2 rounded-full transition-all duration-200 ${
            isSelected ? 'bg-gold text-black' : 'bg-gold/10 text-gold border border-gold/20'
          }`}>
            {isSelected ? 'Selected' : 'Select Plan'}
          </span>
        </div>
      </button>
    );
  }

  // Standard card
  return (
    <button
      type="button"
      onClick={() => onSelect(plan.id)}
      className={`relative text-left w-full p-6 rounded-xl border transition-all duration-300 cursor-pointer group ${
        isSelected
          ? 'bg-accent/10 border-accent shadow-lg shadow-red-900/20 scale-[1.02]'
          : 'bg-surface border-white/5 hover:border-white/20 hover:bg-surface-light'
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-6 bg-accent text-white text-[10px] font-display font-bold tracking-widest uppercase px-3 py-1 rounded-full">
          {plan.badge}
        </span>
      )}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-display font-bold text-lg tracking-wide text-white pr-4">
          {plan.name}
        </h3>
        <span
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 transition-all duration-200 flex items-center justify-center ${
            isSelected ? 'border-accent bg-accent' : 'border-white/30'
          }`}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </span>
      </div>
      <p className="text-secondary text-sm mb-4 font-body">{plan.shortDesc}</p>
      <ul className="space-y-2 mb-5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-white/70 font-body">
            <span className="text-accent mt-0.5 text-xs">{'\u2713'}</span>
            {f}
          </li>
        ))}
      </ul>
      <div className="border-t border-white/5 pt-4 flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className="font-display font-bold text-2xl text-white">{plan.displayPrice}</span>
          <span className="text-secondary text-sm font-body">/ {plan.interval}</span>
        </div>
        <span className={`font-display text-xs font-bold tracking-wider uppercase px-4 py-2 rounded-full transition-all duration-200 ${
          isSelected ? 'bg-accent text-white' : 'bg-white/5 text-white/50 border border-white/10 group-hover:bg-white/10 group-hover:text-white/70'
        }`}>
          {isSelected ? 'Selected' : 'Select'}
        </span>
      </div>
    </button>
  );
}

/* ─── Step 1: Choose Plan ─────────────────────────────── */
function StepChoosePlan({ selectedPlan, onSelect, onNext }) {
  return (
    <div>
      <div className="text-center mb-10">
        <h2 className="font-display font-black text-3xl md:text-4xl tracking-widest mb-3">
          CHOOSE YOUR PLAN
        </h2>
        <p className="text-secondary font-body text-sm max-w-lg mx-auto">
          Select the training program that fits your goals. All plans are monthly subscriptions
          that include full access to the AMSC performance system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
        {trainingPlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selectedPlan}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="text-center mt-10">
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedPlan}
          className={`font-display font-bold text-sm tracking-wider uppercase px-12 py-4 rounded-full transition-all duration-200 ${
            selectedPlan
              ? 'bg-accent text-white hover:bg-accent-dark cursor-pointer hover:shadow-lg hover:shadow-red-900/30'
              : 'bg-surface-light text-secondary cursor-not-allowed border border-white/5'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

/* ─── Step 2: Application Form ────────────────────────── */
function StepApplication({ form, onChange, onPolicyToggle, errors, onSubmit, onBack, submitting, selectedPlan }) {
  const plan = getPlanById(selectedPlan);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="font-display font-black text-3xl md:text-4xl tracking-widest mb-3">
          APPLICATION
        </h2>
        <p className="text-secondary font-body text-sm">
          Tell us about yourself. We review every application to ensure AMSC is the right fit for your goals.
        </p>
        {plan && (
          <p className="text-accent font-display font-semibold text-sm tracking-wider mt-3">
            Plan: {plan.name} &mdash; {plan.displayPrice}/month
          </p>
        )}
      </div>

      <div className="space-y-6">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block font-display text-xs font-semibold tracking-widest uppercase text-white/80 mb-2">
            Full Name <span className="text-accent">*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            value={form.fullName}
            onChange={onChange}
            placeholder="e.g. John Kariuki"
            className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white font-body text-sm placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block font-display text-xs font-semibold tracking-widest uppercase text-white/80 mb-2">
            Email Address <span className="text-accent">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={onChange}
            placeholder="john@example.com"
            className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white font-body text-sm placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block font-display text-xs font-semibold tracking-widest uppercase text-white/80 mb-2">
            Phone Number <span className="text-accent">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            value={form.phone}
            onChange={onChange}
            placeholder="+254 712 345 678"
            className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white font-body text-sm placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>

        {/* Sport / Discipline */}
        <div>
          <label htmlFor="sport" className="block font-display text-xs font-semibold tracking-widest uppercase text-white/80 mb-2">
            Sport / Discipline <span className="text-accent">*</span>
          </label>
          <input
            id="sport"
            name="sport"
            type="text"
            required
            value={form.sport}
            onChange={onChange}
            placeholder="e.g. Football, Athletics, Rugby, General Fitness"
            className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white font-body text-sm placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>

        {/* Training Goals */}
        <div>
          <label htmlFor="goals" className="block font-display text-xs font-semibold tracking-widest uppercase text-white/80 mb-2">
            Training Goals <span className="text-accent">*</span>
          </label>
          <textarea
            id="goals"
            name="goals"
            rows={3}
            required
            value={form.goals}
            onChange={onChange}
            placeholder="What do you want to achieve? What are you training for?"
            className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white font-body text-sm placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none"
          />
        </div>

        {/* Training Experience */}
        <div>
          <label htmlFor="experience" className="block font-display text-xs font-semibold tracking-widest uppercase text-white/80 mb-2">
            Training Experience
          </label>
          <textarea
            id="experience"
            name="experience"
            rows={2}
            value={form.experience}
            onChange={onChange}
            placeholder="Tell us about your current or past training background."
            className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white font-body text-sm placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none"
          />
        </div>

        {/* Availability */}
        <div>
          <label htmlFor="availability" className="block font-display text-xs font-semibold tracking-widest uppercase text-white/80 mb-2">
            Training Availability <span className="text-accent">*</span>
          </label>
          <input
            id="availability"
            name="availability"
            type="text"
            required
            value={form.availability}
            onChange={onChange}
            placeholder="e.g. Weekdays 6-8am, Saturdays 9am"
            className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white font-body text-sm placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>

        {/* Health Info */}
        <div>
          <label htmlFor="healthInfo" className="block font-display text-xs font-semibold tracking-widest uppercase text-white/80 mb-2">
            Health / Injury Information
          </label>
          <textarea
            id="healthInfo"
            name="healthInfo"
            rows={2}
            value={form.healthInfo}
            onChange={onChange}
            placeholder="Any injuries, conditions, or limitations we should know about?"
            className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white font-body text-sm placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none"
          />
        </div>

        {/* How did you hear about us */}
        <div>
          <label htmlFor="referralSource" className="block font-display text-xs font-semibold tracking-widest uppercase text-white/80 mb-2">
            How Did You Hear About AMSC?
          </label>
          <input
            id="referralSource"
            name="referralSource"
            type="text"
            value={form.referralSource}
            onChange={onChange}
            placeholder="e.g. Instagram, friend referral, Google"
            className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white font-body text-sm placeholder:text-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
            <ul className="space-y-1">
              {errors.map((err) => (
                <li key={err} className="text-red-400 text-sm font-body flex items-start gap-2">
                  <span className="mt-0.5">{'\u26A0'}</span> {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Info box */}
        <div className="bg-surface-light border border-white/5 rounded-lg p-4">
          <p className="text-secondary text-xs font-body leading-relaxed">
            After submitting, our team will review your application and schedule a discovery call with you.
            If accepted, you&apos;ll receive a secure payment link to activate your subscription.
          </p>
        </div>

        {/* Payment policy agreement */}
        <button
          type="button"
          role="checkbox"
          aria-checked={form.agreedToPolicy}
          onClick={onPolicyToggle}
          className="w-full text-left flex items-start gap-3 p-4 bg-surface border border-white/10 rounded-lg hover:border-white/20 transition-colors cursor-pointer group"
        >
          <span
            className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-all ${
              form.agreedToPolicy
                ? 'bg-accent border-accent'
                : 'border-white/30 group-hover:border-white/50'
            }`}
          >
            {form.agreedToPolicy && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </span>
          <p className="text-secondary text-sm font-body leading-relaxed">
            I have read and agree to the{' '}
            <a
              href="/payment-policy"
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-accent hover:underline"
            >
              AMSC Payment Policy
            </a>
            . I understand that monthly fees are non-refundable and that payment is due within 7 days of my billing date.
          </p>
        </button>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={onBack}
            className="font-display text-sm font-semibold tracking-wider text-secondary hover:text-white transition-colors cursor-pointer"
          >
            {'\u2190'} Back
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="bg-accent text-white font-display font-bold text-sm tracking-wider uppercase px-10 py-3.5 rounded-full hover:bg-accent-dark transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 3: Application Submitted ───────────────────── */
function StepSubmitted() {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-600/20 border-2 border-green-500/40 mb-8">
        <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>

      <h2 className="font-display font-black text-3xl md:text-4xl tracking-widest mb-4">
        APPLICATION RECEIVED
      </h2>
      <p className="text-secondary font-body text-base max-w-md mx-auto mb-10">
        Thank you for applying to train with AMSC. Our team will review your application and
        reach out to schedule a discovery call.
      </p>

      <div className="bg-surface border border-white/5 rounded-xl p-8 text-left mb-8">
        <h3 className="font-display font-bold text-sm tracking-widest uppercase text-white/60 mb-6">
          What Happens Next
        </h3>
        <div className="space-y-5">
          <div className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-display font-bold text-sm">
              1
            </span>
            <div>
              <h4 className="font-display font-bold text-white tracking-wide text-sm">Application Review</h4>
              <p className="text-secondary text-sm font-body mt-1">
                We&apos;ll review your details to understand your goals and needs.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-display font-bold text-sm">
              2
            </span>
            <div>
              <h4 className="font-display font-bold text-white tracking-wide text-sm">Discovery Call</h4>
              <p className="text-secondary text-sm font-body mt-1">
                We&apos;ll reach out to schedule a brief call to discuss your training plan and answer any questions.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-display font-bold text-sm">
              3
            </span>
            <div>
              <h4 className="font-display font-bold text-white tracking-wide text-sm">Payment & Onboarding</h4>
              <p className="text-secondary text-sm font-body mt-1">
                If accepted, you&apos;ll receive a secure payment link. Once paid, we&apos;ll get you set up on Trainerize and ready to train.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-light border border-white/5 rounded-xl p-6 mb-8">
        <p className="text-secondary text-sm font-body">
          Questions? Reach out to us on{' '}
          <a
            href="https://instagram.com/amscperformance"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Instagram @amscperformance
          </a>
        </p>
      </div>

      <Link
        href="/"
        className="inline-block font-display text-sm font-semibold tracking-wider text-secondary hover:text-white transition-colors"
      >
        {'\u2190'} Back to Home
      </Link>
    </div>
  );
}

/* ─── Main Join Flow ──────────────────────────────────── */
function JoinFlow() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('plan');

  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(preselected || '');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    sport: '',
    goals: '',
    experience: '',
    availability: '',
    healthInfo: '',
    referralSource: '',
    agreedToPolicy: false,
  });

  function handleFormChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handlePolicyToggle() {
    setForm((prev) => ({ ...prev, agreedToPolicy: !prev.agreedToPolicy }));
  }

  function validateForm() {
    const errs = [];
    if (!form.fullName.trim() || form.fullName.trim().length < 2)
      errs.push('Please enter your full name.');
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.push('Please enter a valid email address.');
    if (!form.phone.trim() || form.phone.replace(/[\s\-().]/g, '').length < 7)
      errs.push('Please enter a valid phone number.');
    if (!form.sport.trim())
      errs.push('Please enter your sport or discipline.');
    if (!form.goals.trim())
      errs.push('Please tell us about your training goals.');
    if (!form.availability.trim())
      errs.push('Please enter your training availability.');
    if (!form.agreedToPolicy)
      errs.push('Please read and agree to the AMSC Payment Policy to continue.');
    return errs;
  }

  async function handleSubmit() {
    setFormErrors([]);
    const errs = validateForm();
    if (errs.length > 0) {
      setFormErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          planId: selectedPlan,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormErrors(data.errors || [data.error || 'Something went wrong.']);
        return;
      }

      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setFormErrors(['Network error. Please check your connection and try again.']);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="py-12 px-6 bg-background min-h-[80vh] pt-24 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-block font-display text-xs font-semibold tracking-[0.25em] uppercase text-secondary hover:text-white transition-colors mb-4"
          >
            AMSC Performance
          </Link>
        </div>

        {step < 3 && <StepIndicator current={step} />}

        {step === 1 && (
          <StepChoosePlan
            selectedPlan={selectedPlan}
            onSelect={setSelectedPlan}
            onNext={() => {
              if (selectedPlan) {
                setStep(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          />
        )}

        {step === 2 && (
          <StepApplication
            form={form}
            onChange={handleFormChange}
            onPolicyToggle={handlePolicyToggle}
            errors={formErrors}
            submitting={submitting}
            selectedPlan={selectedPlan}
            onSubmit={handleSubmit}
            onBack={() => {
              setStep(1);
              setFormErrors([]);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {step === 3 && <StepSubmitted />}
      </div>
    </section>
  );
}

/* ─── Page wrapper with Suspense ─────────────────────── */
export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <section className="py-12 px-6 bg-background min-h-[80vh] flex items-center justify-center pt-24">
          <div className="text-center">
            <span className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-secondary font-body text-sm">Loading...</p>
          </div>
        </section>
      }
    >
      <JoinFlow />
    </Suspense>
  );
}
