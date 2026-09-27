import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";

import Event from "@/models/Event";
import BadgeConfig from "@/models/BadgeConfig";

import {
  DEFAULT_BADGE_CONFIG,
  type BadgeConfigData,
  type BadgeFieldConfig,
} from "@/types/badge";

interface RouteContext {
  params: Promise<{
    eventId: string;
  }>;
}

function cleanField(
  field: BadgeFieldConfig,
): BadgeFieldConfig {
  return {
    id: field.id,

    label: field.label,

    enabled: Boolean(
      field.enabled,
    ),

    x: Math.max(
      0,
      Number(field.x) || 0,
    ),

    y: Math.max(
      0,
      Number(field.y) || 0,
    ),

    width: Math.max(
      1,
      Number(field.width) || 1,
    ),

    height: Math.max(
      1,
      Number(field.height) || 1,
    ),

    fontSize: Math.max(
      1,
      Number(field.fontSize) || 1,
    ),

    fontWeight:
      Number(field.fontWeight) ||
      400,

    align:
      field.align === "left" ||
      field.align === "right"
        ? field.align
        : "center",

    color:
      typeof field.color ===
      "string"
        ? field.color
        : "#241000",
  };
}

function normalizeConfig(
  body: Partial<BadgeConfigData>,
): BadgeConfigData {
  const width =
    Number(body.width) ||
    DEFAULT_BADGE_CONFIG.width;

  const height =
    Number(body.height) ||
    DEFAULT_BADGE_CONFIG.height;

  const incomingFields =
    Array.isArray(body.fields)
      ? body.fields
      : DEFAULT_BADGE_CONFIG.fields;

  return {
    width: Math.max(
      1,
      width,
    ),

    height: Math.max(
      1,
      height,
    ),

    backgroundColor:
      typeof body.backgroundColor ===
      "string"
        ? body.backgroundColor
        : "#ffffff",

    borderColor:
      typeof body.borderColor ===
      "string"
        ? body.borderColor
        : "#EA580C",

    borderWidth: Math.max(
      0,
      Number(body.borderWidth) ||
        0,
    ),

    borderRadius: Math.max(
      0,
      Number(body.borderRadius) ||
        0,
    ),

    backgroundImage:
      typeof body.backgroundImage ===
      "string"
        ? body.backgroundImage
        : "",

    backgroundImageName:
      typeof body.backgroundImageName ===
      "string"
        ? body.backgroundImageName
        : "",

    qrSource:
      body.qrSource ===
      "qrValue"
        ? "qrValue"
        : "registrationNumber",

    fields:
      incomingFields.map(cleanField),
  };
}

async function getOwnedEvent(
  eventId: string,
  userId: string,
) {
  return Event.findOne({
    _id: eventId,
    createdBy: userId,
  });
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
          message:
            "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const { eventId } =
      await context.params;

    await connectDB();

    const event =
      await getOwnedEvent(
        eventId,
        session.user.id,
      );

    if (!event) {
      return NextResponse.json(
        {
          message:
            "Event not found.",
        },
        {
          status: 404,
        },
      );
    }

    let config =
      await BadgeConfig.findOne({
        eventId: event._id,
      }).lean();

    if (!config) {
      const created =
        await BadgeConfig.create({
          eventId: event._id,
          ...DEFAULT_BADGE_CONFIG,
        });

      config =
        created.toObject();
    }

    return NextResponse.json({
      config,
    });
  } catch (error) {
    console.error(
      "GET badge configuration error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Failed to load badge configuration.",
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
          message:
            "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const { eventId } =
      await context.params;

    await connectDB();

    const event =
      await getOwnedEvent(
        eventId,
        session.user.id,
      );

    if (!event) {
      return NextResponse.json(
        {
          message:
            "Event not found.",
        },
        {
          status: 404,
        },
      );
    }

    const body =
      (await request.json()) as Partial<BadgeConfigData>;

    const config =
      normalizeConfig(body);

    if (
      config.backgroundImage.length >
      4_000_000
    ) {
      return NextResponse.json(
        {
          message:
            "Badge template image is too large. Please use a smaller image.",
        },
        {
          status: 400,
        },
      );
    }

    const saved =
      await BadgeConfig.findOneAndUpdate(
        {
          eventId: event._id,
        },
        {
          $set: config,
          $setOnInsert: {
            eventId: event._id,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        },
      ).lean();

    return NextResponse.json({
      config: saved,
    });
  } catch (error) {
    console.error(
      "PUT badge configuration error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Failed to save badge configuration.",
      },
      {
        status: 500,
      },
    );
  }
}