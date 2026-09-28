"use client";

import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  QrCode,
  ShieldCheck,
} from "lucide-react";

import QRCode from "qrcode";
import {
  useEffect,
  useState,
} from "react";

interface PublicBadgePortalCardProps {
  eventId: string;
}

export default function PublicBadgePortalCard({
  eventId,
}: PublicBadgePortalCardProps) {
  const [publicUrl, setPublicUrl] =
    useState("");

  const [qrCode, setQrCode] =
    useState("");

  const [loading, setLoading] =
    useState(true);

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

      const url =
        typeof data.publicUrl === "string"
          ? data.publicUrl
          : "";

      setPublicUrl(url);

      if (url) {
        try {
          const generatedQr =
            await QRCode.toDataURL(url, {
              width: 320,
              margin: 2,
              errorCorrectionLevel: "H",
              color: {
                dark: "#241000",
                light: "#ffffff",
              },
            });

          setQrCode(generatedQr);
        } catch (qrError) {
          console.error(
            "QR generation failed:",
            qrError,
          );

          setQrCode("");
        }
      } else {
        setQrCode("");
      }
    } catch (err) {
      console.error(
        "Load public portal failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load public portal.",
      );

      setPublicUrl("");
      setQrCode("");
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
                Share this permanent link with
                attendees so they can find and
                download their generated badges.
              </p>
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
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
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#a58a78]">
                  Permanent Shareable URL
                </p>

                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-green-700">
                  <ShieldCheck className="h-3 w-3" />
                  Fixed Link
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="min-w-0 flex-1 rounded-xl border border-[#ead8cb] bg-[#fffaf5] px-4 py-3">
                  <p className="truncate text-sm font-medium text-[#5c4030]">
                    {publicUrl ||
                      "Public URL unavailable"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={copyUrl}
                  disabled={!publicUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-100 transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-50"
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
                  disabled={!publicUrl}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#ead8cb] bg-white px-4 py-2.5 text-xs font-semibold text-[#6b4a38] transition hover:border-[#EA580C] hover:text-[#EA580C] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Public Portal
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" />

                  <div>
                    <p className="text-xs font-bold text-[#7c2d12]">
                      Permanent public link
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#9a6b52]">
                      This URL is permanently linked
                      to this event and cannot be
                      regenerated or replaced.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-[#a58a78]">
                Only attendees whose badges have
                been generated from the admin panel
                will be able to find and download a
                badge through this portal.
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="rounded-3xl border border-[#f1dfd0] bg-[#fffaf5] p-4">
                <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl bg-white p-2">
                  {qrCode ? (
                    <img
                      src={qrCode}
                      alt="QR code for the public badge portal"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-[#a58a78]">
                      <QrCode className="h-12 w-12" />

                      <span className="text-[10px] font-medium">
                        QR unavailable
                      </span>
                    </div>
                  )}
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