import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import {
  getPublicEventSession,
} from "@/lib/publicEventAuth";

import Event from "@/models/Event";
import Attendee from "@/models/Attendee";
import ScanRecord from "@/models/ScanRecord";

interface RouteContext {
  params: Promise<{
    publicId: string;
  }>;
}

function responseHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
  };
}

function isValidObjectId(value: string) {
  return mongoose.Types.ObjectId.isValid(value);
}

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const { publicId } = await context.params;

    const identifier = String(
      publicId ?? "",
    ).trim();

    if (!identifier) {
      return NextResponse.json(
        {
          success: false,
          message: "Public event ID is required.",
        },
        {
          status: 400,
          headers: responseHeaders(),
        },
      );
    }

    /*
     * =========================================================
     * PUBLIC EVENT AUTHENTICATION
     * =========================================================
     */

    const publicSession =
      await getPublicEventSession(
        request,
        identifier,
      );

    if (!publicSession) {
      return NextResponse.json(
        {
          success: false,
          message: "Public event session is required.",
        },
        {
          status: 401,
          headers: responseHeaders(),
        },
      );
    }

    /*
     * =========================================================
     * DATABASE
     * =========================================================
     */

    await connectDB();

    let event = await Event.findOne({
      publicId: identifier,
    });

    /*
     * Legacy fallback:
     * If publicId happens to be a MongoDB ObjectId,
     * allow the event lookup as a fallback.
     */

    if (
      !event &&
      isValidObjectId(identifier)
    ) {
      event = await Event.findById(
        identifier,
      );
    }

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: "Event not found.",
        },
        {
          status: 404,
          headers: responseHeaders(),
        },
      );
    }

    /*
     * =========================================================
     * SESSION / EVENT VALIDATION
     * =========================================================
     */

    if (
      publicSession.eventId !==
      event._id.toString()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid public event session.",
        },
        {
          status: 403,
          headers: responseHeaders(),
        },
      );
    }

    const resolvedPublicId =
      String(
        event.publicId ?? identifier,
      ).trim();

    if (
      publicSession.publicId !==
      resolvedPublicId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid public event session.",
        },
        {
          status: 403,
          headers: responseHeaders(),
        },
      );
    }

    if (event.status === "draft") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This event is not available yet.",
        },
        {
          status: 403,
          headers: responseHeaders(),
        },
      );
    }

    const eventId =
      event._id;

    /*
     * =========================================================
     * BASIC COUNTS
     * =========================================================
     */

    const [
      totalAttendees,
      totalBadgesPrinted,
      totalScans,
      scannedAttendeeIds,
    ] = await Promise.all([
      Attendee.countDocuments({
        eventId,
      }),

      Attendee.countDocuments({
        eventId,
        badgeGenerated: true,
      }),

      ScanRecord.countDocuments({
        eventId,
      }),

      ScanRecord.distinct(
        "attendeeId",
        {
          eventId,
        },
      ),
    ]);

    /*
     * =========================================================
     * SCANS BY DAY
     * =========================================================
     */

    const byDayRaw =
      await ScanRecord.aggregate([
        {
          $match: {
            eventId,
          },
        },

        {
          $group: {
            _id: {
              dayId: "$dayId",
              dayName: "$dayName",
            },
            count: {
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

    const byDay =
      byDayRaw.map(
        (item: {
          _id?: {
            dayId?: string;
            dayName?: string;
          };
          count?: number;
        }) => ({
          id:
            item._id?.dayId ??
            "unknown",
          name:
            item._id?.dayName ??
            "Unknown Day",
          count:
            Number(item.count ?? 0),
        }),
      );

    /*
     * =========================================================
     * SCANS BY MODULE
     * =========================================================
     */

    const byModuleRaw =
      await ScanRecord.aggregate([
        {
          $match: {
            eventId,
          },
        },

        {
          $group: {
            _id: {
              itemId: "$itemId",
              itemName: "$itemName",
            },
            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]);

    const byModule =
      byModuleRaw.map(
        (item: {
          _id?: {
            itemId?: string;
            itemName?: string;
          };
          count?: number;
        }) => ({
          id:
            item._id?.itemId ??
            "unknown",
          name:
            item._id?.itemName ??
            "Unknown Module",
          count:
            Number(item.count ?? 0),
        }),
      );

    /*
     * =========================================================
     * OVERALL CATEGORY SCANS
     *
     * ScanRecord does not directly store attendee category.
     * So we lookup the attendee document.
     * =========================================================
     */

    const byCategoryRaw =
      await ScanRecord.aggregate([
        {
          $match: {
            eventId,
          },
        },

        {
          $lookup: {
            from: "attendees",
            localField: "attendeeId",
            foreignField: "_id",
            as: "attendee",
          },
        },

        {
          $unwind: {
            path: "$attendee",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $group: {
            _id: {
              category: {
                $ifNull: [
                  "$attendee.category",
                  "Uncategorized",
                ],
              },
            },
            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]);

    const byCategory =
      byCategoryRaw.map(
        (item: {
          _id?: {
            category?: string;
          };
          count?: number;
        }) => ({
          name:
            item._id?.category ||
            "Uncategorized",
          count:
            Number(item.count ?? 0),
        }),
      );

    /*
     * =========================================================
     * DAY + MODULE SCANS
     *
     * Each day's total is broken down by the actual scanning
     * modules/items such as Luck Dinner, Certificate, Lunch,
     * Welcome Kit, etc.
     * =========================================================
     */

    const dayModuleRaw =
      await ScanRecord.aggregate([
        {
          $match: {
            eventId,
          },
        },

        {
          $group: {
            _id: {
              dayId: "$dayId",
              dayName: "$dayName",
              itemId: "$itemId",
              itemName: "$itemName",
            },
            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            "_id.dayName": 1,
            count: -1,
          },
        },
      ]);

    const dayModuleMap =
      new Map<
        string,
        {
          id: string;
          name: string;
          count: number;
          modules: {
            id?: string;
            name: string;
            count: number;
          }[];
        }
      >();

    for (const item of dayModuleRaw) {
      const dayId = String(
        item?._id?.dayId ?? "unknown",
      );

      const dayName = String(
        item?._id?.dayName ?? "Unknown Day",
      );

      const moduleId = String(
        item?._id?.itemId ?? "unknown",
      );

      const moduleName = String(
        item?._id?.itemName ?? "Unknown Module",
      );

      const count = Number(
        item?.count ?? 0,
      );

      if (!dayModuleMap.has(dayId)) {
        dayModuleMap.set(
          dayId,
          {
            id: dayId,
            name: dayName,
            count: 0,
            modules: [],
          },
        );
      }

      const day = dayModuleMap.get(dayId);

      if (!day) {
        continue;
      }

      day.count += count;

      day.modules.push({
        id: moduleId,
        name: moduleName,
        count,
      });
    }

    const byDayWithModules =
      Array.from(
        dayModuleMap.values(),
      );

    /*
     * =========================================================
     * DAY + CATEGORY SCANS
     *
     * This is the important new data.
     *
     * Example:
     *
     * Day 1
     *   Doctors       40
     *   Nurses        20
     *   Students      15
     *
     * Day 2
     *   Doctors       30
     *   Nurses        25
     * =========================================================
     */

    const dayCategoryRaw =
      await ScanRecord.aggregate([
        {
          $match: {
            eventId,
          },
        },

        {
          $lookup: {
            from: "attendees",
            localField: "attendeeId",
            foreignField: "_id",
            as: "attendee",
          },
        },

        {
          $unwind: {
            path: "$attendee",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $group: {
            _id: {
              dayId: "$dayId",
              dayName: "$dayName",
              category: {
                $ifNull: [
                  "$attendee.category",
                  "Uncategorized",
                ],
              },
            },
            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            "_id.dayName": 1,
            count: -1,
          },
        },
      ]);

    /*
     * Convert flat aggregation into:
     *
     * [
     *   {
     *     id,
     *     name,
     *     count,
     *     categories: [...]
     *   }
     * ]
     */

    const dayMap =
      new Map<
        string,
        {
          id: string;
          name: string;
          count: number;
          categories: {
            name: string;
            count: number;
          }[];
        }
      >();

    for (const item of dayCategoryRaw) {
      const dayId =
        String(
          item?._id?.dayId ??
            "unknown",
        );

      const dayName =
        String(
          item?._id?.dayName ??
            "Unknown Day",
        );

      const category =
        String(
          item?._id?.category ??
            "Uncategorized",
        );

      const count =
        Number(
          item?.count ?? 0,
        );

      if (!dayMap.has(dayId)) {
        dayMap.set(
          dayId,
          {
            id: dayId,
            name: dayName,
            count: 0,
            categories: [],
          },
        );
      }

      const day =
        dayMap.get(dayId);

      if (!day) {
        continue;
      }

      day.count += count;

      day.categories.push({
        name: category,
        count,
      });
    }

    const byDayWithCategories =
      Array.from(
        dayMap.values(),
      );

    /*
     * =========================================================
     * RESPONSE
     * =========================================================
     */

    return NextResponse.json(
      {
        success: true,

        data: {
          event: {
            id:
              event._id.toString(),
            name:
              event.name,
            publicId:
              resolvedPublicId,
            description:
              event.description ?? "",
            startDate:
              event.startDate ?? null,
            endDate:
              event.endDate ?? null,
            location:
              event.location ?? "",
            status:
              event.status,
          },

          stats: {
            totalAttendees,
            totalBadgesPrinted,
            totalScans,
            uniqueScannedAttendees:
              scannedAttendeeIds.length,
          },

          byDay,

          byDayWithModules,

          byModule,

          byCategory,
        },
      },
      {
        status: 200,
        headers: responseHeaders(),
      },
    );
  } catch (error) {
    console.error(
      "Public dashboard error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load public dashboard.",
      },
      {
        status: 500,
        headers: responseHeaders(),
      },
    );
  }
}