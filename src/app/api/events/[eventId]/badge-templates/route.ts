import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import BadgeTemplate from "@/models/BadgeTemplate";
import Event from "@/models/Event";

import type {
  BadgeConfigData,
} from "@/types/badge";

interface RouteContext {
  params: Promise<{
    eventId: string;
  }>;
}

interface CreateTemplateBody
  extends BadgeConfigData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

function cleanString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function isValidConfig(
  config: Partial<BadgeConfigData>,
): boolean {
  if (
    typeof config.width !== "number" ||
    typeof config.height !== "number" ||
    config.width <= 0 ||
    config.height <= 0
  ) {
    return false;
  }

  if (
    !Array.isArray(
      config.fields,
    )
  ) {
    return false;
  }

  return true;
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
            "Event not found or access denied.",
        },
        {
          status: 404,
        },
      );
    }

    const templates =
      await BadgeTemplate.find({
        eventId: event._id,
        createdBy:
          session.user.id,
      })
        .sort({
          isActive: -1,
          createdAt: -1,
        })
        .lean();

    return NextResponse.json({
      templates,
    });
  } catch (error) {
    console.error(
      "GET badge templates error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Failed to load badge templates.",
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
      (await request.json()) as CreateTemplateBody;

    const name =
      cleanString(body.name);

    const description =
      cleanString(
        body.description,
      );

    if (!name) {
      return NextResponse.json(
        {
          message:
            "Template name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          message:
            "Template name cannot exceed 100 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isValidConfig(
        body,
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid badge configuration.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !body.backgroundImage
    ) {
      return NextResponse.json(
        {
          message:
            "Badge template image is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      body.backgroundImage.length >
      4_000_000
    ) {
      return NextResponse.json(
        {
          message:
            "Badge template image is too large.",
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
            "Event not found or access denied.",
        },
        {
          status: 404,
        },
      );
    }

    const existingTemplate =
      await BadgeTemplate.findOne({
        eventId: event._id,
        createdBy:
          session.user.id,
        name: {
          $regex: `^${name.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          )}$`,
          $options: "i",
        },
      });

    if (existingTemplate) {
      return NextResponse.json(
        {
          message:
            "A badge template with this name already exists.",
        },
        {
          status: 409,
        },
      );
    }

    const existingTemplateCount =
      await BadgeTemplate.countDocuments({
        eventId: event._id,
        createdBy:
          session.user.id,
      });

    const requestedActive =
      body.isActive === true;

    const shouldBeActive =
      requestedActive ||
      existingTemplateCount === 0;

    if (shouldBeActive) {
      await BadgeTemplate.updateMany(
        {
          eventId: event._id,
          createdBy:
            session.user.id,
          isActive: true,
        },
        {
          $set: {
            isActive: false,
          },
        },
      );
    }

    const template =
      await BadgeTemplate.create({
        eventId:
          event._id,

        name,

        description,

        width: body.width,

        height: body.height,

        backgroundColor:
          body.backgroundColor ||
          "#ffffff",

        borderColor:
          body.borderColor ||
          "#EA580C",

        borderWidth:
          Math.max(
            0,
            Number(
              body.borderWidth ?? 0,
            ),
          ),

        borderRadius:
          Math.max(
            0,
            Number(
              body.borderRadius ?? 0,
            ),
          ),

        backgroundImage:
          body.backgroundImage,

        backgroundImageName:
          cleanString(
            body.backgroundImageName,
          ),

        qrSource:
          body.qrSource ===
          "qrValue"
            ? "qrValue"
            : "registrationNumber",

        fields:
          body.fields,

        isActive:
          shouldBeActive,

        createdBy:
          session.user.id,
      });

    return NextResponse.json(
      {
        message:
          "Badge template created successfully.",
        template,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST badge template error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Failed to create badge template.",
      },
      {
        status: 500,
      },
    );
  }
}