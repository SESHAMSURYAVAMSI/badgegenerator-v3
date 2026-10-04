"use client";

import Link from "next/link";
import {
  BarChart3,
  BadgeCheck,
  CalendarDays,
  MapPin,
  PieChart,
  RefreshCw,
  ScanLine,
  Ticket,
  Users,
} from "lucide-react";
import {
  useParams,
} from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

interface EventData {
  id: string;
  name: string;
  publicId: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  location: string;
  status: string;
}

interface StatsData {
  totalAttendees: number;
  totalBadgesPrinted: number;
  totalScans: number;
  uniqueScannedAttendees: number;
}

interface ChartItem {
  id?: string;
  name: string;
  count: number;
}

interface DayData {
  id: string;
  name: string;
  count: number;
}

interface DayWithModules {
  id: string;
  name: string;
  count: number;
  modules: ChartItem[];
}

interface DashboardData {
  event: EventData;
  stats: StatsData;
  byDay: DayData[];
  byDayWithModules: DayWithModules[];
  byModule: ChartItem[];
  byCategory: ChartItem[];
}

interface DashboardResponse {
  success: boolean;
  message?: string;
  data?: DashboardData;
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "Not scheduled";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Not scheduled";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function getPercentage(
  value: number,
  total: number,
) {
  if (
    total <= 0 ||
    value <= 0
  ) {
    return 0;
  }

  return Math.round(
    (value / total) * 100,
  );
}

function buildConicGradient(
  items: ChartItem[],
) {
  if (!items.length) {
    return "#f5e9e2 0 100%";
  }

  const total =
    items.reduce(
      (sum, item) =>
        sum + item.count,
      0,
    );

  if (total <= 0) {
    return "#f5e9e2 0 100%";
  }

  const colors = [
    "#EA580C",
    "#241000",
    "#F97316",
    "#9A3412",
    "#FB923C",
    "#78350F",
    "#FDBA74",
    "#C2410C",
  ];

  let current = 0;

  const segments =
    items.map(
      (item, index) => {
        const start =
          current;

        const percentage =
          (item.count /
            total) *
          100;

        current +=
          percentage;

        const end =
          current;

        return `${colors[index % colors.length]} ${start}% ${end}%`;
      },
    );

  return segments.join(
    ", ",
  );
}

function DonutChart({
  items,
  centerValue,
  centerLabel,
}: {
  items: ChartItem[];
  centerValue: number;
  centerLabel: string;
}) {
  const gradient =
    buildConicGradient(
      items,
    );

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex h-52 w-52 items-center justify-center rounded-full shadow-inner sm:h-60 sm:w-60"
        style={{
          background: `conic-gradient(${gradient})`,
        }}
      >
        <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white shadow-sm sm:h-36 sm:w-36">
          <span className="text-3xl font-black text-[#241000] sm:text-4xl">
            {centerValue}
          </span>

          <span className="mt-1 max-w-20 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
            {centerLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function ChartLegend({
  items,
}: {
  items: ChartItem[];
}) {
  const colors = [
    "#EA580C",
    "#241000",
    "#F97316",
    "#9A3412",
    "#FB923C",
    "#78350F",
    "#FDBA74",
    "#C2410C",
  ];

  const total =
    items.reduce(
      (sum, item) =>
        sum + item.count,
      0,
    );

  return (
    <div className="space-y-3">
      {items.map(
        (item, index) => {
          const percentage =
            getPercentage(
              item.count,
              total,
            );

          return (
            <div
              key={`${item.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-orange-100 bg-[#fffaf7] px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      colors[
                        index %
                          colors.length
                      ],
                  }}
                />

                <span className="truncate text-xs font-bold text-[#241000]">
                  {item.name}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-black text-[#EA580C]">
                  {item.count}
                </span>

                <span className="text-[10px] font-semibold text-stone-400">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}

function EmptyChart({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex min-h-60 items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-[#fffaf7] px-6 text-center">
      <div>
        <PieChart className="mx-auto h-10 w-10 text-orange-200" />

        <p className="mt-3 text-sm font-bold text-stone-500">
          {message}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C]">
          <Icon className="h-5 w-5" />
        </div>

        <BadgeCheck className="h-4 w-4 text-orange-200" />
      </div>

      <p className="mt-5 text-3xl font-black tracking-tight text-[#241000]">
        {value.toLocaleString()}
      </p>

      <p className="mt-1 text-sm font-bold text-[#241000]">
        {title}
      </p>

      <p className="mt-1 text-xs text-stone-400">
        {subtitle}
      </p>
    </div>
  );
}

export default function PublicDashboardPage() {
  const params =
    useParams<{
      publicId: string;
    }>();

  const publicId =
    String(
      params?.publicId ?? "",
    );

  const [data, setData] =
    useState<DashboardData | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const loadDashboard =
    useCallback(
      async (
        showRefresh = false,
      ) => {
        if (!publicId) {
          return;
        }

        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          const response =
            await fetch(
              `/api/public/events/${encodeURIComponent(
                publicId,
              )}/dashboard`,
              {
                cache: "no-store",
              },
            );

          const result =
            (await response.json()) as DashboardResponse;

          if (
            !response.ok ||
            !result.success ||
            !result.data
          ) {
            throw new Error(
              result.message ||
                "Failed to load dashboard.",
            );
          }

          setData(
            result.data,
          );
        } catch (loadError) {
          console.error(
            "Public dashboard load error:",
            loadError,
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load dashboard.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [publicId],
    );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const badgePercentage =
    useMemo(() => {
      if (!data) {
        return 0;
      }

      return getPercentage(
        data.stats
          .totalBadgesPrinted,
        data.stats
          .totalAttendees,
      );
    }, [data]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf7] px-4 py-12 text-[#241000]">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl animate-pulse">
            <div className="h-8 w-48 rounded-lg bg-orange-100" />

            <div className="mt-3 h-4 w-72 rounded bg-orange-50" />

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({
                length: 4,
              }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-36 rounded-3xl bg-white shadow-sm"
                  />
                ),
              )}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="h-96 rounded-3xl bg-white shadow-sm" />
              <div className="h-96 rounded-3xl bg-white shadow-sm" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#fffaf7] px-4 py-16 text-[#241000]">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <Ticket className="mx-auto h-12 w-12 text-red-300" />

          <h1 className="mt-5 text-2xl font-black">
            Unable to load dashboard
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            {error ||
              "Something went wrong while loading the public event dashboard."}
          </p>

          <button
            type="button"
            onClick={() => {
              void loadDashboard(
                true,
              );
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700"
          >
            <RefreshCw className="h-4 w-4" />

            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf7] px-4 py-8 text-[#241000] sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-orange-200/20 blur-3xl" />

        <div className="absolute right-[-12rem] top-[22rem] h-[32rem] w-[32rem] rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl">
        {/* =====================================================
            EVENT HEADER
        ===================================================== */}

        <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#EA580C]">
                <BarChart3 className="h-3.5 w-3.5" />

                Public Dashboard
              </div>

              <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-4xl">
                {data.event.name}
              </h1>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-stone-500">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#EA580C]" />

                  {formatDate(
                    data.event.startDate,
                  )}

                  {data.event.endDate &&
                    ` → ${formatDate(
                      data.event.endDate,
                    )}`}
                </span>

                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#EA580C]" />

                  {data.event.location ||
                    "Location not specified"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/public/${encodeURIComponent(
                  publicId,
                )}`}
                className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-bold text-[#241000] transition hover:bg-orange-50"
              >
                <Users className="h-4 w-4 text-[#EA580C]" />

                Search
              </Link>

              <button
                type="button"
                onClick={() => {
                  void loadDashboard(
                    true,
                  );
                }}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-600/15 transition hover:bg-orange-700 disabled:opacity-60"
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
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
        </section>

        {/* =====================================================
            PRIMARY STATISTICS
        ===================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Attendees"
            value={
              data.stats
                .totalAttendees
            }
            subtitle="Registered for this event"
            icon={Users}
          />

          <StatCard
            title="Badges Printed"
            value={
              data.stats
                .totalBadgesPrinted
            }
            subtitle={`${badgePercentage}% badge completion`}
            icon={BadgeCheck}
          />

          <StatCard
            title="Total Scans"
            value={
              data.stats
                .totalScans
            }
            subtitle="All successful module scans"
            icon={ScanLine}
          />

          <StatCard
            title="People Scanned"
            value={
              data.stats
                .uniqueScannedAttendees
            }
            subtitle="Unique attendees scanned"
            icon={Ticket}
          />
        </section>

        {/* =====================================================
            MODULE + OVERALL CATEGORY PIE CHARTS
        ===================================================== */}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* MODULE */}

          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#EA580C]">
                  Module Distribution
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Scans by module
                </h2>

                <p className="mt-1 text-xs text-stone-400">
                  See how scans are distributed across modules.
                </p>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                <ScanLine className="h-5 w-5" />
              </div>
            </div>

            {data.byModule.length ===
            0 ? (
              <div className="mt-6">
                <EmptyChart message="No module scans yet." />
              </div>
            ) : (
              <div className="mt-7 grid items-center gap-7 md:grid-cols-[minmax(220px,0.9fr)_minmax(200px,1fr)]">
                <DonutChart
                  items={
                    data.byModule
                  }
                  centerValue={
                    data.stats
                      .totalScans
                  }
                  centerLabel="Total scans"
                />

                <ChartLegend
                  items={
                    data.byModule
                  }
                />
              </div>
            )}
          </div>

          {/* CATEGORY */}

          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#EA580C]">
                  Category Distribution
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Scans by category
                </h2>

                <p className="mt-1 text-xs text-stone-400">
                  Total successful scans grouped by attendee category.
                </p>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                <PieChart className="h-5 w-5" />
              </div>
            </div>

            {data.byCategory.length ===
            0 ? (
              <div className="mt-6">
                <EmptyChart message="No category scans yet." />
              </div>
            ) : (
              <div className="mt-7 grid items-center gap-7 md:grid-cols-[minmax(220px,0.9fr)_minmax(200px,1fr)]">
                <DonutChart
                  items={
                    data.byCategory
                  }
                  centerValue={
                    data.stats
                      .totalScans
                  }
                  centerLabel="Total scans"
                />

                <ChartLegend
                  items={
                    data.byCategory
                  }
                />
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            DAY-WISE MODULE PIE CHARTS
        ===================================================== */}

        <section className="mt-6 rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#EA580C]">
              Day-wise Module Scanning
            </p>

            <h2 className="text-xl font-black">
              Module scans for each day
            </h2>

            <p className="max-w-3xl text-sm leading-6 text-stone-500">
              Each day below shows the total successful scans and exactly how many times each module was scanned on that day.
            </p>
          </div>

          {data.byDayWithModules.length ===
          0 ? (
            <div className="mt-6">
              <EmptyChart message="No day-wise module scan data available yet." />
            </div>
          ) : (
            <div className="mt-7 grid gap-6 lg:grid-cols-2">
              {data.byDayWithModules.map(
                (day) => (
                  <div
                    key={day.id}
                    className="rounded-3xl border border-orange-100 bg-[#fffaf7] p-5 sm:p-6"
                  >
                    {/* Day header */}

                    <div className="flex items-center justify-between gap-4 border-b border-orange-100 pb-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EA580C]">
                          Event Day
                        </p>

                        <h3 className="mt-1 text-lg font-black">
                          {day.name}
                        </h3>
                      </div>

                      <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                        <p className="text-2xl font-black text-[#EA580C]">
                          {day.count}
                        </p>

                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-stone-400">
                          Total scans
                        </p>
                      </div>
                    </div>

                    {/* Day module pie */}

                    <div className="mt-6 grid items-center gap-6 md:grid-cols-[minmax(190px,0.9fr)_minmax(200px,1fr)]">
                      <DonutChart
  items={
    day.modules
  }
  centerValue={
    day.count
  }
  centerLabel="Day scans"
/>

                      <div>
                        <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#241000]">
                          Module breakdown
                        </p>

                        <ChartLegend
                          items={
                            day.modules
                          }
                        />
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        {/* =====================================================
            DAY TOTAL SUMMARY
        ===================================================== */}

        {data.byDay.length > 0 && (
          <section className="mt-6">
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#EA580C]">
                Scan Summary
              </p>

              <h2 className="mt-1 text-xl font-black">
                Total scans by day
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.byDay.map(
                (day) => (
                  <div
                    key={day.id}
                    className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                          <CalendarDays className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="text-sm font-black">
                            {day.name}
                          </p>

                          <p className="text-xs text-stone-400">
                            Successful scans
                          </p>
                        </div>
                      </div>

                      <p className="text-2xl font-black text-[#EA580C]">
                        {day.count}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}