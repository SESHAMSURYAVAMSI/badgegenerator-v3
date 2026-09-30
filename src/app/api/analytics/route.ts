import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Attendee from "@/models/Attendee";
import Event from "@/models/Event";

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

export async function GET() {
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

    await connectDB();

    const events = await Event.find({
      createdBy: session.user.id,
    })
      .select(
        "_id name code attendeeCount badgeCount status",
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    const eventIds = events.map(
      (event) => event._id,
    );

    const categoryRows =
      eventIds.length > 0
        ? await Attendee.aggregate([
            {
              $match: {
                eventId: {
                  $in: eventIds,
                },
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
          ])
        : [];

    const eventStats = events.map(
      (event) => {
        const registered =
          event.attendeeCount || 0;

        const badges =
          event.badgeCount || 0;

        return {
          eventId: event._id.toString(),
          eventName: event.name,
          eventCode: event.code,
          status: event.status,
          registered,
          badges,
          pending: Math.max(
            0,
            registered - badges,
          ),
          rate: calculateRate(
            badges,
            registered,
          ),
        };
      },
    );

    const totalEvents = events.length;

    const totalAttendees =
      events.reduce(
        (total, event) =>
          total +
          (event.attendeeCount || 0),
        0,
      );

    const totalBadges =
      events.reduce(
        (total, event) =>
          total +
          (event.badgeCount || 0),
        0,
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

    return createResponse({
      success: true,
      analytics: {
        summary: {
          events: totalEvents,
          attendees: totalAttendees,
          badges: totalBadges,
          badgeRate: calculateRate(
            totalBadges,
            totalAttendees,
          ),
        },
        categoryStats,
        eventStats,
      },
    });
  } catch (error) {
    console.error(
      "GET global analytics error:",
      error,
    );

    return createResponse(
      {
        success: false,
        message:
          "Failed to load analytics.",
      },
      500,
    );
  }
}