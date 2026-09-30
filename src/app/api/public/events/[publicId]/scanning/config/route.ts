import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import ScanConfig from "@/models/ScanConfig";

interface RouteContext {
  params: Promise<{
    publicId: string;
  }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { publicId } = await context.params;

    const identifier = publicId.trim();

    if (!identifier) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Public event ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    /*
     * First resolve using permanent publicId.
     */
    let event = await Event.findOne({
      publicId: identifier,
    }).lean();

    /*
     * Backward compatibility for older links.
     */
    if (
      !event &&
      mongoose.Types.ObjectId.isValid(identifier)
    ) {
      event = await Event.findById(
        identifier,
      ).lean();
    }

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: "Event not found.",
        },
        {
          status: 404,
        },
      );
    }

    const config =
      await ScanConfig.findOne({
        eventId: event._id,
      }).lean();

    /*
     * No configuration yet.
     */
    if (!config) {
      return NextResponse.json(
        {
          success: true,

          data: {
            eventId: event._id.toString(),
            days: [],
          },
        },
        {
          status: 200,
        },
      );
    }

    const enabledDays =
      (config.days ?? [])
        .filter(
          (day) => day.enabled,
        )
        .sort(
          (first, second) =>
            first.sortOrder -
            second.sortOrder,
        )
        .map((day) => ({
          id: day.id,
          name: day.name,
          date: day.date ?? "",
          enabled: day.enabled,
          sortOrder: day.sortOrder,

          items: (day.items ?? [])
            .filter(
              (item) =>
                item.enabled,
            )
            .sort(
              (first, second) =>
                first.sortOrder -
                second.sortOrder,
            )
            .map((item) => ({
              id: item.id,
              name: item.name,
              description:
                item.description ?? "",
              icon:
                item.icon ?? "scan",
              enabled:
                item.enabled,
              sortOrder:
                item.sortOrder,
            })),
        }));

    return NextResponse.json(
      {
        success: true,

        data: {
          eventId:
            event._id.toString(),

          days: enabledDays,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Public scanning config error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load scanning configuration.",
      },
      {
        status: 500,
      },
    );
  }
}