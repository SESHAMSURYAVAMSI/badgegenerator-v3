import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getPublicEventSessionFromRequest } from "@/lib/publicEventAuth";

export default auth(async (request) => {
  const pathname = request.nextUrl.pathname;
  const isAuthenticated = Boolean(request.auth);

  // Admin routes
  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    const loginUrl = new URL("/admin-login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Public event routes. The signed cookie now accepts either a slug
  // or a legacy permanent publicId as the URL segment.
  const publicMatch = pathname.match(/^\/public\/([^/]+)(?:\/(.*))?$/);
  if (publicMatch) {
    const identifier = decodeURIComponent(publicMatch[1]);
    const remainingPath = publicMatch[2] ?? "";
    const isLoginPage = remainingPath === "login";

    if (!isLoginPage) {
      const publicSession = await getPublicEventSessionFromRequest(request, identifier);
      if (!publicSession) {
        const loginUrl = new URL(
          `/public/${encodeURIComponent(identifier)}/login`,
          request.nextUrl.origin,
        );
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/public/:path*"],
};
