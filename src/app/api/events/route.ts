import { NextResponse } from "next/server";
import crypto from "crypto";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";

function createPublicId() {
  return crypto
    .randomBytes(12)
    .toString("hex");
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createEventCode(value: string) {
  const clean = value
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6);

  const random = crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase();

  return `${clean || "EVENT"}-${random}`;
}

export async function GET() {
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
    console.error(
      "GET events error:",
      error,
    );

    return NextResponse.json(
      {
        message: "Failed to fetch events.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
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

    await connectDB();

    const body = await request.json();

    const {
      name,
      description,
      location,
      startDate,
      endDate,
      status,
    } = body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return NextResponse.json(
        {
          message: "Event name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      startDate &&
      endDate &&
      new Date(startDate) >
        new Date(endDate)
    ) {
      return NextResponse.json(
        {
          message:
            "End date cannot be before start date.",
        },
        {
          status: 400,
        },
      );
    }

    let slug = createSlug(name);

    if (!slug) {
      slug = `event-${Date.now()}`;
    }

    const existingSlug =
      await Event.findOne({
        slug,
      });

    if (existingSlug) {
      slug = `${slug}-${crypto
        .randomBytes(3)
        .toString("hex")}`;
    }

    let code = createEventCode(name);

    while (
      await Event.exists({
        code,
      })
    ) {
      code = createEventCode(name);
    }

    let publicId = createPublicId();

    while (
      await Event.exists({
        publicId,
      })
    ) {
      publicId = createPublicId();
    }

    const event = await Event.create({
      name: name.trim(),

      slug,

      code,

      publicId,

      description:
        typeof description === "string"
          ? description.trim()
          : "",

      location:
        typeof location === "string"
          ? location.trim()
          : "",

      startDate: startDate
        ? new Date(startDate)
        : undefined,

      endDate: endDate
        ? new Date(endDate)
        : undefined,

      status:
        status === "active" ||
        status === "completed"
          ? status
          : "draft",

      attendeeCount: 0,

      badgeCount: 0,

      createdBy: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,

        event,

        publicUrl: `/public/${publicId}`,

        message:
          "Event created successfully.",
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST event error:",
      error,
    );

    return NextResponse.json(
      {
        message: "Failed to create event.",
      },
      {
        status: 500,
      },
    );
  }
}