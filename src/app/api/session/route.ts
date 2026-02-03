import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { logger } from "@/lib/logging/logger";
import { createRequestContext } from "@/lib/logging/request-context";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export async function POST(request: Request) {
  const traceHeader = request.headers.get("x-cloud-trace-context") ?? undefined;
  const context = createRequestContext({ route: "/api/session", feature: "session" });

  try {
    const { idToken } = (await request.json()) as { idToken?: string };
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken." }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });

    const response = NextResponse.json({ status: "ok" });
    response.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    await logger.info("Session created", context, traceHeader);
    return response;
  } catch (error) {
    await logger.error("Failed to create session cookie", {
      ...context,
      error: String(error),
    }, traceHeader);
    return NextResponse.json({ error: "Failed to create session cookie." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const traceHeader = request.headers.get("x-cloud-trace-context") ?? undefined;
  const context = createRequestContext({ route: "/api/session", feature: "session" });

  const response = NextResponse.json({ status: "ok" });
  response.cookies.set("__session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  await logger.info("Session cleared", context, traceHeader);
  return response;
}
