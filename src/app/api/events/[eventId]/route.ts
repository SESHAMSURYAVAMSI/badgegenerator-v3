import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";

interface RouteContext {
  params: Promise<{
    eventId: string;
  }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          message: "Event ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const event = await Event.findOne({
      _id: eventId,
      createdBy: session.user.id,
    }).lean();

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

    return NextResponse.json({
      success: true,
      event: {
        _id: event._id.toString(),
        name: event.name,
        slug: event.slug,
        code: event.code,
        description: event.description ?? "",
        startDate: event.startDate ?? null,
        endDate: event.endDate ?? null,
        location: event.location ?? "",
        status: event.status,
        attendeeCount: event.attendeeCount ?? 0,
        badgeCount: event.badgeCount ?? 0,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/events/[eventId] failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch event.",
      },
      {
        status: 500,
      },
    );
  }
}