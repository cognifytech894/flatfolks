import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { touchLastSeen, updateUser } from "@/lib/database";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { isAllowedProfilePhoto } from "@/lib/image-storage";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const sessionUserId = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!sessionUserId) return NextResponse.json({ error: "Please log in to update your profile." }, { status: 401 });
  if (sessionUserId !== id) return NextResponse.json({ error: "You can only update your own profile." }, { status: 403 });
  await touchLastSeen(sessionUserId);

  const body = await request.json() as { name?: string; email?: string; phone?: string; location?: string; gender?: "Male" | "Female"; photo?: string };
  // The email is the sign-in identity, proven by OTP. Changing it here, unverified,
  // would let someone claim another person's address before they sign up.
  if (body.email !== undefined) return NextResponse.json({ error: "Your sign-in email can't be changed here. Please contact support." }, { status: 400 });
  if (body.name !== undefined && !body.name.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (body.name !== undefined && body.name.trim().length > 80) return NextResponse.json({ error: "Name must be 80 characters or fewer." }, { status: 400 });
  if (body.location !== undefined && body.location.length > 160) return NextResponse.json({ error: "Location must be 160 characters or fewer." }, { status: 400 });
  if (body.phone !== undefined && body.phone.trim() && !/^[\d\s+-]{7,20}$/.test(body.phone.trim())) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  if (body.gender !== undefined && !["Male", "Female"].includes(body.gender)) return NextResponse.json({ error: "Invalid gender." }, { status: 400 });
  if (body.photo !== undefined && !isAllowedProfilePhoto(body.photo)) return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  try { return NextResponse.json({ user: await updateUser(id, body) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update profile." }, { status: 400 }); }
}
