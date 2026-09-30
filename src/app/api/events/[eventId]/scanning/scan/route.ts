import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Attendee from "@/models/Attendee";
import ScanConfig from "@/models/ScanConfig";
import ScanRecord from "@/models/ScanRecord";

interface RouteContext {
  params: Promise<{
    eventId: string;
  }>;
}

interface ScanRequestBody {
  qrValue?: string;
  dayId?: string;
  itemId?: string;
}

function normalizeValue(
  value: unknown,
): string {
  return String(value ?? "")
    .trim();
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          message: "Event ID is required",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      (await request.json()) as ScanRequestBody;

    const qrValue = normalizeValue(
      body.qrValue,
    );

    const dayId = normalizeValue(
      body.dayId,
    );

    const itemId = normalizeValue(
      body.itemId,
    );

    if (!qrValue) {
      return NextResponse.json(
        {
          success: false,
          code: "QR_VALUE_REQUIRED",
          message:
            "QR code value is required",
        },
        {
          status: 400,
        },
      );
    }

    if (!dayId) {
      return NextResponse.json(
        {
          success: false,
          code: "DAY_REQUIRED",
          message:
            "Scanning day is required",
        },
        {
          status: 400,
        },
      );
    }

    if (!itemId) {
      return NextResponse.json(
        {
          success: false,
          code: "ITEM_REQUIRED",
          message:
            "Scanning module is required",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    /*
     * Validate event.
     */
    const event =
      await Event.findById(eventId).lean();

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          code: "EVENT_NOT_FOUND",
          message: "Event not found",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Load scanning configuration.
     */
    const config =
      await ScanConfig.findOne({
        eventId: event._id,
      }).lean();

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          code: "SCAN_CONFIG_NOT_FOUND",
          message:
            "Scanning configuration has not been created for this event",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Find selected day.
     */
    const day = config.days.find(
      (configuredDay) =>
        configuredDay.id === dayId,
    );

    if (!day) {
      return NextResponse.json(
        {
          success: false,
          code: "DAY_NOT_FOUND",
          message:
            "Selected scanning day was not found",
        },
        {
          status: 404,
        },
      );
    }

    if (!day.enabled) {
      return NextResponse.json(
        {
          success: false,
          code: "DAY_DISABLED",
          message:
            "This scanning day is currently disabled",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Find selected scanning module.
     */
    const item = day.items.find(
      (configuredItem) =>
        configuredItem.id === itemId,
    );

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          code: "ITEM_NOT_FOUND",
          message:
            "Selected scanning module was not found",
        },
        {
          status: 404,
        },
      );
    }

    if (!item.enabled) {
      return NextResponse.json(
        {
          success: false,
          code: "ITEM_DISABLED",
          message:
            "This scanning module is currently disabled",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Resolve attendee.
     *
     * The QR may contain:
     * 1. registrationNumber
     * 2. qrValue
     *
     * Both are supported.
     */
    const attendee =
      await Attendee.findOne({
        eventId: event._id,
        $or: [
          {
            registrationNumber:
              qrValue.toUpperCase(),
          },
          {
            qrValue,
          },
        ],
      }).lean();

    if (!attendee) {
      return NextResponse.json(
        {
          success: false,
          code: "ATTENDEE_NOT_FOUND",
          message:
            "This QR code does not belong to an attendee of this event",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Check duplicate scan.
     *
     * Same attendee + same event + same day
     * + same item cannot be scanned twice.
     */
    const existingScan =
      await ScanRecord.findOne({
        eventId: event._id,
        attendeeId: attendee._id,
        dayId,
        itemId,
      }).lean();

    if (existingScan) {
      return NextResponse.json(
        {
          success: false,
          duplicate: true,
          code: "ALREADY_SCANNED",
          message:
            `${attendee.name} has already collected ${item.name} for ${day.name}.`,
          data: {
            attendee: {
              id: attendee._id.toString(),
              name: attendee.name,
              email: attendee.email,
              registrationNumber:
                attendee.registrationNumber,
              category: attendee.category,
            },
            day: {
              id: day.id,
              name: day.name,
            },
            item: {
              id: item.id,
              name: item.name,
            },
            scannedAt:
              existingScan.scannedAt,
          },
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Create scan record.
     *
     * The unique compound index in ScanRecord
     * protects against race-condition duplicates.
     */
    try {
      const scan =
        await ScanRecord.create({
          eventId: event._id,
          attendeeId: attendee._id,
          dayId: day.id,
          dayName: day.name,
          itemId: item.id,
          itemName: item.name,
          registrationNumber:
            attendee.registrationNumber,
          attendeeName: attendee.name,
          scannedAt: new Date(),
        });

      return NextResponse.json(
        {
          success: true,
          duplicate: false,
          code: "SCAN_SUCCESS",
          message:
            `${attendee.name} successfully received ${item.name}.`,
          data: {
            scanId: scan._id.toString(),

            attendee: {
              id: attendee._id.toString(),
              name: attendee.name,
              email: attendee.email,
              registrationNumber:
                attendee.registrationNumber,
              category: attendee.category,
            },

            event: {
              id: event._id.toString(),
              name: event.name,
            },

            day: {
              id: day.id,
              name: day.name,
            },

            item: {
              id: item.id,
              name: item.name,
            },

            scannedAt:
              scan.scannedAt,
          },
        },
        {
          status: 201,
        },
      );
    } catch (error: unknown) {
      /*
       * MongoDB duplicate-key protection.
       *
       * This can happen if two devices scan the
       * same attendee at almost exactly the same time.
       */
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code ===
          11000
      ) {
        const duplicate =
          await ScanRecord.findOne({
            eventId: event._id,
            attendeeId: attendee._id,
            dayId,
            itemId,
          }).lean();

        return NextResponse.json(
          {
            success: false,
            duplicate: true,
            code: "ALREADY_SCANNED",
            message:
              `${attendee.name} has already been scanned for ${item.name}.`,
            data: {
              attendee: {
                id: attendee._id.toString(),
                name: attendee.name,
                email: attendee.email,
                registrationNumber:
                  attendee.registrationNumber,
                category:
                  attendee.category,
              },
              day: {
                id: day.id,
                name: day.name,
              },
              item: {
                id: item.id,
                name: item.name,
              },
              scannedAt:
                duplicate?.scannedAt ??
                new Date(),
            },
          },
          {
            status: 409,
          },
        );
      }

      throw error;
    }
  } catch (error) {
    console.error(
      "POST scanning scan error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        code: "SCAN_FAILED",
        message:
          "Something went wrong while processing the scan",
      },
      {
        status: 500,
      },
    );
  }
}