import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/current-admin";
import { isUuid, jsonBody } from "@/lib/json-body";
import { approveFeedback, deleteFeedback } from "@/lib/database";

export const runtime = "nodejs";

async function feedbackId(request: Request) {
  const { id } = await jsonBody(request);
  return isUuid(id) ? id : undefined;
}

/** Approve a testimonial so it shows on the home page. */
export async function PATCH(request: Request) {
  if (!await isAdminSession()) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  const id = await feedbackId(request);
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (!await approveFeedback(id)) return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  return NextResponse.json({ id, approved: true });
}

/** Delete a testimonial (spam, or no longer wanted). */
export async function DELETE(request: Request) {
  if (!await isAdminSession()) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  const id = await feedbackId(request);
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (!await deleteFeedback(id)) return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  return NextResponse.json({ id });
}
