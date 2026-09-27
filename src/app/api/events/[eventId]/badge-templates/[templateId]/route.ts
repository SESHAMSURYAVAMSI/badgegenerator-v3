import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import BadgeTemplate from "@/models/BadgeTemplate";

interface RouteContext {
  params: Promise<{
    eventId: string;
    templateId: string;
  }>;
}

async function getAuthorizedTemplate(
  eventId: string,
  templateId: string,
) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      ),
    };
  }

  await connectDB();

  const event = await Event.findOne({
    _id: eventId,
    createdBy: session.user.id,
  });

  if (!event) {
    return {
      error: NextResponse.json(
        {
          message: "Event not found or access denied.",
        },
        {
          status: 404,
        },
      ),
    };
  }

  const template = await BadgeTemplate.findOne({
    _id: templateId,
    eventId,
  });

  if (!template) {
    return {
      error: NextResponse.json(
        {
          message: "Badge template not found.",
        },
        {
          status: 404,
        },
      ),
    };
  }

  return {
    session,
    event,
    template,
  };
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { eventId, templateId } = await context.params;

    const result = await getAuthorizedTemplate(
      eventId,
      templateId,
    );

    if (result.error) {
      return result.error;
    }

    return NextResponse.json({
      success: true,
      template: result.template,
    });
  } catch (error) {
    console.error(
      "GET badge template error:",
      error,
    );

    return NextResponse.json(
      {
        message: "Failed to fetch badge template.",
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
    const { eventId, templateId } = await context.params;

    const result = await getAuthorizedTemplate(
      eventId,
      templateId,
    );

    if (result.error) {
      return result.error;
    }

    const body = await request.json();

    const {
      name,
      description,
      width,
      height,
      backgroundColor,
      borderColor,
      borderWidth,
      borderRadius,
      backgroundImage,
      backgroundImageName,
      qrSource,
      fields,
      isActive,
    } = body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return NextResponse.json(
        {
          message: "Template name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Array.isArray(fields)) {
      return NextResponse.json(
        {
          message: "Template fields are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      backgroundImage &&
      typeof backgroundImage === "string" &&
      backgroundImage.length > 4_000_000
    ) {
      return NextResponse.json(
        {
          message:
            "Background image is too large.",
        },
        {
          status: 400,
        },
      );
    }

    const duplicate = await BadgeTemplate.findOne({
      _id: {
        $ne: templateId,
      },
      eventId,
      name: {
        $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          message:
            "Another template already uses this name.",
        },
        {
          status: 409,
        },
      );
    }

    if (isActive === true) {
      await BadgeTemplate.updateMany(
        {
          eventId,
          _id: {
            $ne: templateId,
          },
        },
        {
          $set: {
            isActive: false,
          },
        },
      );
    }

    const updatedTemplate =
      await BadgeTemplate.findOneAndUpdate(
        {
          _id: templateId,
          eventId,
        },
        {
          $set: {
            name: name.trim(),
            description:
              typeof description === "string"
                ? description.trim()
                : "",
            width:
              typeof width === "number"
                ? width
                : result.template.width,
            height:
              typeof height === "number"
                ? height
                : result.template.height,
            backgroundColor:
              typeof backgroundColor === "string"
                ? backgroundColor
                : result.template.backgroundColor,
            borderColor:
              typeof borderColor === "string"
                ? borderColor
                : result.template.borderColor,
            borderWidth:
              typeof borderWidth === "number"
                ? borderWidth
                : result.template.borderWidth,
            borderRadius:
              typeof borderRadius === "number"
                ? borderRadius
                : result.template.borderRadius,
            backgroundImage:
              typeof backgroundImage === "string"
                ? backgroundImage
                : result.template.backgroundImage,
            backgroundImageName:
              typeof backgroundImageName === "string"
                ? backgroundImageName
                : result.template
                    .backgroundImageName,
            qrSource:
              qrSource === "registrationNumber" ||
              qrSource === "qrValue"
                ? qrSource
                : result.template.qrSource,
            fields,
            isActive:
              typeof isActive === "boolean"
                ? isActive
                : result.template.isActive,
          },
        },
        {
          new: true,
        },
      );

    if (!updatedTemplate) {
      return NextResponse.json(
        {
          message: "Template not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      message: "Template updated successfully.",
    });
  } catch (error) {
    console.error(
      "PUT badge template error:",
      error,
    );

    return NextResponse.json(
      {
        message: "Failed to update badge template.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { eventId, templateId } = await context.params;

    const result = await getAuthorizedTemplate(
      eventId,
      templateId,
    );

    if (result.error) {
      return result.error;
    }

    const body = await request.json();

    if (body.action === "activate") {
      await BadgeTemplate.updateMany(
        {
          eventId,
        },
        {
          $set: {
            isActive: false,
          },
        },
      );

      const activatedTemplate =
        await BadgeTemplate.findOneAndUpdate(
          {
            _id: templateId,
            eventId,
          },
          {
            $set: {
              isActive: true,
            },
          },
          {
            new: true,
          },
        );

      return NextResponse.json({
        success: true,
        template: activatedTemplate,
        message:
          "Template activated successfully.",
      });
    }

    if (body.action === "duplicate") {
      const original = result.template;

      const baseName = `${original.name} Copy`;

      let duplicateName = baseName;
      let counter = 2;

      while (
        await BadgeTemplate.exists({
          eventId,
          name: duplicateName,
        })
      ) {
        duplicateName = `${baseName} ${counter}`;
        counter += 1;
      }

      const duplicatedTemplate =
        await BadgeTemplate.create({
          eventId,
          name: duplicateName,
          description:
            original.description || "",
          width: original.width,
          height: original.height,
          backgroundColor:
            original.backgroundColor,
          borderColor: original.borderColor,
          borderWidth: original.borderWidth,
          borderRadius: original.borderRadius,
          backgroundImage:
            original.backgroundImage,
          backgroundImageName:
            original.backgroundImageName,
          qrSource: original.qrSource,
          fields: original.fields.map(
            (field) => ({
              id: field.id,
              label: field.label,
              enabled: field.enabled,
              x: field.x,
              y: field.y,
              width: field.width,
              height: field.height,
              fontSize: field.fontSize,
              fontWeight: field.fontWeight,
              align: field.align,
              color: field.color,
            }),
          ),
          isActive: false,
          createdBy: result.session.user.id,
        });

      return NextResponse.json(
        {
          success: true,
          template: duplicatedTemplate,
          message:
            "Template duplicated successfully.",
        },
        {
          status: 201,
        },
      );
    }

    return NextResponse.json(
      {
        message: "Invalid template action.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error(
      "PATCH badge template error:",
      error,
    );

    return NextResponse.json(
      {
        message: "Failed to update badge template.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { eventId, templateId } = await context.params;

    const result = await getAuthorizedTemplate(
      eventId,
      templateId,
    );

    if (result.error) {
      return result.error;
    }

    const wasActive =
      result.template.isActive;

    await BadgeTemplate.deleteOne({
      _id: templateId,
      eventId,
    });

    if (wasActive) {
      const nextTemplate =
        await BadgeTemplate.findOne({
          eventId,
        }).sort({
          createdAt: -1,
        });

      if (nextTemplate) {
        nextTemplate.isActive = true;
        await nextTemplate.save();
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "Template deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE badge template error:",
      error,
    );

    return NextResponse.json(
      {
        message: "Failed to delete badge template.",
      },
      {
        status: 500,
      },
    );
  }
}