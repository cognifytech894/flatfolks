import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { LegalPage } from "@/components/layout/legal-page";
import { getListingById } from "@/lib/database";
import { verifyRestoreToken } from "@/lib/inactive-posts";
import { listingPath } from "@/lib/seo/listings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Restore your post", robots: { index: false, follow: false } };

const outcomes: Record<string, { title: string; body: string }> = {
  restored: { title: "Your post is back", body: "It's live on FlatFolks again. Your account is now marked active, so it won't be removed unless you're inactive for another 30 days." },
  "already-active": { title: "This post is already live", body: "Nothing to restore: it's visible on FlatFolks." },
  stale: { title: "This link has already been used", body: "The post was restored and later removed again. Use the link in the most recent email, or restore it from My Posts in your dashboard." },
  gone: { title: "This post has been permanently deleted", body: "It was removed more than 30 days ago. You can post it again any time." },
  invalid: { title: "This restore link isn't valid", body: "It may have expired (links last 30 days) or been copied incompletely. You can also restore posts from My Posts in your dashboard." },
};

// Restoring takes a button press (a POST), not just opening the link: email
// scanners open links automatically and would otherwise restore every post.
export default async function RestorePage({ searchParams }: { searchParams: Promise<{ token?: string; result?: string }> }) {
  const { token, result } = await searchParams;
  const outcome = result ? outcomes[result] || outcomes.invalid : undefined;
  if (outcome) {
    return (
      <LegalPage eyebrow="Your post" title={outcome.title}>
        <p className="flex items-start gap-2">{result === "restored" && <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-700" />}{outcome.body}</p>
        <p><Link href="/dashboard">Go to My Posts</Link> · <Link href="/property">Post again</Link></p>
      </LegalPage>
    );
  }

  const secret = process.env.RESTORE_TOKEN_SECRET;
  const verified = token && secret ? verifyRestoreToken(token, secret, new Date()) : null;
  const listing = verified ? await getListingById(verified.listingId) : undefined;
  if (!verified) return <LegalPage eyebrow="Your post" title={outcomes.invalid.title}><p>{outcomes.invalid.body}</p><p><Link href="/dashboard">Go to My Posts</Link></p></LegalPage>;
  if (!listing) return <LegalPage eyebrow="Your post" title={outcomes.gone.title}><p>{outcomes.gone.body}</p><p><Link href="/property">Post again</Link></p></LegalPage>;
  if (listing.status !== "removed_inactive") return <LegalPage eyebrow="Your post" title={outcomes["already-active"].title}><p><Link href={listingPath(listing)}>View your post</Link></p></LegalPage>;

  return (
    <LegalPage eyebrow="Your post" title="Restore your post">
      <p>Your post <b>&ldquo;{listing.title}&rdquo;</b> was removed because there was no activity on your account for 30 days. Restore it to make it visible again.</p>
      <form action="/api/listings/restore" method="post">
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">
          <RotateCcw className="h-4 w-4" />Restore my post
        </button>
      </form>
      <p className="text-sm">Your FlatFolks account is not affected either way.</p>
    </LegalPage>
  );
}
