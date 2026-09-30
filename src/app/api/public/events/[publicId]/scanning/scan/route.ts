import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Attendee from "@/models/Attendee";
import ScanConfig from "@/models/ScanConfig";
import ScanRecord from "@/models/ScanRecord";
import ScanAttempt from "@/models/ScanAttempt";

interface RouteContext {
  params: Promise<{
    publicId: string;
  }>;
}

interface ScanRequestBody {
  dayId?: string;
  itemId?: string;
  qrValue?: string;
  registrationNumber?: string;
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    await connectDB();

    const { publicId } = await context.params;

    const body =
      (await request.json()) as ScanRequestBody;

    const dayId = String(
      body.dayId ?? "",
    ).trim();

    const itemId = String(
      body.itemId ?? "",
    ).trim();

    const qrValue = String(
      body.qrValue ?? "",
    ).trim();

    const registrationNumber = String(
      body.registrationNumber ?? "",
    )
      .trim()
      .toUpperCase();

    /*
     * --------------------------------------------------
     * FIND EVENT
     * --------------------------------------------------
     */

    const event = await Event.findOne({
      publicId: publicId.trim(),
    }).lean();

    if (!event) {
      await ScanAttempt.create({
        status: "event_not_found",
        source: "public",
        qrValue,
      });

      return NextResponse.json(
        {
          success: false,
          duplicate: false,
          message: "Event not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * --------------------------------------------------
     * FIND SCANNING CONFIG
     * --------------------------------------------------
     */

    const config =
      await ScanConfig.findOne({
        eventId: event._id,
      }).lean();

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          duplicate: false,
          message:
            "Scanning configuration is not available.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * --------------------------------------------------
     * VALIDATE DAY
     * --------------------------------------------------
     */

    const day = config.days.find(
      (currentDay) =>
        currentDay.id === dayId &&
        currentDay.enabled,
    );

    if (!day) {
      await ScanAttempt.create({
        eventId: event._id,
        dayId,
        status: "invalid_day",
        source: "public",
        qrValue,
      });

      return NextResponse.json(
        {
          success: false,
          duplicate: false,
          message:
            "Selected day is not valid.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * --------------------------------------------------
     * VALIDATE ITEM
     * --------------------------------------------------
     */

    const item = day.items.find(
      (currentItem) =>
        currentItem.id === itemId &&
        currentItem.enabled,
    );

    if (!item) {
      await ScanAttempt.create({
        eventId: event._id,
        dayId: day.id,
        dayName: day.name,
        itemId,
        status: "invalid_item",
        source: "public",
        qrValue,
      });

      return NextResponse.json(
        {
          success: false,
          duplicate: false,
          message:
            "Selected scanning module is not valid.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * --------------------------------------------------
     * VALIDATE QR
     * --------------------------------------------------
     */

    if (!qrValue && !registrationNumber) {
      await ScanAttempt.create({
        eventId: event._id,
        dayId: day.id,
        dayName: day.name,
        itemId: item.id,
        itemName: item.name,
        status: "invalid_qr",
        source: "public",
      });

      return NextResponse.json(
        {
          success: false,
          duplicate: false,
          message:
            "No QR value was provided.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * --------------------------------------------------
     * FIND ATTENDEE
     * --------------------------------------------------
     */

    const attendeeQuery: {
      eventId: typeof event._id;
      $or: Array<
        | { qrValue: string }
        | { registrationNumber: string }
      >;
    } = {
      eventId: event._id,
      $or: [],
    };

    if (qrValue) {
      attendeeQuery.$or.push({
        qrValue,
      });
    }

    if (registrationNumber) {
      attendeeQuery.$or.push({
        registrationNumber,
      });
    }

    const attendee =
      await Attendee.findOne(
        attendeeQuery,
      );

    /*
     * --------------------------------------------------
     * INVALID ATTENDEE
     * --------------------------------------------------
     */

    if (!attendee) {
      await ScanAttempt.create({
        eventId: event._id,
        dayId: day.id,
        dayName: day.name,
        itemId: item.id,
        itemName: item.name,
        qrValue,
        registrationNumber,
        status: "invalid_qr",
        source: "public",
      });

      return NextResponse.json(
        {
          success: false,
          duplicate: false,
          message:
            "Invalid QR code. Attendee not found for this event.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * --------------------------------------------------
     * CHECK EXISTING SCAN
     * --------------------------------------------------
     *
     * One attendee can only be scanned once
     * for:
     *
     * Event + Day + Module
     *
     * If already scanned, return the ORIGINAL
     * scan timestamp.
     */

    const existingScan =
      await ScanRecord.findOne({
        eventId: event._id,
        attendeeId: attendee._id,
        dayId: day.id,
        itemId: item.id,
      }).lean();

    if (existingScan) {
      await ScanAttempt.create({
        eventId: event._id,
        attendeeId: attendee._id,
        dayId: day.id,
        dayName: day.name,
        itemId: item.id,
        itemName: item.name,
        registrationNumber:
          attendee.registrationNumber,
        attendeeName: attendee.name,
        qrValue:
          qrValue || attendee.qrValue,
        status: "duplicate",
        source: "public",
      });

      return NextResponse.json(
        {
          success: false,
          duplicate: true,
          code: "ALREADY_SCANNED",
          message:
            "This attendee has already been scanned for this module.",
          data: {
            scanId:
              existingScan._id.toString(),

            attendee: {
              id: attendee._id.toString(),
              name: attendee.name,
              email: attendee.email,
              registrationNumber:
                attendee.registrationNumber,
              category:
                attendee.category,
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
              existingScan.scannedAt.toISOString(),
          },
        },
        {
          status: 200,
        },
      );
    }

    /*
     * --------------------------------------------------
     * CREATE SUCCESSFUL SCAN
     * --------------------------------------------------
     */

    const scannedAt = new Date();

    try {
      const createdScan =
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
          scannedAt,
        });

      /*
       * ------------------------------------------------
       * RECORD SUCCESS ATTEMPT
       * ------------------------------------------------
       */

      await ScanAttempt.create({
        eventId: event._id,
        attendeeId: attendee._id,
        dayId: day.id,
        dayName: day.name,
        itemId: item.id,
        itemName: item.name,
        registrationNumber:
          attendee.registrationNumber,
        attendeeName: attendee.name,
        qrValue:
          qrValue || attendee.qrValue,
        status: "success",
        source: "public",
      });

      /*
       * ------------------------------------------------
       * SUCCESS RESPONSE
       * ------------------------------------------------
       *
       * Keep the response shape exactly the same
       * for success and duplicate.
       */

      return NextResponse.json(
        {
          success: true,
          duplicate: false,
          code: "SCAN_SUCCESS",
          message: "Scan successful.",
          data: {
            scanId:
              createdScan._id.toString(),

            attendee: {
              id: attendee._id.toString(),
              name: attendee.name,
              email: attendee.email,
              registrationNumber:
                attendee.registrationNumber,
              category:
                attendee.category,
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
              createdScan.scannedAt.toISOString(),
          },
        },
        {
          status: 200,
        },
      );
    } catch (error: unknown) {
      /*
       * ------------------------------------------------
       * HANDLE RACE CONDITION
       * ------------------------------------------------
       *
       * Two scanners can scan the same attendee at
       * almost exactly the same time.
       *
       * The unique MongoDB index protects the database.
       *
       * If MongoDB returns duplicate-key error 11000,
       * fetch the original scan and return it as
       * "Already Scanned".
       */

      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        const raceExistingScan =
          await ScanRecord.findOne({
            eventId: event._id,
            attendeeId: attendee._id,
            dayId: day.id,
            itemId: item.id,
          }).lean();

        await ScanAttempt.create({
          eventId: event._id,
          attendeeId: attendee._id,
          dayId: day.id,
          dayName: day.name,
          itemId: item.id,
          itemName: item.name,
          registrationNumber:
            attendee.registrationNumber,
          attendeeName: attendee.name,
          qrValue:
            qrValue || attendee.qrValue,
          status: "duplicate",
          source: "public",
        });

        return NextResponse.json(
          {
            success: false,
            duplicate: true,
            code: "ALREADY_SCANNED",
            message:
              "This attendee has already been scanned for this module.",
            data: {
              scanId:
                raceExistingScan?._id?.toString(),

              attendee: {
                id: attendee._id.toString(),
                name: attendee.name,
                email: attendee.email,
                registrationNumber:
                  attendee.registrationNumber,
                category:
                  attendee.category,
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
                raceExistingScan?.scannedAt
                  ? raceExistingScan.scannedAt.toISOString()
                  : undefined,
            },
          },
          {
            status: 200,
          },
        );
      }

      throw error;
    }
  } catch (error) {
    console.error(
      "Public scanning error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        duplicate: false,
        message:
          "Unable to process the scan.",
      },
      {
        status: 500,
      },
    );
  }
}