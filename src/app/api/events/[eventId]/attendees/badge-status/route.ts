import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";

import Event from "@/models/Event";
import Attendee from "@/models/Attendee";

interface RouteContext {
  params: Promise<{
    eventId: string;
  }>;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 },
      );
    }

    const { eventId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { message: "Valid event ID is required." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      attendeeIds?: unknown;
    };

    if (
      !Array.isArray(body.attendeeIds) ||
      body.attendeeIds.length === 0
    ) {
      return NextResponse.json(
        { message: "At least one attendee ID is required." },
        { status: 400 },
      );
    }

    const attendeeIds = [
      ...new Set(
        body.attendeeIds
          .filter(
            (id): id is string =>
              typeof id === "string" &&
              mongoose.Types.ObjectId.isValid(id),
          )
          .map((id) => id.trim()),
      ),
    ];

    if (attendeeIds.length === 0) {
      return NextResponse.json(
        { message: "No valid attendee IDs were provided." },
        { status: 400 },
      );
    }

    if (attendeeIds.length > 1000) {
      return NextResponse.json(
        { message: "A maximum of 1000 attendees can be updated at once." },
        { status: 400 },
      );
    }

    await connectDB();

    const event = await Event.findOne({
      _id: eventId,
      createdBy: session.user.id,
    }).select("_id");

    if (!event) {
      return NextResponse.json(
        { message: "Event not found." },
        { status: 404 },
      );
    }

    const now = new Date();

    const result = await Attendee.updateMany(
      {
        eventId: event._id,
        _id: {
          $in: attendeeIds.map(
            (id) => new mongoose.Types.ObjectId(id),
          ),
        },
      },
      {
        $set: {
          badgeGenerated: true,
          badgeGeneratedAt: now,
        },
        $inc: {
          badgeGenerationCount: 1,
        },
      },
    );

    const [attendeeCount, generatedBadges] = await Promise.all([
      Attendee.countDocuments({
        eventId: event._id,
      }),
      Attendee.countDocuments({
        eventId: event._id,
        badgeGenerated: true,
      }),
    ]);

    await Event.updateOne(
      { _id: event._id },
      {
        $set: {
          attendeeCount,
          badgeCount: generatedBadges,
        },
      },
    );

    return NextResponse.json({
      success: true,
      requested: attendeeIds.length,
      updated: result.modifiedCount,
      attendeeCount,
      generatedBadges,
    });
  } catch (error) {
    console.error("Bulk badge status update error:", error);

    return NextResponse.json(
      { message: "Failed to update badge generation status." },
      { status: 500 },
    );
  }
}