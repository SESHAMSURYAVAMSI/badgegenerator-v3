import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

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
      "Cache-Control":
        "private, no-store, max-age=0",
      "X-Content-Type-Options":
        "nosniff",
      "Referrer-Policy":
        "no-referrer",
    },
  });
}

function escapeRegex(value: string): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const { publicId } =
      await context.params;

    const normalizedPublicId =
      publicId?.trim();

    if (
      !normalizedPublicId ||
      normalizedPublicId.length < 20 ||
      normalizedPublicId.length > 100
    ) {
      return jsonResponse(
        {
          message:
            "Invalid public link.",
        },
        400,
      );
    }

    await connectDB();

    /*
     * Find the event using the public URL ID.
     */
    const event =
      await Event.findOne({
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

    const { searchParams } =
      new URL(request.url);

    const query =
      searchParams.get("q")?.trim() || "";

    /*
     * If the public page is opened without
     * a search query, return only event details.
     */
    if (!query) {
      return jsonResponse({
        success: true,
        event: {
          name: String(
            event.name ?? "",
          ),
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
          message:
            "Search query is too long.",
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
     * Attendee does NOT have a "status"
     * field.
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
        name: String(
          event.name ?? "",
        ),
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
        message:
          "Unable to search badges.",
      },
      500,
    );
  }
}