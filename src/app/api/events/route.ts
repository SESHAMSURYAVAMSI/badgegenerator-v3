import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";

function createSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createEventCode(name: string): string {
  const prefix = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase();

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `${prefix || "EVT"}-${randomPart}`;
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 },
      );
    }

    await connectDB();

    const events = await Event.find({
      createdBy: session.user.id,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error("GET /api/events failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch events.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const location =
      typeof body.location === "string"
        ? body.location.trim()
        : "";

    const startDate =
      typeof body.startDate === "string" &&
      body.startDate
        ? new Date(`${body.startDate}T00:00:00.000Z`)
        : undefined;

    const endDate =
      typeof body.endDate === "string" &&
      body.endDate
        ? new Date(`${body.endDate}T23:59:59.999Z`)
        : undefined;

    const status =
      body.status === "active"
        ? "active"
        : "draft";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Event name is required.",
        },
        { status: 400 },
      );
    }

    if (
      startDate &&
      Number.isNaN(startDate.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid start date.",
        },
        { status: 400 },
      );
    }

    if (
      endDate &&
      Number.isNaN(endDate.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid end date.",
        },
        { status: 400 },
      );
    }

    if (
      startDate &&
      endDate &&
      endDate < startDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "End date cannot be earlier than start date.",
        },
        { status: 400 },
      );
    }

    await connectDB();

    let slug = createSlug(name);

    if (!slug) {
      slug = `event-${Date.now()}`;
    }

    const existingSlug = await Event.findOne({
      slug,
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    let code = createEventCode(name);

    let existingCode = await Event.findOne({
      code,
    });

    while (existingCode) {
      code = createEventCode(name);

      existingCode = await Event.findOne({
        code,
      });
    }

    const event = await Event.create({
      name,
      slug,
      code,
      description,
      location,
      startDate,
      endDate,
      status,
      attendeeCount: 0,
      badgeCount: 0,
      createdBy: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Event created successfully.",
        event,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/events failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create event.",
      },
      { status: 500 },
    );
  }
}