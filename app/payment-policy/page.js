export const metadata = {
  title: 'Payment Policy',
  description: 'How billing, payments, cancellations, and pauses work at AMSC Performance.',
};

export default function PaymentPolicyPage() {
  return (
    <section className="min-h-screen bg-background py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">Payment Policy</h1>
        <p className="text-secondary text-sm mb-12">Last updated: May 2026</p>

        <div className="prose-legal space-y-10 text-secondary text-sm leading-relaxed font-body">

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">1. How Billing Works</h2>
            <p>
              AMSC Performance training programs are monthly subscriptions billed in Kenyan Shillings (KES).
              Your billing cycle is 30 days, starting from your training start date. The same date recurs
              each month as your payment due date.
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>First payment is required and must be confirmed before your first training session begins.</li>
              <li>Accepted payment methods: Paystack (card or M-Pesa) and IntaSend (M-Pesa).</li>
              <li>Your billing date is set by AMSC when your training starts and does not change unless explicitly agreed.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">2. Payment Dates &amp; Late Payment</h2>
            <p>
              Payment is due on the same date each month. A <strong className="text-white">7-day grace period</strong> applies
              after your due date — training continues normally during this window.
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>If payment is not received within 7 days of the due date, your training access may be suspended.</li>
              <li>Training is reinstated automatically once payment is confirmed — no additional steps required.</li>
              <li>Repeated late payments may result in your subscription being reviewed or cancelled at AMSC&apos;s discretion.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">3. Cancellation</h2>
            <p>
              You may cancel your subscription at any time. There is no minimum commitment period beyond your
              current billing cycle.
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>Cancellation takes effect at the end of your current 30-day billing cycle. You will not be charged for the next cycle.</li>
              <li>To cancel, notify AMSC at least <strong className="text-white">24 hours before your next billing date</strong> via Instagram, WhatsApp, or email (see Contact section).</li>
              <li>Sessions already scheduled within your current paid cycle remain accessible after submitting a cancellation notice.</li>
              <li>Cancellation requests received after a billing date has passed will apply from the following cycle.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">4. No Refunds</h2>
            <p>
              Monthly subscription fees are <strong className="text-white">non-refundable</strong> once a billing
              cycle has commenced. This applies regardless of how many sessions were attended during that period.
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>Unused training days within a paid cycle are not refunded.</li>
              <li>Partial refunds are not available for mid-cycle cancellations.</li>
              <li>Exceptions are not guaranteed and are handled entirely at AMSC&apos;s sole discretion on a case-by-case basis.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">5. Training Pauses</h2>
            <p>
              If you need to temporarily stop training due to injury, travel, or another valid personal reason,
              you may request a pause by contacting AMSC directly. Pauses are <strong className="text-white">not automatic</strong> — they
              require explicit approval from AMSC.
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>Each pause request is reviewed individually. Not all requests will be approved.</li>
              <li>A training pause does not automatically entitle you to a refund, credit, or extension.</li>
              <li>In exceptional circumstances (e.g., a serious injury or medical emergency), unused days from a paid month
                  may be credited to your next billing cycle at AMSC&apos;s sole discretion.</li>
              <li>Any credits granted are one-time and non-transferable.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">6. Payment Methods</h2>
            <p>We currently accept the following payment methods:</p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li>
                <strong className="text-white">Card via Paystack:</strong> Your card is stored securely and
                renews automatically each billing cycle. Ensure your card is valid and has sufficient funds
                on your billing date to avoid interruptions.
              </li>
              <li>
                <strong className="text-white">M-Pesa via Paystack or IntaSend:</strong> Manual payment is
                required each cycle using the secure payment link sent to you. M-Pesa payments must be completed
                within the 7-day grace window to maintain uninterrupted access.
              </li>
            </ul>
            <p className="mt-3">
              AMSC is not responsible for payment failures caused by insufficient funds, expired cards, or
              M-Pesa service interruptions. It remains your responsibility to ensure payment is completed on time.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">7. Contact</h2>
            <p>For billing questions, payment issues, cancellation requests, or pause inquiries, reach us through any of the following:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>
                Instagram:{' '}
                <a
                  href="https://instagram.com/amscperformance"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  @amscperformance
                </a>
              </li>
              <li>WhatsApp: contact us via the number on our Instagram profile</li>
              <li>
                Email:{' '}
                <a href="mailto:admin@amscperformance.com" className="text-accent hover:underline">
                  admin@amscperformance.com
                </a>
              </li>
            </ul>
            <p className="mt-3">
              We aim to respond to all billing queries within 1 business day.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
