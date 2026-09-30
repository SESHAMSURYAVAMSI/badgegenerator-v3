import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import ScanConfig from "@/models/ScanConfig";
import { auth } from "@/auth";

interface RouteContext {
  params: Promise<{
    eventId: string;
  }>;
}

const DEFAULT_ITEMS = [
  {
    id: "breakfast",
    name: "Breakfast",
    description: "Breakfast distribution",
    icon: "coffee",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "lunch",
    name: "Lunch",
    description: "Lunch distribution",
    icon: "utensils",
    enabled: true,
    sortOrder: 2,
  },
  {
    id: "dinner",
    name: "Dinner",
    description: "Dinner distribution",
    icon: "utensils",
    enabled: true,
    sortOrder: 3,
  },
  {
    id: "kit-bag",
    name: "Kit Bag",
    description: "Conference kit bag",
    icon: "package",
    enabled: true,
    sortOrder: 4,
  },
  {
    id: "certificate",
    name: "Certificate",
    description: "Certificate collection",
    icon: "award",
    enabled: true,
    sortOrder: 5,
  },
];

function getNumberOfDays(
  startDate?: Date,
  endDate?: Date,
): number {
  if (!startDate || !endDate) {
    return 1;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const difference =
    end.getTime() - start.getTime();

  const days =
    Math.floor(
      difference / (1000 * 60 * 60 * 24),
    ) + 1;

  return Math.max(1, days);
}

function createDefaultDays(
  startDate?: Date,
  endDate?: Date,
) {
  const numberOfDays = getNumberOfDays(
    startDate,
    endDate,
  );

  const days = [];

  for (let index = 0; index < numberOfDays; index++) {
    let date = "";

    if (startDate) {
      const currentDate = new Date(startDate);

      currentDate.setDate(
        currentDate.getDate() + index,
      );

      date = currentDate
        .toISOString()
        .split("T")[0];
    }

    days.push({
      id: `day-${index + 1}`,
      name: `Day ${index + 1}`,
      date,
      enabled: true,
      sortOrder: index + 1,
      items: DEFAULT_ITEMS.map((item) => ({
        ...item,
      })),
    });
  }

  return days;
}

async function getOwnedEvent(
  eventId: string,
  adminId: string,
) {
  return Event.findOne({
    _id: eventId,
    createdBy: adminId,
  });
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
          success: false,
          message: "Unauthorized",
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
          success: false,
          message: "Event ID is required",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const event = await getOwnedEvent(
      eventId,
      session.user.id,
    );

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: "Event not found",
        },
        {
          status: 404,
        },
      );
    }

    let config = await ScanConfig.findOne({
      eventId: event._id,
    }).lean();

    /*
     * If scanning configuration does not exist yet,
     * create a default configuration automatically.
     */
    if (!config) {
      const defaultDays = createDefaultDays(
        event.startDate,
        event.endDate,
      );

      const createdConfig =
        await ScanConfig.create({
          eventId: event._id,
          days: defaultDays,
        });

      config = createdConfig.toObject();
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          eventId: event._id.toString(),
          days: config.days ?? [],
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "GET scanning config error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load scanning configuration",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
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
          success: false,
          message: "Event ID is required",
        },
        {
          status: 400,
        },
      );
    }

    const body = await request.json();

    if (!Array.isArray(body?.days)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "days must be an array",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const event = await getOwnedEvent(
      eventId,
      session.user.id,
    );

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: "Event not found",
        },
        {
          status: 404,
        },
      );
    }

    const cleanedDays = body.days.map(
      (
        day: {
          id?: string;
          name?: string;
          date?: string;
          enabled?: boolean;
          sortOrder?: number;
          items?: {
            id?: string;
            name?: string;
            description?: string;
            icon?: string;
            enabled?: boolean;
            sortOrder?: number;
          }[];
        },
        dayIndex: number,
      ) => ({
        id:
          String(day.id ?? "").trim() ||
          `day-${dayIndex + 1}`,

        name:
          String(day.name ?? "").trim() ||
          `Day ${dayIndex + 1}`,

        date:
          String(day.date ?? "").trim(),

        enabled:
          day.enabled !== false,

        sortOrder:
          Number.isFinite(day.sortOrder)
            ? Number(day.sortOrder)
            : dayIndex + 1,

        items: Array.isArray(day.items)
          ? day.items.map(
              (
                item,
                itemIndex,
              ) => ({
                id:
                  String(item.id ?? "")
                    .trim() ||
                  `item-${itemIndex + 1}`,

                name:
                  String(item.name ?? "")
                    .trim() ||
                  `Item ${itemIndex + 1}`,

                description:
                  String(
                    item.description ?? "",
                  ).trim(),

                icon:
                  String(
                    item.icon ?? "scan",
                  ).trim(),

                enabled:
                  item.enabled !== false,

                sortOrder:
                  Number.isFinite(
                    item.sortOrder,
                  )
                    ? Number(
                        item.sortOrder,
                      )
                    : itemIndex + 1,
              }),
            )
          : [],
      }),
    );

    const config =
      await ScanConfig.findOneAndUpdate(
        {
          eventId: event._id,
        },
        {
          $set: {
            days: cleanedDays,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      ).lean();

    return NextResponse.json(
      {
        success: true,
        message:
          "Scanning configuration saved successfully",
        data: {
          eventId: event._id.toString(),
          days: config?.days ?? [],
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "PUT scanning config error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to save scanning configuration",
      },
      {
        status: 500,
      },
    );
  }
}