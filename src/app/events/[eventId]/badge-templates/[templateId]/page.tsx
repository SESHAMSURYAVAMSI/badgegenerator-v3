"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

interface BadgeTemplate {
  _id: string;
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
  fields: unknown[];
  isActive: boolean;
}

export default function EditBadgeTemplatePage() {
  const params = useParams();
  const router = useRouter();

  const eventId = String(params.eventId);
  const templateId = String(
    params.templateId,
  );

  const [template, setTemplate] =
    useState<BadgeTemplate | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadTemplate = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/events/${eventId}/badge-templates/${templateId}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load template.",
        );
      }

      setTemplate(data.template);
      setName(data.template.name || "");
      setDescription(
        data.template.description || "",
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load template.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, [eventId, templateId]);

  const saveTemplate = async () => {
    if (!template) return;

    if (!name.trim()) {
      setError(
        "Template name is required.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        `/api/events/${eventId}/badge-templates/${templateId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            description:
              description.trim(),
            width: template.width,
            height: template.height,
            backgroundColor:
              template.backgroundColor,
            borderColor:
              template.borderColor,
            borderWidth:
              template.borderWidth,
            borderRadius:
              template.borderRadius,
            backgroundImage:
              template.backgroundImage,
            backgroundImageName:
              template.backgroundImageName,
            qrSource: template.qrSource,
            fields: template.fields,
            isActive: template.isActive,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to save template.",
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
          : "Failed to save template.",
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
                <Sparkles className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-[#241000]">
                  Edit Template
                </h1>

                <p className="mt-1 text-sm text-[#8b6f5c]">
                  Update the reusable template
                  information.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#EA580C]" />
                  <p className="text-sm text-[#8b6f5c]">
                    Loading template...
                  </p>
                </div>
              </div>
            ) : !template ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                {error ||
                  "Template could not be found."}
              </div>
            ) : (
              <div className="space-y-6">
                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

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
                    className="w-full rounded-xl border border-[#ead8cb] bg-white px-4 py-3 text-sm text-[#241000] outline-none transition focus:border-[#EA580C] focus:ring-4 focus:ring-orange-100"
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
                    className="w-full resize-none rounded-xl border border-[#ead8cb] bg-white px-4 py-3 text-sm text-[#241000] outline-none transition focus:border-[#EA580C] focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-[#fffaf5] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#a58a78]">
                      Width
                    </p>

                    <p className="mt-1 text-lg font-bold text-[#241000]">
                      {template.width}px
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#fffaf5] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#a58a78]">
                      Height
                    </p>

                    <p className="mt-1 text-lg font-bold text-[#241000]">
                      {template.height}px
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#fffaf5] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#a58a78]">
                      Fields
                    </p>

                    <p className="mt-1 text-lg font-bold text-[#241000]">
                      {template.fields.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#fffaf5] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#a58a78]">
                      Status
                    </p>

                    <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[#241000]">
                      {template.isActive && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                      {template.isActive
                        ? "Active"
                        : "Inactive"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
                  <p className="text-sm font-bold text-[#7c2d12]">
                    Design editing
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#9a3412]">
                    The template keeps its existing
                    badge layout, background and field
                    positions. Use the badge designer
                    to modify the actual visual layout.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <Link
                    href={`/events/${eventId}/badge-templates`}
                    className="inline-flex items-center justify-center rounded-xl border border-[#ead8cb] px-5 py-3 text-sm font-semibold text-[#6b4a38] transition hover:border-[#EA580C] hover:text-[#EA580C]"
                  >
                    Cancel
                  </Link>

                  <button
                    type="button"
                    onClick={saveTemplate}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}