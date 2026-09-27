"use client";

import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { useEffect, useState } from "react";

interface PublicBadgePortalCardProps {
  eventId: string;
}

export default function PublicBadgePortalCard({
  eventId,
}: PublicBadgePortalCardProps) {
  const [publicUrl, setPublicUrl] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [regenerating, setRegenerating] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadPortal = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/events/${eventId}/public-portal`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load public portal.",
        );
      }

      setPublicUrl(data.publicUrl);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load public portal.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortal();
  }, [eventId]);

  const copyUrl = async () => {
    if (!publicUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        publicUrl,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Copy URL failed:",
        error,
      );
    }
  };

  const regenerateUrl = async () => {
    const confirmed =
      window.confirm(
        "Regenerating this URL will invalidate the current public link. Continue?",
      );

    if (!confirmed) {
      return;
    }

    try {
      setRegenerating(true);
      setError("");

      const response = await fetch(
        `/api/events/${eventId}/public-portal`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to regenerate URL.",
        );
      }

      setPublicUrl(data.publicUrl);
      setCopied(false);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to regenerate URL.",
      );
    } finally {
      setRegenerating(false);
    }
  };

  const openPortal = () => {
    if (!publicUrl) {
      return;
    }

    window.open(
      publicUrl,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <section className="rounded-3xl border border-[#f1dfd0] bg-white shadow-sm">
      <div className="border-b border-[#f1dfd0] bg-gradient-to-r from-[#fff7f0] to-white px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50">
              <Link2 className="h-6 w-6 text-[#EA580C]" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#241000]">
                Public Badge Portal
              </h2>

              <p className="mt-1 text-sm leading-5 text-[#8b6f5c]">
                Share this link with attendees so
                they can find and download their
                generated badges.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Public Access
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[160px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-[#8b6f5c]">
              <Loader2 className="h-5 w-5 animate-spin text-[#EA580C]" />
              Loading public portal...
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#a58a78]">
                Shareable URL
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="min-w-0 flex-1 rounded-xl border border-[#ead8cb] bg-[#fffaf5] px-4 py-3">
                  <p className="truncate text-sm font-medium text-[#5c4030]">
                    {publicUrl}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={copyUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-100 transition hover:bg-[#c2410c]"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openPortal}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#ead8cb] bg-white px-4 py-2.5 text-xs font-semibold text-[#6b4a38] transition hover:border-[#EA580C] hover:text-[#EA580C]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Public Portal
                </button>

                <button
                  type="button"
                  onClick={regenerateUrl}
                  disabled={regenerating}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#ead8cb] bg-white px-4 py-2.5 text-xs font-semibold text-[#6b4a38] transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {regenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}

                  Regenerate URL
                </button>
              </div>

              <p className="mt-4 text-xs leading-5 text-[#a58a78]">
                Only attendees whose badges have been
                generated from the admin panel will be
                able to download a badge.
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="rounded-3xl border border-[#f1dfd0] bg-[#fffaf5] p-4">
                <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-white">
                  <QrCode className="h-28 w-28 text-[#241000]" />
                </div>

                <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[#a58a78]">
                  Scan to find badge
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}