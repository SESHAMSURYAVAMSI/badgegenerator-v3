import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";

import Event from "@/models/Event";
import Attendee from "@/models/Attendee";
import ScanConfig from "@/models/ScanConfig";
import ScanRecord from "@/models/ScanRecord";
import ScanAttempt from "@/models/ScanAttempt";

interface RouteContext {
  params: Promise<{
    eventId: string;
  }>;
}

function getTodayStart(): Date {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
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
          message: "Event ID is required.",
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
          message: "Event not found.",
        },
        {
          status: 404,
        },
      );
    }

    const todayStart = getTodayStart();

    /*
     * --------------------------------------------------
     * BASIC COUNTS
     * --------------------------------------------------
     */

    const [
      totalAttendees,
      totalSuccessfulScans,
      todaySuccessfulScans,
      uniqueScannedAttendees,
      totalAttempts,
      duplicateAttempts,
      invalidQrAttempts,
      invalidDayAttempts,
      invalidItemAttempts,
      todayAttempts,
    ] = await Promise.all([
      Attendee.countDocuments({
        eventId: event._id,
      }),

      ScanRecord.countDocuments({
        eventId: event._id,
      }),

      ScanRecord.countDocuments({
        eventId: event._id,
        scannedAt: {
          $gte: todayStart,
        },
      }),

      ScanRecord.distinct(
        "attendeeId",
        {
          eventId: event._id,
        },
      ),

      ScanAttempt.countDocuments({
        eventId: event._id,
      }),

      ScanAttempt.countDocuments({
        eventId: event._id,
        status: "duplicate",
      }),

      ScanAttempt.countDocuments({
        eventId: event._id,
        status: "invalid_qr",
      }),

      ScanAttempt.countDocuments({
        eventId: event._id,
        status: "invalid_day",
      }),

      ScanAttempt.countDocuments({
        eventId: event._id,
        status: "invalid_item",
      }),

      ScanAttempt.countDocuments({
        eventId: event._id,
        scannedAt: {
          $gte: todayStart,
        },
      }),
    ]);

    const uniqueCount =
      uniqueScannedAttendees.length;

    const unscannedCount = Math.max(
      totalAttendees - uniqueCount,
      0,
    );

    const attendancePercentage =
      totalAttendees > 0
        ? Math.round(
            (uniqueCount / totalAttendees) *
              100,
          )
        : 0;

    /*
     * --------------------------------------------------
     * DAY-WISE SUCCESSFUL SCANS
     * --------------------------------------------------
     */

    const dayStats =
      await ScanRecord.aggregate([
        {
          $match: {
            eventId: event._id,
          },
        },
        {
          $group: {
            _id: {
              dayId: "$dayId",
              dayName: "$dayName",
            },
            total: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            "_id.dayName": 1,
          },
        },
      ]);

    /*
     * --------------------------------------------------
     * MODULE-WISE SUCCESSFUL SCANS
     * --------------------------------------------------
     */

    const itemStats =
      await ScanRecord.aggregate([
        {
          $match: {
            eventId: event._id,
          },
        },
        {
          $group: {
            _id: {
              itemId: "$itemId",
              itemName: "$itemName",
            },
            total: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            total: -1,
          },
        },
      ]);

    /*
     * --------------------------------------------------
     * RECENT SUCCESSFUL SCANS
     * --------------------------------------------------
     */

    const recentScans =
      await ScanRecord.find({
        eventId: event._id,
      })
        .sort({
          scannedAt: -1,
        })
        .limit(20)
        .lean();

    /*
     * --------------------------------------------------
     * RECENT DUPLICATE ATTEMPTS
     * --------------------------------------------------
     */

    const recentDuplicates =
      await ScanAttempt.find({
        eventId: event._id,
        status: "duplicate",
      })
        .sort({
          scannedAt: -1,
        })
        .limit(20)
        .lean();

    /*
     * --------------------------------------------------
     * RECENT INVALID ATTEMPTS
     * --------------------------------------------------
     */

    const recentInvalidAttempts =
      await ScanAttempt.find({
        eventId: event._id,
        status: {
          $in: [
            "invalid_qr",
            "invalid_day",
            "invalid_item",
            "event_not_found",
          ],
        },
      })
        .sort({
          scannedAt: -1,
        })
        .limit(20)
        .lean();

    /*
     * --------------------------------------------------
     * HOURLY SCANS TODAY
     * --------------------------------------------------
     */

    const hourlyScans =
      await ScanRecord.aggregate([
        {
          $match: {
            eventId: event._id,
            scannedAt: {
              $gte: todayStart,
            },
          },
        },
        {
          $group: {
            _id: {
              $hour: "$scannedAt",
            },
            total: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]);

    /*
     * --------------------------------------------------
     * SCAN CONFIG
     * --------------------------------------------------
     */

    const config =
      await ScanConfig.findOne({
        eventId: event._id,
      }).lean();

    /*
     * --------------------------------------------------
     * RESPONSE
     * --------------------------------------------------
     */

    return NextResponse.json({
      success: true,

      event: {
        id: event._id.toString(),
        name: event.name,
        publicId: event.publicId ?? null,
      },

      overview: {
        totalAttendees,

        totalSuccessfulScans,

        todaySuccessfulScans,

        uniqueScannedAttendees:
          uniqueCount,

        unscannedCount,

        attendancePercentage,

        totalAttempts,

        todayAttempts,

        duplicateAttempts,

        invalidQrAttempts,

        invalidDayAttempts,

        invalidItemAttempts,
      },

      dayStats: dayStats.map(
        (entry) => ({
          dayId: String(
            entry._id.dayId,
          ),
          dayName: String(
            entry._id.dayName,
          ),
          total: Number(
            entry.total,
          ),
        }),
      ),

      itemStats: itemStats.map(
        (entry) => ({
          itemId: String(
            entry._id.itemId,
          ),
          itemName: String(
            entry._id.itemName,
          ),
          total: Number(
            entry.total,
          ),
        }),
      ),

      recentScans:
        recentScans.map(
          (scan) => ({
            id: scan._id.toString(),
            attendeeId:
              scan.attendeeId.toString(),
            registrationNumber:
              scan.registrationNumber,
            attendeeName:
              scan.attendeeName,
            dayId: scan.dayId,
            dayName:
              scan.dayName,
            itemId:
              scan.itemId,
            itemName:
              scan.itemName,
            scannedAt:
              scan.scannedAt.toISOString(),
          }),
        ),

      recentDuplicates:
        recentDuplicates.map(
          (attempt) => ({
            id: attempt._id.toString(),
            attendeeId:
              attempt.attendeeId?.toString() ??
              null,
            registrationNumber:
              attempt.registrationNumber ??
              "",
            attendeeName:
              attempt.attendeeName ??
              "",
            dayName:
              attempt.dayName ?? "",
            itemName:
              attempt.itemName ?? "",
            scannedAt:
              attempt.scannedAt.toISOString(),
          }),
        ),

      recentInvalidAttempts:
        recentInvalidAttempts.map(
          (attempt) => ({
            id: attempt._id.toString(),
            status:
              attempt.status,
            qrValue:
              attempt.qrValue ?? "",
            registrationNumber:
              attempt.registrationNumber ??
              "",
            dayName:
              attempt.dayName ?? "",
            itemName:
              attempt.itemName ?? "",
            scannedAt:
              attempt.scannedAt.toISOString(),
          }),
        ),

      hourlyScans:
        hourlyScans.map(
          (entry) => ({
            hour: Number(
              entry._id,
            ),
            total: Number(
              entry.total,
            ),
          }),
        ),

      configuredDays:
        config?.days?.length ?? 0,
    });
  } catch (error) {
    console.error(
      "Scanning analytics error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Unable to load scanning analytics.",
      },
      {
        status: 500,
      },
    );
  }
}