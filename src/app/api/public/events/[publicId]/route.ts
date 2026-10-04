import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import {
  getPublicEventSession,
} from "@/lib/publicEventAuth";

interface RouteContext {
  params: Promise<{
    publicId: string;
  }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const { publicId } =
      await context.params;

    const identifier =
      publicId.trim();

    if (!identifier) {
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

    /*
     * --------------------------------------------------
     * PUBLIC EVENT AUTHENTICATION
     * --------------------------------------------------
     */

    const publicSession =
      await getPublicEventSession(
        request,
        identifier,
      );

    if (!publicSession) {
      return NextResponse.json(
        {
          success: false,
          code: "PUBLIC_AUTH_REQUIRED",
          message:
            "Event authentication is required.",
        },
        {
          status: 401,
        },
      );
    }

    await connectDB();

    let event =
      await Event.findOne({
        publicId: identifier,
      })
        .select(
          "name publicId description startDate endDate location status attendeeCount badgeCount",
        )
        .lean();

    /*
     * Keep the existing ObjectId fallback.
     */
    if (
      !event &&
      mongoose.Types.ObjectId.isValid(
        identifier,
      )
    ) {
      event =
        await Event.findById(identifier)
          .select(
            "name publicId description startDate endDate location status attendeeCount badgeCount",
          )
          .lean();
    }

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

    /*
     * --------------------------------------------------
     * VERIFY SESSION BELONGS TO THIS EVENT
     * --------------------------------------------------
     */

    if (
      publicSession.eventId !==
      event._id.toString()
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "EVENT_SESSION_MISMATCH",
          message:
            "This event session does not belong to the requested event.",
        },
        {
          status: 403,
        },
      );
    }

    let resolvedPublicId =
      event.publicId ?? "";

    /*
     * Normally every newly-created event should already
     * have a publicId.
     *
     * Keep the legacy fallback for older events.
     */
    if (!resolvedPublicId) {
      resolvedPublicId =
        new mongoose.Types.ObjectId().toString();

      await Event.updateOne(
        {
          _id: event._id,
        },
        {
          $set: {
            publicId:
              resolvedPublicId,
          },
        },
      );
    }

    /*
     * The session itself was authenticated against the
     * URL publicId, so ensure the resolved event publicId
     * is also consistent.
     */
    if (
      publicSession.publicId !==
      resolvedPublicId
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "EVENT_SESSION_MISMATCH",
          message:
            "The event session is not valid for this event.",
        },
        {
          status: 403,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: event._id.toString(),
        id: event._id.toString(),
        name: event.name,
        publicId:
          resolvedPublicId,
        description:
          event.description ?? "",
        startDate: event.startDate
          ? event.startDate.toISOString()
          : undefined,
        endDate: event.endDate
          ? event.endDate.toISOString()
          : undefined,
        location:
          event.location ?? "",
        status: event.status,
        attendeeCount:
          event.attendeeCount ?? 0,
        badgeCount:
          event.badgeCount ?? 0,
      },
    });
  } catch (error) {
    console.error(
      "Public event API error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load event.",
      },
      {
        status: 500,
      },
    );
  }
}