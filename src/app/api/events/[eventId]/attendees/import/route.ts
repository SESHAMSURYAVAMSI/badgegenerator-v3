import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Attendee from "@/models/Attendee";
import Event from "@/models/Event";

interface RouteContext {
  params: Promise<{
    eventId: string;
  }>;
}

interface ImportRow {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  registrationNumber?: unknown;
  category?: unknown;
  qrValue?: unknown;
}

interface CleanRow {
  name: string;
  email: string;
  phone: string;
  registrationNumber: string;
  category: string;
  qrValue: string;
  rowNumber: number;
}

interface ImportError {
  rowNumber: number;
  message: string;
}

const MAX_ROWS = 5000;

function cleanString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeRegistrationNumber(
  value: string,
): string {
  return value.trim().toUpperCase();
}

function createRegistrationNumber(): string {
  const timestamp = Date.now()
    .toString()
    .slice(-7);

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase();

  return `REG-${timestamp}-${randomPart}`;
}

function isValidEmail(email: string): boolean {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function generateUniqueRegistrationNumber(
  eventId: string,
  usedNumbers: Set<string>,
): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const registrationNumber =
      createRegistrationNumber();

    if (usedNumbers.has(registrationNumber)) {
      continue;
    }

    const existing = await Attendee.exists({
      eventId,
      registrationNumber,
    });

    if (!existing) {
      usedNumbers.add(registrationNumber);

      return registrationNumber;
    }
  }

  throw new Error(
    "Unable to generate a unique registration number.",
  );
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
          success: false,
          message: "Unauthorized.",
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
          message: "Event ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const body = await request.json();

    if (
      !body ||
      !Array.isArray(body.rows)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid import data. Expected rows array.",
        },
        {
          status: 400,
        },
      );
    }

    const rows = body.rows as ImportRow[];

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The uploaded file does not contain any attendee rows.",
        },
        {
          status: 400,
        },
      );
    }

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        {
          success: false,
          message: `You can import a maximum of ${MAX_ROWS.toLocaleString()} attendees at once.`,
        },
        {
          status: 400,
        },
      );
    }

    await connectDB();

    const event = await Event.findOne({
      _id: eventId,
      createdBy: session.user.id,
    });

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

    const errors: ImportError[] = [];
    const cleanRows: CleanRow[] = [];

    const fileRegistrationNumbers =
      new Set<string>();

    for (
      let index = 0;
      index < rows.length;
      index += 1
    ) {
      const row = rows[index];

      const rowNumber = index + 2;

      const name = cleanString(row.name);

      const email = cleanString(row.email)
        .toLowerCase();

      const phone = cleanString(row.phone);

      const registrationNumber =
        normalizeRegistrationNumber(
          cleanString(
            row.registrationNumber,
          ),
        );

      const category = cleanString(
        row.category,
      );

      const qrValue = cleanString(
        row.qrValue,
      );

      if (!name) {
        errors.push({
          rowNumber,
          message: "Name is required.",
        });

        continue;
      }

      if (name.length > 150) {
        errors.push({
          rowNumber,
          message:
            "Name cannot exceed 150 characters.",
        });

        continue;
      }

      if (!isValidEmail(email)) {
        errors.push({
          rowNumber,
          message: `Invalid email address: ${email}`,
        });

        continue;
      }

      if (
        registrationNumber &&
        fileRegistrationNumbers.has(
          registrationNumber,
        )
      ) {
        errors.push({
          rowNumber,
          message: `Duplicate registration number in uploaded file: ${registrationNumber}`,
        });

        continue;
      }

      if (registrationNumber) {
        fileRegistrationNumbers.add(
          registrationNumber,
        );
      }

      cleanRows.push({
        name,
        email,
        phone,
        registrationNumber,
        category,
        qrValue,
        rowNumber,
      });
    }

    if (cleanRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No valid attendee rows were found.",
          errors,
        },
        {
          status: 400,
        },
      );
    }

    const providedRegistrationNumbers =
      cleanRows
        .filter(
          (row) => row.registrationNumber,
        )
        .map(
          (row) => row.registrationNumber,
        );

    const existingAttendees =
      providedRegistrationNumbers.length > 0
        ? await Attendee.find({
            eventId: event._id,
            registrationNumber: {
              $in: providedRegistrationNumbers,
            },
          })
            .select("registrationNumber")
            .lean()
        : [];

    const existingNumbers = new Set(
      existingAttendees.map(
        (attendee) =>
          attendee.registrationNumber,
      ),
    );

    const usedNumbers = new Set(
      providedRegistrationNumbers,
    );

    const attendeesToInsert: Array<{
      eventId: typeof event._id;
      name: string;
      email: string;
      phone: string;
      registrationNumber: string;
      category: string;
      qrValue: string;
      status: "registered";
    }> = [];

    for (const row of cleanRows) {
      let registrationNumber =
        row.registrationNumber;

      if (
        registrationNumber &&
        existingNumbers.has(
          registrationNumber,
        )
      ) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `Registration number already exists: ${registrationNumber}`,
        });

        continue;
      }

      if (!registrationNumber) {
        registrationNumber =
          await generateUniqueRegistrationNumber(
            event._id.toString(),
            usedNumbers,
          );
      } else {
        usedNumbers.add(
          registrationNumber,
        );
      }

      const qrValue =
        row.qrValue || registrationNumber;

      attendeesToInsert.push({
        eventId: event._id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        registrationNumber,
        category: row.category,
        qrValue,
        status: "registered",
      });
    }

    if (attendeesToInsert.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No attendees could be imported.",
          errors,
        },
        {
          status: 400,
        },
      );
    }

    let insertedCount = 0;

    try {
      const insertedAttendees =
        await Attendee.insertMany(
          attendeesToInsert,
          {
            ordered: false,
          },
        );

      insertedCount =
        insertedAttendees.length;
    } catch (error) {
      console.error(
        "Bulk attendee insert error:",
        error,
      );

      if (
        error &&
        typeof error === "object" &&
        "insertedDocs" in error
      ) {
        const insertedDocs = (
          error as {
            insertedDocs?: unknown[];
          }
        ).insertedDocs;

        if (Array.isArray(insertedDocs)) {
          insertedCount =
            insertedDocs.length;
        }
      }

      if (insertedCount === 0) {
        throw error;
      }
    }

    const attendeeCount =
      await Attendee.countDocuments({
        eventId: event._id,
        status: {
          $ne: "cancelled",
        },
      });

    await Event.findByIdAndUpdate(
      event._id,
      {
        attendeeCount,
      },
    );

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedCount.toLocaleString()} attendee${
        insertedCount === 1
          ? ""
          : "s"
      }.`,
      importedCount: insertedCount,
      skippedCount:
        rows.length - insertedCount,
      errorCount: errors.length,
      attendeeCount,
      errors,
    });
  } catch (error) {
    console.error(
      "POST /api/events/[eventId]/attendees/import failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to import attendees.",
      },
      {
        status: 500,
      },
    );
  }
}