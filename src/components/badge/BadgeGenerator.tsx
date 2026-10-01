"use client";

import {
  useState,
} from "react";

import {
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import JSZip from "jszip";
import { jsPDF } from "jspdf";

import {
  renderBadgeToCanvas,
  renderBadgeToPngBlob,
} from "@/lib/badge/renderBadge";

import type {
  BadgeConfigData,
  BadgePreviewAttendee,
} from "@/types/badge";

interface BadgeGeneratorAttendee
  extends BadgePreviewAttendee {
  _id: string;
  email?: string;
  badgeGenerated?: boolean;
  badgeUrl?: string;
  badgeGeneratedAt?: string;
  badgeGenerationCount?: number;
}

interface BadgeGeneratorProps {
  eventId: string;
  config: BadgeConfigData;
  attendees: BadgeGeneratorAttendee[];
  selectedAttendeeId: string;
}

const EXPORT_SCALE = 3;

function sanitizeFileName(
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
    )
    .toLowerCase();
}

async function markBadgeGenerated(
  attendeeId: string,
  eventId: string,
): Promise<void> {
  const response =
    await fetch(
      `/api/events/${eventId}/attendees`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          attendeeId,
          badgeGenerated: true,
        }),
      },
    );

  if (!response.ok) {
    const data =
      await response
        .json()
        .catch(() => null);

    throw new Error(
      data?.message ||
        "Failed to update badge generation status.",
    );
  }
}

export default function BadgeGenerator({
  eventId,
  config,
  attendees,
  selectedAttendeeId,
}: BadgeGeneratorProps) {
  const [isGenerating, setIsGenerating] =
    useState(false);

  const [isGeneratingAll, setIsGeneratingAll] =
    useState(false);

  const [statusMessage, setStatusMessage] =
    useState("");

  const [generatedInSession, setGeneratedInSession] =
    useState(0);

  const selectedAttendee =
    attendees.find(
      (attendee) =>
        attendee._id ===
        selectedAttendeeId,
    );

  const generatedCount =
    attendees.filter(
      (attendee) =>
        attendee.badgeGenerated,
    ).length;

  const pendingCount =
    attendees.length -
    generatedCount;

  async function generateSingleBadge(
    attendee: BadgeGeneratorAttendee,
    shouldDownload = true,
  ): Promise<Blob> {
    const blob =
      await renderBadgeToPngBlob({
        config,
        attendee,
        scale: EXPORT_SCALE,
      });

    if (shouldDownload) {
      const url =
        URL.createObjectURL(
          blob,
        );

      const anchor =
        document.createElement(
          "a",
        );

      const baseName =
        sanitizeFileName(
          attendee.registrationNumber ||
            attendee.name ||
            "badge",
        );

      anchor.href = url;

      anchor.download =
        `${baseName}-high-resolution.png`;

      document.body.appendChild(
        anchor,
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(
        url,
      );
    }

    if (eventId) {
      await markBadgeGenerated(
        attendee._id,
        eventId,
      );
    }

    return blob;
  }

  async function handleGenerateSingle() {
    if (!selectedAttendee) {
      setStatusMessage(
        "Please select an attendee first.",
      );

      return;
    }

    if (!config.backgroundImage) {
      setStatusMessage(
        "Please upload and save a badge template first.",
      );

      return;
    }

    if (!eventId) {
      setStatusMessage(
        "Event ID is missing.",
      );

      return;
    }

    try {
      setIsGenerating(true);

      setStatusMessage(
        "Rendering high-resolution badge...",
      );

      await generateSingleBadge(
        selectedAttendee,
      );

      setGeneratedInSession(
        (value) => value + 1,
      );

      setStatusMessage(
        `${selectedAttendee.name}'s badge was generated successfully.`,
      );
    } catch (error) {
      console.error(
        "Single badge generation failed:",
        error,
      );

      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to generate badge.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateAll() {
    if (
      attendees.length ===
      0
    ) {
      setStatusMessage(
        "There are no attendees to generate badges for.",
      );

      return;
    }

    if (!config.backgroundImage) {
      setStatusMessage(
        "Please upload and save a badge template first.",
      );

      return;
    }

    if (!eventId) {
      setStatusMessage(
        "Event ID is missing.",
      );

      return;
    }

    try {
      setIsGeneratingAll(true);

      setStatusMessage(
        "Generating badges...",
      );

      let completed = 0;

      for (
        const attendee of attendees
      ) {
        try {
          await generateSingleBadge(
            attendee,
            false,
          );

          completed += 1;

          setStatusMessage(
            `Generated ${completed} of ${attendees.length} badges...`,
          );
        } catch (error) {
          console.error(
            `Failed to generate badge for ${attendee.name}:`,
            error,
          );
        }
      }

      setGeneratedInSession(
        (value) =>
          value + completed,
      );

      setStatusMessage(
        `Completed ${completed} of ${attendees.length} badge generations.`,
      );
    } catch (error) {
      console.error(
        "Bulk generation failed:",
        error,
      );

      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to generate badges.",
      );
    } finally {
      setIsGeneratingAll(false);
    }
  }

  async function handleDownloadZip() {
    if (
      attendees.length ===
      0
    ) {
      setStatusMessage(
        "There are no attendees.",
      );

      return;
    }

    if (!config.backgroundImage) {
      setStatusMessage(
        "Please upload and save a badge template first.",
      );

      return;
    }

    if (!eventId) {
      setStatusMessage(
        "Event ID is missing.",
      );

      return;
    }

    try {
      setIsGeneratingAll(true);

      setStatusMessage(
        "Preparing ZIP file...",
      );

      const zip =
        new JSZip();

      let completed = 0;

      for (
        const attendee of attendees
      ) {
        try {
          const blob =
            await generateSingleBadge(
              attendee,
              false,
            );

          const arrayBuffer =
            await blob.arrayBuffer();

          const baseName =
            sanitizeFileName(
              attendee.registrationNumber ||
                attendee.name ||
                "badge",
            );

          zip.file(
            `${baseName}-high-resolution.png`,
            arrayBuffer,
          );

          completed += 1;

          setStatusMessage(
            `Preparing ${completed} of ${attendees.length} badges...`,
          );
        } catch (error) {
          console.error(
            `Failed to add ${attendee.name} to ZIP:`,
            error,
          );
        }
      }

      const zipBlob =
        await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: {
            level: 6,
          },
        });

      const url =
        URL.createObjectURL(
          zipBlob,
        );

      const anchor =
        document.createElement(
          "a",
        );

      anchor.href = url;

      anchor.download =
        "badgeflow-high-resolution-badges.zip";

      document.body.appendChild(
        anchor,
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(
        url,
      );

      setGeneratedInSession(
        (value) =>
          value + completed,
      );

      setStatusMessage(
        `ZIP created successfully with ${completed} badges.`,
      );
    } catch (error) {
      console.error(
        "ZIP generation failed:",
        error,
      );

      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to create ZIP.",
      );
    } finally {
      setIsGeneratingAll(false);
    }
  }

  async function handleDownloadPdf() {
    if (
      attendees.length ===
      0
    ) {
      setStatusMessage(
        "There are no attendees.",
      );

      return;
    }

    if (!config.backgroundImage) {
      setStatusMessage(
        "Please upload and save a badge template first.",
      );

      return;
    }

    if (!eventId) {
      setStatusMessage(
        "Event ID is missing.",
      );

      return;
    }

    try {
      setIsGeneratingAll(true);

      setStatusMessage(
        "Preparing PDF...",
      );

      const firstCanvas =
        await renderBadgeToCanvas({
          config,
          attendee: attendees[0],
          scale: EXPORT_SCALE,
        });

      const pdf =
        new jsPDF({
          orientation:
            config.width >=
            config.height
              ? "landscape"
              : "portrait",
          unit: "px",
          format: [
            config.width,
            config.height,
          ],
          compress: true,
        });

      for (
        let index = 0;
        index <
        attendees.length;
        index += 1
      ) {
        const attendee =
          attendees[index];

        const canvas =
          index === 0
            ? firstCanvas
            : await renderBadgeToCanvas({
                config,
                attendee,
                scale: EXPORT_SCALE,
              });

        const imageData =
          canvas.toDataURL(
            "image/png",
            1,
          );

        if (index > 0) {
          pdf.addPage([
            config.width,
            config.height,
          ]);
        }

        pdf.addImage(
          imageData,
          "PNG",
          0,
          0,
          config.width,
          config.height,
          undefined,
          "NONE",
        );

        await markBadgeGenerated(
          attendee._id,
          eventId,
        );

        setStatusMessage(
          `Preparing ${index + 1} of ${attendees.length} PDF pages...`,
        );
      }

      pdf.save(
        "badgeflow-high-resolution-badges.pdf",
      );

      setGeneratedInSession(
        (value) =>
          value + attendees.length,
      );

      setStatusMessage(
        `PDF created successfully with ${attendees.length} badges.`,
      );
    } catch (error) {
      console.error(
        "PDF generation failed:",
        error,
      );

      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to create PDF.",
      );
    } finally {
      setIsGeneratingAll(false);
    }
  }

  const busy =
    isGenerating ||
    isGeneratingAll;

  return (
    <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 bg-gradient-to-r from-[#fff7ed] to-white px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EA580C] text-white shadow-lg shadow-orange-200">
                <Sparkles size={19} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-[#241000]">
                  Badge Generation
                </h2>

                <p className="text-sm text-stone-500">
                  Generate production-ready
                  high-resolution badges.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                Total
              </p>

              <p className="mt-1 text-lg font-bold text-[#241000]">
                {attendees.length}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                Generated
              </p>

              <p className="mt-1 text-lg font-bold text-emerald-700">
                {generatedCount}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">
                Pending
              </p>

              <p className="mt-1 text-lg font-bold text-orange-700">
                {pendingCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          {selectedAttendee ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Selected attendee
                </p>

                <h3 className="mt-1 text-base font-bold text-[#241000]">
                  {selectedAttendee.name}
                </h3>

                <p className="mt-1 text-sm text-stone-500">
                  {selectedAttendee.registrationNumber}
                </p>

                {selectedAttendee.medicalCouncilNumber && (
                  <p className="mt-1 text-xs font-semibold text-orange-700">
                    Medical Council No:{" "}
                    {selectedAttendee.medicalCouncilNumber}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedAttendee.badgeGenerated && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={14} />
                    Generated
                  </span>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={
                    handleGenerateSingle
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : selectedAttendee.badgeGenerated ? (
                    <RefreshCw size={17} />
                  ) : (
                    <Download size={17} />
                  )}

                  {selectedAttendee.badgeGenerated
                    ? "Regenerate Badge"
                    : "Generate Badge"}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-5 text-center">
              <p className="text-sm font-medium text-stone-500">
                Select an attendee above to
                generate an individual badge.
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            disabled={
              busy ||
              attendees.length === 0
            }
            onClick={
              handleGenerateAll
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-[#241000] transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGeneratingAll ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <Sparkles size={17} />
            )}

            Generate All
          </button>

          <button
            type="button"
            disabled={
              busy ||
              attendees.length === 0
            }
            onClick={
              handleDownloadZip
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-[#241000] transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={17} />

            Download ZIP
          </button>

          <button
            type="button"
            disabled={
              busy ||
              attendees.length === 0
            }
            onClick={
              handleDownloadPdf
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-[#241000] transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={17} />

            Download PDF
          </button>
        </div>

        {generatedInSession > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={17} />

              {generatedInSession} badge
              generation
              {generatedInSession ===
              1
                ? ""
                : "s"} completed in
              this session.
            </div>
          </div>
        )}

        {statusMessage && (
          <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
            <p className="text-sm font-medium text-orange-800">
              {statusMessage}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[#241000]">
                High-resolution export
              </p>

              <p className="mt-1 text-xs leading-5 text-stone-500">
                Badges are rendered at{" "}
                {EXPORT_SCALE}× the configured
                badge dimensions for sharper
                output.
              </p>
            </div>

            <span className="w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
              {EXPORT_SCALE}× Quality
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}