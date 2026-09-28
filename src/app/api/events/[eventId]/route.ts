import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Attendee from "@/models/Attendee";
import BadgeConfig from "@/models/BadgeConfig";
import Event, {
  type EventStatus,
} from "@/models/Event";

interface RouteContext {
  params: Promise<{
    eventId: string;
  }>;
}

const VALID_STATUSES: EventStatus[] = [
  "draft",
  "active",
  "completed",
];

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

function isValidObjectId(
  value: string,
): boolean {
  return mongoose.isValidObjectId(value);
}

function serializeEvent(event: any) {
  return {
    _id: event._id.toString(),
    name: event.name,
    slug: event.slug,
    code: event.code,
    publicId: event.publicId ?? "",
    description: event.description ?? "",
    startDate: event.startDate
      ? new Date(event.startDate).toISOString()
      : null,
    endDate: event.endDate
      ? new Date(event.endDate).toISOString()
      : null,
    location: event.location ?? "",
    status: event.status,
    attendeeCount: event.attendeeCount ?? 0,
    badgeCount: event.badgeCount ?? 0,
    createdAt: event.createdAt
      ? new Date(event.createdAt).toISOString()
      : null,
    updatedAt: event.updatedAt
      ? new Date(event.updatedAt).toISOString()
      : null,
  };
}

/*
 * GET
 *
 * Loads one event belonging to the
 * currently authenticated admin.
 */
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

    const { eventId } =
      await context.params;

    if (!eventId) {
      return createResponse(
        {
          success: false,
          message: "Event ID is required.",
        },
        400,
      );
    }

    if (!isValidObjectId(eventId)) {
      return createResponse(
        {
          success: false,
          message: "Invalid event ID.",
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
          success: false,
          message:
            "Event not found or access denied.",
        },
        404,
      );
    }

    return createResponse({
      success: true,
      event: serializeEvent(event),
    });
  } catch (error) {
    console.error(
      "GET event error:",
      error,
    );

    return createResponse(
      {
        success: false,
        message: "Failed to load event.",
      },
      500,
    );
  }
}

/*
 * PATCH
 *
 * Updates editable event settings.
 *
 * IMPORTANT:
 *
 * publicId is intentionally NOT editable.
 *
 * This guarantees that once the public
 * portal URL is generated, it remains
 * permanent.
 *
 * slug and code are also intentionally
 * protected from this endpoint.
 */
export async function PATCH(
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

    const { eventId } =
      await context.params;

    if (!eventId) {
      return createResponse(
        {
          success: false,
          message: "Event ID is required.",
        },
        400,
      );
    }

    if (!isValidObjectId(eventId)) {
      return createResponse(
        {
          success: false,
          message: "Invalid event ID.",
        },
        400,
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return createResponse(
        {
          success: false,
          message: "Invalid request body.",
        },
        400,
      );
    }

    await connectDB();

    /*
     * Always verify ownership before updating.
     */
    const existingEvent =
      await Event.findOne({
        _id: eventId,
        createdBy: session.user.id,
      });

    if (!existingEvent) {
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
     * Build the update object explicitly.
     *
     * We NEVER pass the entire request body
     * directly into MongoDB.
     *
     * This prevents users from modifying:
     *
     * - _id
     * - createdBy
     * - publicId
     * - slug
     * - code
     * - attendeeCount
     * - badgeCount
     * - createdAt
     * - updatedAt
     */
    const update: Record<
      string,
      unknown
    > = {};

    /*
     * NAME
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "name",
      )
    ) {
      const name =
        typeof body.name === "string"
          ? body.name.trim()
          : "";

      if (!name) {
        return createResponse(
          {
            success: false,
            message:
              "Event name is required.",
          },
          400,
        );
      }

      if (name.length > 200) {
        return createResponse(
          {
            success: false,
            message:
              "Event name must be 200 characters or less.",
          },
          400,
        );
      }

      update.name = name;
    }

    /*
     * DESCRIPTION
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "description",
      )
    ) {
      const description =
        typeof body.description ===
        "string"
          ? body.description.trim()
          : "";

      if (description.length > 5000) {
        return createResponse(
          {
            success: false,
            message:
              "Description must be 5000 characters or less.",
          },
          400,
        );
      }

      update.description =
        description;
    }

    /*
     * LOCATION
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "location",
      )
    ) {
      const location =
        typeof body.location ===
        "string"
          ? body.location.trim()
          : "";

      if (location.length > 500) {
        return createResponse(
          {
            success: false,
            message:
              "Location must be 500 characters or less.",
          },
          400,
        );
      }

      update.location = location;
    }

    /*
     * STATUS
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "status",
      )
    ) {
      if (
        typeof body.status !== "string" ||
        !VALID_STATUSES.includes(
          body.status as EventStatus,
        )
      ) {
        return createResponse(
          {
            success: false,
            message:
              "Invalid event status.",
          },
          400,
        );
      }

      update.status =
        body.status as EventStatus;
    }

    /*
     * START DATE
     */
    let nextStartDate:
      | Date
      | null
      | undefined = undefined;

    let nextEndDate:
      | Date
      | null
      | undefined = undefined;

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "startDate",
      )
    ) {
      if (
        body.startDate === null ||
        body.startDate === ""
      ) {
        nextStartDate = null;
      } else if (
        typeof body.startDate === "string"
      ) {
        const parsedDate = new Date(
          body.startDate,
        );

        if (
          Number.isNaN(
            parsedDate.getTime(),
          )
        ) {
          return createResponse(
            {
              success: false,
              message:
                "Invalid start date.",
            },
            400,
          );
        }

        nextStartDate = parsedDate;
      } else {
        return createResponse(
          {
            success: false,
            message:
              "Invalid start date.",
          },
          400,
        );
      }

      update.startDate =
        nextStartDate;
    }

    /*
     * END DATE
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "endDate",
      )
    ) {
      if (
        body.endDate === null ||
        body.endDate === ""
      ) {
        nextEndDate = null;
      } else if (
        typeof body.endDate === "string"
      ) {
        const parsedDate = new Date(
          body.endDate,
        );

        if (
          Number.isNaN(
            parsedDate.getTime(),
          )
        ) {
          return createResponse(
            {
              success: false,
              message:
                "Invalid end date.",
            },
            400,
          );
        }

        nextEndDate = parsedDate;
      } else {
        return createResponse(
          {
            success: false,
            message:
              "Invalid end date.",
          },
          400,
        );
      }

      update.endDate =
        nextEndDate;
    }

    /*
     * DATE RANGE VALIDATION
     *
     * Use the new value when provided,
     * otherwise use the existing value.
     */
    const finalStartDate =
      nextStartDate !== undefined
        ? nextStartDate
        : existingEvent.startDate
          ? new Date(
              existingEvent.startDate,
            )
          : null;

    const finalEndDate =
      nextEndDate !== undefined
        ? nextEndDate
        : existingEvent.endDate
          ? new Date(
              existingEvent.endDate,
            )
          : null;

    if (
      finalStartDate &&
      finalEndDate &&
      finalEndDate.getTime() <
        finalStartDate.getTime()
    ) {
      return createResponse(
        {
          success: false,
          message:
            "End date cannot be earlier than the start date.",
        },
        400,
      );
    }

    /*
     * Nothing editable was supplied.
     */
    if (
      Object.keys(update).length === 0
    ) {
      return createResponse(
        {
          success: false,
          message:
            "No event settings were provided.",
        },
        400,
      );
    }

    /*
     * Update only the explicitly allowed
     * fields.
     */
    const updatedEvent =
      await Event.findOneAndUpdate(
        {
          _id: eventId,
          createdBy: session.user.id,
        },
        {
          $set: update,
        },
        {
          new: true,
          runValidators: true,
        },
      ).lean();

    if (!updatedEvent) {
      return createResponse(
        {
          success: false,
          message:
            "Event not found or access denied.",
        },
        404,
      );
    }

    return createResponse({
      success: true,
      message:
        "Event settings updated successfully.",
      event:
        serializeEvent(updatedEvent),
    });
  } catch (error) {
    console.error(
      "PATCH event error:",
      error,
    );

    return createResponse(
      {
        success: false,
        message:
          "Failed to update event settings.",
      },
      500,
    );
  }
}

/*
 * DELETE
 *
 * Permanently removes:
 *
 * 1. Event
 * 2. All attendees belonging to event
 * 3. Badge configuration belonging to event
 *
 * Only the admin who owns the event can
 * perform this operation.
 */
export async function DELETE(
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

    const { eventId } =
      await context.params;

    if (!eventId) {
      return createResponse(
        {
          success: false,
          message: "Event ID is required.",
        },
        400,
      );
    }

    if (!isValidObjectId(eventId)) {
      return createResponse(
        {
          success: false,
          message: "Invalid event ID.",
        },
        400,
      );
    }

    await connectDB();

    /*
     * Verify ownership first.
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
     * Use a MongoDB transaction so the
     * event and its related records are
     * removed together.
     */
    const mongoSession =
      await mongoose.startSession();

    try {
      await mongoSession.withTransaction(
        async () => {
          /*
           * Delete all attendees belonging
           * to this event.
           */
          await Attendee.deleteMany(
            {
              eventId: event._id,
            },
            {
              session: mongoSession,
            },
          );

          /*
           * Delete the badge configuration.
           */
          await BadgeConfig.deleteOne(
            {
              eventId: event._id,
            },
            {
              session: mongoSession,
            },
          );

          /*
           * Delete the event itself.
           *
           * Ownership is checked again here
           * for additional protection.
           */
          const deleteResult =
            await Event.deleteOne(
              {
                _id: event._id,
                createdBy:
                  session.user.id,
              },
              {
                session: mongoSession,
              },
            );

          if (
            deleteResult.deletedCount !== 1
          ) {
            throw new Error(
              "Event deletion failed.",
            );
          }
        },
      );
    } finally {
      await mongoSession.endSession();
    }

    return createResponse({
      success: true,
      message:
        "Event and all related data were permanently deleted.",
      deletedEventId: eventId,
    });
  } catch (error) {
    console.error(
      "DELETE event error:",
      error,
    );

    return createResponse(
      {
        success: false,
        message:
          "Failed to delete event.",
      },
      500,
    );
  }
}