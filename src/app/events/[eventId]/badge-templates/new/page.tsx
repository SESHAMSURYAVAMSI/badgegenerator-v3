"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FilePlus2,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

interface BadgeField {
  id: string;
  label: string;
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: number;
  align: "left" | "center" | "right";
  color: string;
}

interface BadgeConfig {
  width: number;
  height: number;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  backgroundImage: string;
  backgroundImageName: string;
  qrSource:
    | "registrationNumber"
    | "qrValue";
  fields: BadgeField[];
}

export default function NewBadgeTemplatePage() {
  const params = useParams();
  const router = useRouter();

  const eventId = String(params.eventId);

  const [config, setConfig] =
    useState<BadgeConfig | null>(null);

  const [name, setName] =
    useState("My Badge Template");

  const [description, setDescription] =
    useState(
      "Reusable badge design for this event.",
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/events/${eventId}/badge`,
          {
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to load badge configuration.",
          );
        }

        setConfig(data.config);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load badge configuration.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [eventId]);

  const createTemplate = async () => {
    if (!name.trim()) {
      setError(
        "Please enter a template name.",
      );
      return;
    }

    if (!config) {
      setError(
        "Badge configuration is not available.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `/api/events/${eventId}/badge-templates`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            description:
              description.trim(),
            ...config,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create template.",
        );
      }

      router.push(
        `/events/${eventId}/badge-templates`,
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create template.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fffaf5]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/events/${eventId}/badge-templates`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#7c5b48] transition hover:text-[#EA580C]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </Link>

        <div className="overflow-hidden rounded-3xl border border-[#f1dfd0] bg-white shadow-sm">
          <div className="border-b border-[#f1dfd0] bg-gradient-to-r from-[#fff7f0] to-white px-6 py-7 sm:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EA580C] text-white shadow-lg shadow-orange-200">
                <FilePlus2 className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-[#241000]">
                  Create Badge Template
                </h1>

                <p className="mt-1 text-sm text-[#8b6f5c]">
                  Save your current badge design as
                  a reusable template.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#EA580C]" />
                  <p className="text-sm text-[#8b6f5c]">
                    Loading current badge design...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#241000]">
                    Template Name
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value,
                      )
                    }
                    placeholder="e.g. ACVS Premium Badge"
                    className="w-full rounded-xl border border-[#ead8cb] bg-white px-4 py-3 text-sm text-[#241000] outline-none transition placeholder:text-[#b49a88] focus:border-[#EA580C] focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#241000]">
                    Description
                  </label>

                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value,
                      )
                    }
                    rows={4}
                    placeholder="Describe where this template should be used..."
                    className="w-full resize-none rounded-xl border border-[#ead8cb] bg-white px-4 py-3 text-sm text-[#241000] outline-none transition placeholder:text-[#b49a88] focus:border-[#EA580C] focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#EA580C]" />

                    <div>
                      <p className="text-sm font-bold text-[#7c2d12]">
                        Current badge design will
                        be saved
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#9a3412]">
                        The current size, background,
                        QR settings and field positions
                        will be stored as a reusable
                        template.
                      </p>
                    </div>
                  </div>
                </div>

                {config && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl bg-[#fffaf5] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#a58a78]">
                        Width
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#241000]">
                        {config.width}px
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#fffaf5] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#a58a78]">
                        Height
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#241000]">
                        {config.height}px
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#fffaf5] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#a58a78]">
                        Fields
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#241000]">
                        {
                          config.fields.filter(
                            (field) =>
                              field.enabled,
                          ).length
                        }
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#fffaf5] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#a58a78]">
                        QR
                      </p>

                      <p className="mt-1 truncate text-sm font-bold text-[#241000]">
                        {config.qrSource ===
                        "registrationNumber"
                          ? "Registration"
                          : "QR Value"}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <Link
                    href={`/events/${eventId}/badge-templates`}
                    className="inline-flex items-center justify-center rounded-xl border border-[#ead8cb] px-5 py-3 text-sm font-semibold text-[#6b4a38] transition hover:border-[#EA580C] hover:text-[#EA580C]"
                  >
                    Cancel
                  </Link>

                  <button
                    type="button"
                    onClick={createTemplate}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Create Template
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}