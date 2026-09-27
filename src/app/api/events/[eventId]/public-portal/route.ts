import crypto from "crypto";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";

interface RouteContext {
  params: Promise<{
    eventId: string;
  }>;
}

function generatePublicId(): string {
  return crypto.randomBytes(16).toString("hex");
}

async function generateUniquePublicId(): Promise<string> {
  let publicId = generatePublicId();

  while (
    await Event.collection.findOne({
      publicId,
    })
  ) {
    publicId = generatePublicId();
  }

  return publicId;
}

function createResponse(
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

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createResponse(
        {
          message: "Unauthorized.",
        },
        401,
      );
    }

    const { eventId } = await context.params;

    if (!eventId) {
      return createResponse(
        {
          message: "Event ID is required.",
        },
        400,
      );
    }

    await connectDB();

    const event = await Event.findOne({
      _id: eventId,
      createdBy: session.user.id,
    }).lean();

    if (!event) {
      return createResponse(
        {
          message:
            "Event not found or access denied.",
        },
        404,
      );
    }

    /*
     * Read publicId directly from MongoDB.
     *
     * Using the native collection here makes this
     * endpoint safe even if an older Event document
     * was created before publicId was added to the
     * Mongoose schema.
     */
    const rawEvent =
      await Event.collection.findOne(
        {
          _id: event._id,
        },
        {
          projection: {
            publicId: 1,
          },
        },
      );

    let publicId =
      typeof rawEvent?.publicId === "string"
        ? rawEvent.publicId
        : "";

    /*
     * Older events may not have a publicId.
     *
     * Generate one automatically and persist it
     * directly into MongoDB.
     */
    if (!publicId) {
      publicId =
        await generateUniquePublicId();

      await Event.collection.updateOne(
        {
          _id: event._id,
        },
        {
          $set: {
            publicId,
          },
        },
      );
    }

    const origin =
      new URL(request.url).origin;

    const publicUrl =
      `${origin}/public/${publicId}`;

    return createResponse({
      success: true,
      publicId,
      publicUrl,
      event: {
        name: event.name,
        status: event.status,
      },
    });
  } catch (error) {
    console.error(
      "GET public portal error:",
      error,
    );

    return createResponse(
      {
        message:
          "Failed to load public portal.",
      },
      500,
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
      return createResponse(
        {
          message: "Unauthorized.",
        },
        401,
      );
    }

    const { eventId } = await context.params;

    if (!eventId) {
      return createResponse(
        {
          message: "Event ID is required.",
        },
        400,
      );
    }

    await connectDB();

    const event = await Event.findOne({
      _id: eventId,
      createdBy: session.user.id,
    }).lean();

    if (!event) {
      return createResponse(
        {
          message:
            "Event not found or access denied.",
        },
        404,
      );
    }

    /*
     * Generate a completely new public URL.
     *
     * The previous URL becomes invalid.
     */
    const publicId =
      await generateUniquePublicId();

    await Event.collection.updateOne(
      {
        _id: event._id,
      },
      {
        $set: {
          publicId,
        },
      },
    );

    const origin =
      new URL(request.url).origin;

    const publicUrl =
      `${origin}/public/${publicId}`;

    return createResponse({
      success: true,
      publicId,
      publicUrl,
      message:
        "Public portal URL regenerated successfully.",
    });
  } catch (error) {
    console.error(
      "Regenerate public portal error:",
      error,
    );

    return createResponse(
      {
        message:
          "Failed to regenerate public portal URL.",
      },
      500,
    );
  }
}