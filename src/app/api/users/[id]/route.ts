import { NextResponse } from "next/server";
import { updateUser } from "@/lib/database";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json() as { name?: string; email?: string; phone?: string };
  if (!body.name?.trim() || !body.email?.trim() || !body.phone?.trim()) return NextResponse.json({ error: "Name, email, and phone number are required." }, { status: 400 });
  try { return NextResponse.json({ user: await updateUser((await params).id, { name: body.name, email: body.email, phone: body.phone }) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update profile." }, { status: 400 }); }
}
