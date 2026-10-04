import { auth } from "@/auth";
import { NextResponse } from "next/server";

import {
  getPublicEventSessionFromRequest,
} from "@/lib/publicEventAuth";

export default auth(
  async (request) => {
    const pathname =
      request.nextUrl.pathname;

    const isAuthenticated =
      Boolean(request.auth);

    /*
     * --------------------------------------------------
     * ADMIN ROUTES
     * --------------------------------------------------
     */

    const isDashboardRoute =
      pathname.startsWith("/dashboard");

    if (
      isDashboardRoute &&
      !isAuthenticated
    ) {
      const loginUrl =
        new URL(
          "/admin-login",
          request.nextUrl.origin,
        );

      loginUrl.searchParams.set(
        "callbackUrl",
        pathname,
      );

      return NextResponse.redirect(
        loginUrl,
      );
    }

    /*
     * --------------------------------------------------
     * PUBLIC EVENT ROUTES
     * --------------------------------------------------
     */

    const publicMatch =
      pathname.match(
        /^\/public\/([^/]+)(?:\/(.*))?$/,
      );

    if (publicMatch) {
      const publicId =
        publicMatch[1];

      const remainingPath =
        publicMatch[2] ?? "";

      const isLoginPage =
        remainingPath === "login";

      /*
       * The login page itself must remain public.
       */

      if (!isLoginPage) {
        const publicSession =
          await getPublicEventSessionFromRequest(
            request,
            publicId,
          );

        if (!publicSession) {
          const loginUrl =
            new URL(
              `/public/${encodeURIComponent(
                publicId,
              )}/login`,
              request.nextUrl.origin,
            );

          loginUrl.searchParams.set(
            "callbackUrl",
            pathname,
          );

          return NextResponse.redirect(
            loginUrl,
          );
        }
      }
    }

    return NextResponse.next();
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/public/:path*",
  ],
};