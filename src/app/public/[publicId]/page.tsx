"use client";

import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  Hash,
  Loader2,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  ScanLine,
  ArrowRight,
  Ticket,
  UserRound,
  X,
} from "lucide-react";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useMemo,
  useState,
} from "react";

interface PublicAttendee {
  _id: string;
  name: string;
  email?: string;
  registrationNumber: string;
  category: string;
  qrValue: string;
  badgeGenerated: boolean;
  badgeUrl?: string;
  badgeGeneratedAt?: string;
  badgeGenerationCount?: number;
}

interface PublicEvent {
  name: string;
  description?: string;
  location?: string;
}

type DownloadFormat = "png" | "pdf";

export default function PublicBadgePage() {
  const params = useParams();

  const publicId = String(
    params.publicId ?? "",
  );

  const [query, setQuery] =
    useState("");

  const [event, setEvent] =
    useState<PublicEvent | null>(null);

  const [attendees, setAttendees] =
    useState<PublicAttendee[]>([]);

  const [selectedAttendee, setSelectedAttendee] =
    useState<PublicAttendee | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [searched, setSearched] =
    useState(false);

  const [error, setError] =
    useState("");

  const [previewError, setPreviewError] =
    useState("");

  const [previewOpen, setPreviewOpen] =
    useState(false);

  const [downloadLoading, setDownloadLoading] =
    useState<{
      attendeeId: string;
      format: DownloadFormat;
    } | null>(null);

  const searchBadge = async () => {
    const trimmedQuery =
      query.trim();

    if (!trimmedQuery) {
      setError(
        "Enter your name, email or registration number.",
      );

      setAttendees([]);
      setSearched(false);
      setSelectedAttendee(null);

      return;
    }

    if (!publicId) {
      setError(
        "Invalid public badge portal link.",
      );

      return;
    }

    try {
      setLoading(true);
      setError("");
      setPreviewError("");
      setSearched(true);
      setSelectedAttendee(null);
      setPreviewOpen(false);

      const response = await fetch(
        `/api/public/events/${encodeURIComponent(
          publicId,
        )}/badge?q=${encodeURIComponent(
          trimmedQuery,
        )}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to search badges.",
        );
      }

      setEvent(
        data.event || null,
      );

      const generatedAttendees =
        Array.isArray(data.attendees)
          ? data.attendees.filter(
              (
                attendee: PublicAttendee,
              ) =>
                attendee.badgeGenerated ===
                true,
            )
          : [];

      setAttendees(
        generatedAttendees,
      );
    } catch (err) {
      console.error(
        "Public badge search failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to search badges.",
      );

      setAttendees([]);
      setSelectedAttendee(null);
    } finally {
      setLoading(false);
    }
  };

  const createBadgeSourceUrl = (
    attendeeId: string,
  ) => {
    return `/api/public/events/${encodeURIComponent(
      publicId,
    )}/badge/${encodeURIComponent(
      attendeeId,
    )}/download`;
  };

  /*
   * Loads the badge returned by the public
   * badge endpoint into an HTMLImageElement.
   *
   * The endpoint may internally return SVG,
   * but that SVG is never exposed as a
   * downloadable format to the attendee.
   */
  const loadBadgeImage = (
    attendee: PublicAttendee,
  ): Promise<HTMLImageElement> => {
    return new Promise(
      (resolve, reject) => {
        const image =
          new Image();

        image.onload = () => {
          resolve(image);
        };

        image.onerror = () => {
          reject(
            new Error(
              "Unable to load the generated badge.",
            ),
          );
        };

        image.src =
          `${createBadgeSourceUrl(
            attendee._id,
          )}?format=source&v=${Date.now()}`;
      },
    );
  };

  /*
   * Converts the badge source into a PNG
   * entirely in the browser.
   */
  const createPngBlob = async (
    attendee: PublicAttendee,
  ): Promise<Blob> => {
    const image =
      await loadBadgeImage(
        attendee,
      );

    const naturalWidth =
      image.naturalWidth || 900;

    const naturalHeight =
      image.naturalHeight || 1200;

    const canvas =
      document.createElement(
        "canvas",
      );

    canvas.width =
      naturalWidth;

    canvas.height =
      naturalHeight;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Unable to create badge image.",
      );
    }

    context.clearRect(
      0,
      0,
      naturalWidth,
      naturalHeight,
    );

    context.drawImage(
      image,
      0,
      0,
      naturalWidth,
      naturalHeight,
    );

    const blob =
      await new Promise<Blob | null>(
        (resolve) => {
          canvas.toBlob(
            resolve,
            "image/png",
            1,
          );
        },
      );

    if (!blob) {
      throw new Error(
        "Unable to create PNG badge.",
      );
    }

    return blob;
  };

  const saveBlob = (
    blob: Blob,
    fileName: string,
  ) => {
    const objectUrl =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = objectUrl;
    link.download = fileName;

    document.body.appendChild(
      link,
    );

    link.click();

    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(
        objectUrl,
      );
    }, 1000);
  };

  const downloadPng = async (
    attendee: PublicAttendee,
  ) => {
    try {
      setDownloadLoading({
        attendeeId:
          attendee._id,
        format: "png",
      });

      setError("");

      const blob =
        await createPngBlob(
          attendee,
        );

      const safeName =
        (
          attendee.registrationNumber ||
          attendee.name ||
          "badge"
        )
          .trim()
          .replace(
            /[^a-zA-Z0-9-_]+/g,
            "-",
          )
          .replace(
            /^-+|-+$/g,
            "",
          );

      saveBlob(
        blob,
        `${safeName}-badge.png`,
      );
    } catch (err) {
      console.error(
        "PNG download failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to download PNG badge.",
      );
    } finally {
      setDownloadLoading(null);
    }
  };

  const downloadPdf = async (
    attendee: PublicAttendee,
  ) => {
    try {
      setDownloadLoading({
        attendeeId:
          attendee._id,
        format: "pdf",
      });

      setError("");

      const pngBlob =
        await createPngBlob(
          attendee,
        );

      const imageUrl =
        URL.createObjectURL(
          pngBlob,
        );

      const image =
        new Image();

      await new Promise<void>(
        (
          resolve,
          reject,
        ) => {
          image.onload = () =>
            resolve();

          image.onerror = () =>
            reject(
              new Error(
                "Unable to prepare PDF image.",
              ),
            );

          image.src =
            imageUrl;
        },
      );

      /*
       * jsPDF is loaded only when the
       * attendee actually requests a PDF.
       *
       * This keeps it out of the initial
       * page bundle as much as possible.
       */
      const {
        jsPDF,
      } = await import(
        "jspdf"
      );

      const width =
        image.naturalWidth || 900;

      const height =
        image.naturalHeight || 1200;

      /*
       * Convert pixels to PDF points.
       *
       * 1 CSS pixel is treated approximately
       * as 0.75 PDF points.
       */
      const pdfWidth =
        width * 0.75;

      const pdfHeight =
        height * 0.75;

      const pdf =
        new jsPDF({
          orientation:
            pdfWidth >=
            pdfHeight
              ? "landscape"
              : "portrait",
          unit: "pt",
          format: [
            pdfWidth,
            pdfHeight,
          ],
          compress: true,
        });

      pdf.addImage(
        image,
        "PNG",
        0,
        0,
        pdfWidth,
        pdfHeight,
        undefined,
        "FAST",
      );

      const safeName =
        (
          attendee.registrationNumber ||
          attendee.name ||
          "badge"
        )
          .trim()
          .replace(
            /[^a-zA-Z0-9-_]+/g,
            "-",
          )
          .replace(
            /^-+|-+$/g,
            "",
          );

      pdf.save(
        `${safeName}-badge.pdf`,
      );

      URL.revokeObjectURL(
        imageUrl,
      );
    } catch (err) {
      console.error(
        "PDF download failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to download PDF badge.",
      );
    } finally {
      setDownloadLoading(null);
    }
  };

  const openBadgePreview = (
    attendee: PublicAttendee,
  ) => {
    if (!attendee.badgeGenerated) {
      return;
    }

    setPreviewError("");
    setSelectedAttendee(attendee);
    setPreviewOpen(true);
  };

  const closeBadgePreview = () => {
    setPreviewOpen(false);
    setPreviewError("");
    setSelectedAttendee(null);
  };

  const badgePreviewUrl =
    useMemo(() => {
      if (
        !selectedAttendee ||
        !selectedAttendee.badgeGenerated
      ) {
        return "";
      }

      return createBadgeSourceUrl(
        selectedAttendee._id,
      );
    }, [
      selectedAttendee,
      publicId,
    ]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#fffaf5] via-white to-[#fff1e7]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-4 py-2 shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EA580C] text-white">
              <Ticket className="h-4 w-4" />
            </div>

            <span className="text-sm font-bold text-[#241000]">
              BadgeFlow
            </span>
          </div>
        </div>

        {/* Hero */}
        <div className="mx-auto mt-8 max-w-2xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#EA580C] to-[#9a3412] text-white shadow-xl shadow-orange-200">
            <Ticket className="h-8 w-8" />
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-[#241000] sm:text-4xl">
            Find Your Badge
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#8b6f5c] sm:text-base">
            Search for your event badge using
            your registration number, name or
            email address.
          </p>
        </div>

        {/* Search */}
        <div className="mx-auto mt-8 max-w-2xl">
          <div className="rounded-3xl border border-[#f1dfd0] bg-white p-3 shadow-xl shadow-orange-100/50">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a58a78]" />

                <input
                  type="text"
                  value={query}
                  onChange={(inputEvent) =>
                    setQuery(
                      inputEvent.target
                        .value,
                    )
                  }
                  onKeyDown={(inputEvent) => {
                    if (
                      inputEvent.key ===
                      "Enter"
                    ) {
                      searchBadge();
                    }
                  }}
                  placeholder="Registration number, name or email"
                  className="h-12 w-full rounded-2xl border border-transparent bg-[#fffaf5] pl-12 pr-4 text-sm text-[#241000] outline-none transition focus:border-orange-200 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <button
                type="button"
                onClick={searchBadge}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#EA580C] px-6 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search Badge
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Event */}
        {event && (
          <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#EA580C]">
              Event
            </p>

            <h2 className="mt-1 text-xl font-bold text-[#241000]">
              {event.name}
            </h2>

            {event.location && (
              <p className="mt-2 flex items-center gap-2 text-sm text-[#8b6f5c]">
                <MapPin className="h-4 w-4 shrink-0" />
                {event.location}
              </p>
            )}

            {event.description && (
              <p className="mt-3 text-sm leading-6 text-[#8b6f5c]">
                {event.description}
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {searched && !loading && (
          <div className="mx-auto mt-8 max-w-4xl">
            {attendees.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#e8cdbc] bg-white px-6 py-14 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                  <Search className="h-7 w-7 text-[#EA580C]" />
                </div>

                <h3 className="mt-5 text-lg font-bold text-[#241000]">
                  No generated badge found
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8b6f5c]">
                  We couldn't find a generated
                  badge matching your search.
                  Please check your registration
                  number, name or email and try
                  again.
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />

                    <h2 className="text-lg font-bold text-[#241000]">
                      Generated Badges
                    </h2>
                  </div>

                  <p className="mt-1 text-sm text-[#8b6f5c]">
                    We found{" "}
                    <span className="font-semibold text-[#241000]">
                      {attendees.length}
                    </span>{" "}
                    generated badge
                    {attendees.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    matching your search.
                  </p>
                </div>

                <div className="space-y-4">
                  {attendees.map(
                    (attendee) => {
                      const isPngDownloading =
                        downloadLoading?.attendeeId ===
                          attendee._id &&
                        downloadLoading.format ===
                          "png";

                      const isPdfDownloading =
                        downloadLoading?.attendeeId ===
                          attendee._id &&
                        downloadLoading.format ===
                          "pdf";

                      return (
                        <div
                          key={
                            attendee._id
                          }
                          className="rounded-3xl border border-[#f1dfd0] bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
                        >
                          <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50">
                                  <UserRound className="h-5 w-5 text-[#EA580C]" />
                                </div>

                                <div className="min-w-0">
                                  <h3 className="truncate text-base font-bold text-[#241000]">
                                    {
                                      attendee.name
                                    }
                                  </h3>

                                  <div className="mt-2 flex flex-col gap-1 text-xs text-[#8b6f5c] sm:flex-row sm:gap-4">
                                    <span className="inline-flex items-center gap-1.5">
                                      <Hash className="h-3.5 w-3.5" />

                                      {
                                        attendee.registrationNumber
                                      }
                                    </span>

                                    {attendee.email && (
                                      <span className="inline-flex max-w-full items-center gap-1.5 truncate">
                                        <Mail className="h-3.5 w-3.5 shrink-0" />

                                        {
                                          attendee.email
                                        }
                                      </span>
                                    )}
                                  </div>

                                  {attendee.category && (
                                    <span className="mt-2 inline-flex rounded-full bg-[#fff3e9] px-2.5 py-1 text-[11px] font-semibold text-[#9a3412]">
                                      {
                                        attendee.category
                                      }
                                    </span>
                                  )}

                                  <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Badge Generated
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  openBadgePreview(
                                    attendee,
                                  )
                                }
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#ead8cb] bg-white px-4 py-3 text-sm font-semibold text-[#6b4a38] transition hover:border-[#EA580C] hover:text-[#EA580C]"
                              >
                                <ExternalLink className="h-4 w-4" />
                                View Badge
                              </button>
                            </div>

                            {/* Download Formats */}
                            <div className="border-t border-[#f5e7dd] pt-4">
                              <div className="mb-3 flex items-center gap-2">
                                <Download className="h-4 w-4 text-[#EA580C]" />

                                <p className="text-xs font-bold uppercase tracking-wider text-[#8b6f5c]">
                                  Download Badge
                                </p>
                              </div>

                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadPng(
                                      attendee,
                                    )
                                  }
                                  disabled={
                                    isPngDownloading ||
                                    isPdfDownloading
                                  }
                                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ead8cb] bg-white px-5 py-3 text-sm font-semibold text-[#6b4a38] transition hover:border-[#EA580C] hover:bg-orange-50 hover:text-[#EA580C] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isPngDownloading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileImage className="h-4 w-4" />
                                  )}

                                  {isPngDownloading
                                    ? "Preparing PNG..."
                                    : "Download PNG"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadPdf(
                                      attendee,
                                    )
                                  }
                                  disabled={
                                    isPngDownloading ||
                                    isPdfDownloading
                                  }
                                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isPdfDownloading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}

                                  {isPdfDownloading
                                    ? "Preparing PDF..."
                                    : "Download PDF"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Badge Preview */}
        {previewOpen &&
          selectedAttendee && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241000]/70 p-4 backdrop-blur-sm">
              <div className="relative flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-[#fffaf5] shadow-2xl">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-[#f1dfd0] bg-white px-5 py-4 sm:px-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />

                      <h2 className="truncate text-lg font-bold text-[#241000]">
                        Generated Badge
                      </h2>
                    </div>

                    <p className="mt-1 truncate text-xs text-[#8b6f5c]">
                      {
                        selectedAttendee.name
                      }{" "}
                      •{" "}
                      {
                        selectedAttendee.registrationNumber
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeBadgePreview
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ead8cb] bg-white text-[#6b4a38] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    aria-label="Close badge preview"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Preview */}
                <div className="min-h-0 flex-1 overflow-auto p-5 sm:p-8">
                  {previewError ? (
                    <div className="flex min-h-[300px] items-center justify-center">
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center text-sm text-red-700">
                        {previewError}
                      </div>
                    </div>
                  ) : badgePreviewUrl ? (
                    <div className="flex flex-col items-center">
                      <div className="w-full rounded-3xl border border-[#ead8cb] bg-white p-3 shadow-xl sm:p-5">
                        <div className="flex min-h-[350px] items-center justify-center overflow-hidden rounded-2xl bg-[#fffaf5] p-2 sm:min-h-[500px]">
                          <img
                            src={
                              badgePreviewUrl
                            }
                            alt={`Generated badge for ${selectedAttendee.name}`}
                            className="max-h-[68vh] w-auto max-w-full object-contain"
                          />
                        </div>
                      </div>

                      {/* Modal Download Buttons */}
                      <div className="mt-5 grid w-full gap-3 sm:max-w-xl sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() =>
                            downloadPng(
                              selectedAttendee,
                            )
                          }
                          disabled={
                            downloadLoading?.attendeeId ===
                            selectedAttendee._id
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ead8cb] bg-white px-6 py-3 text-sm font-semibold text-[#6b4a38] transition hover:border-[#EA580C] hover:bg-orange-50 hover:text-[#EA580C] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {downloadLoading?.attendeeId ===
                          selectedAttendee._id &&
                          downloadLoading.format ===
                            "png" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileImage className="h-4 w-4" />
                          )}

                          {downloadLoading?.attendeeId ===
                            selectedAttendee._id &&
                          downloadLoading.format ===
                            "png"
                            ? "Preparing PNG..."
                            : "Download PNG"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            downloadPdf(
                              selectedAttendee,
                            )
                          }
                          disabled={
                            downloadLoading?.attendeeId ===
                            selectedAttendee._id
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {downloadLoading?.attendeeId ===
                          selectedAttendee._id &&
                          downloadLoading.format ===
                            "pdf" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}

                          {downloadLoading?.attendeeId ===
                            selectedAttendee._id &&
                          downloadLoading.format ===
                            "pdf"
                            ? "Preparing PDF..."
                            : "Download PDF"}
                        </button>
                      </div>

                      <div className="mt-5 flex items-center gap-2 text-center text-xs text-[#a58a78]">
                        <ShieldCheck className="h-4 w-4 shrink-0" />

                        <span>
                          Only PNG and PDF
                          downloads are
                          available.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[300px] items-center justify-center">
                      <div className="text-center">
                        <Ticket className="mx-auto h-10 w-10 text-[#EA580C]" />

                        <p className="mt-3 text-sm font-semibold text-[#241000]">
                          Badge preview unavailable
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* QR Scanner */}
        <div className="mx-auto mt-8 max-w-2xl">
          <Link
            href={`/public/${encodeURIComponent(publicId)}/scan`}
            className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#241000] to-[#EA580C] px-6 py-4 text-sm font-black text-white shadow-xl shadow-[#EA580C]/15 transition hover:-translate-y-0.5 hover:shadow-2xl"
          >
            <ScanLine className="h-5 w-5 transition-transform group-hover:scale-110" />
            <span>Scan Attendee QR</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>

          <p className="mt-2 text-center text-xs text-[#8b6f5c]">
            Select the event day and scanning module before opening the camera.
          </p>
        </div>

        {/* Security */}
        <div className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-2 text-center text-xs text-[#a58a78]">
          <ShieldCheck className="h-4 w-4" />

          <span>
            Only generated badges are available
            for viewing and download.
          </span>
        </div>

        <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-center">
          <p className="text-xs leading-5 text-[#9a6b52]">
            This is the public badge portal for
            this event. Search results are limited
            to badges generated for this event.
          </p>
        </div>
      </div>
    </main>
  );
}