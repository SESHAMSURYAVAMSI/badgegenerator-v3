import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((request) => {
  const isAuthenticated = Boolean(request.auth);

  const isDashboardRoute =
    request.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboardRoute && !isAuthenticated) {
    const loginUrl = new URL(
      "/admin-login",
      request.nextUrl.origin,
    );

    loginUrl.searchParams.set(
      "callbackUrl",
      request.nextUrl.pathname,
    );

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};