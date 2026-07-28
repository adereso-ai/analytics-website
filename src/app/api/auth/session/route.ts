import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  createSessionCookie,
  getSessionUser,
} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return NextResponse.json({ user });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string };
    if (!body.idToken) {
      return NextResponse.json({ error: "Falta idToken" }, { status: 400 });
    }
    const user = await createSessionCookie(body.idToken);
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auth error";
    const status = message.includes("@") ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
