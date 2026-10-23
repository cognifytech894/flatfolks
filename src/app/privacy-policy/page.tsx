import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";
import { contactEmail } from "@/data/contact";
import { siteUrl as baseUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How FlatFolks collects, uses and protects your personal information when you search for rooms, flats and flatmates.",
  alternates: { canonical: `${baseUrl}/privacy-policy` },
  openGraph: { title: "Privacy Policy | FlatFolks", type: "website", siteName: "FlatFolks", url: `${baseUrl}/privacy-policy` },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy Policy" updated="23 October 2026">
      <p>
        This Privacy Policy explains what information FlatFolks (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects when you use flatfolks.in, how we
        use it, and the choices you have. By using FlatFolks you agree to this policy.
      </p>

      <section>
        <h2>Information we collect</h2>
        <ul>
          <li><b>Account details:</b> your email address, which we use to send you a one-time code (OTP) to sign in.</li>
          <li><b>Profile details you choose to add:</b> name, phone number, location, gender and a profile photo.</li>
          <li><b>Listings you post:</b> title, location, rent, deposit, description, photos, preferences and the contact phone number you provide.</li>
          <li><b>Reviews and feedback</b> you submit, along with the name you give.</li>
          <li><b>Technical information:</b> basic request data such as your IP address, which our servers use for security and to prevent abuse (for example, rate-limiting sign-in attempts).</li>
        </ul>
      </section>

      <section>
        <h2>How we use your information</h2>
        <ul>
          <li>To create and secure your account and sign you in.</li>
          <li>To publish your listings and show them to people searching for rooms, flats or flatmates.</li>
          <li>To let interested users contact you about a listing.</li>
          <li>To keep the platform safe, prevent spam and fraud, and fix problems.</li>
          <li>To reply when you contact us.</li>
        </ul>
        <p className="mt-3">We do not sell your personal information.</p>
      </section>

      <section>
        <h2>What other users can see</h2>
        <p>
          Listings you publish are public. The contact phone number on a listing is shown to signed-in users so they can call or message you
          on WhatsApp. Please only include information in a listing that you are comfortable sharing.
        </p>
      </section>

      <section>
        <h2>Service providers</h2>
        <p>We use trusted third parties to run FlatFolks, and they process data only to provide their service to us:</p>
        <ul>
          <li><b>Supabase</b> for our database and for storing uploaded photos.</li>
          <li><b>Resend</b> for sending sign-in codes by email.</li>
          <li><b>Google Analytics</b> to understand how visitors use the site (pages viewed, device and approximate location), so we can improve it.</li>
          <li>Our hosting provider, which serves the website.</li>
        </ul>
        <p className="mt-3">We may also share information if required by law or to protect the rights and safety of our users.</p>
      </section>

      <section>
        <h2>Cookies and local storage</h2>
        <p>
          We use a secure cookie to keep you signed in, and your browser&apos;s local storage to remember things like your profile details and
          chat requests on your device. These are needed for the site to work. You can clear them at any time from your browser settings, which
          will sign you out.
        </p>
        <p className="mt-3">
          We also use Google Analytics, which sets its own cookies to count visits and see which pages are used. It doesn&apos;t receive your name,
          email or phone number. You can block these cookies in your browser or use Google&apos;s{" "}
          <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">opt-out add-on</a>.
        </p>
      </section>

      <section>
        <h2>Data retention</h2>
        <p>
          We keep your account and listings for as long as your account is active. Sign-in codes expire after 10 minutes. You can ask us to delete
          your account and listings at any time.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <ul>
          <li>You can view and edit your profile from your <Link href="/profile">profile page</Link>.</li>
          <li>You can edit or remove your listings from your <Link href="/dashboard">dashboard</Link>.</li>
          <li>To access, correct or delete your personal information, email us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</li>
        </ul>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          We take reasonable measures to protect your information, including encrypted connections (HTTPS) and one-time codes instead of stored
          passwords. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>FlatFolks is intended for people aged 18 and over. We do not knowingly collect information from children.</p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>We may update this policy from time to time. When we do, we will change the &ldquo;Last updated&rdquo; date at the top of this page.</p>
      </section>

      <section>
        <h2>Contact us</h2>
        <p>
          Questions about this policy? Email us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or visit our{" "}
          <Link href="/contact">Contact page</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
