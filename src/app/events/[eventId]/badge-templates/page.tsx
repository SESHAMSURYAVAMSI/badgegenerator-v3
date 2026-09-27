"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Copy,
  Edit3,
  FilePlus2,
  Loader2,
  MoreVertical,
  Palette,
  Plus,
  Sparkles,
  Trash2,
  CheckCircle2,
  Layers3,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  useEffect,
  useState,
} from "react";

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

interface BadgeTemplate {
  _id: string;
  eventId: string;
  name: string;
  description: string;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function BadgeTemplatesPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = String(params.eventId);

  const [templates, setTemplates] =
    useState<BadgeTemplate[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [actionId, setActionId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/events/${eventId}/badge-templates`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load templates.",
        );
      }

      setTemplates(
        Array.isArray(data.templates)
          ? data.templates
          : [],
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load templates.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [eventId]);

  const activateTemplate = async (
    templateId: string,
  ) => {
    try {
      setActionId(templateId);

      const response = await fetch(
        `/api/events/${eventId}/badge-templates/${templateId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "activate",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to activate template.",
        );
      }

      await loadTemplates();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to activate template.",
      );
    } finally {
      setActionId(null);
    }
  };

  const duplicateTemplate = async (
    templateId: string,
  ) => {
    try {
      setActionId(templateId);

      const response = await fetch(
        `/api/events/${eventId}/badge-templates/${templateId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "duplicate",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to duplicate template.",
        );
      }

      await loadTemplates();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to duplicate template.",
      );
    } finally {
      setActionId(null);
    }
  };

  const deleteTemplate = async (
    templateId: string,
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this badge template?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionId(templateId);

      const response = await fetch(
        `/api/events/${eventId}/badge-templates/${templateId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete template.",
        );
      }

      await loadTemplates();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to delete template.",
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#fffaf5]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href={`/events/${eventId}`}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#7c5b48] transition hover:text-[#EA580C]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Event
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EA580C] to-[#9a3412] text-white shadow-lg shadow-orange-200">
                <Layers3 className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#241000] sm:text-3xl">
                  Badge Templates
                </h1>

                <p className="mt-1 text-sm text-[#8b6f5c]">
                  Create and manage reusable badge
                  designs for this event.
                </p>
              </div>
            </div>
          </div>

          <Link
            href={`/events/${eventId}/badge-templates/new`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#c2410c]"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-[#f1dfd0] bg-white">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#EA580C]" />
              <p className="text-sm text-[#8b6f5c]">
                Loading badge templates...
              </p>
            </div>
          </div>
        ) : templates.length === 0 ? (
          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="rounded-3xl border border-dashed border-[#e8cdbc] bg-white px-6 py-20 text-center shadow-sm"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50">
              <Palette className="h-9 w-9 text-[#EA580C]" />
            </div>

            <h2 className="mt-6 text-xl font-bold text-[#241000]">
              No badge templates yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8b6f5c]">
              Create your first reusable badge
              template and use it whenever you
              generate badges for this event.
            </p>

            <Link
              href={`/events/${eventId}/badge-templates/new`}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#c2410c]"
            >
              <FilePlus2 className="h-4 w-4" />
              Create First Template
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {templates.map(
              (template, index) => {
                const isProcessing =
                  actionId === template._id;

                return (
                  <motion.div
                    key={template._id}
                    initial={{
                      opacity: 0,
                      y: 15,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay: index * 0.05,
                    }}
                    className={`group overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                      template.isActive
                        ? "border-[#EA580C]/40"
                        : "border-[#f1dfd0]"
                    }`}
                  >
                    {/* Preview */}
                    <div className="relative h-64 overflow-hidden bg-[#f8eee7]">
                      {template.backgroundImage ? (
                        <img
                          src={
                            template.backgroundImage
                          }
                          alt={template.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center"
                          style={{
                            backgroundColor:
                              template.backgroundColor ||
                              "#ffffff",
                          }}
                        >
                          <div className="flex flex-col items-center gap-3 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100">
                              <Sparkles className="h-6 w-6 text-[#EA580C]" />
                            </div>

                            <span className="text-xs font-semibold text-[#8b6f5c]">
                              {template.width} ×{" "}
                              {template.height}
                            </span>
                          </div>
                        </div>
                      )}

                      {template.isActive && (
                        <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[#c2410c] shadow-lg backdrop-blur">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Active
                        </div>
                      )}

                      <div className="absolute right-4 top-4">
                        <div className="rounded-xl bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[#6b4a38] shadow backdrop-blur">
                          {template.fields.filter(
                            (field) =>
                              field.enabled,
                          ).length}{" "}
                          fields
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-bold text-[#241000]">
                            {template.name}
                          </h3>

                          <p className="mt-1 line-clamp-2 min-h-[40px] text-sm leading-5 text-[#8b6f5c]">
                            {template.description ||
                              "Reusable badge design template."}
                          </p>
                        </div>

                        <div className="shrink-0 rounded-xl bg-orange-50 p-2.5">
                          <Palette className="h-5 w-5 text-[#EA580C]" />
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-[#fffaf5] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#a58a78]">
                            Size
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[#241000]">
                            {template.width} ×{" "}
                            {template.height}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[#fffaf5] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#a58a78]">
                            QR Source
                          </p>

                          <p className="mt-1 truncate text-sm font-semibold text-[#241000]">
                            {template.qrSource ===
                            "registrationNumber"
                              ? "Registration"
                              : "QR Value"}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-5 flex gap-2">
                        <Link
                          href={`/events/${eventId}/badge?templateId=${template._id}`}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c2410c]"
                        >
                          <Sparkles className="h-4 w-4" />
                          Use Template
                        </Link>

                        <Link
                          href={`/events/${eventId}/badge-templates/${template._id}/edit`}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ead8cb] bg-white text-[#6b4a38] transition hover:border-[#EA580C] hover:text-[#EA580C]"
                          title="Edit template"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Link>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {!template.isActive && (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              activateTemplate(
                                template._id,
                              )
                            }
                            className="rounded-xl border border-[#ead8cb] px-3 py-2 text-xs font-semibold text-[#6b4a38] transition hover:border-[#EA580C] hover:text-[#EA580C] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                            ) : (
                              "Activate"
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            duplicateTemplate(
                              template._id,
                            )
                          }
                          className="rounded-xl border border-[#ead8cb] px-3 py-2 text-xs font-semibold text-[#6b4a38] transition hover:border-[#EA580C] hover:text-[#EA580C] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            deleteTemplate(
                              template._id,
                            )
                          }
                          className="rounded-xl border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              },
            )}
          </div>
        )}
      </div>
    </main>
  );
}