import { after, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/current-user";
import { claimWelcomeEmail, getUserPhoto, touchLastSeen, updateUser } from "@/lib/database";
import { sendWelcomeEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site-url";
import { buildWelcomeEmail } from "@/lib/welcome-email";
import { isAllowedProfilePhoto } from "@/lib/image-storage";
import { jsonBody } from "@/lib/json-body";
import { publicErrorMessage } from "@/lib/public-error";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) return NextResponse.json({ error: "Please log in to update your profile." }, { status: 401 });
  if (sessionUserId !== id) return NextResponse.json({ error: "You can only update your own profile." }, { status: 403 });
  await touchLastSeen(sessionUserId);

  const body = await jsonBody(request) as { name?: string; email?: string; phone?: string; location?: string; gender?: "Male" | "Female"; photo?: string };
  if ((["name", "phone", "location", "photo"] as const).some((field) => body[field] !== undefined && typeof body[field] !== "string")) return NextResponse.json({ error: "Invalid profile details." }, { status: 400 });
  // The email is the sign-in identity, proven by OTP. Changing it here, unverified,
  // would let someone claim another person's address before they sign up.
  if (body.email !== undefined) return NextResponse.json({ error: "Your sign-in email can't be changed here. Please contact support." }, { status: 400 });
  if (body.name !== undefined && !body.name.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (body.name !== undefined && body.name.trim().length > 80) return NextResponse.json({ error: "Name must be 80 characters or fewer." }, { status: 400 });
  if (body.location !== undefined && body.location.length > 160) return NextResponse.json({ error: "Location must be 160 characters or fewer." }, { status: 400 });
  if (body.phone !== undefined && body.phone.trim() && !/^[\d\s+-]{7,20}$/.test(body.phone.trim())) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  if (body.gender !== undefined && !["Male", "Female"].includes(body.gender)) return NextResponse.json({ error: "Invalid gender." }, { status: 400 });
  // Keeping the current photo is always fine; a new one must be the member's own upload.
  if (body.photo !== undefined && !isAllowedProfilePhoto(body.photo, id) && body.photo !== await getUserPhoto(id)) return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  try {
    const user = await updateUser(id, body);
    // A new member's welcome email goes out once, when they first save their
    // name (the step right after the sign-up OTP), greeting them by first
    // name. Sent after the response, and a failure never blocks the save.
    if (body.name !== undefined && await claimWelcomeEmail(id).catch((error) => { console.error("Could not claim welcome email:", error); return false; })) {
      after(async () => {
        try { await sendWelcomeEmail(buildWelcomeEmail(user.email, siteUrl, user.name)); }
        catch (error) { console.error("Failed to send welcome email:", error); }
      });
    }
    return NextResponse.json({ user });
  }
  catch (error) { return NextResponse.json({ error: publicErrorMessage(error, "Could not update profile.") }, { status: 400 }); }
}
