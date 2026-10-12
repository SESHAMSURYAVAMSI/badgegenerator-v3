import { NextResponse } from "next/server";
import mongoose from "mongoose";
import ExcelJS from "exceljs";

import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Attendee from "@/models/Attendee";
import Event from "@/models/Event";
import ScanRecord from "@/models/ScanRecord";

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

function safeFileName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "event";
}

function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  // Prevent spreadsheet formula injection in CSV files.
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDateTime(value: Date | string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const { eventId } = await context.params;
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, message: "A valid event ID is required." },
        { status: 400 },
      );
    }

    const format = new URL(request.url).searchParams.get("format")?.toLowerCase();
    if (format !== "xlsx" && format !== "csv") {
      return NextResponse.json(
        { success: false, message: 'Use format="xlsx" or format="csv".' },
        { status: 400 },
      );
    }

    await connectDB();

    const event = await Event.findOne({
      _id: eventId,
      createdBy: session.user.id,
    }).lean();

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found." },
        { status: 404 },
      );
    }

    // ScanRecord stores only successful scans. Group records by attendee so each
    // attendee appears once, while the details column lists every day/module scan.
    const records = await ScanRecord.find({ eventId: event._id })
      .sort({ scannedAt: 1, registrationNumber: 1 })
      .lean();

    const attendeeIds = [...new Set(records.map((record) => record.attendeeId.toString()))];
    const attendees = attendeeIds.length
      ? await Attendee.find({
          _id: { $in: attendeeIds.map((id) => new mongoose.Types.ObjectId(id)) },
          eventId: event._id,
        })
          .select("_id email category phone")
          .lean()
      : [];

    const attendeeById = new Map(
      attendees.map((attendee) => [
        attendee._id.toString(),
        attendee as typeof attendee & {
          email?: string;
          category?: string;
          phone?: string;
        },
      ]),
    );

    type ScanDetail = {
      dayKey: string;
      dayName: string;
      itemKey: string;
      itemName: string;
      scannedAt: Date | string | undefined;
      attendeeId: string;
      attendeeName: string;
      registrationNumber: string;
      email: string;
      phone: string;
      category: string;
    };

    type AttendeeReport = {
      eventName: string;
      attendeeId: string;
      attendeeName: string;
      registrationNumber: string;
      email: string;
      phone: string;
      category: string;
      days: Map<string, string>;
      scans: ScanDetail[];
    };

    const grouped = new Map<string, AttendeeReport>();
    const scanDetails: ScanDetail[] = [];

    for (const record of records) {
      const attendeeId = record.attendeeId.toString();
      const attendee = attendeeById.get(attendeeId);
      const dayName = record.dayName?.trim() || "Unnamed day";
      const itemName = record.itemName?.trim() || "Unnamed module";
      // IDs keep distinct configured days/modules separate even when labels match.
      const dayKey = record.dayId?.toString() || dayName;
      const itemKey = record.itemId?.toString() || itemName;

      const detail: ScanDetail = {
        dayKey,
        dayName,
        itemKey,
        itemName,
        scannedAt: record.scannedAt,
        attendeeId,
        attendeeName: record.attendeeName ?? "",
        registrationNumber: record.registrationNumber ?? "",
        email: attendee?.email ?? "",
        phone: attendee?.phone ?? "",
        category: attendee?.category ?? "",
      };
      scanDetails.push(detail);

      let report = grouped.get(attendeeId);
      if (!report) {
        report = {
          eventName: event.name ?? "",
          attendeeId,
          attendeeName: detail.attendeeName,
          registrationNumber: detail.registrationNumber,
          email: detail.email,
          phone: detail.phone,
          category: detail.category,
          days: new Map<string, string>(),
          scans: [],
        };
        grouped.set(attendeeId, report);
      }

      report.days.set(dayKey, dayName);
      report.scans.push(detail);
    }

    const sortByRegistration = <T extends { registrationNumber: string; attendeeName: string }>(
      items: T[],
    ) =>
      items.sort((a, b) =>
        a.registrationNumber.localeCompare(b.registrationNumber, undefined, {
          numeric: true,
          sensitivity: "base",
        }) || a.attendeeName.localeCompare(b.attendeeName),
      );

    const reports = sortByRegistration([...grouped.values()]);
    const rows = reports.map((report) => {
      const details = report.scans.map((scan) => {
        const timestamp = formatDateTime(scan.scannedAt);
        return `${scan.dayName} — ${scan.itemName}${timestamp ? ` — ${timestamp}` : ""}`;
      });

      return {
        eventName: report.eventName,
        attendeeName: report.attendeeName,
        registrationNumber: report.registrationNumber,
        email: report.email,
        phone: report.phone,
        category: report.category,
        daysAttended: [...report.days.values()].join(", "),
        daysAttendedCount: report.days.size,
        totalSuccessfulScans: report.scans.length,
        successfulScanDetails: details.join("\n"),
      };
    });

    const filename = `${safeFileName(event.name ?? "event")}-successful-scan-report`;

    if (format === "csv") {
      // CSV has no worksheet support, so keep the one-row-per-attendee summary
      // and put all their successful scan details in a single cell.
      const headers = [
        "Event Name",
        "Attendee Name",
        "Registration Number",
        "Email",
        "Phone",
        "Category",
        "Days Attended",
        "Days Attended Count",
        "Total Successful Scans",
        "Successful Scan Details",
      ];
      const values = rows.map((row) => [
        row.eventName,
        row.attendeeName,
        row.registrationNumber,
        row.email,
        row.phone,
        row.category,
        row.daysAttended,
        row.daysAttendedCount,
        row.totalSuccessfulScans,
        row.successfulScanDetails,
      ]);
      const csv = "\uFEFF" + [
        headers.map(csvCell).join(","),
        ...values.map((row) => row.map(csvCell).join(",")),
      ].join("\r\n");

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "BadgeFlow";
    workbook.created = new Date();

    const headerFill = "FFEA580C";
    const borderColor = "FFE7E5E4";

    const styleWorksheet = (worksheet: ExcelJS.Worksheet, filterColumnCount: number) => {
      const header = worksheet.getRow(1);
      header.height = 32;
      header.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: headerFill },
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = { bottom: { style: "thin", color: { argb: borderColor } } };
      });

      worksheet.views = [{ state: "frozen", ySplit: 1 }];
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: Math.max(worksheet.rowCount, 1), column: filterColumnCount },
      };

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.eachCell((cell) => {
          cell.alignment = { vertical: "top", wrapText: true };
          cell.border = { bottom: { style: "hair", color: { argb: borderColor } } };
        });
      });
    };

    const summary = workbook.addWorksheet("Attendee Summary");
    summary.columns = [
      { header: "Event Name", key: "eventName", width: 28 },
      { header: "Attendee Name", key: "attendeeName", width: 28 },
      { header: "Registration Number", key: "registrationNumber", width: 24 },
      { header: "Email", key: "email", width: 32 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "Category", key: "category", width: 20 },
      { header: "Days Attended", key: "daysAttended", width: 24 },
      { header: "Days Attended Count", key: "daysAttendedCount", width: 20 },
      { header: "Total Successful Scans", key: "totalSuccessfulScans", width: 24 },
      { header: "Successful Scan Details", key: "successfulScanDetails", width: 60 },
    ];
    rows.forEach((row) => summary.addRow(row));
    styleWorksheet(summary, summary.columnCount);
    summary.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.getCell(8).numFmt = "0";
      row.getCell(9).font = { bold: true, color: { argb: "FF047857" } };
      const detailLines = String(row.getCell(10).value ?? "").split("\n").length;
      row.height = Math.min(Math.max(detailLines, 1) * 18, 180);
    });

    const detailHeaders = [
      { header: "Event Name", key: "eventName", width: 28 },
      { header: "Attendee Name", key: "attendeeName", width: 28 },
      { header: "Registration Number", key: "registrationNumber", width: 24 },
      { header: "Email", key: "email", width: 32 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "Category", key: "category", width: 20 },
      { header: "Scan Day", key: "dayName", width: 20 },
      { header: "Scanned Module", key: "itemName", width: 24 },
      { header: "Scan Date", key: "scanDate", width: 16 },
      { header: "Scan Time", key: "scanTime", width: 18 },
      { header: "Successful Scan Timestamp", key: "timestamp", width: 28 },
      { header: "Scan Status", key: "status", width: 16 },
    ];

    const detailRow = (scan: ScanDetail) => {
      const date = scan.scannedAt ? new Date(scan.scannedAt) : null;
      const validDate = date && !Number.isNaN(date.getTime()) ? date : null;
      return {
        eventName: event.name ?? "",
        attendeeName: scan.attendeeName,
        registrationNumber: scan.registrationNumber,
        email: scan.email,
        phone: scan.phone,
        category: scan.category,
        dayName: scan.dayName,
        itemName: scan.itemName,
        scanDate: validDate
          ? validDate.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
          : "",
        scanTime: validDate
          ? validDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
          : "",
        timestamp: validDate ? formatDateTime(validDate) : "",
        status: "SUCCESS",
      };
    };

    const normalizedModuleName = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, "");

    const isKitbag = (value: string) => {
      const normalized = normalizedModuleName(value);
      return normalized.includes("kitbag") || normalized.includes("kitbagdistribution");
    };
    const isCertificate = (value: string) =>
      normalizedModuleName(value).includes("certificate");

    const kitbagScans = scanDetails.filter((scan) => isKitbag(scan.itemName));
    const certificateScans = scanDetails.filter((scan) => isCertificate(scan.itemName));
    const addIndividualScanSheet = (
      requestedName: string,
      scans: ScanDetail[],
    ) => {
      const safeBaseName = requestedName
        .replace(/[\\\/?*:\[\]]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 31) || "Scan Details";
      let sheetName = safeBaseName;
      let suffix = 2;
      while (workbook.getWorksheet(sheetName)) {
        const ending = ` ${suffix++}`;
        sheetName = `${safeBaseName.slice(0, 31 - ending.length)}${ending}`;
      }

      const worksheet = workbook.addWorksheet(sheetName);
      worksheet.columns = detailHeaders;
      const ordered = [...scans].sort((a, b) =>
        a.registrationNumber.localeCompare(b.registrationNumber, undefined, {
          numeric: true,
          sensitivity: "base",
        }) || a.attendeeName.localeCompare(b.attendeeName),
      );
      ordered.forEach((scan) => worksheet.addRow(detailRow(scan)));
      styleWorksheet(worksheet, detailHeaders.length);
      return worksheet;
    };

    // Standard modules get one worksheet per configured day + module,
    // e.g. "Day 1 - Lunch" and "Day 1 - Breakfast".
    const moduleGroups = new Map<string, { dayName: string; itemName: string; scans: ScanDetail[] }>();
    for (const scan of scanDetails) {
      if (isKitbag(scan.itemName) || isCertificate(scan.itemName)) continue;
      const key = `${scan.dayKey}::${scan.itemKey}`;
      const group = moduleGroups.get(key);
      if (group) {
        group.scans.push(scan);
      } else {
        moduleGroups.set(key, {
          dayName: scan.dayName,
          itemName: scan.itemName,
          scans: [scan],
        });
      }
    }

    const orderedGroups = [...moduleGroups.values()].sort((a, b) =>
      a.dayName.localeCompare(b.dayName, undefined, { numeric: true, sensitivity: "base" }) ||
      a.itemName.localeCompare(b.itemName, undefined, { numeric: true, sensitivity: "base" }),
    );

    for (const group of orderedGroups) {
      addIndividualScanSheet(`${group.dayName} - ${group.itemName}`, group.scans);
    }

    // Kitbag and Certificate each get a single all-days worksheet. Group by
    // attendee so someone scanned on multiple days still occupies one row.
    const addCombinedSpecialSheet = (
      sheetName: string,
      scans: ScanDetail[],
    ) => {
      const worksheet = workbook.addWorksheet(sheetName);
      worksheet.columns = [
        { header: "Event Name", key: "eventName", width: 28 },
        { header: "Attendee Name", key: "attendeeName", width: 28 },
        { header: "Registration Number", key: "registrationNumber", width: 24 },
        { header: "Email", key: "email", width: 32 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Category", key: "category", width: 20 },
        { header: "Days Scanned", key: "daysScanned", width: 28 },
        { header: "Total Successful Scans", key: "totalSuccessfulScans", width: 24 },
        { header: "Successful Scan Details (All Days)", key: "successfulScanDetails", width: 64 },
      ];

      const byAttendee = new Map<string, ScanDetail[]>();
      for (const scan of scans) {
        const list = byAttendee.get(scan.attendeeId) ?? [];
        list.push(scan);
        byAttendee.set(scan.attendeeId, list);
      }

      const attendeeRows = [...byAttendee.values()].map((attendeeScans) => {
        const first = attendeeScans[0];
        const uniqueDays = new Map<string, string>();
        attendeeScans.forEach((scan) => uniqueDays.set(scan.dayKey, scan.dayName));
        const details = attendeeScans
          .slice()
          .sort((a, b) => {
            const timeA = a.scannedAt ? new Date(a.scannedAt).getTime() : 0;
            const timeB = b.scannedAt ? new Date(b.scannedAt).getTime() : 0;
            return timeA - timeB;
          })
          .map((scan) => {
            const timestamp = formatDateTime(scan.scannedAt);
            return `${scan.dayName} — ${scan.itemName}${timestamp ? ` — ${timestamp}` : ""}`;
          });

        return {
          eventName: event.name ?? "",
          attendeeName: first.attendeeName,
          registrationNumber: first.registrationNumber,
          email: first.email,
          phone: first.phone,
          category: first.category,
          daysScanned: [...uniqueDays.values()].join(", "),
          totalSuccessfulScans: attendeeScans.length,
          successfulScanDetails: details.join("\n"),
        };
      });

      sortByRegistration(attendeeRows).forEach((row) => worksheet.addRow(row));
      styleWorksheet(worksheet, worksheet.columnCount);
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.getCell(8).font = { bold: true, color: { argb: "FF047857" } };
        const detailLines = String(row.getCell(9).value ?? "").split("\n").length;
        row.height = Math.min(Math.max(detailLines, 1) * 18, 180);
      });
    };

    // Always include both sheets, even if there are no scans yet.
    addCombinedSpecialSheet("Kitbag - All Days", kitbagScans);
    addCombinedSpecialSheet("Certificate - All Days", certificateScans);

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Successful scan report export error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to export the successful scan report." },
      { status: 500 },
    );
  }
}
