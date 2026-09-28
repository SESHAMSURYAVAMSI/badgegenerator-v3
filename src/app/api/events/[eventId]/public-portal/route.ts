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
          success: false,
          message: "Unauthorized.",
        },
        401,
      );
    }

    const { eventId } = await context.params;

    if (!eventId) {
      return createResponse(
        {
          success: false,
          message: "Event ID is required.",
        },
        400,
      );
    }

    await connectDB();

    /*
     * First verify that this event belongs to
     * the currently authenticated admin.
     */
    const event = await Event.findOne({
      _id: eventId,
      createdBy: session.user.id,
    }).lean();

    if (!event) {
      return createResponse(
        {
          success: false,
          message:
            "Event not found or access denied.",
        },
        404,
      );
    }

    /*
     * Read the publicId directly from MongoDB.
     *
     * This also supports older Event documents
     * that may have been created before publicId
     * was added to the schema.
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
        ? rawEvent.publicId.trim()
        : "";

    /*
     * IMPORTANT:
     *
     * If the event already has a publicId,
     * NEVER generate another one.
     *
     * This makes the public URL permanent.
     */
    if (!publicId) {
      publicId =
        await generateUniquePublicId();

      /*
       * Only set publicId when the event does
       * not already have one.
       *
       * The $exists / $ne protection prevents
       * an existing publicId from accidentally
       * being replaced.
       */
      const updateResult =
        await Event.collection.updateOne(
          {
            _id: event._id,
            $or: [
              {
                publicId: {
                  $exists: false,
                },
              },
              {
                publicId: "",
              },
              {
                publicId: null,
              },
            ],
          },
          {
            $set: {
              publicId,
            },
          },
        );

      /*
       * If another request created the publicId
       * at the same time, read the already-existing
       * value instead of replacing it.
       */
      if (updateResult.modifiedCount === 0) {
        const existingEvent =
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

        if (
          typeof existingEvent?.publicId ===
          "string"
        ) {
          publicId =
            existingEvent.publicId;
        }
      }
    }

    const origin =
      new URL(request.url).origin;

    const publicUrl =
      `${origin}/public/${publicId}`;

    return createResponse({
      success: true,
      publicId,
      publicUrl,
      permanent: true,
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
        success: false,
        message:
          "Failed to load public portal.",
      },
      500,
    );
  }
}