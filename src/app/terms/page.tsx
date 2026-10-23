import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";
import { contactEmail } from "@/data/contact";
import { siteUrl as baseUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that apply when you use FlatFolks to find or list rooms, flats and flatmates.",
  alternates: { canonical: `${baseUrl}/terms` },
  openGraph: { title: "Terms of Use | FlatFolks", type: "website", siteName: "FlatFolks", url: `${baseUrl}/terms` },
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of Use" updated="23 October 2026">
      <p>
        These Terms of Use (&ldquo;Terms&rdquo;) apply to your use of flatfolks.in (&ldquo;FlatFolks&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By
        using FlatFolks you agree to these Terms. If you do not agree, please do not use the site.
      </p>

      <section>
        <h2>What FlatFolks is</h2>
        <p>
          FlatFolks is an online platform where people can list and search for rooms, flats and flatmates. We are not a broker, agent, landlord
          or party to any rental agreement. Any arrangement you make is directly between you and the other user.
        </p>
      </section>

      <section>
        <h2>Who can use FlatFolks</h2>
        <p>
          You must be at least 18 years old to use FlatFolks. You are responsible for the activity on your account and for keeping access to your
          email address secure.
        </p>
      </section>

      <section>
        <h2>Listings and content you post</h2>
        <ul>
          <li>Your listings must be accurate, up to date and about a property or requirement that genuinely exists.</li>
          <li>You must have the right to rent out or share any property you list, and the right to use any photos you upload.</li>
          <li>Remove or update your listing once it is no longer available.</li>
          <li>You keep ownership of your content, but you allow us to display it on FlatFolks so others can find it.</li>
        </ul>
      </section>

      <section>
        <h2>What is not allowed</h2>
        <ul>
          <li>Fake, misleading, duplicate or spam listings.</li>
          <li>Asking for money before a property has been seen or an agreement made, or any other fraud or scam.</li>
          <li>Harassing, abusive, discriminatory or unlawful content or behaviour.</li>
          <li>Collecting other users&apos; contact details for marketing or any purpose other than renting.</li>
          <li>Attempting to disrupt, scrape or gain unauthorised access to the site.</li>
        </ul>
        <p className="mt-3">We may remove content or suspend accounts that break these rules, without notice.</p>
      </section>

      <section>
        <h2>Stay safe</h2>
        <p>
          We do not inspect properties or guarantee any listing, user, or the accuracy of what they say. Always visit the property, meet the
          person, and check documents before paying any money or signing an agreement. Never pay a deposit to someone you have not met.
        </p>
      </section>

      <section>
        <h2>Limitation of liability</h2>
        <p>
          FlatFolks is provided &ldquo;as is&rdquo;. To the extent permitted by law, we are not liable for any loss or damage arising from your use of
          the site, from listings or content posted by other users, or from any dealings between users.
        </p>
      </section>

      <section>
        <h2>Privacy</h2>
        <p>
          Our <Link href="/privacy-policy">Privacy Policy</Link> explains how we handle your personal information.
        </p>
      </section>

      <section>
        <h2>Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. When we do, we will change the &ldquo;Last updated&rdquo; date above. Continuing to use FlatFolks
          after a change means you accept the updated Terms.
        </p>
      </section>

      <section>
        <h2>Governing law</h2>
        <p>These Terms are governed by the laws of India.</p>
      </section>

      <section>
        <h2>Contact us</h2>
        <p>
          Questions about these Terms? Email us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
