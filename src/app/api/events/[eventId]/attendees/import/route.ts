import { NextResponse } from "next/server";
import mongoose from "mongoose";

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
  medicalCouncilNumber?: unknown;
  registrationNumber?: unknown;
  category?: unknown;
  qrValue?: unknown;
}

interface CleanRow {
  name: string;
  email: string;
  phone: string;
  medicalCouncilNumber: string;
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
  return value
    .trim()
    .toUpperCase();
}

function escapeRegex(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
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

async function generateRegistrationNumbers(
  eventId: unknown,
  eventCode: string,
  count: number,
  reservedNumbers: Set<string>,
): Promise<string[]> {
  const attendeeEventId =
    new mongoose.Types.ObjectId(
      String(eventId),
    );

  const normalizedCode =
    eventCode.trim().toUpperCase();

  const safeCode =
    escapeRegex(normalizedCode);

  const pattern =
    new RegExp(
      `^${safeCode}-(\\d+)$`,
      "i",
    );

  const existingAttendees =
    await Attendee.find({
      eventId: attendeeEventId,
      registrationNumber: {
        $regex: pattern,
      },
    })
      .select("registrationNumber")
      .lean();

  const usedNumbers =
    new Set<string>();

  for (const attendee of existingAttendees) {
    usedNumbers.add(
      attendee.registrationNumber.toUpperCase(),
    );
  }

  for (const number of reservedNumbers) {
    usedNumbers.add(
      number.toUpperCase(),
    );
  }

  let highestNumber = 0;

  for (const registrationNumber of usedNumbers) {
    const match =
      registrationNumber.match(
        pattern,
      );

    if (!match) {
      continue;
    }

    const number =
      Number(match[1]);

    if (
      Number.isFinite(number) &&
      number > highestNumber
    ) {
      highestNumber = number;
    }
  }

  const generated: string[] = [];

  let nextNumber =
    highestNumber + 1;

  while (
    generated.length < count
  ) {
    const candidate =
      `${normalizedCode}-${String(
        nextNumber,
      ).padStart(3, "0")}`;

    if (
      !usedNumbers.has(
        candidate.toUpperCase(),
      )
    ) {
      generated.push(candidate);

      usedNumbers.add(
        candidate.toUpperCase(),
      );
    }

    nextNumber += 1;
  }

  return generated;
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

    if (
      rows.length > MAX_ROWS
    ) {
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
        createdBy:
          session.user.id,
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

    const errors: ImportError[] =
      [];

    const cleanRows: CleanRow[] =
      [];

    /*
     * Supplied registration numbers
     * must remain unique inside the
     * uploaded file.
     */
    const fileRegistrationNumbers =
      new Set<string>();

    let rowsNeedingGeneratedNumber = 0;

    /*
     * First pass:
     * validate names, emails, etc.
     *
     * Registration number is now
     * optional.
     */
    for (
      let index = 0;
      index < rows.length;
      index += 1
    ) {
      const row =
        rows[index];

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

      const medicalCouncilNumber =
        cleanString(
          row.medicalCouncilNumber,
        ).toUpperCase();

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

      if (
        name.length > 150
      ) {
        errors.push({
          rowNumber,
          message:
            "Name cannot exceed 150 characters.",
        });

        continue;
      }

      if (
        !isValidEmail(email)
      ) {
        errors.push({
          rowNumber,
          message:
            `Invalid email address: ${email}`,
        });

        continue;
      }

      /*
       * Registration number is OPTIONAL.
       */
      if (registrationNumber) {
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
      } else {
        rowsNeedingGeneratedNumber +=
          1;
      }

      cleanRows.push({
        name,
        email,
        phone,
        medicalCouncilNumber,
        registrationNumber,
        category,
        qrValue,
        rowNumber,
      });
    }

    if (
      cleanRows.length === 0
    ) {
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
     * Find registration numbers
     * already used by this event.
     */
    const providedRegistrationNumbers =
      cleanRows
        .filter(
          (row) =>
            Boolean(
              row.registrationNumber,
            ),
        )
        .map(
          (row) =>
            row.registrationNumber,
        );

    const existingAttendees =
      providedRegistrationNumbers.length >
      0
        ? await Attendee.find({
            eventId: event._id,
            registrationNumber: {
              $in:
                providedRegistrationNumbers,
            },
          })
            .select(
              "registrationNumber",
            )
            .lean()
        : [];

    const existingNumbers =
      new Set(
        existingAttendees.map(
          (attendee) =>
            attendee.registrationNumber.toUpperCase(),
        ),
      );

    /*
     * Generate registration numbers
     * for rows where the Excel/CSV
     * field was empty.
     */
    const generatedNumbers =
      await generateRegistrationNumbers(
        event._id,
        event.code,
        rowsNeedingGeneratedNumber,
        new Set([
          ...existingNumbers,
          ...fileRegistrationNumbers,
        ]),
      );

    let generatedIndex = 0;

    const attendeesToInsert: Array<{
      eventId: typeof event._id;
      name: string;
      email: string;
      phone: string;
      medicalCouncilNumber: string;
      registrationNumber: string;
      category: string;
      qrValue: string;
      badgeGenerated: boolean;
      badgeUrl: string;
      badgeGenerationCount: number;
    }> = [];

    /*
     * Prepare final attendees.
     */
    for (const row of cleanRows) {
      let registrationNumber =
        row.registrationNumber;

      /*
       * Automatically generated
       * registration number.
       */
      if (!registrationNumber) {
        registrationNumber =
          generatedNumbers[
            generatedIndex
          ];

        generatedIndex += 1;
      }

      /*
       * Supplied registration number
       * already exists in this event.
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
            `Registration number already exists in this event: ${registrationNumber}`,
        });

        continue;
      }

      /*
       * QR value:
       *
       * Custom QR value wins.
       *
       * Otherwise registration number
       * becomes the QR value.
       */
      const qrValue =
        row.qrValue ||
        registrationNumber;

      attendeesToInsert.push({
        eventId: event._id,

        name: row.name,
        email: row.email,
        phone: row.phone,
        medicalCouncilNumber:
          row.medicalCouncilNumber,

        registrationNumber,

        category: row.category,

        qrValue,

        badgeGenerated: false,
        badgeUrl: "",
        badgeGenerationCount: 0,
      });

      /*
       * Reserve the number so another
       * imported row cannot receive it.
       */
      existingNumbers.add(
        registrationNumber,
      );
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

      if (
        error &&
        typeof error ===
          "object" &&
        "insertedDocs" in error
      ) {
        const insertedDocs =
          (
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

    const attendeeCount =
      await Attendee.countDocuments({
        eventId: event._id,
      });

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
          insertedCount === 1
            ? ""
            : "s"
        }. Registration numbers were automatically generated where missing.`,

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