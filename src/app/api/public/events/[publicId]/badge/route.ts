import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getPublicEventSession } from "@/lib/publicEventAuth";

import Event from "@/models/Event";
import Attendee from "@/models/Attendee";

interface RouteContext {
  params: Promise<{
    publicId: string;
  }>;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const { publicId } = await context.params;

    const normalizedPublicId = publicId?.trim();

    if (
      !normalizedPublicId ||
      normalizedPublicId.length < 20 ||
      normalizedPublicId.length > 100
    ) {
      return jsonResponse(
        {
          success: false,
          message: "Invalid public link.",
        },
        400,
      );
    }

    /*
     * ---------------------------------------------------------
     * PUBLIC EVENT AUTHENTICATION
     * ---------------------------------------------------------
     *
     * The public event must be authenticated using the
     * separate public-event session.
     *
     * This is intentionally NOT the admin NextAuth session.
     */
    const publicSession =
      await getPublicEventSession(
        request,
        normalizedPublicId,
      );

    if (!publicSession) {
      return jsonResponse(
        {
          success: false,
          message:
            "Public event authentication is required.",
          code: "PUBLIC_AUTH_REQUIRED",
        },
        401,
      );
    }

    await connectDB();

    /*
     * Find the event using the permanent public ID.
     */
    const event = await Event.findOne({
      publicId: normalizedPublicId,
    }).lean();

    if (!event) {
      return jsonResponse(
        {
          success: false,
          message:
            "This public badge link is no longer valid. Please ask the event organizer for the latest badge link.",
        },
        404,
      );
    }

    /*
     * ---------------------------------------------------------
     * EVENT SESSION MATCH
     * ---------------------------------------------------------
     *
     * Prevent a valid session for Event A from being used
     * against Event B.
     */
    if (
      publicSession.eventId !==
      event._id.toString()
    ) {
      return jsonResponse(
        {
          success: false,
          message:
            "This public event session does not belong to this event.",
          code: "EVENT_SESSION_MISMATCH",
        },
        403,
      );
    }

    /*
     * Also verify the public ID stored in the session.
     */
    if (
      publicSession.publicId !==
      normalizedPublicId
    ) {
      return jsonResponse(
        {
          success: false,
          message:
            "Invalid public event session.",
          code: "INVALID_PUBLIC_SESSION",
        },
        403,
      );
    }

    /*
     * Do not expose draft events through the public portal.
     */
    if (event.status === "draft") {
      return jsonResponse(
        {
          success: false,
          message:
            "This event is not currently available.",
        },
        403,
      );
    }

    const { searchParams } =
      new URL(request.url);

    const query =
      searchParams.get("q")?.trim() || "";

    /*
     * If the public page is opened without a
     * search query, return only event details.
     */
    if (!query) {
      return jsonResponse({
        success: true,
        event: {
          name: String(event.name ?? ""),
          description: String(
            event.description ?? "",
          ),
          location: String(
            event.location ?? "",
          ),
        },
        attendees: [],
      });
    }

    if (query.length > 100) {
      return jsonResponse(
        {
          success: false,
          message: "Search query is too long.",
        },
        400,
      );
    }

    const regex = new RegExp(
      escapeRegex(query),
      "i",
    );

    /*
     * IMPORTANT:
     *
     * Attendee does NOT have a "status" field.
     *
     * BadgeFlow uses:
     *
     * badgeGenerated: true
     *
     * to indicate that a badge is ready.
     */
    const attendees =
      await Attendee.find({
        eventId: event._id,
        badgeGenerated: true,
        $or: [
          {
            registrationNumber: regex,
          },
          {
            name: regex,
          },
          {
            email: regex,
          },
        ],
      })
        .select(
          "_id name email registrationNumber category qrValue badgeGenerated badgeUrl badgeGeneratedAt badgeGenerationCount",
        )
        .sort({
          name: 1,
        })
        .limit(10)
        .lean();

    return jsonResponse({
      success: true,
      event: {
        name: String(event.name ?? ""),
        description: String(
          event.description ?? "",
        ),
        location: String(
          event.location ?? "",
        ),
      },
      attendees,
    });
  } catch (error) {
    console.error(
      "Public badge search error:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        message: "Unable to search badges.",
      },
      500,
    );
  }
}