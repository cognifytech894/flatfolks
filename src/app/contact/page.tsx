import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { LegalPage } from "@/components/layout/legal-page";
import { contactEmail } from "@/data/contact";
import { siteUrl as baseUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with FlatFolks for help with your account, a listing, or to report a problem.",
  alternates: { canonical: `${baseUrl}/contact` },
  openGraph: { title: "Contact Us", type: "website", siteName: "FlatFolks", url: `${baseUrl}/contact` },
};

export default function ContactPage() {
  return (
    <LegalPage eyebrow="Contact" title="Contact Us">
      <p>
        Have a question, need help with your account or a listing, or want to report a suspicious listing or user? Email us and we&apos;ll get back
        to you as soon as we can.
      </p>

      <a
        href={`mailto:${contactEmail}`}
        className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 !no-underline transition hover:border-blue-200 hover:bg-blue-50"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-600">
          <Mail className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <small className="block text-xs font-medium text-slate-500">Email</small>
          <b className="block break-all text-base text-slate-900">{contactEmail}</b>
        </span>
      </a>

      <section>
        <h2>When you write to us</h2>
        <ul>
          <li>For a listing, include the link to the listing page.</li>
          <li>For your account, write from the email address you sign in with.</li>
          <li>To delete your account or data, say so in your email and we&apos;ll take care of it.</li>
        </ul>
      </section>

      <p>
        See also our <Link href="/privacy-policy">Privacy Policy</Link> and <Link href="/terms">Terms of Use</Link>.
      </p>
    </LegalPage>
  );
}
