import { NextResponse } from "next/server";
import { loginUser, registerUser } from "@/lib/database";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json() as { action?: string; name?: string; email?: string; phone?: string; password?: string };
  if (!body.password || (!body.email?.trim() && !body.phone?.trim()) || (body.action === "signup" && (!body.email?.trim() || !body.phone?.trim()))) return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
  if (body.password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  try {
    const user = body.action === "signup"
      ? await registerUser({ name: body.name?.trim() || body.email!.split("@")[0], email: body.email!, phone: body.phone, password: body.password })
      : await loginUser({ email: body.email, phone: body.phone, password: body.password });
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed.";
    return NextResponse.json({ error: message }, { status: message.includes("already exists") ? 409 : 401 });
  }
}
