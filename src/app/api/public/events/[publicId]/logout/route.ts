import { NextResponse } from "next/server";

import {
  PUBLIC_EVENT_COOKIE,
} from "@/lib/publicEventAuth";

interface RouteContext {
  params: Promise<{
    publicId: string;
  }>;
}

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    await context.params;

    const response =
      NextResponse.json({
        success: true,
        message:
          "Event session ended.",
      });

    response.cookies.set({
      name: PUBLIC_EVENT_COOKIE,
      value: "",
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error(
      "Public event logout error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to end the event session.",
      },
      {
        status: 500,
      },
    );
  }
}