import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Attendee from "@/models/Attendee";
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
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { eventId } = await context.params;

    await connectDB();

    const event = await Event.findOne({
      _id: eventId,
      createdBy: session.user.id,
    });

    if (!event) {
      return NextResponse.json(
        {
          message: "Event not found",
        },
        {
          status: 404,
        },
      );
    }

    const attendees = await Attendee.find({
      eventId: event._id,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    return NextResponse.json({
      success: true,
      attendees,
    });
  } catch (error) {
    console.error(
      "GET attendees error:",
      error,
    );

    return NextResponse.json(
      {
        message: "Failed to fetch attendees",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { eventId } = await context.params;

    const body = await request.json();

    const name = String(
      body.name ?? "",
    ).trim();

    const email = String(
      body.email ?? "",
    )
      .trim()
      .toLowerCase();

    const category = String(
      body.category ?? "",
    ).trim();

    /*
     * Registration number is now completely
     * controlled by the user.
     *
     * BadgeFlow will NOT generate one.
     */
    const registrationNumber = String(
      body.registrationNumber ?? "",
    ).trim();

    /*
     * QR value can be supplied separately.
     *
     * If no QR value is supplied,
     * the provided registration number
     * will be used.
     */
    const qrValue = String(
      body.qrValue ??
        registrationNumber,
    ).trim();

    if (!name) {
      return NextResponse.json(
        {
          message: "Name is required",
        },
        {
          status: 400,
        },
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          message: "Email is required",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Registration number is mandatory.
     *
     * IMPORTANT:
     * There is NO automatic fallback here.
     */
    if (!registrationNumber) {
      return NextResponse.json(
        {
          message:
            "Registration number is required",
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
    });

    if (!event) {
      return NextResponse.json(
        {
          message: "Event not found",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Check whether the supplied
     * registration number already exists
     * for this event.
     */
    const existing =
      await Attendee.findOne({
        eventId: event._id,
        registrationNumber,
      });

    if (existing) {
      return NextResponse.json(
        {
          message:
            "Registration number already exists for this event.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Create attendee using the EXACT
     * registration number supplied by
     * the user.
     */
    const attendee =
      await Attendee.create({
        eventId: event._id,
        name,
        email,
        category,

        registrationNumber,

        qrValue:
          qrValue ||
          registrationNumber,

        badgeGenerated: false,
        badgeUrl: "",
        badgeGenerationCount: 0,
      });

    /*
     * Update total attendee count.
     */
    await Event.updateOne(
      {
        _id: event._id,
      },
      {
        $inc: {
          attendeeCount: 1,
        },
      },
    );

    return NextResponse.json(
      {
        success: true,
        attendee,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST attendee error:",
      error,
    );

    return NextResponse.json(
      {
        message: "Failed to create attendee",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { eventId } = await context.params;

    const body = await request.json();

    const attendeeId = String(
      body.attendeeId ?? "",
    ).trim();

    if (!attendeeId) {
      return NextResponse.json(
        {
          message:
            "attendeeId is required.",
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
    });

    if (!event) {
      return NextResponse.json(
        {
          message: "Event not found",
        },
        {
          status: 404,
        },
      );
    }

    const attendee =
      await Attendee.findOne({
        _id: attendeeId,
        eventId: event._id,
      });

    if (!attendee) {
      return NextResponse.json(
        {
          message:
            "Attendee not found",
        },
        {
          status: 404,
        },
      );
    }

    const badgeGenerated =
      body.badgeGenerated;

    const badgeUrl =
      body.badgeUrl !== undefined
        ? String(body.badgeUrl)
        : attendee.badgeUrl;

    /*
     * Badge has been generated.
     */
    if (
      badgeGenerated === true
    ) {
      attendee.badgeGenerated =
        true;

      attendee.badgeUrl =
        badgeUrl;

      attendee.badgeGeneratedAt =
        new Date();

      attendee.badgeGenerationCount =
        (attendee.badgeGenerationCount ??
          0) + 1;
    }

    /*
     * Badge generation has been reset.
     */
    else if (
      badgeGenerated === false
    ) {
      attendee.badgeGenerated =
        false;

      attendee.badgeUrl =
        badgeUrl;

      attendee.badgeGeneratedAt =
        undefined;
    }

    /*
     * Only update badge URL if it was
     * explicitly provided.
     */
    else if (
      body.badgeUrl !== undefined
    ) {
      attendee.badgeUrl =
        badgeUrl;
    }

    await attendee.save();

    /*
     * Recalculate generated badge count
     * from the actual attendees.
     */
    const generatedBadges =
      await Attendee.countDocuments({
        eventId: event._id,
        badgeGenerated: true,
      });

    await Event.updateOne(
      {
        _id: event._id,
      },
      {
        $set: {
          badgeCount:
            generatedBadges,
        },
      },
    );

    return NextResponse.json({
      success: true,
      attendee,
      generatedBadges,
    });
  } catch (error) {
    console.error(
      "PATCH attendee badge error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Failed to update badge generation status",
      },
      {
        status: 500,
      },
    );
  }
}