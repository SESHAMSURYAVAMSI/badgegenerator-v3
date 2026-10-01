"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
  Users,
  X,
  AlertTriangle,
  Download,
  RefreshCw,
} from "lucide-react";

interface ImportRow {
  name: string;
  email: string;
  phone: string;
  medicalCouncilNumber: string;
  registrationNumber: string;
  category: string;
  qrValue: string;
}

interface EventInfo {
  _id: string;
  name: string;
  code: string;
  attendeeCount: number;
}

interface ImportError {
  rowNumber: number;
  message: string;
}

interface ImportResult {
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  attendeeCount: number;
  errors: ImportError[];
}

const MAX_ROWS = 5000;

const expectedColumns = [
  "Name",
  "Email",
  "Phone",
  "Medical Council Number",
  "Registration Number",
  "Category",
  "QR Value",
];

function getEventId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const parts = window.location.pathname
    .split("/")
    .filter(Boolean);

  const eventsIndex =
    parts.indexOf("events");

  if (
    eventsIndex === -1 ||
    !parts[eventsIndex + 1]
  ) {
    return "";
  }

  return parts[eventsIndex + 1];
}

function normalizeHeader(
  value: string,
): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getColumnValue(
  row: Record<string, unknown>,
  names: string[],
): string {
  const entries = Object.entries(row);

  for (const [key, value] of entries) {
    const normalizedKey =
      normalizeHeader(key);

    if (
      names.includes(normalizedKey)
    ) {
      if (
        value === null ||
        value === undefined
      ) {
        return "";
      }

      return String(value).trim();
    }
  }

  return "";
}

function convertWorksheetRows(
  rows: Record<string, unknown>[],
): ImportRow[] {
  return rows.map((row) => ({
    name: getColumnValue(row, [
      "name",
      "full name",
      "attendee name",
      "attendee",
    ]),

    email: getColumnValue(row, [
      "email",
      "email address",
      "mail",
    ]),

    phone: getColumnValue(row, [
      "phone",
      "phone number",
      "mobile",
      "mobile number",
      "contact",
    ]),

    medicalCouncilNumber:
      getColumnValue(row, [
        "medical council number",
        "medical council no",
        "medical council no.",
        "council number",
        "mci number",
        "nmc number",
      ]),

    registrationNumber:
      getColumnValue(row, [
        "registration number",
        "registration no",
        "registration no.",
        "registration id",
        "registration",
        "reg no",
        "reg no.",
      ]),

    category: getColumnValue(row, [
      "category",
      "type",
      "attendee type",
    ]),

    qrValue: getColumnValue(row, [
      "qr value",
      "qr",
      "qr code",
      "qr data",
    ]),
  }));
}

function downloadTemplate() {
  const templateRows = [
    {
      Name: "Rahul Sharma",
      Email: "rahul@example.com",
      Phone: "9876543210",
      "Medical Council Number": "TS-MCI-12345",
      "Registration Number": "REG-001",
      Category: "Delegate",
      "QR Value": "REG-001",
    },
    {
      Name: "Priya Reddy",
      Email: "priya@example.com",
      Phone: "9876543211",
      "Medical Council Number": "TS-MCI-12346",
      "Registration Number": "REG-002",
      Category: "Speaker",
      "QR Value": "REG-002",
    },
    {
      Name: "Arjun Kumar",
      Email: "arjun@example.com",
      Phone: "9876543212",
      "Medical Council Number": "",
      "Registration Number": "",
      Category: "VIP",
      "QR Value": "",
    },
  ];

  const worksheet =
    XLSX.utils.json_to_sheet(
      templateRows,
    );

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Attendees",
  );

  XLSX.writeFile(
    workbook,
    "BadgeFlow-Attendee-Template.xlsx",
  );
}

export default function ImportAttendeesPage() {
  const eventId = getEventId();

  const [event, setEvent] =
    useState<EventInfo | null>(null);

  const [rows, setRows] =
    useState<ImportRow[]>([]);

  const [fileName, setFileName] =
    useState("");

  const [fileError, setFileError] =
    useState("");

  const [isReading, setIsReading] =
    useState(false);

  const [isImporting, setIsImporting] =
    useState(false);

  const [importResult, setImportResult] =
    useState<ImportResult | null>(null);

  const [dragActive, setDragActive] =
    useState(false);

  async function loadEvent() {
    if (!eventId) {
      return;
    }

    try {
      const response = await fetch(
        `/api/events/${eventId}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load event.",
        );
      }

      setEvent(data.event);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  async function processFile(
    file: File,
  ) {
    setFileError("");
    setImportResult(null);

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase();

    const supportedExtensions = [
      "xlsx",
      "xls",
      "csv",
    ];

    if (
      !extension ||
      !supportedExtensions.includes(
        extension,
      )
    ) {
      setFileError(
        "Please upload an Excel or CSV file (.xlsx, .xls, or .csv).",
      );

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError(
        "File size cannot exceed 10 MB.",
      );

      return;
    }

    try {
      setIsReading(true);

      const arrayBuffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(arrayBuffer, {
          type: "array",
          cellDates: true,
        });

      const firstSheetName =
        workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error(
          "The uploaded file does not contain a worksheet.",
        );
      }

      const worksheet =
        workbook.Sheets[
          firstSheetName
        ];

      const rawRows =
        XLSX.utils.sheet_to_json<
          Record<string, unknown>
        >(worksheet, {
          defval: "",
          raw: false,
        });

      if (rawRows.length === 0) {
        throw new Error(
          "The uploaded file does not contain any attendee rows.",
        );
      }

      if (rawRows.length > MAX_ROWS) {
        throw new Error(
          `The file contains ${rawRows.length.toLocaleString()} rows. Maximum allowed is ${MAX_ROWS.toLocaleString()}.`,
        );
      }

      const convertedRows =
        convertWorksheetRows(
          rawRows,
        );

      const hasAnyName = convertedRows.some(
        (row) =>
          row.name.trim().length > 0,
      );

      if (!hasAnyName) {
        throw new Error(
          "Could not find a Name column. Please check your spreadsheet headers.",
        );
      }

      setRows(convertedRows);
      setFileName(file.name);
    } catch (error) {
      console.error(error);

      setRows([]);
      setFileName("");

      setFileError(
        error instanceof Error
          ? error.message
          : "Unable to read the uploaded file.",
      );
    } finally {
      setIsReading(false);
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (file) {
      processFile(file);
    }

    event.target.value = "";
  }

  function handleDrop(
    event: React.DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    setDragActive(false);

    const file =
      event.dataTransfer.files?.[0];

    if (file) {
      processFile(file);
    }
  }

  function clearFile() {
    setRows([]);
    setFileName("");
    setFileError("");
    setImportResult(null);
  }

  async function handleImport() {
    if (!eventId || rows.length === 0) {
      return;
    }

    try {
      setIsImporting(true);
      setFileError("");
      setImportResult(null);

      const response = await fetch(
        `/api/events/${eventId}/attendees/import`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rows,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setImportResult({
          importedCount: 0,
          skippedCount: rows.length,
          errorCount:
            data.errors?.length || 1,
          attendeeCount:
            event?.attendeeCount || 0,
          errors: data.errors || [
            {
              rowNumber: 0,
              message:
                data.message ||
                "Import failed.",
            },
          ],
        });

        return;
      }

      setImportResult({
        importedCount:
          data.importedCount || 0,
        skippedCount:
          data.skippedCount || 0,
        errorCount:
          data.errorCount || 0,
        attendeeCount:
          data.attendeeCount || 0,
        errors: data.errors || [],
      });

      await loadEvent();
    } catch (error) {
      console.error(error);

      setFileError(
        error instanceof Error
          ? error.message
          : "Import failed. Please try again.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  const previewRows = rows.slice(0, 8);

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#241000]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-orange-200/20 blur-3xl" />

        <div className="absolute right-[-12rem] top-[20rem] h-[30rem] w-[30rem] rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8 lg:px-10">
          <Link
            href={`/events/${eventId}/attendees`}
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA580C] text-white shadow-lg shadow-orange-600/20">
              <BadgeCheck className="h-5 w-5" />
            </div>

            <div className="hidden sm:block">
              <div className="text-lg font-bold tracking-tight">
                Badge
                <span className="text-[#EA580C]">
                  Flow
                </span>
              </div>

              <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                Bulk Import
              </div>
            </div>
          </Link>

          <Link
            href={`/events/${eventId}/attendees`}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C]"
          >
            <ArrowLeft className="h-4 w-4" />

            <span className="hidden sm:inline">
              Back to Attendees
            </span>

            <span className="sm:hidden">
              Back
            </span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#EA580C]">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Bulk Attendee Import
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Import attendees in bulk
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            Upload your Excel or CSV file,
            review the data, and import
            registrations into{" "}
            <span className="font-semibold text-stone-700">
              {event?.name || "your event"}
            </span>
            .
          </p>
        </motion.div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {/* Upload */}
            <motion.div
              initial={{
                opacity: 0,
                y: 15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.05,
              }}
              className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">
                    Upload spreadsheet
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-stone-400">
                    Supported formats: XLSX,
                    XLS and CSV. Maximum 5,000
                    rows.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-bold text-[#EA580C] transition hover:bg-orange-100"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </button>
              </div>

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() =>
                  setDragActive(false)
                }
                onDrop={handleDrop}
                className={`mt-6 rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-12 ${
                  dragActive
                    ? "border-[#EA580C] bg-orange-50"
                    : "border-stone-200 bg-stone-50/60 hover:border-orange-300 hover:bg-orange-50/40"
                }`}
              >
                <input
                  id="attendee-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <label
                  htmlFor="attendee-file"
                  className="cursor-pointer"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C]">
                    {isReading ? (
                      <Loader2 className="h-7 w-7 animate-spin" />
                    ) : (
                      <Upload className="h-7 w-7" />
                    )}
                  </div>

                  <h3 className="mt-5 text-base font-bold">
                    {isReading
                      ? "Reading file..."
                      : "Drop your file here"}
                  </h3>

                  <p className="mt-2 text-sm text-stone-400">
                    or{" "}
                    <span className="font-semibold text-[#EA580C]">
                      browse from your computer
                    </span>
                  </p>

                  <p className="mt-3 text-[11px] text-stone-400">
                    XLSX, XLS or CSV · Max 10 MB
                  </p>
                </label>
              </div>

              {fileName && (
                <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-emerald-800">
                        {fileName}
                      </p>

                      <p className="mt-0.5 text-xs text-emerald-600">
                        {rows.length.toLocaleString()}{" "}
                        rows detected
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearFile}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-emerald-600 transition hover:bg-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {fileError && (
                <div className="mt-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />

                  <div>
                    <p className="text-sm font-semibold text-red-700">
                      Upload problem
                    </p>

                    <p className="mt-1 text-xs leading-5 text-red-500">
                      {fileError}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Preview */}
            {rows.length > 0 && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-4 border-b border-stone-100 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />

                      <h2 className="text-lg font-bold">
                        Import preview
                      </h2>
                    </div>

                    <p className="mt-1 text-xs text-stone-400">
                      Showing the first{" "}
                      {Math.min(
                        previewRows.length,
                        8,
                      )}{" "}
                      of{" "}
                      {rows.length.toLocaleString()}{" "}
                      rows.
                    </p>
                  </div>

                  <div className="rounded-xl bg-orange-50 px-4 py-2 text-xs font-bold text-[#EA580C]">
                    {rows.length.toLocaleString()}{" "}
                    attendees ready
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-stone-100 bg-stone-50/70">
                        <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          #
                        </th>

                        {expectedColumns.map(
                          (column) => (
                            <th
                              key={column}
                              className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-stone-400"
                            >
                              {column}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {previewRows.map(
                        (row, index) => (
                          <tr
                            key={`${row.name}-${index}`}
                            className="border-b border-stone-100 last:border-0"
                          >
                            <td className="px-5 py-4 text-xs font-semibold text-stone-400">
                              {index + 1}
                            </td>

                            <td className="px-5 py-4 text-xs font-semibold">
                              {row.name || (
                                <span className="text-red-400">
                                  Missing
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4 text-xs text-stone-500">
                              {row.email || "—"}
                            </td>

                            <td className="px-5 py-4 text-xs text-stone-500">
                              {row.phone || "—"}
                            </td>

                            <td className="px-5 py-4">
                              <span className="rounded-lg bg-stone-50 px-2 py-1 text-[10px] font-bold text-stone-600">
                                {row.registrationNumber ||
                                  "Auto"}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-xs text-stone-500">
                              {row.category ||
                                "General"}
                            </td>

                            <td className="px-5 py-4">
                              <span className="max-w-32 truncate text-xs text-stone-500">
                                {row.qrValue ||
                                  row.registrationNumber ||
                                  "Auto"}
                              </span>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-stone-100 bg-stone-50/40 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-stone-500">
                    Blank registration numbers
                    and QR values will be generated
                    automatically.
                  </p>

                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={
                      isImporting ||
                      rows.length === 0
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-6 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Import{" "}
                        {rows.length.toLocaleString()}{" "}
                        Attendees
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Result */}
            {importResult && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"
              >
                <div className="border-b border-stone-100 p-6 sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold">
                        Import completed
                      </h2>

                      <p className="mt-1 text-xs text-stone-400">
                        Your event attendee data has
                        been processed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-7">
                  <div className="rounded-2xl bg-emerald-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                      Imported
                    </p>

                    <p className="mt-2 text-3xl font-bold text-emerald-700">
                      {importResult.importedCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-orange-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                      Skipped
                    </p>

                    <p className="mt-2 text-3xl font-bold text-orange-700">
                      {importResult.skippedCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-stone-100 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Total attendees
                    </p>

                    <p className="mt-2 text-3xl font-bold text-stone-700">
                      {importResult.attendeeCount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {importResult.errors.length >
                  0 && (
                  <div className="border-t border-stone-100 p-6 sm:p-7">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />

                      <h3 className="text-sm font-bold">
                        Rows requiring attention
                      </h3>
                    </div>

                    <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-stone-200">
                      {importResult.errors.map(
                        (
                          importError,
                          index,
                        ) => (
                          <div
                            key={`${importError.rowNumber}-${index}`}
                            className="flex gap-4 border-b border-stone-100 px-4 py-3 last:border-0"
                          >
                            <span className="shrink-0 rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-500">
                              Row{" "}
                              {
                                importError.rowNumber
                              }
                            </span>

                            <p className="text-xs text-stone-600">
                              {
                                importError.message
                              }
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-stone-100 bg-stone-50/40 p-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={clearFile}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Import Another File
                  </button>

                  <Link
                    href={`/events/${eventId}/attendees`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 hover:bg-[#c2410c]"
                  >
                    View Attendees
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                <Users className="h-5 w-5" />
              </div>

              <h2 className="mt-5 text-base font-bold">
                Current event
              </h2>

              <p className="mt-1 text-sm font-semibold text-stone-700">
                {event?.name ||
                  "Loading event..."}
              </p>

              {event?.code && (
                <p className="mt-1 text-xs font-bold text-[#EA580C]">
                  {event.code}
                </p>
              )}

              <div className="mt-5 rounded-2xl bg-stone-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Current attendees
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {event?.attendeeCount?.toLocaleString() ||
                    "0"}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold">
                File requirements
              </h2>

              <div className="mt-5 space-y-4">
                {[
                  "First row should contain column headers.",
                  "Name is the only required field.",
                  "Registration Number can be left blank.",
                  "QR Value can be left blank.",
                  "Maximum 5,000 rows per import.",
                ].map(
                  (item, index) => (
                    <div
                      key={item}
                      className="flex gap-3"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[10px] font-bold text-[#EA580C]">
                        {index + 1}
                      </div>

                      <p className="text-xs leading-5 text-stone-500">
                        {item}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}