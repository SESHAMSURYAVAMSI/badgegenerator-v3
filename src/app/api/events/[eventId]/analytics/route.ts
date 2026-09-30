import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Attendee from "@/models/Attendee";
import Event, {
  type EventStatus,
} from "@/models/Event";

interface RouteContext {
  params: Promise<{
    eventId: string;
  }>;
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
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function calculateRate(
  badges: number,
  registered: number,
) {
  if (!registered) {
    return 0;
  }

  return Number(
    ((badges / registered) * 100).toFixed(1),
  );
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDateLabel(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
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

    if (!mongoose.isValidObjectId(eventId)) {
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

    const eventObjectId =
      new mongoose.Types.ObjectId(
        eventId,
      );

    const [
      categoryRows,
      registrationRows,
      badgeRows,
    ] = await Promise.all([
      Attendee.aggregate([
        {
          $match: {
            eventId: eventObjectId,
          },
        },
        {
          $group: {
            _id: {
              $cond: [
                {
                  $and: [
                    {
                      $ne: [
                        "$category",
                        null,
                      ],
                    },
                    {
                      $ne: [
                        "$category",
                        "",
                      ],
                    },
                  ],
                },
                "$category",
                "Uncategorized",
              ],
            },
            registered: {
              $sum: 1,
            },
            badges: {
              $sum: {
                $cond: [
                  "$badgeGenerated",
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            category: "$_id",
            registered: 1,
            badges: 1,
            pending: {
              $subtract: [
                "$registered",
                "$badges",
              ],
            },
          },
        },
        {
          $sort: {
            registered: -1,
            category: 1,
          },
        },
      ]),

      Attendee.aggregate([
        {
          $match: {
            eventId: eventObjectId,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            registered: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]),

      Attendee.aggregate([
        {
          $match: {
            eventId: eventObjectId,
            badgeGenerated: true,
            badgeGeneratedAt: {
              $ne: null,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$badgeGeneratedAt",
              },
            },
            badges: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]),
    ]);

    const registered =
      Number(event.attendeeCount) || 0;

    const badges =
      Number(event.badgeCount) || 0;

    const pending = Math.max(
      0,
      registered - badges,
    );

    const categoryStats =
      categoryRows.map((row) => ({
        category: String(
          row.category ||
            "Uncategorized",
        ),
        registered:
          Number(row.registered) || 0,
        badges:
          Number(row.badges) || 0,
        pending:
          Number(row.pending) || 0,
        rate: calculateRate(
          Number(row.badges) || 0,
          Number(row.registered) || 0,
        ),
      }));

    const registrationTrend =
      registrationRows.map((row) => {
        const date = new Date(
          `${row._id}T00:00:00`,
        );

        return {
          date: row._id,
          label: getDateLabel(date),
          registered:
            Number(row.registered) || 0,
        };
      });

    const badgeTrend =
      badgeRows.map((row) => {
        const date = new Date(
          `${row._id}T00:00:00`,
        );

        return {
          date: row._id,
          label: getDateLabel(date),
          badges:
            Number(row.badges) || 0,
        };
      });

    const allTrendDates = new Set([
      ...registrationRows.map(
        (row) => row._id,
      ),
      ...badgeRows.map(
        (row) => row._id,
      ),
    ]);

    const combinedTrend = Array.from(
      allTrendDates,
    )
      .sort()
      .map((dateKey) => {
        const date = new Date(
          `${dateKey}T00:00:00`,
        );

        const registrationRow =
          registrationRows.find(
            (row) =>
              row._id === dateKey,
          );

        const badgeRow =
          badgeRows.find(
            (row) =>
              row._id === dateKey,
          );

        return {
          date: dateKey,
          label: getDateLabel(date),
          registered:
            Number(
              registrationRow?.registered,
            ) || 0,
          badges:
            Number(badgeRow?.badges) || 0,
        };
      });

    return createResponse({
      success: true,
      analytics: {
        event: {
          id: event._id.toString(),
          name: event.name,
          code: event.code,
          status:
            event.status as EventStatus,
          startDate: event.startDate
            ? new Date(
                event.startDate,
              ).toISOString()
            : null,
          endDate: event.endDate
            ? new Date(
                event.endDate,
              ).toISOString()
            : null,
          location:
            event.location || "",
        },

        summary: {
          registered,
          badges,
          pending,
          badgeRate: calculateRate(
            badges,
            registered,
          ),
        },

        categoryStats,

        registrationTrend,

        badgeTrend,

        combinedTrend,
      },
    });
  } catch (error) {
    console.error(
      "GET event analytics error:",
      error,
    );

    return createResponse(
      {
        success: false,
        message:
          "Failed to load event analytics.",
      },
      500,
    );
  }
}