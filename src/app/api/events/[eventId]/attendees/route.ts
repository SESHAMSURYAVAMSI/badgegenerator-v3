import { NextResponse } from "next/server";
import mongoose from "mongoose";

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

function escapeRegex(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

/*
 * Generate the next registration number
 * for the current event.
 *
 * Example:
 *
 * Event code: ACVS26
 *
 * Existing:
 * ACVS26-001
 * ACVS26-002
 * ACVS26-004
 *
 * Next:
 * ACVS26-005
 */
async function generateRegistrationNumber(
  eventId: unknown,
  eventCode: string,
): Promise<string> {
  const attendeeEventId =
    new mongoose.Types.ObjectId(String(eventId));

  const normalizedCode =
    eventCode.trim().toUpperCase();

  const safeCode =
    escapeRegex(normalizedCode);

  const pattern =
    new RegExp(
      `^${safeCode}-(\\d+)$`,
      "i",
    );

  const existingAttendees =
    await Attendee.find({
      eventId: attendeeEventId,
      registrationNumber: {
        $regex: pattern,
      },
    })
      .select("registrationNumber")
      .lean();

  let highestNumber = 0;

  for (const attendee of existingAttendees) {
    const match =
      attendee.registrationNumber.match(
        pattern,
      );

    if (!match) {
      continue;
    }

    const number =
      Number(match[1]);

    if (
      Number.isFinite(number) &&
      number > highestNumber
    ) {
      highestNumber = number;
    }
  }

  /*
   * Start after the highest generated
   * registration number.
   */
  let nextNumber =
    highestNumber + 1;

  /*
   * Double-check uniqueness.
   *
   * This also protects us if an admin has
   * manually entered a number such as:
   *
   * ACVS26-005
   */
  while (true) {
    const candidate =
      `${normalizedCode}-${String(
        nextNumber,
      ).padStart(3, "0")}`;

    const exists =
      await Attendee.exists({
        eventId: attendeeEventId,
        registrationNumber:
          candidate,
      });

    if (!exists) {
      return candidate;
    }

    nextNumber += 1;
  }
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

    const event =
      await Event.findOne({
        _id: eventId,
        createdBy:
          session.user.id,
      }).lean();

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

    const { searchParams } =
      new URL(request.url);

    const page = Math.max(
      1,
      Number(
        searchParams.get("page") ||
          "1",
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

      const regex =
        new RegExp(
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
          registrationNumber:
            regex,
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
        Math.ceil(
          total / limit,
        ),
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
     * Registration number is OPTIONAL
     * from the UI.
     *
     * If provided, we keep it.
     *
     * If empty, we generate one below
     * using the event code.
     */
    let registrationNumber =
      normalizeRegistrationNumber(
        body.registrationNumber,
      );

    const providedQrValue =
      String(
        body.qrValue ?? "",
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

    await connectDB();

    const event =
      await Event.findOne({
        _id: eventId,
        createdBy:
          session.user.id,
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
     * Automatically generate a
     * registration number when the
     * admin leaves it empty.
     */
    if (!registrationNumber) {
      registrationNumber =
        await generateRegistrationNumber(
          event._id,
          event.code,
        );
    }

    /*
     * Check duplicates only inside
     * the current event.
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

    /*
     * QR value:
     *
     * 1. Use custom QR value if supplied.
     *
     * 2. Otherwise use the final
     *    registration number.
     */
    const qrValue =
      providedQrValue ||
      registrationNumber;

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

          qrValue,

          badgeGenerated: false,
          badgeUrl: "",
          badgeGenerationCount: 0,
        });
    } catch (error) {
      /*
       * If two requests happen at exactly
       * the same time, MongoDB's unique
       * index protects the event.
       */
      if (
        error &&
        typeof error ===
          "object" &&
        "code" in error &&
        (
          error as {
            code?: number;
          }
        ).code === 11000
      ) {
        /*
         * If the number was auto-generated,
         * retry once with a fresh number.
         */
        if (
          !normalizeRegistrationNumber(
            body.registrationNumber,
          )
        ) {
          const retryNumber =
            await generateRegistrationNumber(
              event._id,
              event.code,
            );

          attendee =
            await Attendee.create({
              eventId: event._id,

              name,
              email,
              phone,

              registrationNumber:
                retryNumber,

              category,

              qrValue:
                providedQrValue ||
                retryNumber,

              badgeGenerated: false,
              badgeUrl: "",
              badgeGenerationCount: 0,
            });
        } else {
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
      } else {
        throw error;
      }
    }

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

    const event =
      await Event.findOne({
        _id: eventId,
        createdBy:
          session.user.id,
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

    /*
     * ---------------------------------------------------------
     * EDIT ATTENDEE DETAILS
     * ---------------------------------------------------------
     *
     * The edit form uses:
     *
     * action: "update"
     *
     * Editable fields:
     * - name
     * - email
     * - phone
     * - registrationNumber
     * - category
     * - qrValue
     *
     * System fields such as eventId, badgeGenerated,
     * badgeUrl, badgeGenerationCount and timestamps
     * cannot be changed through this action.
     */
    if (body.action === "update") {
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

      const registrationNumber =
        normalizeRegistrationNumber(
          body.registrationNumber,
        );

      const category = String(
        body.category ?? "",
      ).trim();

      const qrValue =
        body.qrValue !== undefined
          ? String(
              body.qrValue ?? "",
            ).trim()
          : attendee.qrValue;

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Name is required.",
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
              "Name cannot exceed 150 characters.",
          },
          {
            status: 400,
          },
        );
      }

      if (!email) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Email is required.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please enter a valid email address.",
          },
          {
            status: 400,
          },
        );
      }

      /*
       * Registration numbers are always stored.
       * An existing attendee cannot be changed
       * to an empty registration number.
       */
      if (!registrationNumber) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Registration number cannot be empty.",
          },
          {
            status: 400,
          },
        );
      }

      if (phone.length > 50) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Phone number cannot exceed 50 characters.",
          },
          {
            status: 400,
          },
        );
      }

      if (registrationNumber.length > 100) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Registration number cannot exceed 100 characters.",
          },
          {
            status: 400,
          },
        );
      }

      if (category.length > 100) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Category cannot exceed 100 characters.",
          },
          {
            status: 400,
          },
        );
      }

      if (qrValue.length > 500) {
        return NextResponse.json(
          {
            success: false,
            message:
              "QR value cannot exceed 500 characters.",
          },
          {
            status: 400,
          },
        );
      }

      /*
       * Check registration-number uniqueness
       * only inside this event and exclude
       * the attendee currently being edited.
       */
      const duplicate =
        await Attendee.findOne({
          eventId: event._id,
          registrationNumber,
          _id: {
            $ne: attendee._id,
          },
        }).lean();

      if (duplicate) {
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

      /*
       * If QR value is empty, automatically use
       * the final registration number.
       *
       * This means an admin can clear the QR field
       * and let BadgeFlow restore the default.
       */
      const finalQrValue =
        qrValue || registrationNumber;

      attendee.name = name;
      attendee.email = email;
      attendee.phone = phone;
      attendee.registrationNumber =
        registrationNumber;
      attendee.category = category;
      attendee.qrValue = finalQrValue;

      try {
        await attendee.save();
      } catch (error) {
        /*
         * MongoDB unique index remains the final
         * protection against a registration-number
         * race condition.
         */
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          (
            error as {
              code?: number;
            }
          ).code === 11000
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

      return NextResponse.json({
        success: true,
        message:
          "Attendee updated successfully.",
        attendee,
      });
    }

    /*
     * ---------------------------------------------------------
     * BADGE STATUS UPDATE
     * ---------------------------------------------------------
     *
     * Existing BadgeGenerator functionality remains
     * supported when action is not "update".
     */
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
      "PATCH attendee error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Failed to update attendee",
      },
      {
        status: 500,
      },
    );
  }
}
export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { eventId } = await context.params;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { message: "Valid event ID is required." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const attendeeId = String(
      body.attendeeId ?? "",
    ).trim();

    if (!attendeeId || !mongoose.Types.ObjectId.isValid(attendeeId)) {
      return NextResponse.json(
        { message: "Valid attendeeId is required." },
        { status: 400 },
      );
    }

    await connectDB();

    const event = await Event.findOne({
      _id: eventId,
      createdBy: session.user.id,
    });

    if (!event) {
      return NextResponse.json(
        { message: "Event not found" },
        { status: 404 },
      );
    }

    const attendee = await Attendee.findOne({
      _id: attendeeId,
      eventId: event._id,
    }).lean();

    if (!attendee) {
      return NextResponse.json(
        { message: "Attendee not found" },
        { status: 404 },
      );
    }

    await Attendee.deleteOne({
      _id: attendee._id,
      eventId: event._id,
    });

    const attendeeCount = await Attendee.countDocuments({
      eventId: event._id,
    });

    const badgeCount = await Attendee.countDocuments({
      eventId: event._id,
      badgeGenerated: true,
    });

    await Event.updateOne(
      { _id: event._id },
      {
        $set: {
          attendeeCount,
          badgeCount,
        },
      },
    );

    return NextResponse.json({
      success: true,
      message: "Attendee deleted successfully.",
      attendeeId: attendee._id.toString(),
      attendeeCount,
      badgeCount,
    });
  } catch (error) {
    console.error(
      "DELETE attendee error:",
      error,
    );

    return NextResponse.json(
      {
        message: "Failed to delete attendee",
      },
      {
        status: 500,
      },
    );
  }
}

