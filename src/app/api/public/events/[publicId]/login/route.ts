import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import {
  createPublicEventToken,
  PUBLIC_EVENT_COOKIE,
  SESSION_DURATION_SECONDS,
} from "@/lib/publicEventAuth";

interface RouteContext {
  params: Promise<{
    publicId: string;
  }>;
}

interface LoginRequestBody {
  code?: string;
}

function normalizeEventCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { publicId } =
      await context.params;

    const normalizedPublicId =
      publicId.trim();

    if (!normalizedPublicId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Public event ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    let body: LoginRequestBody;

    try {
      body =
        (await request.json()) as LoginRequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid request body.",
        },
        {
          status: 400,
        },
      );
    }

    const submittedCode =
      normalizeEventCode(
        String(body.code ?? ""),
      );

    if (!submittedCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter the event code.",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const event =
      await Event.findOne({
        publicId: normalizedPublicId,
      }).select(
        "_id name publicId code status",
      );

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: "Event not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (event.status === "draft") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This event is not currently available.",
        },
        {
          status: 403,
        },
      );
    }

    const storedCode =
      normalizeEventCode(
        String(event.code ?? ""),
      );

    if (
      !storedCode ||
      submittedCode !== storedCode
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Incorrect event code.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Use the normalized URL publicId here.
     *
     * Mongoose types publicId as possibly undefined,
     * while the normalized URL value is guaranteed to
     * exist at this point.
     */
    const token =
      await createPublicEventToken(
        event._id.toString(),
        normalizedPublicId,
      );

    const response =
      NextResponse.json({
        success: true,
        message:
          "Event access granted.",
        data: {
          eventId:
            event._id.toString(),
          publicId:
            normalizedPublicId,
          name: event.name,
        },
      });

    response.cookies.set({
      name: PUBLIC_EVENT_COOKIE,
      value: token,
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge:
        SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (error) {
    console.error(
      "Public event login error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to authenticate this event.",
      },
      {
        status: 500,
      },
    );
  }
}