"use client";

import {
  useState,
} from "react";

import {
  Download,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

interface ExportAttendeesButtonProps {
  eventId: string;
}

export default function ExportAttendeesButton({
  eventId,
}: ExportAttendeesButtonProps) {
  const [isExporting, setIsExporting] =
    useState(false);

  async function handleExport() {
    if (!eventId) {
      return;
    }

    try {
      setIsExporting(true);

      const response =
        await fetch(
          `/api/events/${eventId}/attendees/export`,
          {
            method: "GET",
          },
        );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(
              () => null,
            );

        throw new Error(
          data?.message ||
            "Failed to export attendees.",
        );
      }

      const blob =
        await response.blob();

      const contentDisposition =
        response.headers.get(
          "Content-Disposition",
        );

      let fileName =
        "badgeflow-attendees.xlsx";

      const match =
        contentDisposition?.match(
          /filename="([^"]+)"/,
        );

      if (match?.[1]) {
        fileName =
          match[1];
      }

      const url =
        URL.createObjectURL(
          blob,
        );

      const anchor =
        document.createElement(
          "a",
        );

      anchor.href = url;

      anchor.download =
        fileName;

      document.body.appendChild(
        anchor,
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(
        url,
      );
    } catch (error) {
      console.error(
        "Attendee Excel export failed:",
        error,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to export attendees.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={
        isExporting ||
        !eventId
      }
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isExporting ? (
        <Loader2
          size={17}
          className="animate-spin"
        />
      ) : (
        <FileSpreadsheet
          size={17}
        />
      )}

      {isExporting
        ? "Preparing Excel..."
        : "Export Excel"}
    </button>
  );
}