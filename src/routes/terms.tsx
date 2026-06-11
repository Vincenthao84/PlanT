import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms and Conditions — PLAN T" },
      { name: "description", content: "Terms and Conditions of using the PLAN T Platform." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Terms and Conditions of using the Platform</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: May 7, 2026</p>

        <article className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using PlanT (the "Platform"), you agree to be bound by these Terms and Conditions. If you do not agree, you may not use our services. All property rights and design in this application are owned by us and all rights are reserved.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">2. Eligibility</h2>
            <p>You must be at least 18 years old to create an account. By using the Platform, you represent and warrant that you have the legal capacity to enter into a binding agreement.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">3. Prohibited Activities and Content</h2>
            <p>To maintain a safe and legal environment, we strictly prohibit the following activities on the Platform:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Illegal Activities:</strong> Use of the Platform for any purpose that violates local, state, national, or international laws.</li>
              <li><strong>Sexual Content:</strong> The sale, promotion, or distribution of sexually explicit material, adult services, or pornography.</li>
              <li><strong>Piracy and Counterfeiting:</strong> The sale of unauthorized copies of software, movies, music, or any other counterfeit goods.</li>
              <li><strong>Intellectual Property Infringement:</strong> Any activity that infringes upon the copyrights, trademarks, patents, or trade secrets of third parties.</li>
              <li><strong>Privacy Infringement:</strong> Collecting or disclosing the private personal information of other users without their express consent.</li>
              <li><strong>Harassment:</strong> Engaging in stalking, bullying, or the use of hate speech.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">4. Transactions</h2>
            <p>PlanT acts as a venue to allow users to offer, sell, and buy goods. We are not a party to the actual transaction between requesters / buyers and order takers / service providers / sellers. We do not guarantee the quality, safety, or legality of the items advertised.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">5. Intellectual Property Rights</h2>
            <p>All content included on the Platform, such as text, graphics, logos, and software, is the property of PlanT or its content suppliers and is protected by international copyright laws.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">6. Termination of Use</h2>
            <p>We reserve the right, at our sole discretion, to suspend or terminate accounts that violate these terms, including immediate removal of listings associated with illegal activities or intellectual property infringement.</p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mt-10 mb-4">Collection of Personal Information</h2>
            <p>Your privacy is important to us. This section outlines how we handle your data.</p>

            <h3 className="text-xl font-semibold mt-6 mb-2">1. Information We Collect</h3>
            <p>We collect information you provide directly to us when you create an account, list an item, or communicate with other users. This may include:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Account Data:</strong> Name, email address, and password (or any other necessary information requested by us from time to time).</li>
              <li><strong>Transaction Data:</strong> Payment information (processed via secure third-party gateways) and shipping addresses.</li>
              <li><strong>Usage Data:</strong> IP addresses, device information, and browsing history on the Platform.</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-2">2. How We might Use Your Information</h3>
            <p>We use the collected data to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Facilitate transactions and verify user identity.</li>
              <li>Improve our Platform and provide customer support.</li>
              <li>Detect and prevent fraudulent or illegal activity.</li>
              <li>Comply with legal obligations.</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-2">3. Data Sharing</h3>
            <p>We do not sell your personal information to third parties. We only share data with service providers (like payment processors) necessary to operate the Platform, or when required by law enforcement.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">7. Limitation of Liability</h2>
            <p>PlanT shall not be liable for any indirect, incidental, or consequential damages resulting from the use or the inability to use our services.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-6 mb-2">8. Changes to Terms</h2>
            <p>We may update these terms from time to time. Continued use of the Platform after changes are posted constitutes your acceptance of the new terms.</p>
          </section>
/
          <p className="pt-6">
            See also our{" "}
            <Link to="/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
