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

function createRegistrationNumber(): string {
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `REG-${Date.now()
    .toString()
    .slice(-6)}-${randomPart}`;
}

async function getOwnedEvent(
  eventId: string,
  userId: string,
) {
  return Event.findOne({
    _id: eventId,
    createdBy: userId,
  });
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

    const { searchParams } = new URL(request.url);

    const search =
      searchParams.get("search")?.trim() || "";

    const requestedPage = Number(
      searchParams.get("page") || "1",
    );

    const requestedLimit = Number(
      searchParams.get("limit") || "10",
    );

    const page =
      Number.isFinite(requestedPage) &&
      requestedPage > 0
        ? Math.floor(requestedPage)
        : 1;

    const limit =
      Number.isFinite(requestedLimit) &&
      requestedLimit > 0
        ? Math.min(Math.floor(requestedLimit), 100)
        : 10;

    await connectDB();

    const event = await getOwnedEvent(
      eventId,
      session.user.id,
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

    const filter: Record<string, unknown> = {
      eventId: event._id,
    };

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

      const searchRegex = new RegExp(
        escapedSearch,
        "i",
      );

      filter.$or = [
        {
          name: searchRegex,
        },
        {
          email: searchRegex,
        },
        {
          phone: searchRegex,
        },
        {
          registrationNumber: searchRegex,
        },
        {
          category: searchRegex,
        },
        {
          qrValue: searchRegex,
        },
      ];
    }

    const total = await Attendee.countDocuments(
      filter,
    );

    const totalPages = Math.max(
      Math.ceil(total / limit),
      1,
    );

    const safePage = Math.min(
      page,
      totalPages,
    );

    const skip = (safePage - 1) * limit;

    const attendees = await Attendee.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      attendees: attendees.map((attendee) => ({
        _id: attendee._id.toString(),
        eventId: attendee.eventId.toString(),
        name: attendee.name,
        email: attendee.email ?? "",
        phone: attendee.phone ?? "",
        registrationNumber:
          attendee.registrationNumber,
        category: attendee.category ?? "",
        qrValue: attendee.qrValue,
        status: attendee.status,
        createdAt: attendee.createdAt,
        updatedAt: attendee.updatedAt,
      })),
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/events/[eventId]/attendees failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch attendees.",
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

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    const providedRegistrationNumber =
      typeof body.registrationNumber === "string"
        ? body.registrationNumber.trim().toUpperCase()
        : "";

    const category =
      typeof body.category === "string"
        ? body.category.trim()
        : "";

    const providedQrValue =
      typeof body.qrValue === "string"
        ? body.qrValue.trim()
        : "";

    const status =
      body.status === "checked-in"
        ? "checked-in"
        : body.status === "cancelled"
          ? "cancelled"
          : "registered";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Attendee name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (name.length > 150) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Attendee name cannot exceed 150 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address.",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const event = await getOwnedEvent(
      eventId,
      session.user.id,
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

    let registrationNumber =
      providedRegistrationNumber;

    if (!registrationNumber) {
      let attempts = 0;

      while (attempts < 10) {
        const generated =
          createRegistrationNumber();

        const existing =
          await Attendee.exists({
            eventId: event._id,
            registrationNumber: generated,
          });

        if (!existing) {
          registrationNumber = generated;
          break;
        }

        attempts += 1;
      }

      if (!registrationNumber) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Unable to generate registration number. Please try again.",
          },
          {
            status: 500,
          },
        );
      }
    } else {
      const existing =
        await Attendee.findOne({
          eventId: event._id,
          registrationNumber,
        });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Registration number already exists for this event.",
          },
          {
            status: 409,
          },
        );
      }
    }

    const qrValue =
      providedQrValue || registrationNumber;

    const attendee = await Attendee.create({
      eventId: event._id,
      name,
      email,
      phone,
      registrationNumber,
      category,
      qrValue,
      status,
    });

    const attendeeCount =
      await Attendee.countDocuments({
        eventId: event._id,
        status: {
          $ne: "cancelled",
        },
      });

    await Event.findByIdAndUpdate(event._id, {
      attendeeCount,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Attendee added successfully.",
        attendee: {
          _id: attendee._id.toString(),
          eventId: attendee.eventId.toString(),
          name: attendee.name,
          email: attendee.email ?? "",
          phone: attendee.phone ?? "",
          registrationNumber:
            attendee.registrationNumber,
          category: attendee.category ?? "",
          qrValue: attendee.qrValue,
          status: attendee.status,
          createdAt: attendee.createdAt,
          updatedAt: attendee.updatedAt,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/events/[eventId]/attendees failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create attendee.",
      },
      {
        status: 500,
      },
    );
  }
}