import { NextResponse } from "next/server";
import { createAdminSessionToken, verifyAdminPin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const pin = typeof body.pin === "string" ? body.pin : "";

  if (!verifyAdminPin(pin)) {
    return NextResponse.json({ ok: false, error: "Invalid PIN." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("meera_admin_session", createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("meera_admin_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
}
