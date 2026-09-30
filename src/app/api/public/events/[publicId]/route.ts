import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";

interface RouteContext {
  params: Promise<{
    publicId: string;
  }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { publicId } = await context.params;

    const identifier = publicId.trim();

    if (!identifier) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Public event identifier is required.",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    /*
     * First find the event using the permanent
     * publicId generated when the event was created.
     */
    let event = await Event.findOne({
      publicId: identifier,
    })
      .select(
        "name publicId description startDate endDate location status attendeeCount badgeCount",
      )
      .lean();

    /*
     * Backward compatibility:
     *
     * If an older public URL contains a MongoDB
     * ObjectId, allow it to resolve as well.
     */
    if (
      !event &&
      mongoose.Types.ObjectId.isValid(identifier)
    ) {
      event = await Event.findById(identifier)
        .select(
          "name publicId description startDate endDate location status attendeeCount badgeCount",
        )
        .lean();
    }

    if (!event) {
      console.error(
        "❌ Public event not found:",
        identifier,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Event not found. The public event link may be invalid.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Older events may not have a publicId.
     * Create one automatically if necessary.
     */
    let resolvedPublicId =
      event.publicId ?? "";

    if (!resolvedPublicId) {
      resolvedPublicId =
        new mongoose.Types.ObjectId().toString();

      await Event.updateOne(
        {
          _id: event._id,
        },
        {
          $set: {
            publicId: resolvedPublicId,
          },
        },
      );
    }

    /*
     * IMPORTANT:
     *
     * The public scanner expects the event
     * inside `data`.
     */
    return NextResponse.json({
      success: true,

      data: {
        _id: event._id.toString(),

        id: event._id.toString(),

        name: event.name,

        publicId: resolvedPublicId,

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
      "❌ Public event API error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load public event.",
      },
      {
        status: 500,
      },
    );
  }
}