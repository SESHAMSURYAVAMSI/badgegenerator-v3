"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  QrCode,
  RefreshCw,
  ScanLine,
  Settings2,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";

interface AnalyticsData {
  success: boolean;

  event: {
    id: string;
    name: string;
    publicId: string | null;
  };

  overview: {
    totalAttendees: number;
    totalSuccessfulScans: number;
    todaySuccessfulScans: number;
    uniqueScannedAttendees: number;
    unscannedCount: number;
    attendancePercentage: number;

    totalAttempts: number;
    todayAttempts: number;

    duplicateAttempts: number;
    invalidQrAttempts: number;
    invalidDayAttempts: number;
    invalidItemAttempts: number;
  };

  dayStats: Array<{
    dayId: string;
    dayName: string;
    total: number;
  }>;

  itemStats: Array<{
    itemId: string;
    itemName: string;
    total: number;
  }>;

  recentScans: Array<{
    id: string;
    attendeeId: string;
    registrationNumber: string;
    attendeeName: string;
    dayId: string;
    dayName: string;
    itemId: string;
    itemName: string;
    scannedAt: string;
  }>;

  recentDuplicates: Array<{
    id: string;
    attendeeId: string | null;
    registrationNumber: string;
    attendeeName: string;
    dayName: string;
    itemName: string;
    scannedAt: string;
  }>;

  recentInvalidAttempts: Array<{
    id: string;
    status: string;
    qrValue: string;
    registrationNumber: string;
    dayName: string;
    itemName: string;
    scannedAt: string;
  }>;

  hourlyScans: Array<{
    hour: number;
    total: number;
  }>;

  configuredDays: number;
}

interface PageProps {
  params: Promise<{
    eventId: string;
  }>;
}

function formatTime(
  value: string,
): string {
  return new Date(value).toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function formatDateTime(
  value: string,
): string {
  return new Date(value).toLocaleString(
    [],
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function getAttemptLabel(
  status: string,
): string {
  switch (status) {
    case "invalid_qr":
      return "Invalid QR";

    case "invalid_day":
      return "Invalid day";

    case "invalid_item":
      return "Invalid module";

    case "event_not_found":
      return "Event not found";

    default:
      return status;
  }
}

export default function ScanningDashboardPage({
  params,
}: PageProps) {
  const [eventId, setEventId] =
    useState("");

  const [data, setData] =
    useState<AnalyticsData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  /*
   * --------------------------------------------------
   * RESOLVE EVENT ID
   * --------------------------------------------------
   */

  useEffect(() => {
    let active = true;

    params.then((resolvedParams) => {
      if (active) {
        setEventId(
          resolvedParams.eventId,
        );
      }
    });

    return () => {
      active = false;
    };
  }, [params]);

  /*
   * --------------------------------------------------
   * LOAD ANALYTICS
   * --------------------------------------------------
   */

  const loadAnalytics =
    useCallback(
      async (
        showSpinner = true,
      ) => {
        if (!eventId) return;

        if (showSpinner) {
          setRefreshing(true);
        }

        try {
          const response =
            await fetch(
              `/api/events/${eventId}/scanning/analytics`,
              {
                cache: "no-store",
              },
            );

          const result =
            (await response.json()) as AnalyticsData & {
              message?: string;
            };

          if (!response.ok) {
            throw new Error(
              result.message ||
                "Unable to load analytics.",
            );
          }

          setData(result);
          setError("");
          setLastUpdated(new Date());
        } catch (requestError) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load analytics.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [eventId],
    );

  /*
   * --------------------------------------------------
   * INITIAL LOAD
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!eventId) return;

    void loadAnalytics(true);
  }, [eventId, loadAnalytics]);

  /*
   * --------------------------------------------------
   * LIVE REFRESH
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!eventId) return;

    const interval =
      window.setInterval(() => {
        void loadAnalytics(false);
      }, 10_000);

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [eventId, loadAnalytics]);

  const maxItemCount =
    useMemo(() => {
      if (!data?.itemStats.length) {
        return 1;
      }

      return Math.max(
        ...data.itemStats.map(
          (item) => item.total,
        ),
        1,
      );
    }, [data?.itemStats]);

  const maxDayCount =
    useMemo(() => {
      if (!data?.dayStats.length) {
        return 1;
      }

      return Math.max(
        ...data.dayStats.map(
          (day) => day.total,
        ),
        1,
      );
    }, [data?.dayStats]);

  /*
   * --------------------------------------------------
   * LOADING
   * --------------------------------------------------
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf7] text-[#241000]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white px-6 py-4 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-[#EA580C]" />

            <span className="text-sm font-medium">
              Loading scanning analytics...
            </span>
          </div>
        </div>
      </main>
    );
  }

  /*
   * --------------------------------------------------
   * ERROR
   * --------------------------------------------------
   */

  if (!data) {
    return (
      <main className="min-h-screen bg-[#fffaf7] px-6 py-10 text-[#241000]">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/events"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#EA580C]"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to Events
          </Link>

          <div className="rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>

            <h1 className="text-xl font-bold">
              Unable to load dashboard
            </h1>

            <p className="mt-2 text-sm text-[#795548]">
              {error ||
                "Something went wrong while loading scanning analytics."}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadAnalytics(true)
              }
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <RefreshCw className="h-4 w-4" />

              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] text-[#241000]">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl" />

        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-orange-100/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}

        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href={`/events/${eventId}`}
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#EA580C]"
            >
              <ArrowLeft className="h-4 w-4" />

              Event
            </Link>

            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EA580C] to-[#241000] shadow-lg shadow-orange-200">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                    Scanning Dashboard
                  </h1>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />

                    Live
                  </span>
                </div>

                <p className="mt-1 text-sm text-[#795548]">
                  {data.event.name}
                </p>

                {lastUpdated && (
                  <p className="mt-1 text-xs text-[#a1887f]">
                    Updated{" "}
                    {lastUpdated.toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      },
                    )}
                    {" • "}
                    Auto refresh every 10 seconds
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void loadAnalytics(true)
              }
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-bold text-[#241000] shadow-sm transition hover:border-orange-300 hover:bg-orange-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </button>

            <Link
              href={`/events/${eventId}/scanning`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700"
            >
              <Settings2 className="h-4 w-4" />

              Configure
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />

            {error}
          </div>
        )}

        {/* Primary stats */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Successful Scans"
            value={
              data.overview
                .totalSuccessfulScans
            }
            subtitle="All successful scans"
            icon={ScanLine}
          />

          <StatCard
            title="Unique Attendees"
            value={
              data.overview
                .uniqueScannedAttendees
            }
            subtitle={`${data.overview.attendancePercentage}% attendee coverage`}
            icon={Users}
          />

          <StatCard
            title="Today's Scans"
            value={
              data.overview
                .todaySuccessfulScans
            }
            subtitle="Successful scans today"
            icon={Clock3}
          />

          <StatCard
            title="Duplicate Attempts"
            value={
              data.overview
                .duplicateAttempts
            }
            subtitle="Rejected duplicate scans"
            icon={Copy}
            warning
          />
        </section>

        {/* Attempt monitoring */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SmallMetric
            label="Total Attempts"
            value={
              data.overview.totalAttempts
            }
            icon={QrCode}
          />

          <SmallMetric
            label="Invalid QR"
            value={
              data.overview
                .invalidQrAttempts
            }
            icon={ShieldAlert}
            danger
          />

          <SmallMetric
            label="Invalid Day"
            value={
              data.overview
                .invalidDayAttempts
            }
            icon={AlertTriangle}
            danger
          />

          <SmallMetric
            label="Invalid Module"
            value={
              data.overview
                .invalidItemAttempts
            }
            icon={XCircle}
            danger
          />
        </section>

        {/* Coverage */}

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm lg:col-span-1">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#EA580C]">
                Attendee Coverage
              </p>

              <h2 className="mt-1 text-lg font-black">
                Overall participation
              </h2>
            </div>

            <div className="flex items-center justify-center">
              <div
                className="relative flex h-48 w-48 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#EA580C ${data.overview.attendancePercentage}%, #f4e8e1 ${data.overview.attendancePercentage}% 100%)`,
                }}
              >
                <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                  <span className="text-4xl font-black">
                    {
                      data.overview
                        .attendancePercentage
                    }
                    %
                  </span>

                  <span className="mt-1 text-xs font-semibold text-[#795548]">
                    scanned
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-orange-50 p-4">
                <p className="text-xs font-semibold text-[#795548]">
                  Scanned
                </p>

                <p className="mt-1 text-xl font-black text-[#EA580C]">
                  {
                    data.overview
                      .uniqueScannedAttendees
                  }
                </p>
              </div>

              <div className="rounded-2xl bg-[#fffaf7] p-4">
                <p className="text-xs font-semibold text-[#795548]">
                  Remaining
                </p>

                <p className="mt-1 text-xl font-black">
                  {
                    data.overview
                      .unscannedCount
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Item performance */}

          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#EA580C]">
                  Module Performance
                </p>

                <h2 className="mt-1 text-lg font-black">
                  Successful scans by module
                </h2>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                <ScanLine className="h-5 w-5 text-[#EA580C]" />
              </div>
            </div>

            {data.itemStats.length === 0 ? (
              <EmptyState text="No successful scans yet." />
            ) : (
              <div className="space-y-5">
                {data.itemStats.map(
                  (item) => (
                    <div
                      key={item.itemId}
                    >
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="truncate text-sm font-bold">
                          {item.itemName}
                        </span>

                        <span className="text-sm font-black text-[#EA580C]">
                          {item.total}
                        </span>
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-orange-50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#EA580C] to-[#241000] transition-all duration-500"
                          style={{
                            width: `${Math.max(
                              (item.total /
                                maxItemCount) *
                                100,
                              3,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </section>

        {/* Day statistics */}

        <section className="mt-6 rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#EA580C]">
              Day-wise Performance
            </p>

            <h2 className="mt-1 text-lg font-black">
              Successful scans by event day
            </h2>
          </div>

          {data.dayStats.length === 0 ? (
            <EmptyState text="No day-wise scan data available yet." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.dayStats.map(
                (day) => (
                  <div
                    key={day.dayId}
                    className="rounded-2xl border border-orange-100 bg-[#fffaf7] p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">
                        {day.dayName}
                      </span>

                      <span className="text-lg font-black text-[#EA580C]">
                        {day.total}
                      </span>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-orange-100">
                      <div
                        className="h-full rounded-full bg-[#EA580C] transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            (day.total /
                              maxDayCount) *
                              100,
                            4,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        {/* Recent successful scans */}

        <section className="mt-6 rounded-3xl border border-orange-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-orange-100 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#EA580C]">
                Live Activity
              </p>

              <h2 className="mt-1 text-lg font-black">
                Recent successful scans
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-green-600">
              <CheckCircle2 className="h-4 w-4" />

              Live data
            </div>
          </div>

          {data.recentScans.length === 0 ? (
            <EmptyState text="No successful scans yet." />
          ) : (
            <div className="divide-y divide-orange-50">
              {data.recentScans.map(
                (scan) => (
                  <div
                    key={scan.id}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {scan.attendeeName}
                        </p>

                        <p className="mt-0.5 text-xs text-[#795548]">
                          {scan.registrationNumber}
                          {" • "}
                          {scan.itemName}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs font-bold text-[#241000]">
                        {scan.dayName}
                      </p>

                      <p className="mt-0.5 text-xs text-[#a1887f]">
                        {formatDateTime(
                          scan.scannedAt,
                        )}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        {/* Duplicate attempts */}

        <section className="mt-6 rounded-3xl border border-orange-100 bg-white shadow-sm">
          <div className="border-b border-orange-100 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Copy className="h-5 w-5 text-amber-600" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
                  Duplicate Monitoring
                </p>

                <h2 className="mt-1 text-lg font-black">
                  Recent duplicate attempts
                </h2>
              </div>
            </div>
          </div>

          {data.recentDuplicates
            .length === 0 ? (
            <EmptyState text="No duplicate attempts recorded." />
          ) : (
            <div className="divide-y divide-orange-50">
              {data.recentDuplicates.map(
                (attempt) => (
                  <div
                    key={attempt.id}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                        <Copy className="h-5 w-5 text-amber-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {attempt.attendeeName ||
                            "Unknown attendee"}
                        </p>

                        <p className="mt-0.5 text-xs text-[#795548]">
                          {attempt.registrationNumber ||
                            "No registration number"}
                          {" • "}
                          {attempt.itemName ||
                            "Unknown module"}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs font-bold">
                        {attempt.dayName ||
                          "Unknown day"}
                      </p>

                      <p className="mt-0.5 text-xs text-[#a1887f]">
                        {formatDateTime(
                          attempt.scannedAt,
                        )}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        {/* Invalid attempts */}

        <section className="mt-6 rounded-3xl border border-orange-100 bg-white shadow-sm">
          <div className="border-b border-orange-100 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                <ShieldAlert className="h-5 w-5 text-red-500" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">
                  Security Activity
                </p>

                <h2 className="mt-1 text-lg font-black">
                  Recent invalid attempts
                </h2>
              </div>
            </div>
          </div>

          {data.recentInvalidAttempts
            .length === 0 ? (
            <EmptyState text="No invalid attempts recorded." />
          ) : (
            <div className="divide-y divide-orange-50">
              {data.recentInvalidAttempts.map(
                (attempt) => (
                  <div
                    key={attempt.id}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                        <XCircle className="h-5 w-5 text-red-500" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-bold">
                          {getAttemptLabel(
                            attempt.status,
                          )}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-[#795548]">
                          {attempt.registrationNumber ||
                            attempt.qrValue ||
                            "Unknown QR value"}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs font-bold">
                        {attempt.itemName ||
                          "Unknown module"}
                      </p>

                      <p className="mt-0.5 text-xs text-[#a1887f]">
                        {formatTime(
                          attempt.scannedAt,
                        )}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        {/* Bottom quick actions */}

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href={`/events/${eventId}/scanning`}
            className="group rounded-3xl border border-orange-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
                <Settings2 className="h-6 w-6 text-[#EA580C]" />
              </div>

              <div>
                <h3 className="font-black">
                  Configure Scanning
                </h3>

                <p className="mt-1 text-sm text-[#795548]">
                  Manage days and scanning modules.
                </p>
              </div>
            </div>
          </Link>

          {data.event.publicId ? (
            <Link
              href={`/public/${data.event.publicId}/scan`}
              target="_blank"
              className="group rounded-3xl border border-orange-100 bg-gradient-to-br from-[#EA580C] to-[#241000] p-6 text-white shadow-lg shadow-orange-100 transition hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <QrCode className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="font-black">
                    Open Public Scanner
                  </h3>

                  <p className="mt-1 text-sm text-white/75">
                    Launch the attendee scanning portal.
                  </p>
                </div>
              </div>
            </Link>
          ) : null}
        </section>
      </div>
    </main>
  );
}

/*
 * --------------------------------------------------
 * STAT CARD
 * --------------------------------------------------
 */

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  warning?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  warning = false,
}: StatCardProps) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#795548]">
            {title}
          </p>

          <p
            className={`mt-3 text-3xl font-black ${
              warning
                ? "text-amber-600"
                : "text-[#241000]"
            }`}
          >
            {value}
          </p>

          <p className="mt-1 text-xs text-[#a1887f]">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            warning
              ? "bg-amber-50"
              : "bg-orange-50"
          }`}
        >
          <Icon
            className={`h-5 w-5 ${
              warning
                ? "text-amber-600"
                : "text-[#EA580C]"
            }`}
          />
        </div>
      </div>
    </div>
  );
}

/*
 * --------------------------------------------------
 * SMALL METRIC
 * --------------------------------------------------
 */

interface SmallMetricProps {
  label: string;
  value: number;
  icon: React.ComponentType<{
    className?: string;
  }>;
  danger?: boolean;
}

function SmallMetric({
  label,
  value,
  icon: Icon,
  danger = false,
}: SmallMetricProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-white px-5 py-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold text-[#795548]">
          {label}
        </p>

        <p
          className={`mt-1 text-xl font-black ${
            danger
              ? "text-red-500"
              : "text-[#241000]"
          }`}
        >
          {value}
        </p>
      </div>

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          danger
            ? "bg-red-50"
            : "bg-orange-50"
        }`}
      >
        <Icon
          className={`h-5 w-5 ${
            danger
              ? "text-red-500"
              : "text-[#EA580C]"
          }`}
        />
      </div>
    </div>
  );
}

/*
 * --------------------------------------------------
 * EMPTY STATE
 * --------------------------------------------------
 */

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center justify-center px-6 py-12 text-center">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
          <BarChart3 className="h-5 w-5 text-[#EA580C]" />
        </div>

        <p className="mt-3 text-sm font-semibold text-[#795548]">
          {text}
        </p>
      </div>
    </div>
  );
}