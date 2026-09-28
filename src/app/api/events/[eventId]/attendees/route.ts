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

function normalizeRegistrationNumber(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
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

    const { eventId } =
      await context.params;

    if (!eventId) {
      return NextResponse.json(
        {
          message:
            "Event ID is required.",
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
          message: "Event not found",
        },
        {
          status: 404,
        },
      );
    }

    const { searchParams } =
      new URL(request.url);

    const page = Math.max(
      1,
      Number(
        searchParams.get("page") || "1",
      ),
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number(
          searchParams.get("limit") ||
            "10",
        ),
      ),
    );

    const search =
      searchParams
        .get("search")
        ?.trim() || "";

    const skip =
      (page - 1) * limit;

    const filter: Record<
      string,
      unknown
    > = {
      eventId: event._id,
    };

    if (search) {
      const escapedSearch =
        search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );

      const regex = new RegExp(
        escapedSearch,
        "i",
      );

      filter.$or = [
        {
          name: regex,
        },
        {
          email: regex,
        },
        {
          phone: regex,
        },
        {
          registrationNumber: regex,
        },
        {
          category: regex,
        },
        {
          qrValue: regex,
        },
      ];
    }

    const [
      attendees,
      total,
    ] = await Promise.all([
      Attendee.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Attendee.countDocuments(
        filter,
      ),
    ]);

    const totalPages =
      Math.max(
        1,
        Math.ceil(total / limit),
      );

    return NextResponse.json({
      success: true,

      attendees,

      pagination: {
        page,
        limit,
        total,
        totalPages,

        hasNextPage:
          page < totalPages,

        hasPreviousPage:
          page > 1,
      },
    });
  } catch (error) {
    console.error(
      "GET attendees error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Failed to fetch attendees",
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

    const { eventId } =
      await context.params;

    if (!eventId) {
      return NextResponse.json(
        {
          message:
            "Event ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      await request.json();

    const name = String(
      body.name ?? "",
    ).trim();

    const email = String(
      body.email ?? "",
    )
      .trim()
      .toLowerCase();

    const phone = String(
      body.phone ?? "",
    ).trim();

    const category = String(
      body.category ?? "",
    ).trim();

    /*
     * Registration number belongs
     * to THIS EVENT only.
     */
    const registrationNumber =
      normalizeRegistrationNumber(
        body.registrationNumber,
      );

    const qrValue = String(
      body.qrValue ??
        registrationNumber,
    ).trim();

    if (!name) {
      return NextResponse.json(
        {
          message:
            "Name is required",
        },
        {
          status: 400,
        },
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          message:
            "Email is required",
        },
        {
          status: 400,
        },
      );
    }

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
          message:
            "Event not found",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * IMPORTANT:
     *
     * This duplicate check is scoped
     * ONLY to the current event.
     *
     * Same registration number can be
     * used in another event.
     */
    const existing =
      await Attendee.findOne({
        eventId: event._id,
        registrationNumber,
      }).lean();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Registration number ${registrationNumber} already exists for this event.`,
        },
        {
          status: 409,
        },
      );
    }

    let attendee;

    try {
      attendee =
        await Attendee.create({
          eventId: event._id,

          name,
          email,
          phone,

          registrationNumber,

          category,

          qrValue:
            qrValue ||
            registrationNumber,

          badgeGenerated: false,
          badgeUrl: "",
          badgeGenerationCount: 0,
        });
    } catch (error) {
      /*
       * Handles a race condition where
       * another request creates the same
       * registration number at exactly
       * the same time.
       */
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: number })
          .code === 11000
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Registration number ${registrationNumber} already exists for this event.`,
          },
          {
            status: 409,
          },
        );
      }

      throw error;
    }

    /*
     * Recalculate attendee count from
     * the actual event's attendees.
     */
    const attendeeCount =
      await Attendee.countDocuments({
        eventId: event._id,
      });

    const badgeCount =
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
          attendeeCount,
          badgeCount,
        },
      },
    );

    return NextResponse.json(
      {
        success: true,
        attendee,
        attendeeCount,
        badgeCount,
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
        message:
          "Failed to create attendee",
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

    const { eventId } =
      await context.params;

    const body =
      await request.json();

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
          message:
            "Event not found",
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
    } else if (
      badgeGenerated === false
    ) {
      attendee.badgeGenerated =
        false;

      attendee.badgeUrl =
        badgeUrl;

      attendee.badgeGeneratedAt =
        undefined;
    } else if (
      body.badgeUrl !== undefined
    ) {
      attendee.badgeUrl =
        badgeUrl;
    }

    await attendee.save();

    const generatedBadges =
      await Attendee.countDocuments({
        eventId: event._id,
        badgeGenerated: true,
      });

    const attendeeCount =
      await Attendee.countDocuments({
        eventId: event._id,
      });

    await Event.updateOne(
      {
        _id: event._id,
      },
      {
        $set: {
          attendeeCount,
          badgeCount:
            generatedBadges,
        },
      },
    );

    return NextResponse.json({
      success: true,
      attendee,
      generatedBadges,
      attendeeCount,
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