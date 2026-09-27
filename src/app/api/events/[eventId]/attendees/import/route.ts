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

function cleanString(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function normalizeRegistrationNumber(
  value: string,
): string {
  return value.trim().toUpperCase();
}

function isValidEmail(
  email: string,
): boolean {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
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

    const { eventId } =
      await context.params;

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Event ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      await request.json();

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

    const rows =
      body.rows as ImportRow[];

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

    const event =
      await Event.findOne({
        _id: eventId,
        createdBy: session.user.id,
      });

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Event not found.",
        },
        {
          status: 404,
        },
      );
    }

    const errors: ImportError[] = [];

    const cleanRows: CleanRow[] =
      [];

    const fileRegistrationNumbers =
      new Set<string>();

    /*
     * Validate every uploaded row.
     */
    for (
      let index = 0;
      index < rows.length;
      index += 1
    ) {
      const row =
        rows[index];

      /*
       * Excel row number.
       * Row 1 is normally the header,
       * therefore data starts at row 2.
       */
      const rowNumber =
        index + 2;

      const name =
        cleanString(row.name);

      const email =
        cleanString(
          row.email,
        ).toLowerCase();

      const phone =
        cleanString(row.phone);

      /*
       * Registration number comes
       * directly from the uploaded file.
       *
       * We normalize it to uppercase,
       * but we NEVER generate it.
       */
      const registrationNumber =
        normalizeRegistrationNumber(
          cleanString(
            row.registrationNumber,
          ),
        );

      const category =
        cleanString(
          row.category,
        );

      const qrValue =
        cleanString(
          row.qrValue,
        );

      if (!name) {
        errors.push({
          rowNumber,
          message:
            "Name is required.",
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
          message:
            `Invalid email address: ${email}`,
        });

        continue;
      }

      /*
       * Registration number is mandatory.
       *
       * IMPORTANT:
       * No automatic generation.
       */
      if (!registrationNumber) {
        errors.push({
          rowNumber,
          message:
            "Registration number is required.",
        });

        continue;
      }

      /*
       * Prevent duplicate registration
       * numbers inside the uploaded file.
       */
      if (
        fileRegistrationNumbers.has(
          registrationNumber,
        )
      ) {
        errors.push({
          rowNumber,
          message:
            `Duplicate registration number in uploaded file: ${registrationNumber}`,
        });

        continue;
      }

      fileRegistrationNumbers.add(
        registrationNumber,
      );

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

    /*
     * Check supplied registration
     * numbers against MongoDB.
     */
    const providedRegistrationNumbers =
      cleanRows.map(
        (row) =>
          row.registrationNumber,
      );

    const existingAttendees =
      await Attendee.find({
        eventId: event._id,
        registrationNumber: {
          $in:
            providedRegistrationNumbers,
        },
      })
        .select(
          "registrationNumber",
        )
        .lean();

    const existingNumbers =
      new Set(
        existingAttendees.map(
          (attendee) =>
            attendee.registrationNumber,
        ),
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

      badgeGenerated: boolean;
      badgeUrl: string;
      badgeGenerationCount: number;
    }> = [];

    /*
     * Prepare attendees for insertion.
     */
    for (const row of cleanRows) {
      const registrationNumber =
        row.registrationNumber;

      /*
       * Registration number already
       * exists in this event.
       */
      if (
        existingNumbers.has(
          registrationNumber,
        )
      ) {
        errors.push({
          rowNumber:
            row.rowNumber,
          message:
            `Registration number already exists: ${registrationNumber}`,
        });

        continue;
      }

      /*
       * QR value:
       *
       * 1. Use uploaded QR value when
       *    provided.
       *
       * 2. Otherwise use the exact
       *    supplied registration number.
       */
      const qrValue =
        row.qrValue ||
        registrationNumber;

      attendeesToInsert.push({
        eventId: event._id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        registrationNumber,
        category: row.category,
        qrValue,
        status: "registered",

        badgeGenerated: false,
        badgeUrl: "",
        badgeGenerationCount: 0,
      });
    }

    if (
      attendeesToInsert.length ===
      0
    ) {
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

      /*
       * MongoDB may insert some
       * documents before encountering
       * an error when ordered=false.
       */
      if (
        error &&
        typeof error ===
          "object" &&
        "insertedDocs" in error
      ) {
        const insertedDocs = (
          error as {
            insertedDocs?: unknown[];
          }
        ).insertedDocs;

        if (
          Array.isArray(
            insertedDocs,
          )
        ) {
          insertedCount =
            insertedDocs.length;
        }
      }

      if (
        insertedCount === 0
      ) {
        throw error;
      }
    }

    /*
     * Recalculate attendee count
     * from MongoDB.
     */
    const attendeeCount =
      await Attendee.countDocuments({
        eventId: event._id,
        status: {
          $ne: "cancelled",
        },
      });

    /*
     * Recalculate generated badge
     * count as well.
     */
    const badgeCount =
      await Attendee.countDocuments({
        eventId: event._id,
        badgeGenerated: true,
      });

    await Event.findByIdAndUpdate(
      event._id,
      {
        attendeeCount,
        badgeCount,
      },
    );

    return NextResponse.json({
      success: true,

      message:
        `Successfully imported ${insertedCount.toLocaleString()} attendee${
          insertedCount ===
          1
            ? ""
            : "s"
        }.`,

      importedCount:
        insertedCount,

      skippedCount:
        rows.length -
        insertedCount,

      errorCount:
        errors.length,

      attendeeCount,

      badgeCount,

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