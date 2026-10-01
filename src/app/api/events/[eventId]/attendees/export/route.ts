import { NextResponse } from "next/server";

import ExcelJS from "exceljs";
import QRCode from "qrcode";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Attendee from "@/models/Attendee";
import Event from "@/models/Event";

interface RouteContext {
  params: Promise<{
    eventId: string;
  }>;
}

interface AttendeeExportData {
  _id: string;
  name: string;
  email: string;
  phone: string;
  medicalCouncilNumber: string;
  registrationNumber: string;
  category: string;
  qrValue: string;
  badgeGenerated: boolean;
  badgeGeneratedAt?: Date;
  badgeGenerationCount: number;
}

function formatDate(
  value?: Date,
): string {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function safeFileName(
  value: string,
): string {
  return value
    .trim()
    .replace(
      /[^a-zA-Z0-9-_]+/g,
      "-",
    )
    .replace(
      /-+/g,
      "-",
    )
    .replace(
      /^-|-$/g,
      "",
    );
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

    await connectDB();

    /*
     * Make sure the event belongs
     * to the currently authenticated admin.
     */
    const event =
      await Event.findOne({
        _id: eventId,
        createdBy: session.user.id,
      }).lean();

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

    /*
     * Get every attendee belonging
     * to this event.
     */
    const rawAttendees =
      await Attendee.find({
        eventId: event._id,
      })
        .sort({
          createdAt: 1,
        })
        .lean();

    if (
      rawAttendees.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No attendees found for this event.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Normalize attendee data.
     *
     * phone is supported even if an
     * older Attendee model does not
     * explicitly declare it.
     */
    const attendees: AttendeeExportData[] =
      rawAttendees.map(
        (attendee) => {
          const attendeeWithPhone =
            attendee as typeof attendee & {
              phone?: string;
            };

          return {
            _id:
              attendee._id.toString(),

            name:
              attendee.name ?? "",

            email:
              attendee.email ?? "",

            phone:
              attendeeWithPhone.phone ??
              "",

            medicalCouncilNumber:
              (attendee as typeof attendee & {
                medicalCouncilNumber?: string;
              }).medicalCouncilNumber ?? "",

            registrationNumber:
              attendee.registrationNumber ??
              "",

            category:
              attendee.category ??
              "",

            qrValue:
              attendee.qrValue ||
              attendee.registrationNumber ||
              "",

            badgeGenerated:
              Boolean(
                attendee.badgeGenerated,
              ),

            badgeGeneratedAt:
              attendee.badgeGeneratedAt,

            badgeGenerationCount:
              attendee.badgeGenerationCount ??
              0,
          };
        },
      );

    /*
     * Create workbook.
     */
    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      "BadgeFlow";

    workbook.lastModifiedBy =
      "BadgeFlow";

    workbook.created =
      new Date();

    workbook.modified =
      new Date();

    workbook.properties.date1904 =
      false;

    /*
     * Main attendee worksheet.
     */
    const worksheet =
      workbook.addWorksheet(
        "Attendees",
      );

    /*
     * Freeze the header row.
     */
    worksheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    /*
     * Define columns.
     *
     * QR Image is intentionally
     * wider because an actual image
     * will be embedded into the cell.
     */
    worksheet.columns = [
      {
        header: "Name",
        key: "name",
        width: 28,
      },
      {
        header: "Email",
        key: "email",
        width: 32,
      },
      {
        header: "Phone",
        key: "phone",
        width: 18,
      },
      {
        header: "Medical Council Number",
        key: "medicalCouncilNumber",
        width: 26,
      },
      {
        header:
          "Registration Number",
        key: "registrationNumber",
        width: 24,
      },
      {
        header: "Category",
        key: "category",
        width: 20,
      },
      {
        header: "QR Value",
        key: "qrValue",
        width: 28,
      },
      {
        header: "QR Image",
        key: "qrImage",
        width: 18,
      },
      {
        header: "Badge Generated",
        key: "badgeGenerated",
        width: 18,
      },
      {
        header:
          "Badge Generated At",
        key: "badgeGeneratedAt",
        width: 24,
      },
      {
        header:
          "Generation Count",
        key: "badgeGenerationCount",
        width: 18,
      },
    ];

    /*
     * Header styling.
     */
    const headerRow =
      worksheet.getRow(1);

    headerRow.height = 28;

    headerRow.eachCell(
      (cell) => {
        cell.font = {
          bold: true,
          color: {
            argb: "FFFFFFFF",
          },
          size: 11,
        };

        cell.fill = {
          type: "pattern",
          pattern:
            "solid",
          fgColor: {
            argb: "FFEA580C",
          },
        };

        cell.alignment = {
          vertical:
            "middle",
          horizontal:
            "center",
          wrapText: true,
        };

        cell.border = {
          top: {
            style: "thin",
            color: {
              argb: "FFE7E5E4",
            },
          },
          bottom: {
            style: "thin",
            color: {
              argb: "FFE7E5E4",
            },
          },
          left: {
            style: "thin",
            color: {
              argb: "FFE7E5E4",
            },
          },
          right: {
            style: "thin",
            color: {
              argb: "FFE7E5E4",
            },
          },
        };
      },
    );

    /*
     * Add attendee rows and QR images.
     */
    for (
      let index = 0;
      index < attendees.length;
      index += 1
    ) {
      const attendee =
        attendees[index];

      const row =
        worksheet.addRow({
          name: attendee.name,
          email: attendee.email,
          phone: attendee.phone,
          medicalCouncilNumber:
            attendee.medicalCouncilNumber,
          registrationNumber:
            attendee.registrationNumber,
          category:
            attendee.category,
          qrValue:
            attendee.qrValue,
          qrImage: "",
          badgeGenerated:
            attendee.badgeGenerated
              ? "Yes"
              : "No",
          badgeGeneratedAt:
            formatDate(
              attendee.badgeGeneratedAt,
            ),
          badgeGenerationCount:
            attendee.badgeGenerationCount,
        });

      /*
       * Give every QR row enough
       * height for the image.
       */
      row.height = 82;

      /*
       * Generate actual QR image.
       *
       * High error correction makes
       * the QR more reliable for
       * printed badges.
       */
      const qrDataUrl =
        await QRCode.toDataURL(
          attendee.qrValue ||
            attendee.registrationNumber ||
            attendee._id,
          {
            width: 320,
            margin: 2,
            errorCorrectionLevel:
              "H",
          },
        );

      /*
       * Add the QR image to the
       * workbook.
       */
      const imageId =
        workbook.addImage({
          base64: qrDataUrl,
          extension: "png",
        });

      /*
       * ExcelJS image coordinates
       * are zero-based.
       *
       * Column G = index 6.
       *
       * Row number is index + 2
       * because row 1 is the header.
       */
      worksheet.addImage(
        imageId,
        {
          tl: {
            col: 6.15,
            row:
              index + 1.08,
          },
          ext: {
            width: 75,
            height: 75,
          },
        },
      );

      /*
       * Center the normal cell data.
       */
      row.eachCell(
        (cell) => {
          cell.alignment = {
            vertical:
              "middle",
            wrapText: true,
          };

          cell.border = {
            top: {
              style: "thin",
              color: {
                argb: "FFE7E5E4",
              },
            },
            bottom: {
              style: "thin",
              color: {
                argb: "FFE7E5E4",
              },
            },
            left: {
              style: "thin",
              color: {
                argb: "FFE7E5E4",
              },
            },
            right: {
              style: "thin",
              color: {
                argb: "FFE7E5E4",
              },
            },
          };
        },
      );

      /*
       * Keep QR value and registration
       * number visually prominent.
       */
      row.getCell(
        "registrationNumber",
      ).font = {
        bold: true,
        color: {
          argb: "FF241000",
        },
      };

      row.getCell(
        "qrValue",
      ).font = {
        bold: true,
        color: {
          argb: "FFEA580C",
        },
      };

      /*
       * Badge status styling.
       */
      const badgeStatusCell =
        row.getCell(
          "badgeGenerated",
        );

      badgeStatusCell.alignment = {
        vertical:
          "middle",
        horizontal:
          "center",
      };

      if (
        attendee.badgeGenerated
      ) {
        badgeStatusCell.font = {
          bold: true,
          color: {
            argb: "FF047857",
          },
        };
      } else {
        badgeStatusCell.font = {
          bold: true,
          color: {
            argb: "FFC2410C",
          },
        };
      }
    }

    /*
     * Add autofilter to the complete
     * attendee table.
     */
    worksheet.autoFilter = {
      from: "A1",
      to: "J1",
    };

    /*
     * Add a small metadata worksheet.
     */
    const infoSheet =
      workbook.addWorksheet(
        "Export Info",
      );

    infoSheet.columns = [
      {
        width: 28,
      },
      {
        width: 50,
      },
    ];

    infoSheet.addRow([
      "BadgeFlow Export",
      "",
    ]);

    infoSheet.addRow([
      "Event Name",
      event.name,
    ]);

    infoSheet.addRow([
      "Event Code",
      event.code,
    ]);

    infoSheet.addRow([
      "Total Attendees",
      attendees.length,
    ]);

    infoSheet.addRow([
      "Exported At",
      formatDate(
        new Date(),
      ),
    ]);

    infoSheet.addRow([
      "QR Images",
      "Embedded inside the Attendees worksheet",
    ]);

    infoSheet.getRow(
      1,
    ).font = {
      bold: true,
      size: 16,
      color: {
        argb: "FF241000",
      },
    };

    infoSheet.eachRow(
      (row) => {
        row.eachCell(
          (cell) => {
            cell.alignment = {
              vertical:
                "middle",
              wrapText: true,
            };
          },
        );
      },
    );

    /*
     * Generate XLSX buffer.
     */
    const buffer =
      await workbook.xlsx.writeBuffer();

    const fileNameBase =
      safeFileName(
        event.name ||
          "badgeflow-attendees",
      );

    const fileName =
      `${fileNameBase}-attendees.xlsx`;

    return new NextResponse(
      buffer,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            `attachment; filename="${fileName}"`,

          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/events/[eventId]/attendees/export failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to export attendees.",
      },
      {
        status: 500,
      },
    );
  }
}