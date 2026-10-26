import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from "@/lib/admin-auth";
import { approveFeedback, deleteFeedback } from "@/lib/database";

export const runtime = "nodejs";

async function isAdmin() {
  const cookieStore = await cookies();
  return isValidAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

async function feedbackId(request: Request) {
  const body = await request.json().catch(() => ({})) as { id?: unknown };
  return typeof body.id === "string" && /^[0-9a-f-]{36}$/.test(body.id) ? body.id : undefined;
}

/** Approve a testimonial so it shows on the home page. */
export async function PATCH(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  const id = await feedbackId(request);
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (!await approveFeedback(id)) return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  return NextResponse.json({ id, approved: true });
}

/** Delete a testimonial (spam, or no longer wanted). */
export async function DELETE(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  const id = await feedbackId(request);
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (!await deleteFeedback(id)) return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  return NextResponse.json({ id });
}
