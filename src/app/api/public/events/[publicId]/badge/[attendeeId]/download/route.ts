import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { connectDB } from "@/lib/mongodb";
import { getPublicEventSession } from "@/lib/publicEventAuth";

import Event from "@/models/Event";
import Attendee from "@/models/Attendee";
import BadgeConfig from "@/models/BadgeConfig";

interface RouteContext {
  params: Promise<{
    publicId: string;
    attendeeId: string;
  }>;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function safeFileName(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "badge"
  );
}

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const {
      publicId,
      attendeeId,
    } = await context.params;

    const normalizedPublicId =
      publicId?.trim();

    if (
      !normalizedPublicId ||
      !attendeeId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid badge download request.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ---------------------------------------------------------
     * PUBLIC EVENT AUTHENTICATION
     * ---------------------------------------------------------
     */
    const publicSession =
      await getPublicEventSession(
        request,
        normalizedPublicId,
      );

    if (!publicSession) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Public event authentication is required.",
          code: "PUBLIC_AUTH_REQUIRED",
        },
        {
          status: 401,
        },
      );
    }

    await connectDB();

    /*
     * Find the event using the public ID.
     */
    const event =
      await Event.findOne({
        publicId: normalizedPublicId,
      }).lean();

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

    /*
     * ---------------------------------------------------------
     * EVENT SESSION MATCH
     * ---------------------------------------------------------
     */
    if (
      publicSession.eventId !==
      event._id.toString()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This public event session does not belong to this event.",
          code: "EVENT_SESSION_MISMATCH",
        },
        {
          status: 403,
        },
      );
    }

    if (
      publicSession.publicId !==
      normalizedPublicId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid public event session.",
          code: "INVALID_PUBLIC_SESSION",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * Draft events should never expose public badges.
     */
    if (event.status === "draft") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This event is not currently available.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * IMPORTANT:
     *
     * Attendee does NOT have:
     *
     * status: "generated"
     *
     * BadgeFlow uses:
     *
     * badgeGenerated: true
     *
     * to determine whether a badge is
     * publicly available.
     */
    const attendee =
      await Attendee.findOne({
        _id: attendeeId,
        eventId: event._id,
        badgeGenerated: true,
      }).lean();

    if (!attendee) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Generated badge not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Load the badge configuration belonging
     * to this event.
     */
    const config =
      await BadgeConfig.findOne({
        eventId: event._id,
      }).lean();

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Badge configuration not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Determine which value should be encoded
     * into the QR code.
     */
    const qrValue =
      config.qrSource ===
      "registrationNumber"
        ? attendee.registrationNumber
        : attendee.qrValue ||
          attendee.registrationNumber;

    if (!qrValue) {
      return NextResponse.json(
        {
          success: false,
          message:
            "QR value is missing for this attendee.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Generate QR code.
     */
    const qrDataUrl =
      await QRCode.toDataURL(qrValue, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: 512,
      });

    const width = config.width;
    const height = config.height;

    /*
     * Build enabled badge fields.
     */
    const enabledFields =
      config.fields.filter(
        (field) => field.enabled,
      );

    const fieldMarkup =
      enabledFields
        .map((field) => {
          /*
           * QR field
           */
          if (field.id === "qr") {
            return `
              <image
                href="${qrDataUrl}"
                x="${field.x}"
                y="${field.y}"
                width="${field.width}"
                height="${field.height}"
                preserveAspectRatio="xMidYMid meet"
              />
            `;
          }

          let value = "";

          if (field.id === "name") {
            value = attendee.name;
          }

          if (
            field.id ===
            "registrationNumber"
          ) {
            value =
              attendee.registrationNumber;
          }

          if (field.id === "category") {
            value =
              attendee.category || "";
          }

          /*
           * Medical Council Number
           */
          if (
            field.id ===
            "medicalCouncilNumber"
          ) {
            value =
              attendee.medicalCouncilNumber ||
              "";
          }

          /*
           * Do not render empty fields.
           */
          if (!value) {
            return "";
          }

          const fontWeight =
            field.fontWeight || 500;

          const textAnchor =
            field.align === "left"
              ? "start"
              : field.align === "right"
                ? "end"
                : "middle";

          const textX =
            field.align === "left"
              ? field.x
              : field.align === "right"
                ? field.x +
                  field.width
                : field.x +
                  field.width / 2;

          const textY =
            field.y +
            Math.min(
              field.height,
              field.fontSize,
            );

          return `
            <text
              x="${textX}"
              y="${textY}"
              fill="${escapeXml(
                field.color ||
                  "#241000",
              )}"
              font-size="${field.fontSize}px"
              font-weight="${fontWeight}"
              text-anchor="${textAnchor}"
              font-family="Arial, Helvetica, sans-serif"
            >
              ${escapeXml(value)}
            </text>
          `;
        })
        .join("");

    /*
     * Badge background image.
     */
    const backgroundImage =
      config.backgroundImage
        ? `
          <image
            href="${config.backgroundImage}"
            x="0"
            y="0"
            width="${width}"
            height="${height}"
            preserveAspectRatio="none"
          />
        `
        : "";

    /*
     * Create SVG badge.
     */
    const svg = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="${width}"
        height="${height}"
        viewBox="0 0 ${width} ${height}"
      >
        <rect
          width="${width}"
          height="${height}"
          fill="${escapeXml(
            config.backgroundColor ||
              "#ffffff",
          )}"
        />

        ${backgroundImage}

        ${fieldMarkup}
      </svg>
    `;

    const fileName =
      `${safeFileName(
        attendee.registrationNumber ||
          attendee.name ||
          "badge",
      )}-badge.svg`;

    return new NextResponse(svg, {
      status: 200,

      headers: {
        "Content-Type":
          "image/svg+xml; charset=utf-8",

        "Content-Disposition":
          `attachment; filename="${fileName}"`,

        "Cache-Control":
          "private, no-store, max-age=0",

        "X-Content-Type-Options":
          "nosniff",

        "Referrer-Policy":
          "no-referrer",
      },
    });
  } catch (error) {
    console.error(
      "Public badge download error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to generate badge.",
      },
      {
        status: 500,
      },
    );
  }
}