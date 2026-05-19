import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — PLAN T" },
      { name: "description", content: "Privacy Policy of the PLAN T Platform." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Effective Date: 19 May 2026</p>

        <article className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-[15px] leading-relaxed">
          <p>
            This Privacy Policy describes how our app PlanT (the "App," "we," "us," or "our"), a platform that connects buyers and sellers, collects, uses, discloses, and safeguards your personal information when you use our mobile application, website, and related services (collectively, the "Services").
          </p>
          <p>
            By accessing or using our Services, you agree to the practices described in this Privacy Policy. If you do not agree, please do not use the Services.
          </p>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">1. Information We Collect</h2>
            <p>We collect information you provide directly and information collected automatically.</p>

            <h3 className="text-xl font-semibold mt-4 mb-2">Information You Provide:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, phone number, username, password, profile picture, and other profile details.</li>
              <li><strong>Requests Listing and Transaction Data:</strong> Service or Product descriptions, photos, prices, shipping details, payment information (processed by third-party providers), and messages between buyers and sellers.</li>
              <li><strong>Identity and Verification Data:</strong> Government-issued ID, address, or other verification documents (if you choose to verify your account).</li>
              <li><strong>Communication Data:</strong> Messages, reviews, ratings, support inquiries, and feedback.</li>
              <li><strong>Payment Information:</strong> We might store some payment information like payment QR code or bank account information for facilitating payments between users or to our platform. We might store credit card details except those are handled by secure third-party processors (e.g., Stripe, PayPal).</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Information Collected Automatically:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usage and Device Data:</strong> IP address, device type, operating system, browser type, app version, unique device identifiers, and crash logs.</li>
              <li><strong>Location Data:</strong> Approximate or precise location (with your consent) to show local listings, facilitate shipping, or enable location-based features. You can adjust permissions in your device settings.</li>
              <li><strong>Cookies and Similar Technologies:</strong> We use cookies, pixels, and similar tools to remember preferences, analyze usage, and deliver personalized content or ads.</li>
              <li><strong>Activity Data:</strong> Listings viewed, searches performed, interactions with other users, and time spent on the App.</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Information from Third Parties:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Data from social media logins (if you sign in with Apple, Google, etc.).</li>
              <li>Publicly available information or data from business partners and analytics providers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">2. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve the Services (e.g., process transactions, match buyers and sellers).</li>
              <li>Facilitate communication between users.</li>
              <li>Verify identities, prevent fraud, and ensure platform safety.</li>
              <li>Personalize your experience (recommendations, tailored search results).</li>
              <li>Send administrative messages, updates, and marketing communications (you may opt out of marketing).</li>
              <li>Analyze usage trends and conduct research.</li>
              <li>Comply with legal obligations and enforce our Terms of Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">3. How We Share Your Information</h2>
            <p>We share information in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>With Other Users:</strong> Your public profile (name/username, photo, location if shared), listings, reviews, and messages are visible to other users as necessary for marketplace interactions.</li>
              <li><strong>Service Providers:</strong> With trusted third parties who perform services on our behalf (hosting, payment processing, analytics, customer support, fraud prevention). These providers are contractually obligated to protect your data.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred.</li>
              <li><strong>Legal Requirements:</strong> When required by law, subpoena, court order, or government request. We may also share data to protect our rights, safety, or property, or that of our users.</li>
              <li><strong>With Consent:</strong> With your explicit permission in other situations.</li>
            </ul>
            <p className="mt-2">We do not sell your personal information for monetary compensation.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">4. Data Security</h2>
            <p>We implement reasonable administrative, technical, and physical safeguards to protect your personal information. However, no security system is impenetrable. You are responsible for keeping your account credentials confidential.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">5. Your Rights and Choices</h2>
            <p>Depending on your location (e.g., under GDPR, CCPA/CPRA, or other laws), you may have rights to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access, correct, or delete your personal information.</li>
              <li>Opt out of certain processing (including targeted advertising or data sales, where applicable).</li>
              <li>Restrict processing or object to processing.</li>
              <li>Data portability.</li>
              <li>Withdraw consent where processing is based on consent.</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at the details below. We will respond within the time required by applicable law. We may need to verify your identity before fulfilling a request.</p>
            <p className="mt-2">You can also:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Update account settings directly in the App.</li>
              <li>Manage cookie preferences and location permissions via your device.</li>
              <li>Opt out of push notifications or marketing emails.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">6. Retention of Information</h2>
            <p>We retain your information for as long as necessary to provide the Services, comply with legal obligations, resolve disputes, and enforce agreements. When no longer needed, we delete or anonymize it.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">7. Children's Privacy</h2>
            <p>Our Services are not directed to children under 18 (or the minimum age required in your jurisdiction). We do not knowingly collect personal information from children. If we learn we have collected such data, we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">8. International Data Transfers</h2>
            <p>Your information may be transferred to and processed in countries outside your jurisdiction (including Hong Kong and other locations where we or our service providers operate). We use appropriate safeguards (such as Standard Contractual Clauses or equivalent measures) to protect your data during transfers.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">9. Changes to This Privacy Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy in the App and updating the effective date. Continued use of the Services after changes constitutes acceptance of the revised policy.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">10. Contact Us</h2>
            <p>If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:</p>
            <p><strong>Email:</strong> legal.hao@gmail.com</p>
            <p><strong>Company Name:</strong> Zero Point One International Company</p>
          </section>

          <p className="pt-6">
            See also our{" "}
            <Link to="/terms" className="font-medium text-primary hover:underline">
              Terms and Conditions
            </Link>
            .
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}