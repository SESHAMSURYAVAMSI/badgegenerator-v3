"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  Coffee,
  GripVertical,
  Loader2,
  Package,
  Plus,
  Save,
  ScanLine,
  Settings2,
  Trash2,
  Utensils,
  X,
} from "lucide-react";

interface ScanItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  enabled: boolean;
  sortOrder: number;
}

interface ScanDay {
  id: string;
  name: string;
  date?: string;
  enabled: boolean;
  sortOrder: number;
  items: ScanItem[];
}

interface ScanConfigResponse {
  success: boolean;
  data?: {
    eventId: string;
    days: ScanDay[];
  };
  message?: string;
}

interface EventData {
  _id: string;
  name: string;
  location?: string;
  startDate?: string;
  endDate?: string;
}

interface EventResponse {
  success: boolean;
  event?: EventData;
  data?: EventData;
  message?: string;
}

interface Props {
  params: Promise<{
    eventId: string;
  }>;
}

const DEFAULT_MODULES: ScanItem[] = [
  {
    id: "breakfast",
    name: "Breakfast",
    description:
      "Record breakfast collection.",
    icon: "coffee",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "lunch",
    name: "Lunch",
    description:
      "Record lunch collection.",
    icon: "utensils",
    enabled: true,
    sortOrder: 2,
  },
  {
    id: "dinner",
    name: "Dinner",
    description:
      "Record dinner collection.",
    icon: "utensils",
    enabled: true,
    sortOrder: 3,
  },
  {
    id: "kit-bag",
    name: "Kit Bag",
    description:
      "Record conference kit bag distribution.",
    icon: "package",
    enabled: true,
    sortOrder: 4,
  },
  {
    id: "certificate",
    name: "Certificate",
    description:
      "Record certificate collection.",
    icon: "award",
    enabled: true,
    sortOrder: 5,
  },
];

function createId(
  prefix: string,
): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getModuleIcon(
  icon?: string,
) {
  const normalized =
    icon?.toLowerCase();

  if (
    normalized === "coffee"
  ) {
    return Coffee;
  }

  if (
    normalized === "utensils"
  ) {
    return Utensils;
  }

  if (
    normalized === "award"
  ) {
    return Award;
  }

  return Package;
}

function createDefaultDay(
  index: number,
): ScanDay {
  return {
    id: `day-${index + 1}`,
    name: `Day ${index + 1}`,
    date: "",
    enabled: true,
    sortOrder: index + 1,
    items:
      DEFAULT_MODULES.map(
        (item) => ({
          ...item,
        }),
      ),
  };
}

export default function ScanningConfigurationPage({
  params,
}: Props) {
  const [eventId, setEventId] =
    useState("");

  const [event, setEvent] =
    useState<
      EventResponse["data"] | null
    >(null);

  const [days, setDays] =
    useState<ScanDay[]>([]);

  const [expandedDayId, setExpandedDayId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [addingModuleDayId, setAddingModuleDayId] =
    useState<string | null>(null);

  const [customModuleName, setCustomModuleName] =
    useState("");

  const [customModuleDescription, setCustomModuleDescription] =
    useState("");

  const loadData =
    useCallback(
      async (
        currentEventId: string,
      ) => {
        setLoading(true);
        setError("");

        try {
          const [
            eventResponse,
            configResponse,
          ] = await Promise.all([
            fetch(
              `/api/events/${currentEventId}`,
              {
                cache: "no-store",
              },
            ),
            fetch(
              `/api/events/${currentEventId}/scanning/config`,
              {
                cache: "no-store",
              },
            ),
          ]);

          const eventJson =
            (await eventResponse.json()) as EventResponse;

          const configJson =
            (await configResponse.json()) as ScanConfigResponse;

          const eventData =
            eventJson.event ??
            eventJson.data;

          if (
            !eventResponse.ok ||
            !eventJson.success ||
            !eventData
          ) {
            throw new Error(
              eventJson.message ||
                "Unable to load event.",
            );
          }

          if (
            !configResponse.ok ||
            !configJson.success
          ) {
            throw new Error(
              configJson.message ||
                "Unable to load scanning configuration.",
            );
          }

          setEvent(
            eventData,
          );

          const loadedDays =
            configJson.data?.days ??
            [];

          setDays(
            loadedDays,
          );

          if (
            loadedDays.length > 0
          ) {
            setExpandedDayId(
              loadedDays[0].id,
            );
          }
        } catch (loadError) {
          console.error(
            "Scanning configuration load error:",
            loadError,
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load scanning configuration.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    let active = true;

    void params.then(
      ({
        eventId:
          resolvedEventId,
      }) => {
        if (!active) {
          return;
        }

        setEventId(
          resolvedEventId,
        );

        void loadData(
          resolvedEventId,
        );
      },
    );

    return () => {
      active = false;
    };
  }, [
    params,
    loadData,
  ]);

  const updateDay =
    (
      dayId: string,
      updates: Partial<ScanDay>,
    ) => {
      setDays(
        (currentDays) =>
          currentDays.map(
            (day) =>
              day.id === dayId
                ? {
                    ...day,
                    ...updates,
                  }
                : day,
          ),
      );
    };

  const updateItem =
    (
      dayId: string,
      itemId: string,
      updates: Partial<ScanItem>,
    ) => {
      setDays(
        (currentDays) =>
          currentDays.map(
            (day) => {
              if (
                day.id !== dayId
              ) {
                return day;
              }

              return {
                ...day,
                items:
                  day.items.map(
                    (item) =>
                      item.id ===
                      itemId
                        ? {
                            ...item,
                            ...updates,
                          }
                        : item,
                  ),
              };
            },
          ),
      );
    };

  const addDay =
    () => {
      const nextNumber =
        days.length + 1;

      const newDay =
        createDefaultDay(
          nextNumber - 1,
        );

      setDays(
        (currentDays) => [
          ...currentDays,
          newDay,
        ],
      );

      setExpandedDayId(
        newDay.id,
      );
    };

  const removeDay =
    (dayId: string) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to remove this day and all its scanning modules?",
        );

      if (!confirmed) {
        return;
      }

      setDays(
        (currentDays) =>
          currentDays
            .filter(
              (day) =>
                day.id !== dayId,
            )
            .map(
              (
                day,
                index,
              ) => ({
                ...day,
                sortOrder:
                  index + 1,
              }),
            ),
      );

      if (
        expandedDayId === dayId
      ) {
        setExpandedDayId(
          null,
        );
      }
    };

  const addDefaultModule =
    (
      dayId: string,
      moduleType:
        | "breakfast"
        | "lunch"
        | "dinner"
        | "kit-bag"
        | "certificate",
    ) => {
      const template =
        DEFAULT_MODULES.find(
          (item) =>
            item.id ===
            moduleType,
        );

      if (!template) {
        return;
      }

      setDays(
        (currentDays) =>
          currentDays.map(
            (day) => {
              if (
                day.id !== dayId
              ) {
                return day;
              }

              const alreadyExists =
                day.items.some(
                  (item) =>
                    item.id ===
                    moduleType,
                );

              if (
                alreadyExists
              ) {
                return day;
              }

              return {
                ...day,
                items: [
                  ...day.items,
                  {
                    ...template,
                    sortOrder:
                      day.items
                        .length +
                      1,
                  },
                ],
              };
            },
          ),
      );
    };

  const addCustomModule =
    (dayId: string) => {
      const name =
        customModuleName.trim();

      if (!name) {
        return;
      }

      setDays(
        (currentDays) =>
          currentDays.map(
            (day) => {
              if (
                day.id !== dayId
              ) {
                return day;
              }

              return {
                ...day,
                items: [
                  ...day.items,
                  {
                    id: createId(
                      "module",
                    ),
                    name,
                    description:
                      customModuleDescription.trim(),
                    icon: "package",
                    enabled: true,
                    sortOrder:
                      day.items
                        .length +
                      1,
                  },
                ],
              };
            },
          ),
      );

      setCustomModuleName(
        "",
      );

      setCustomModuleDescription(
        "",
      );

      setAddingModuleDayId(
        null,
      );
    };

  const removeModule =
    (
      dayId: string,
      itemId: string,
    ) => {
      setDays(
        (currentDays) =>
          currentDays.map(
            (day) => {
              if (
                day.id !== dayId
              ) {
                return day;
              }

              return {
                ...day,
                items:
                  day.items
                    .filter(
                      (item) =>
                        item.id !==
                        itemId,
                    )
                    .map(
                      (
                        item,
                        index,
                      ) => ({
                        ...item,
                        sortOrder:
                          index + 1,
                      }),
                    ),
              };
            },
          ),
      );
    };

  const moveItem =
    (
      dayId: string,
      itemId: string,
      direction:
        | "up"
        | "down",
    ) => {
      setDays(
        (currentDays) =>
          currentDays.map(
            (day) => {
              if (
                day.id !== dayId
              ) {
                return day;
              }

              const items = [
                ...day.items,
              ];

              const index =
                items.findIndex(
                  (item) =>
                    item.id ===
                    itemId,
                );

              if (
                index === -1
              ) {
                return day;
              }

              const newIndex =
                direction ===
                "up"
                  ? index - 1
                  : index + 1;

              if (
                newIndex < 0 ||
                newIndex >=
                  items.length
              ) {
                return day;
              }

              const [
                movedItem,
              ] =
                items.splice(
                  index,
                  1,
                );

              items.splice(
                newIndex,
                0,
                movedItem,
              );

              return {
                ...day,
                items:
                  items.map(
                    (
                      item,
                      itemIndex,
                    ) => ({
                      ...item,
                      sortOrder:
                        itemIndex +
                        1,
                    }),
                  ),
              };
            },
          ),
      );
    };

  const saveConfiguration =
    async () => {
      if (!eventId) {
        return;
      }

      setSaving(true);
      setError("");
      setSuccessMessage("");

      try {
        const response =
          await fetch(
            `/api/events/${eventId}/scanning/config`,
            {
              method: "PUT",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                days: days.map(
                  (
                    day,
                    dayIndex,
                  ) => ({
                    ...day,
                    sortOrder:
                      dayIndex + 1,
                    items:
                      day.items.map(
                        (
                          item,
                          itemIndex,
                        ) => ({
                          ...item,
                          sortOrder:
                            itemIndex +
                            1,
                        }),
                      ),
                  }),
                ),
              }),
            },
          );

        const result =
          (await response.json()) as ScanConfigResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Unable to save configuration.",
          );
        }

        setSuccessMessage(
          "Scanning configuration saved successfully.",
        );

        if (
          result.data?.days
        ) {
          setDays(
            result.data.days,
          );
        }

        window.setTimeout(
          () => {
            setSuccessMessage(
              "",
            );
          },
          4000,
        );
      } catch (saveError) {
        console.error(
          "Save scanning configuration error:",
          saveError,
        );

        setError(
          saveError instanceof Error
            ? saveError.message
            : "Unable to save configuration.",
        );
      } finally {
        setSaving(false);
      }
    };

  const enabledModuleCount =
    useMemo(
      () =>
        days.reduce(
          (
            total,
            day,
          ) =>
            total +
            day.items.filter(
              (item) =>
                item.enabled,
            ).length,
          0,
        ),
      [days],
    );

  const enabledDayCount =
    useMemo(
      () =>
        days.filter(
          (day) =>
            day.enabled,
        ).length,
      [days],
    );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf7] text-[#241000]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EA580C]/10">
              <Loader2 className="h-7 w-7 animate-spin text-[#EA580C]" />
            </div>

            <p className="text-sm font-bold text-[#241000]/60">
              Loading scanning
              configuration...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] text-[#241000]">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-80 bg-gradient-to-b from-[#EA580C]/10 via-[#EA580C]/5 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}

        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-[#EA580C]/10 bg-white/90 p-5 shadow-sm backdrop-blur-xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                window.history.back()
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#241000]/10 bg-white text-[#241000]/65 transition hover:border-[#EA580C]/30 hover:text-[#EA580C]"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EA580C] to-[#241000] text-white shadow-lg shadow-[#EA580C]/20">
              <ScanLine className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#EA580C]">
                  Event Scanning
                </p>

                <span className="rounded-full bg-[#EA580C]/10 px-2.5 py-1 text-[10px] font-black text-[#EA580C]">
                  Configuration
                </span>
              </div>

              <h1 className="mt-1 truncate text-xl font-black tracking-tight sm:text-2xl">
                {event?.name ||
                  "Scanning Setup"}
              </h1>

              {event?.location && (
                <p className="mt-1 text-xs font-medium text-[#241000]/45">
                  {event.location}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={
              saveConfiguration
            }
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#EA580C]/20 transition hover:bg-[#c94b08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Configuration
              </>
            )}
          </button>
        </header>

        {/* Messages */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <X className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-black">
                Something went wrong
              </p>

              <p className="mt-1 font-medium">
                {error}
              </p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            <Check className="h-5 w-5" />

            {successMessage}
          </div>
        )}

        {/* Overview */}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#241000]/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-[#241000]/45">
              Total Days
            </p>

            <p className="mt-2 text-3xl font-black">
              {days.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[#241000]/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-[#241000]/45">
              Active Days
            </p>

            <p className="mt-2 text-3xl font-black text-[#EA580C]">
              {enabledDayCount}
            </p>
          </div>

          <div className="rounded-2xl border border-[#241000]/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-[#241000]/45">
              Active Modules
            </p>

            <p className="mt-2 text-3xl font-black">
              {enabledModuleCount}
            </p>
          </div>
        </section>

        {/* Configuration heading */}

        <section className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-[#EA580C]" />

              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#EA580C]">
                Configuration
              </p>
            </div>

            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Build your scanning flow
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#241000]/55">
              Configure exactly what your
              event staff can scan each day.
              Changes here appear on the
              public scanning portal.
            </p>
          </div>

          <button
            type="button"
            onClick={addDay}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#EA580C]/20 bg-white px-4 py-3 text-sm font-black text-[#EA580C] shadow-sm transition hover:border-[#EA580C]/40 hover:bg-[#fff7f2]"
          >
            <Plus className="h-4 w-4" />
            Add Event Day
          </button>
        </section>

        {/* Days */}

        <div className="space-y-4">
          {days.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[#EA580C]/30 bg-white p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EA580C]/10 text-[#EA580C]">
                <ScanLine className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-xl font-black">
                No scanning days yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#241000]/50">
                Add your first event day to
                start configuring breakfast,
                lunch, dinner, kit bags,
                certificates and other
                scanning modules.
              </p>

              <button
                type="button"
                onClick={addDay}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-black text-white"
              >
                <Plus className="h-4 w-4" />
                Add Day 1
              </button>
            </div>
          )}

          {days.map(
            (
              day,
              dayIndex,
            ) => {
              const expanded =
                expandedDayId ===
                day.id;

              return (
                <article
                  key={day.id}
                  className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition ${
                    expanded
                      ? "border-[#EA580C]/25 shadow-lg shadow-[#EA580C]/5"
                      : "border-[#241000]/10"
                  }`}
                >
                  {/* Day header */}

                  <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EA580C]/10 text-sm font-black text-[#EA580C]">
                        D
                        {dayIndex +
                          1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={
                              day.name
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDay(
                                day.id,
                                {
                                  name:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                            className="min-w-0 max-w-full rounded-lg border border-transparent bg-transparent px-1 py-1 text-lg font-black outline-none transition focus:border-[#EA580C]/20 focus:bg-[#fffaf7] sm:text-xl"
                          />

                          {!day.enabled && (
                            <span className="rounded-full bg-[#241000]/5 px-2.5 py-1 text-[10px] font-black text-[#241000]/45">
                              Disabled
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-xs font-bold text-[#241000]/50">
                            Date

                            <input
                              type="date"
                              value={
                                day.date ??
                                ""
                              }
                              onChange={(
                                event,
                              ) =>
                                updateDay(
                                  day.id,
                                  {
                                    date:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                              className="rounded-lg border border-[#241000]/10 bg-[#fffaf7] px-2.5 py-1.5 text-xs font-bold text-[#241000] outline-none focus:border-[#EA580C]"
                            />
                          </label>

                          <span className="text-xs font-semibold text-[#241000]/35">
                            {day.items.length}{" "}
                            modules
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#241000]/10 bg-[#fffaf7] px-3 py-2 text-xs font-bold">
                        <input
                          type="checkbox"
                          checked={
                            day.enabled
                          }
                          onChange={(
                            event,
                          ) =>
                            updateDay(
                              day.id,
                              {
                                enabled:
                                  event
                                    .target
                                    .checked,
                              },
                            )
                          }
                          className="h-4 w-4 accent-[#EA580C]"
                        />

                        Active
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDayId(
                            expanded
                              ? null
                              : day.id,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-[#241000]/10 bg-white px-3 py-2 text-xs font-black transition hover:border-[#EA580C]/30 hover:text-[#EA580C]"
                      >
                        {expanded
                          ? "Collapse"
                          : "Configure"}

                        {expanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeDay(
                            day.id,
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100"
                        aria-label={`Delete ${day.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Day configuration */}

                  {expanded && (
                    <div className="border-t border-[#241000]/10 bg-[#fffaf7]/60 p-5 sm:p-6">
                      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-base font-black">
                            Scanning Modules
                          </h3>

                          <p className="mt-1 text-xs leading-5 text-[#241000]/50">
                            These options will be
                            available after staff
                            selects this day.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {DEFAULT_MODULES.map(
                            (
                              module,
                            ) => {
                              const exists =
                                day.items.some(
                                  (
                                    item,
                                  ) =>
                                    item.id ===
                                    module.id,
                                );

                              return (
                                <button
                                  key={
                                    module.id
                                  }
                                  type="button"
                                  disabled={
                                    exists
                                  }
                                  onClick={() =>
                                    addDefaultModule(
                                      day.id,
                                      module.id as
                                        | "breakfast"
                                        | "lunch"
                                        | "dinner"
                                        | "kit-bag"
                                        | "certificate",
                                    )
                                  }
                                  className="rounded-lg border border-[#EA580C]/15 bg-white px-3 py-2 text-xs font-bold text-[#EA580C] transition hover:bg-[#fff7f2] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {exists
                                    ? "Added"
                                    : `+ ${module.name}`}
                                </button>
                              );
                            },
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setAddingModuleDayId(
                                day.id,
                              );

                              setCustomModuleName(
                                "",
                              );

                              setCustomModuleDescription(
                                "",
                              );
                            }}
                            className="rounded-lg border border-[#241000]/10 bg-white px-3 py-2 text-xs font-bold text-[#241000]/65 transition hover:border-[#EA580C]/30 hover:text-[#EA580C]"
                          >
                            <Plus className="mr-1 inline h-3.5 w-3.5" />
                            Custom
                          </button>
                        </div>
                      </div>

                      {/* Custom module form */}

                      {addingModuleDayId ===
                        day.id && (
                        <div className="mb-5 rounded-2xl border border-[#EA580C]/15 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-black">
                                Add custom module
                              </h4>

                              <p className="mt-1 text-xs text-[#241000]/45">
                                Example:
                                Workshop,
                                Lunch Coupon,
                                Speaker Gift,
                                Certificate
                                Pickup.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setAddingModuleDayId(
                                  null,
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#241000]/5"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <input
                              value={
                                customModuleName
                              }
                              onChange={(
                                event,
                              ) =>
                                setCustomModuleName(
                                  event
                                    .target
                                    .value,
                                )
                              }
                              placeholder="Module name"
                              className="rounded-xl border border-[#241000]/10 bg-[#fffaf7] px-3 py-3 text-sm font-medium outline-none focus:border-[#EA580C] focus:ring-4 focus:ring-[#EA580C]/10"
                            />

                            <input
                              value={
                                customModuleDescription
                              }
                              onChange={(
                                event,
                              ) =>
                                setCustomModuleDescription(
                                  event
                                    .target
                                    .value,
                                )
                              }
                              placeholder="Short description"
                              className="rounded-xl border border-[#241000]/10 bg-[#fffaf7] px-3 py-3 text-sm font-medium outline-none focus:border-[#EA580C] focus:ring-4 focus:ring-[#EA580C]/10"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              addCustomModule(
                                day.id,
                              )
                            }
                            disabled={
                              !customModuleName.trim()
                            }
                            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus className="h-4 w-4" />
                            Add Module
                          </button>
                        </div>
                      )}

                      {/* Modules */}

                      {day.items.length ===
                      0 ? (
                        <div className="rounded-2xl border border-dashed border-[#241000]/15 bg-white p-8 text-center">
                          <Package className="mx-auto h-8 w-8 text-[#241000]/20" />

                          <p className="mt-3 text-sm font-bold">
                            No modules configured
                          </p>

                          <p className="mt-1 text-xs text-[#241000]/45">
                            Add breakfast, lunch,
                            dinner, kit bag,
                            certificate or a custom
                            module above.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {day.items
                            .sort(
                              (
                                first,
                                second,
                              ) =>
                                first.sortOrder -
                                second.sortOrder,
                            )
                            .map(
                              (
                                item,
                                itemIndex,
                              ) => {
                                const Icon =
                                  getModuleIcon(
                                    item.icon,
                                  );

                                return (
                                  <div
                                    key={
                                      item.id
                                    }
                                    className={`rounded-2xl border bg-white p-4 transition ${
                                      item.enabled
                                        ? "border-[#241000]/10"
                                        : "border-[#241000]/5 opacity-60"
                                    }`}
                                  >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                      <div className="flex items-center gap-3">
                                        <div className="hidden h-9 w-7 items-center justify-center text-[#241000]/20 sm:flex">
                                          <GripVertical className="h-4 w-4" />
                                        </div>

                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EA580C]/10 text-[#EA580C]">
                                          <Icon className="h-5 w-5" />
                                        </div>

                                        <div className="min-w-0">
                                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#241000]/30">
                                            Module{" "}
                                            {itemIndex +
                                              1}
                                          </p>

                                          <input
                                            value={
                                              item.name
                                            }
                                            onChange={(
                                              event,
                                            ) =>
                                              updateItem(
                                                day.id,
                                                item.id,
                                                {
                                                  name:
                                                    event
                                                      .target
                                                      .value,
                                                },
                                              )
                                            }
                                            className="mt-0.5 w-full min-w-0 border-none bg-transparent p-0 text-sm font-black outline-none"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex-1">
                                        <input
                                          value={
                                            item.description ??
                                            ""
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            updateItem(
                                              day.id,
                                              item.id,
                                              {
                                                description:
                                                  event
                                                    .target
                                                    .value,
                                              },
                                            )
                                          }
                                          placeholder="Description"
                                          className="w-full rounded-xl border border-[#241000]/10 bg-[#fffaf7] px-3 py-2.5 text-xs font-medium outline-none focus:border-[#EA580C]"
                                        />
                                      </div>

                                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                                        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#241000]/10 px-3 py-2 text-xs font-bold">
                                          <input
                                            type="checkbox"
                                            checked={
                                              item.enabled
                                            }
                                            onChange={(
                                              event,
                                            ) =>
                                              updateItem(
                                                day.id,
                                                item.id,
                                                {
                                                  enabled:
                                                    event
                                                      .target
                                                      .checked,
                                                },
                                              )
                                            }
                                            className="h-4 w-4 accent-[#EA580C]"
                                          />

                                          Active
                                        </label>

                                        <button
                                          type="button"
                                          disabled={
                                            itemIndex ===
                                            0
                                          }
                                          onClick={() =>
                                            moveItem(
                                              day.id,
                                              item.id,
                                              "up",
                                            )
                                          }
                                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#241000]/10 text-[#241000]/45 transition hover:border-[#EA580C]/30 hover:text-[#EA580C] disabled:cursor-not-allowed disabled:opacity-20"
                                          aria-label="Move module up"
                                        >
                                          <ChevronUp className="h-4 w-4" />
                                        </button>

                                        <button
                                          type="button"
                                          disabled={
                                            itemIndex ===
                                            day.items
                                              .length -
                                              1
                                          }
                                          onClick={() =>
                                            moveItem(
                                              day.id,
                                              item.id,
                                              "down",
                                            )
                                          }
                                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#241000]/10 text-[#241000]/45 transition hover:border-[#EA580C]/30 hover:text-[#EA580C] disabled:cursor-not-allowed disabled:opacity-20"
                                          aria-label="Move module down"
                                        >
                                          <ChevronDown className="h-4 w-4" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeModule(
                                              day.id,
                                              item.id,
                                            )
                                          }
                                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100"
                                          aria-label={`Delete ${item.name}`}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              },
                            )}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            },
          )}
        </div>

        {/* Bottom save */}

        {days.length > 0 && (
          <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-[#EA580C]/10 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA580C]/10 text-[#EA580C]">
                <ScanLine className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-black">
                  Ready to publish
                  your scanning flow?
                </p>

                <p className="mt-0.5 text-xs text-[#241000]/45">
                  Save your changes before staff
                  starts scanning.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={
                saveConfiguration
              }
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#EA580C]/20 transition hover:bg-[#c94b08] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving
                ? "Saving..."
                : "Save Configuration"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}