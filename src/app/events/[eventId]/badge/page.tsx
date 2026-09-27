"use client";

import {
  ArrowLeft,
  Check,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import AttendeeSelector, {
  type BadgeAttendee,
} from "@/components/badge/AttendeeSelector";
import BadgeFieldSettings from "@/components/badge/BadgeFieldSettings";
import BadgePreview from "@/components/badge/BadgePreview";
import BadgeTemplateUploader from "@/components/badge/BadgeTemplateUploader";

import {
  DEFAULT_BADGE_CONFIG,
  type BadgeConfigData,
  type BadgeFieldConfig,
  type BadgeFieldType,
  type BadgePreviewAttendee,
} from "@/types/badge";

interface EventData {
  _id: string;
  name: string;
  code: string;
  slug: string;
}

interface AttendeeApiData {
  _id: string;
  name?: string;
  email?: string;
  registrationNumber?: string;
  category?: string;
  qrValue?: string;
}

function createFieldsForTemplate(
  width: number,
  height: number,
): BadgeFieldConfig[] {
  const safeWidth = Math.max(
    width,
    1,
  );

  const safeHeight = Math.max(
    height,
    1,
  );

  const nameWidth = Math.min(
    Math.round(
      safeWidth * 0.8,
    ),
    safeWidth,
  );

  const nameX = Math.round(
    (safeWidth - nameWidth) / 2,
  );

  const registrationWidth =
    Math.min(
      Math.round(
        safeWidth * 0.72,
      ),
      safeWidth,
    );

  const registrationX =
    Math.round(
      (safeWidth -
        registrationWidth) /
        2,
    );

  const categoryWidth =
    Math.min(
      Math.round(
        safeWidth * 0.66,
      ),
      safeWidth,
    );

  const categoryX =
    Math.round(
      (safeWidth -
        categoryWidth) /
        2,
    );

  const qrSize = Math.min(
    Math.round(
      safeWidth * 0.34,
    ),
    Math.round(
      safeHeight * 0.34,
    ),
  );

  const qrX = Math.round(
    (safeWidth - qrSize) / 2,
  );

  const qrY = Math.round(
    safeHeight * 0.27,
  );

  return [
    {
      id: "name",
      label: "Attendee Name",
      enabled: true,
      x: nameX,
      y: Math.round(
        safeHeight * 0.68,
      ),
      width: nameWidth,
      height: Math.max(
        60,
        Math.round(
          safeHeight * 0.075,
        ),
      ),
      fontSize: Math.max(
        18,
        Math.round(
          safeWidth * 0.051,
        ),
      ),
      fontWeight: 700,
      align: "center",
      color: "#241000",
    },
    {
      id: "registrationNumber",
      label: "Registration Number",
      enabled: true,
      x: registrationX,
      y: Math.round(
        safeHeight * 0.77,
      ),
      width: registrationWidth,
      height: Math.max(
        40,
        Math.round(
          safeHeight * 0.045,
        ),
      ),
      fontSize: Math.max(
        14,
        Math.round(
          safeWidth * 0.029,
        ),
      ),
      fontWeight: 600,
      align: "center",
      color: "#241000",
    },
    {
      id: "category",
      label: "Category",
      enabled: true,
      x: categoryX,
      y: Math.round(
        safeHeight * 0.83,
      ),
      width: categoryWidth,
      height: Math.max(
        40,
        Math.round(
          safeHeight * 0.042,
        ),
      ),
      fontSize: Math.max(
        13,
        Math.round(
          safeWidth * 0.026,
        ),
      ),
      fontWeight: 600,
      align: "center",
      color: "#241000",
    },
    {
      id: "qr",
      label: "QR Code",
      enabled: true,
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
      fontSize: 20,
      fontWeight: 500,
      align: "center",
      color: "#241000",
    },
  ];
}

function normalizeAttendee(
  attendee: AttendeeApiData,
): BadgeAttendee {
  const registrationNumber =
    attendee.registrationNumber ||
    attendee._id;

  const category =
    attendee.category ||
    "Delegate";

  const qrValue =
    attendee.qrValue ||
    registrationNumber;

  return {
    _id: attendee._id,
    name:
      attendee.name ||
      "Attendee",
    email: attendee.email,
    registrationNumber,
    category,
    qrValue,
  };
}

export default function BadgeDesignerPage() {
  const params = useParams();

  const eventId = String(
    params.eventId ?? "",
  );

  const [event, setEvent] =
    useState<EventData | null>(null);

  const [attendees, setAttendees] =
    useState<BadgeAttendee[]>([]);

  const [config, setConfig] =
    useState<BadgeConfigData>(
      DEFAULT_BADGE_CONFIG,
    );

  const [
    selectedAttendeeId,
    setSelectedAttendeeId,
  ] = useState("");

  const [selectedField, setSelectedField] =
    useState<BadgeFieldType | null>(
      "name",
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const selectedAttendee =
    useMemo(() => {
      return (
        attendees.find(
          (attendee) =>
            attendee._id ===
            selectedAttendeeId,
        ) ??
        attendees[0] ??
        null
      );
    }, [
      attendees,
      selectedAttendeeId,
    ]);

  const previewAttendee =
    useMemo<
      BadgePreviewAttendee | undefined
    >(() => {
      if (!selectedAttendee) {
        return undefined;
      }

      return {
        name:
          selectedAttendee.name,
        registrationNumber:
          selectedAttendee.registrationNumber,
        category:
          selectedAttendee.category,
        qrValue:
          selectedAttendee.qrValue,
      };
    }, [selectedAttendee]);

  const selectedFieldConfig =
    useMemo(() => {
      if (!selectedField) {
        return null;
      }

      return (
        config.fields.find(
          (field) =>
            field.id ===
            selectedField,
        ) ?? null
      );
    }, [
      config.fields,
      selectedField,
    ]);

  const updateField = useCallback(
    (
      fieldId: BadgeFieldType,
      updates: Partial<BadgeFieldConfig>,
    ) => {
      setConfig((current) => ({
        ...current,
        fields:
          current.fields.map(
            (field) =>
              field.id === fieldId
                ? {
                    ...field,
                    ...updates,
                  }
                : field,
          ),
      }));
    },
    [],
  );

  const loadDesigner =
    useCallback(async () => {
      if (!eventId) {
        setError(
          "Event ID is missing.",
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [
          eventResponse,
          badgeResponse,
          attendeeResponse,
        ] = await Promise.all([
          fetch(
            `/api/events/${eventId}`,
            {
              cache: "no-store",
            },
          ),
          fetch(
            `/api/events/${eventId}/badge`,
            {
              cache: "no-store",
            },
          ),
          fetch(
            `/api/events/${eventId}/attendees?page=1&limit=5000`,
            {
              cache: "no-store",
            },
          ),
        ]);

        if (!eventResponse.ok) {
          throw new Error(
            "Failed to load event.",
          );
        }

        if (!badgeResponse.ok) {
          throw new Error(
            "Failed to load badge configuration.",
          );
        }

        if (!attendeeResponse.ok) {
          throw new Error(
            "Failed to load attendees.",
          );
        }

        const eventData =
          (await eventResponse.json()) as EventData;

        const badgeData =
          (await badgeResponse.json()) as {
            config?: BadgeConfigData;
          };

        const attendeeData =
          (await attendeeResponse.json()) as {
            attendees?: AttendeeApiData[];
          };

        const normalizedAttendees =
          (
            attendeeData.attendees ??
            []
          ).map(
            normalizeAttendee,
          );

        setEvent(eventData);
        setAttendees(
          normalizedAttendees,
        );

        if (badgeData.config) {
          setConfig(
            badgeData.config,
          );
        } else {
          setConfig(
            DEFAULT_BADGE_CONFIG,
          );
        }

        if (
          normalizedAttendees.length >
          0
        ) {
          setSelectedAttendeeId(
            normalizedAttendees[0]
              ._id,
          );
        }
      } catch (loadError) {
        console.error(
          "Badge designer load error:",
          loadError,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load badge designer.",
        );
      } finally {
        setLoading(false);
      }
    }, [eventId]);

  useEffect(() => {
    void loadDesigner();
  }, [loadDesigner]);

  async function saveBadge() {
    if (!eventId) {
      setError(
        "Event ID is missing.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          `/api/events/${eventId}/badge`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              config,
            ),
          },
        );

      const data =
        (await response.json()) as {
          config?: BadgeConfigData;
          message?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to save badge configuration.",
        );
      }

      if (data.config) {
        setConfig(data.config);
      }

      setSuccess(
        "Badge configuration saved successfully.",
      );

      window.setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (saveError) {
      console.error(
        "Badge save error:",
        saveError,
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save badge configuration.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleTemplateUpload(
    image: string,
    imageName: string,
    width: number,
    height: number,
  ) {
    setConfig((current) => ({
      ...current,
      width,
      height,
      backgroundImage: image,
      backgroundImageName:
        imageName,
      fields:
        createFieldsForTemplate(
          width,
          height,
        ),
    }));

    setSelectedField("name");

    setSuccess(
      "Badge template loaded. Position the fields on your badge.",
    );

    window.setTimeout(() => {
      setSuccess("");
    }, 3500);
  }

  function handleTemplateRemove() {
    setConfig({
      ...DEFAULT_BADGE_CONFIG,
      fields:
        createFieldsForTemplate(
          DEFAULT_BADGE_CONFIG.width,
          DEFAULT_BADGE_CONFIG.height,
        ),
    });

    setSelectedField("name");

    setSuccess(
      "Badge template removed.",
    );

    window.setTimeout(() => {
      setSuccess("");
    }, 2500);
  }

  function handleAttendeeSelect(
    attendee: BadgeAttendee,
  ) {
    setSelectedAttendeeId(
      attendee._id,
    );
  }

  function toggleField(
    fieldId: BadgeFieldType,
  ) {
    const field =
      config.fields.find(
        (item) =>
          item.id === fieldId,
      );

    if (!field) {
      return;
    }

    updateField(fieldId, {
      enabled:
        !field.enabled,
    });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf5]">
        <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white px-6 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[#EA580C]" />

          <span className="text-sm font-semibold text-[#241000]">
            Loading badge designer...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf5] text-[#241000]">
      <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/events/${eventId}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-[#EA580C] transition hover:bg-orange-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-[#EA580C]" />

                <h1 className="truncate text-base font-black sm:text-lg">
                  Badge Designer
                </h1>
              </div>

              <p className="truncate text-xs text-stone-500">
                {event?.name ||
                  "Event badge template"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={saveBadge}
            disabled={saving}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            <span className="hidden sm:inline">
              {saving
                ? "Saving..."
                : "Save Badge"}
            </span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1800px] px-4 py-5 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            <Check className="h-4 w-4" />
            {success}
          </div>
        )}

        <div className="mb-5">
          <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[#EA580C]">
            BadgeFlow
          </p>

          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            Design your badge
          </h2>

          <p className="mt-1 max-w-2xl text-sm text-stone-500">
            Upload your actual badge artwork
            and position attendee information
            and QR codes directly on top of it.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[300px_minmax(500px,1fr)_320px]">
          <section className="space-y-5">
            <BadgeTemplateUploader
              image={
                config.backgroundImage
              }
              imageName={
                config.backgroundImageName
              }
              width={config.width}
              height={config.height}
              onUpload={
                handleTemplateUpload
              }
              onRemove={
                handleTemplateRemove
              }
            />

            <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-black">
                  Badge fields
                </h3>

                <p className="mt-1 text-xs text-stone-500">
                  Select a field to move or
                  resize it.
                </p>
              </div>

              <div className="space-y-2">
                {config.fields.map(
                  (field) => (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() =>
                        setSelectedField(
                          field.id,
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${
                        selectedField ===
                        field.id
                          ? "border-orange-300 bg-orange-50"
                          : "border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            field.enabled
                              ? "bg-[#EA580C]"
                              : "bg-stone-300"
                          }`}
                        />

                        <span className="truncate text-sm font-bold">
                          {field.label}
                        </span>
                      </div>

                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleField(
                            field.id,
                          );
                        }}
                        onKeyDown={(
                          event,
                        ) => {
                          if (
                            event.key ===
                              "Enter" ||
                            event.key ===
                              " "
                          ) {
                            event.preventDefault();
                            event.stopPropagation();
                            toggleField(
                              field.id,
                            );
                          }
                        }}
                        className={`ml-2 shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                          field.enabled
                            ? "bg-orange-100 text-[#EA580C]"
                            : "bg-stone-100 text-stone-400"
                        }`}
                      >
                        {field.enabled
                          ? "ON"
                          : "OFF"}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>

            <AttendeeSelector
              attendees={attendees}
              selectedId={
                selectedAttendeeId
              }
              onSelect={
                handleAttendeeSelect
              }
            />
          </section>

          <section className="min-w-0 rounded-3xl border border-orange-100 bg-white p-3 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
              <div>
                <h3 className="text-sm font-black">
                  Live badge preview
                </h3>

                <p className="mt-1 text-xs text-stone-500">
                  Drag fields and resize them
                  directly on the badge.
                </p>
              </div>

              <div className="rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#EA580C]">
                {config.width} ×{" "}
                {config.height}px
              </div>
            </div>

            <BadgePreview
              config={config}
              attendee={
                previewAttendee
              }
              selectedField={
                selectedField
              }
              onSelectField={
                setSelectedField
              }
              onUpdateField={
                updateField
              }
            />
          </section>

          <section>
            <BadgeFieldSettings
              field={
                selectedFieldConfig
              }
              qrSource={
                config.qrSource
              }
              onQrSourceChange={(
                qrSource,
              ) => {
                setConfig(
                  (current) => ({
                    ...current,
                    qrSource,
                  }),
                );
              }}
              onUpdateField={
                updateField
              }
            />
          </section>
        </div>
      </div>
    </main>
  );
}