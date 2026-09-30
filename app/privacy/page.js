export const metadata = {
  title: 'Privacy Policy',
  description: 'How AMSC Performance collects, uses, and protects your personal data under the Kenya Data Protection Act 2019.',
};

export default function PrivacyPage() {
  return (
    <section className="min-h-screen bg-background py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">Privacy Policy</h1>
        <p className="text-secondary text-sm mb-12">Last updated: 30 September 2026</p>

        <div className="prose-legal space-y-10 text-secondary text-sm leading-relaxed font-body">
          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">1. Who We Are</h2>
            <p>
              AMSC Performance (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is an athletic performance training
              company based in Kenya. This Privacy Policy explains how we collect, use, store, and protect your personal
              information when you visit our website at amsc-performance.vercel.app (the &quot;Site&quot;).
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">2. Legal Basis</h2>
            <p>
              We process personal data in accordance with the Kenya Data Protection Act, 2019 (DPA) and, where
              applicable, the EU General Data Protection Regulation (GDPR). Our lawful bases for processing are:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your consent (e.g., submitting an application form)</li>
              <li>Legitimate interest (e.g., improving our services and website)</li>
              <li>Performance of a contract (e.g., delivering training programs you enrol in)</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">3. What Data We Collect</h2>
            <p>We collect personal information through the following channels:</p>

            <h3 className="font-display text-base font-bold text-white mt-4 mb-2">a) Application Form (Tally.so)</h3>
            <p>
              When you apply for a training program, we use a third-party form service, Tally.so, to collect information
              such as your name, email address, phone number, sport, and training goals. Tally.so processes this data on
              our behalf. Please review{' '}
              <a href="https://tally.so/help/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                Tally.so&apos;s Privacy Policy
              </a>{' '}
              for details on their data handling.
            </p>

            <h3 className="font-display text-base font-bold text-white mt-4 mb-2">b) Instagram Feed (Behold.so)</h3>
            <p>
              Our Site displays a live Instagram feed using a widget provided by Behold.so. This widget may load content
              from Instagram&apos;s servers and Behold&apos;s CDN. It does not collect your personal data, but your browser may
              make requests to these third-party servers. See{' '}
              <a href="https://behold.so/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                Behold.so&apos;s Privacy Policy
              </a>.
            </p>

            <h3 className="font-display text-base font-bold text-white mt-4 mb-2">c) Program Waitlists (e.g. AMSC Off Pitch)</h3>
            <p>
              When you join a program waitlist, we collect your first name, email address, playing position, level
              and age range, and, if you choose to give them, your Instagram handle and whether you want to be
              considered for early access. We also record how you reached the page (for example, the Instagram app or a
              link with a campaign tag), the website that referred you, and your country as detected from your
              connection. We do not store your IP address.
            </p>
            <p className="mt-2">
              We only email you with your consent. Joining a waitlist requires ticking a box agreeing to receive
              emails about that program (build updates, early access and launch news). A separate, optional box lets
              you also receive emails about other AMSC Performance programs and services. We record which wording you
              agreed to and when. For anyone under 18, we also ask for confirmation that a parent or guardian has
              agreed before they join.
            </p>
            <p className="mt-2">
              Every email we send includes an Unsubscribe link. Using it stops all further waitlist and marketing
              emails straight away; we keep a record that you unsubscribed so that you are not emailed again.
              Waitlist data is stored with our database provider, Supabase, and emails are sent through Resend. Both
              act as processors on our behalf and may store data on servers outside Kenya. Waitlist data is only
              accessible to AMSC staff.
            </p>

            <h3 className="font-display text-base font-bold text-white mt-4 mb-2">d) Hosting & Server Logs (Vercel)</h3>
            <p>
              Our Site is hosted on Vercel. Vercel may automatically collect technical data such as your IP address,
              browser type, and access times for security and performance purposes. See{' '}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                Vercel&apos;s Privacy Policy
              </a>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">4. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To process and respond to your training program applications</li>
              <li>To communicate with you about our services</li>
              <li>To improve the Site and our offerings</li>
              <li>To comply with legal obligations</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">5. Data Sharing</h2>
            <p>
              We do not sell your personal data. We share data only with the third-party service providers listed above
              (Tally.so, Behold.so, Vercel, Supabase, Resend) as necessary to operate the Site and process applications. These providers
              act as data processors on our behalf or as independent controllers for their own services.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">6. Cookies & Tracking</h2>
            <p>
              Our Site itself does not set first-party cookies. However, the third-party services embedded on our Site
              (Tally.so and Behold.so) may use cookies or similar technologies. You can manage cookies through your
              browser settings or via the cookie preferences banner on our Site.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">7. Data Retention</h2>
            <p>
              Application data submitted through Tally.so is retained for as long as necessary to process your
              application and for a reasonable period thereafter for record-keeping. You may unsubscribe from our
              emails at any time using the link in any email, and you may request deletion of your data at any time
              by contacting us.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">8. Your Rights</h2>
            <p>Under the Kenya Data Protection Act 2019, you have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Be informed about how your data is processed</li>
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, contact us at the details below.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">9. Data Security</h2>
            <p>
              We use industry-standard measures to protect your information, including HTTPS encryption in transit and
              secure third-party platforms. However, no method of transmission over the internet is 100% secure.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">10. Children&apos;s Privacy</h2>
            <p>
              Our youth training programs may involve minors. We require parental or guardian consent before collecting
              personal data from individuals under 18. If you believe a minor has submitted data without consent,
              please contact us immediately.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated
              &quot;Last updated&quot; date.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-white mb-3">12. Contact Us</h2>
            <p>
              For privacy-related enquiries or to exercise your data rights, contact AMSC Performance via Instagram
              at{' '}
              <a href="https://instagram.com/amscperformance" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                @amscperformance
              </a>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
