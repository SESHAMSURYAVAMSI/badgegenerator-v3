import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getPublicEventSession } from "@/lib/publicEventAuth";

import Attendee from "@/models/Attendee";
import BadgeConfig from "@/models/BadgeConfig";
import Event from "@/models/Event";

interface RouteContext {
  params: Promise<{
    publicId: string;
  }>;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

async function generateRegistrationNumber(
  eventId: mongoose.Types.ObjectId,
  eventCode: string,
): Promise<string> {
  const normalizedCode = eventCode.trim().toUpperCase();
  const pattern = new RegExp(
    `^${escapeRegex(normalizedCode)}-(\\d+)$`,
    "i",
  );

  const existingAttendees = await Attendee.find({
    eventId,
    registrationNumber: { $regex: pattern },
  })
    .select("registrationNumber")
    .lean();

  let highestNumber = 0;

  for (const attendee of existingAttendees) {
    const match = attendee.registrationNumber.match(pattern);
    if (!match) continue;

    const value = Number(match[1]);
    if (Number.isSafeInteger(value) && value > highestNumber) {
      highestNumber = value;
    }
  }

  // Retry on unique-index collisions caused by simultaneous registrations.
  for (let offset = 1; offset <= 20; offset += 1) {
    const candidate = `${normalizedCode}-${String(
      highestNumber + offset,
    ).padStart(3, "0")}`;

    const exists = await Attendee.exists({
      eventId,
      registrationNumber: candidate,
    });

    if (!exists) return candidate;
  }

  throw new Error(
    "Could not reserve a registration number. Please try again.",
  );
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { publicId } = await context.params;
    const normalizedPublicId = publicId?.trim();

    if (
      !normalizedPublicId ||
      normalizedPublicId.length < 20 ||
      normalizedPublicId.length > 100
    ) {
      return jsonResponse(
        { success: false, message: "Invalid public event link." },
        400,
      );
    }

    const publicSession = await getPublicEventSession(
      request,
      normalizedPublicId,
    );

    if (!publicSession) {
      return jsonResponse(
        {
          success: false,
          message: "Public event authentication is required.",
          code: "PUBLIC_AUTH_REQUIRED",
        },
        401,
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonResponse(
        { success: false, message: "Please provide attendee details." },
        400,
      );
    }

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const medicalCouncilNumber = String(
      body.medicalCouncilNumber ?? "",
    )
      .trim()
      .toUpperCase();
    const category = String(body.category ?? "").trim();

    if (!name) {
      return jsonResponse(
        { success: false, message: "Full name is required." },
        400,
      );
    }

    if (name.length > 150) {
      return jsonResponse(
        { success: false, message: "Name cannot exceed 150 characters." },
        400,
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(
        { success: false, message: "Enter a valid email address." },
        400,
      );
    }

    if (email.length > 254) {
      return jsonResponse(
        { success: false, message: "Email address is too long." },
        400,
      );
    }

    if (phone.length > 50) {
      return jsonResponse(
        { success: false, message: "Phone number cannot exceed 50 characters." },
        400,
      );
    }

    if (medicalCouncilNumber.length > 100) {
      return jsonResponse(
        {
          success: false,
          message: "Medical Council Number cannot exceed 100 characters.",
        },
        400,
      );
    }

    if (category.length > 100) {
      return jsonResponse(
        { success: false, message: "Category cannot exceed 100 characters." },
        400,
      );
    }

    await connectDB();

    const event = await Event.findOne({
      publicId: normalizedPublicId,
    });

    if (!event) {
      return jsonResponse(
        { success: false, message: "Event not found." },
        404,
      );
    }

    if (
      publicSession.eventId !== event._id.toString() ||
      publicSession.publicId !== normalizedPublicId
    ) {
      return jsonResponse(
        {
          success: false,
          message: "This public event session does not belong to this event.",
          code: "EVENT_SESSION_MISMATCH",
        },
        403,
      );
    }

    if (event.status === "draft") {
      return jsonResponse(
        { success: false, message: "This event is not currently available." },
        403,
      );
    }

    // Spot registration must use the badge design saved for this event.
    const badgeConfig = await BadgeConfig.findOne({
      eventId: event._id,
    })
      .select("_id")
      .lean();

    if (!badgeConfig) {
      return jsonResponse(
        {
          success: false,
          message:
            "This event does not have a saved badge design yet. Please configure the badge before registering attendees.",
        },
        409,
      );
    }

    const eventId = new mongoose.Types.ObjectId(event._id.toString());
    const rawCode = String(event.code || event.slug || "REG")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);

    const eventCode = rawCode || "REG";
    let attendee: InstanceType<typeof Attendee> | null = null;

    for (let attempt = 0; attempt < 3 && !attendee; attempt += 1) {
      const registrationNumber = await generateRegistrationNumber(
        eventId,
        eventCode,
      );

      try {
        // Construct a single Mongoose document explicitly. Model.create() has
        // array and single-document overloads; TypeScript can infer the array
        // overload here, which makes attendee appear to be an array below.
        attendee = new Attendee({
          eventId,
          name,
          email,
          phone,
          medicalCouncilNumber,
          registrationNumber,
          category,
          // BadgeConfig selects whether registrationNumber or qrValue is encoded.
          qrValue: registrationNumber,
          badgeGenerated: true,
          badgeUrl: `/api/public/events/${encodeURIComponent(
            normalizedPublicId,
          )}/badge/${encodeURIComponent(
            registrationNumber,
          )}/download`,
          badgeGeneratedAt: new Date(),
          badgeGenerationCount: 1,
        });
        await attendee.save();
      } catch (error) {
        if (isDuplicateKeyError(error) && attempt < 2) {
          continue;
        }
        if (isDuplicateKeyError(error)) {
          return jsonResponse(
            {
              success: false,
              message:
                "A registration number conflict occurred. Please submit the registration again.",
            },
            409,
          );
        }
        throw error;
      }
    }

    if (!attendee) {
      return jsonResponse(
        { success: false, message: "Unable to create this registration." },
        500,
      );
    }

    // Store the actual attendee-specific badge endpoint for later use.
    attendee.badgeUrl = `/api/public/events/${encodeURIComponent(
      normalizedPublicId,
    )}/badge/${encodeURIComponent(attendee._id.toString())}/download`;
    await attendee.save();

    const [attendeeCount, badgeCount] = await Promise.all([
      Attendee.countDocuments({ eventId }),
      Attendee.countDocuments({ eventId, badgeGenerated: true }),
    ]);

    await Event.updateOne(
      { _id: event._id },
      { $set: { attendeeCount, badgeCount } },
    );

    return jsonResponse(
      {
        success: true,
        message: "Spot registration completed and badge generated.",
        attendee: {
          _id: attendee._id.toString(),
          name: attendee.name,
          email: attendee.email,
          phone: attendee.phone,
          medicalCouncilNumber: attendee.medicalCouncilNumber,
          registrationNumber: attendee.registrationNumber,
          category: attendee.category,
          qrValue: attendee.qrValue,
          badgeGenerated: attendee.badgeGenerated,
          badgeUrl: attendee.badgeUrl,
          badgeGeneratedAt: attendee.badgeGeneratedAt?.toISOString(),
          badgeGenerationCount: attendee.badgeGenerationCount,
        },
        event: {
          name: String(event.name ?? ""),
          description: String(event.description ?? ""),
          location: String(event.location ?? ""),
        },
        attendeeCount,
        badgeCount,
      },
      201,
    );
  } catch (error) {
    console.error("Public spot registration error:", error);
    return jsonResponse(
      {
        success: false,
        message: "Unable to complete spot registration. Please try again.",
      },
      500,
    );
  }
}
