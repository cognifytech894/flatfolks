import { NextResponse } from "next/server";
import { updateUser } from "@/lib/database";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json() as { name?: string; email?: string; phone?: string; location?: string; gender?: "Male" | "Female" };
  if (body.name !== undefined && !body.name.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (body.gender !== undefined && !["Male", "Female"].includes(body.gender)) return NextResponse.json({ error: "Invalid gender." }, { status: 400 });
  try { return NextResponse.json({ user: await updateUser((await params).id, body) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update profile." }, { status: 400 }); }
}
