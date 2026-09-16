import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateUser } from "@/lib/database";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const sessionUserId = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!sessionUserId || sessionUserId !== id) return NextResponse.json({ error: "You can only update your own profile." }, { status: 403 });

  const body = await request.json() as { name?: string; email?: string; phone?: string; location?: string; gender?: "Male" | "Female"; photo?: string };
  if (body.name !== undefined && !body.name.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (body.gender !== undefined && !["Male", "Female"].includes(body.gender)) return NextResponse.json({ error: "Invalid gender." }, { status: 400 });
  if (body.photo !== undefined && body.photo.length > 200_000) return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  try { return NextResponse.json({ user: await updateUser(id, body) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update profile." }, { status: 400 }); }
}
