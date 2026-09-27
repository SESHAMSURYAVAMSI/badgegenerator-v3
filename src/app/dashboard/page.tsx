
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  ClipboardList,
    Clock3,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Users,
} from "lucide-react";

import { auth, signOut } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";

export const dynamic = "force-dynamic";

type DashboardEvent = {
  _id: string;
  name: string;
  code: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  status: "draft" | "active" | "completed";
  attendeeCount?: number;
  badgeCount?: number;
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/admin-login");
  }

  await connectDB();

  const rawEvents = await Event.find({
    createdBy: session.user.id,
  })
    .sort({
      createdAt: -1,
    })
    .lean();

  const events: DashboardEvent[] = rawEvents.map(
    (event) => ({
      _id: event._id.toString(),
      name: event.name,
      code: event.code,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status,
      attendeeCount: event.attendeeCount,
      badgeCount: event.badgeCount,
    }),
  );

  const totalEvents = events.length;

  const totalAttendees = events.reduce(
    (total, event) =>
      total + (event.attendeeCount || 0),
    0,
  );

  const totalBadges = events.reduce(
    (total, event) =>
      total + (event.badgeCount || 0),
    0,
  );

  const activeEvents = events.filter(
    (event) => event.status === "active",
  ).length;

  const draftEvents = events.filter(
    (event) => event.status === "draft",
  ).length;

  const completedEvents = events.filter(
    (event) => event.status === "completed",
  ).length;

  const recentEvents = events.slice(0, 5);

  const adminName =
    session.user.name || "Administrator";

  const adminEmail =
    session.user.email || "Admin";

  return (
    <main className="min-h-screen bg-[#faf8f5] text-[#241000]">
      {/* =====================================================
          BACKGROUND DECORATION
      ====================================================== */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-orange-200/25 blur-[130px]" />

        <div className="absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-amber-100/35 blur-[130px]" />

        <div className="absolute left-[45%] top-[35%] h-[300px] w-[300px] rounded-full bg-orange-100/20 blur-[110px]" />
      </div>

      {/* =====================================================
          HEADER
      ====================================================== */}
      <header className="sticky top-0 z-50 border-b border-[#241000]/10 bg-[#fffdfa]/90 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[76px] items-center gap-4">
            {/* Logo */}
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#EA580C] to-[#C2410C] shadow-lg shadow-orange-500/20">
                <TicketCheck className="h-5 w-5 text-white" />
              </div>

              <div className="hidden sm:block">
                <p className="text-lg font-bold tracking-tight">
                  Badge<span className="text-[#EA580C]">Flow</span>
                </p>

                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/35">
                  Event Management
                </p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="ml-4 hidden items-center gap-1 xl:flex">
              <HeaderLink
                href="/dashboard"
                icon={
                  <LayoutDashboard className="h-4 w-4" />
                }
                label="Dashboard"
                active
              />

              <HeaderLink
                href="/events"
                icon={
                  <CalendarDays className="h-4 w-4" />
                }
                label="Events"
              />

              <HeaderLink
                href="/events"
                icon={<Users className="h-4 w-4" />}
                label="Attendees"
              />

              <HeaderLink
                href="/events"
                icon={
                  <BarChart3 className="h-4 w-4" />
                }
                label="Analytics"
                badge="Soon"
              />

              <HeaderLink
                href="/events"
                icon={
                  <ClipboardList className="h-4 w-4" />
                }
                label="Badge Templates"
                badge="Soon"
              />

              <HeaderLink
                href="/events"
                icon={
                  <Settings className="h-4 w-4" />
                }
                label="Settings"
                badge="Soon"
              />
            </nav>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/events/create"
                className="group flex h-10 items-center gap-2 rounded-xl bg-[#EA580C] px-4 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-[#C2410C]"
              >
                <Plus className="h-4 w-4" />

                <span className="hidden sm:inline">
                  Create Event
                </span>

                <ArrowRight className="hidden h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 sm:block" />
              </Link>

              {/* User */}
              <div className="hidden items-center gap-2 rounded-xl border border-[#241000]/10 bg-white px-2 py-1.5 md:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 text-xs font-bold text-white">
                  {adminName.charAt(0).toUpperCase()}
                </div>

                <div className="max-w-[130px]">
                  <p className="truncate text-xs font-semibold">
                    {adminName}
                  </p>

                  <p className="truncate text-[10px] text-black/40">
                    {adminEmail}
                  </p>
                </div>
              </div>

              {/* Sign out */}
              <form
                action={async () => {
                  "use server";

                  await signOut({
                    redirectTo: "/admin-login",
                  });
                }}
              >
                <button
                  type="submit"
                  title="Sign out"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#241000]/10 bg-white text-black/40 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Mobile navigation */}
          <div className="flex gap-1 overflow-x-auto border-t border-[#241000]/5 py-2 xl:hidden">
            <MobileNavLink
              href="/dashboard"
              label="Dashboard"
              active
            />

            <MobileNavLink
              href="/events"
              label="Events"
            />

            <MobileNavLink
              href="/events"
              label="Attendees"
            />

            <MobileNavLink
              href="/events"
              label="Analytics"
            />

            <MobileNavLink
              href="/events"
              label="Templates"
            />

            <MobileNavLink
              href="/events"
              label="Settings"
            />
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ====================================================== */}
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        {/* Breadcrumb */}
        <div className="mb-5 flex items-center gap-2 text-xs text-black/35">
          <span>Workspace</span>

          <ChevronRight className="h-3.5 w-3.5" />

          <span className="font-medium text-black/55">
            Dashboard
          </span>
        </div>

        {/* =================================================
            HERO
        ================================================== */}
        <section className="relative overflow-hidden rounded-[30px] border border-orange-100 bg-gradient-to-br from-[#fff7ed] via-[#fffaf5] to-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-orange-200/30 blur-[90px]" />

          <div className="pointer-events-none absolute bottom-[-120px] right-[25%] h-64 w-64 rounded-full bg-amber-100/30 blur-[90px]" />

          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-[#EA580C]">
                <Sparkles className="h-3.5 w-3.5" />
                Live Event Workspace
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-[#241000] sm:text-4xl lg:text-5xl">
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-[#EA580C] to-[#9A3412] bg-clip-text text-transparent">
                  {adminName.split(" ")[0]}.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-black/45 sm:text-base">
                Your event operations at a glance. Create events,
                manage attendees and generate professional badges
                from one workspace.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/events"
                  className="group inline-flex items-center gap-2 rounded-xl bg-[#241000] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#3b1705]"
                >
                  Manage Events

                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/events/create"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#241000]/10 bg-white px-5 py-3 text-sm font-semibold text-[#241000] shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:text-[#EA580C]"
                >
                  <Plus className="h-4 w-4" />
                  Create Event
                </Link>
              </div>
            </div>

            {/* Live summary */}
            <div className="hidden lg:block">
              <div className="relative w-[290px] rounded-[26px] border border-orange-100 bg-white/85 p-5 shadow-xl shadow-orange-950/5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-black/30">
                      Live Overview
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      Workspace activity
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                    <Activity className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <MiniMetric
                    label="Events"
                    value={totalEvents.toString()}
                  />

                  <MiniMetric
                    label="Attendees"
                    value={totalAttendees.toString()}
                  />

                  <MiniMetric
                    label="Badges"
                    value={totalBadges.toString()}
                  />

                  <MiniMetric
                    label="Active"
                    value={activeEvents.toString()}
                  />
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />

                  <span className="text-[10px] font-semibold text-emerald-700">
                    Workspace is operational
                  </span>
                </div>

                <div className="absolute -right-5 -top-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EA580C] to-[#C2410C] text-white shadow-xl shadow-orange-500/20">
                  <TicketCheck className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            REAL STATISTICS
        ================================================== */}
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={
              <CalendarDays className="h-5 w-5" />
            }
            label="Total Events"
            value={totalEvents.toLocaleString()}
            description={
              totalEvents === 0
                ? "Create your first event"
                : `${totalEvents} event${
                    totalEvents === 1 ? "" : "s"
                  } in workspace`
            }
          />

          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Total Attendees"
            value={totalAttendees.toLocaleString()}
            description="Across all your events"
          />

          <StatCard
            icon={
              <TicketCheck className="h-5 w-5" />
            }
            label="Badges Generated"
            value={totalBadges.toLocaleString()}
            description="Across all your events"
          />

          <StatCard
            icon={
              <Activity className="h-5 w-5" />
            }
            label="Active Events"
            value={activeEvents.toLocaleString()}
            description={
              activeEvents > 0
                ? "Currently active"
                : "No active events"
            }
          />
        </section>

        {/* =================================================
            STATUS SUMMARY
        ================================================== */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatusSummary
            label="Draft Events"
            value={draftEvents}
            description="Still being prepared"
            icon={
              <ClipboardList className="h-5 w-5" />
            }
          />

          <StatusSummary
            label="Active Events"
            value={activeEvents}
            description="Currently running"
            icon={
              <Activity className="h-5 w-5" />
            }
          />

          <StatusSummary
            label="Completed Events"
            value={completedEvents}
            description="Finished conferences"
            icon={
              <ShieldCheck className="h-5 w-5" />
            }
          />
        </section>

        {/* =================================================
            RECENT EVENTS + QUICK ACTIONS
        ================================================== */}
        <section className="mt-7 grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          {/* Recent events */}
          <div className="rounded-[26px] border border-[#241000]/10 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#EA580C]">
                  Event Workspace
                </p>

                <h2 className="mt-1 text-xl font-bold tracking-tight">
                  Recent Events
                </h2>

                <p className="mt-1 text-sm text-black/40">
                  Your latest conferences and events.
                </p>
              </div>

              <Link
                href="/events"
                className="hidden items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-[#EA580C] transition hover:bg-orange-50 sm:flex"
              >
                View all

                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentEvents.length === 0 ? (
              <EmptyEvents />
            ) : (
              <div className="mt-6 space-y-3">
                {recentEvents.map((event) => (
                  <EventRow
                    key={event._id}
                    event={event}
                  />
                ))}
              </div>
            )}

            {recentEvents.length > 0 && (
              <Link
                href="/events"
                className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-[#241000]/10 bg-[#faf8f5] py-3 text-xs font-semibold text-[#241000] transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C]"
              >
                View all events

                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-[26px] border border-[#241000]/10 bg-white p-6 shadow-sm sm:p-7">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#EA580C]">
                Quick Actions
              </p>

              <h2 className="mt-1 text-xl font-bold tracking-tight">
                Manage Workspace
              </h2>
            </div>

            <div className="mt-6 space-y-3">
              <QuickAction
                href="/events/create"
                icon={<Plus className="h-5 w-5" />}
                title="Create an event"
                description="Set up a new conference"
              />

              <QuickAction
                href="/events"
                icon={
                  <CalendarDays className="h-5 w-5" />
                }
                title="Manage events"
                description="View all your conferences"
              />

              <QuickAction
                href="/events"
                icon={<Users className="h-5 w-5" />}
                title="Manage attendees"
                description="View attendee records"
              />

              <QuickAction
                href="/events"
                icon={
                  <TicketCheck className="h-5 w-5" />
                }
                title="Badge management"
                description="Configure event badges"
              />
            </div>

            <div className="mt-6 rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-[#fffaf5] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#EA580C] shadow-sm">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Workspace secured
                  </p>

                  <p className="mt-0.5 text-xs text-black/40">
                    Authenticated admin access
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            FOOTER
        ================================================== */}
        <footer className="flex flex-col gap-3 py-8 text-xs text-black/30 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} BadgeFlow. All rights
            reserved.
          </p>

          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure Admin Workspace
          </div>
        </footer>
      </div>
    </main>
  );
}

/* =========================================================
   HEADER LINK
========================================================= */

function HeaderLink({
  href,
  icon,
  label,
  active = false,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
        active
          ? "bg-orange-50 text-[#EA580C]"
          : "text-black/50 hover:bg-orange-50/70 hover:text-[#EA580C]"
      }`}
    >
      {icon}

      <span>{label}</span>

      {badge && (
        <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-black/30">
          {badge}
        </span>
      )}
    </Link>
  );
}

/* =========================================================
   MOBILE NAV
========================================================= */

function MobileNavLink({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
        active
          ? "bg-orange-50 text-[#EA580C]"
          : "text-black/45 hover:bg-orange-50 hover:text-[#EA580C]"
      }`}
    >
      {label}
    </Link>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="group rounded-[22px] border border-[#241000]/10 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-950/5">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C] transition duration-300 group-hover:bg-[#EA580C] group-hover:text-white">
          {icon}
        </div>

        <span className="rounded-full bg-[#faf8f5] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-black/25">
          Live
        </span>
      </div>

      <p className="mt-5 text-3xl font-bold tracking-tight text-[#241000]">
        {value}
      </p>

      <p className="mt-1 text-sm font-semibold">
        {label}
      </p>

      <p className="mt-1 text-xs text-black/35">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   STATUS SUMMARY
========================================================= */

function StatusSummary({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[20px] border border-[#241000]/10 bg-white p-4 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-black/40">
          {label}
        </p>

        <p className="mt-0.5 text-xl font-bold">
          {value.toLocaleString()}
        </p>

        <p className="text-[10px] text-black/30">
          {description}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   EVENT ROW
========================================================= */

function EventRow({
  event,
}: {
  event: DashboardEvent;
}) {
  const formattedDate = event.startDate
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(event.startDate))
    : "Date not set";

  return (
    <Link
      href={`/events/${event._id}`}
      className="group flex flex-col gap-4 rounded-2xl border border-[#241000]/8 bg-[#faf8f5] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/40 sm:flex-row sm:items-center"
    >
      {/* Event icon */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#EA580C] shadow-sm transition group-hover:bg-[#EA580C] group-hover:text-white">
        <CalendarDays className="h-5 w-5" />
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-bold">
            {event.name}
          </h3>

          <StatusBadge status={event.status} />
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-black/40">
          <span className="flex items-center gap-1">
            <TicketCheck className="h-3 w-3" />
            {event.code}
          </span>

          <span className="flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            {formattedDate}
          </span>

          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.location}
            </span>
          )}
        </div>
      </div>

      {/* Counts */}
      <div className="flex items-center gap-4 border-t border-[#241000]/8 pt-3 sm:border-t-0 sm:pt-0">
        <div className="text-center">
          <p className="text-sm font-bold">
            {(event.attendeeCount || 0).toLocaleString()}
          </p>

          <p className="text-[9px] text-black/35">
            Attendees
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm font-bold">
            {(event.badgeCount || 0).toLocaleString()}
          </p>

          <p className="text-[9px] text-black/35">
            Badges
          </p>
        </div>

        <ChevronRight className="h-4 w-4 text-black/20 transition group-hover:translate-x-1 group-hover:text-[#EA580C]" />
      </div>
    </Link>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: "draft" | "active" | "completed";
}) {
  const styles = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    active:
      "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed:
      "bg-blue-50 text-blue-700 border-blue-200",
  };

  const labels = {
    draft: "Draft",
    active: "Active",
    completed: "Completed",
  };

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

/* =========================================================
   EMPTY EVENTS
========================================================= */

function EmptyEvents() {
  return (
    <div className="mt-6 rounded-[22px] border border-dashed border-orange-200 bg-gradient-to-br from-orange-50/50 to-[#faf8f5] px-6 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#EA580C] shadow-sm">
        <CalendarDays className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-base font-bold">
        No events yet
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-black/40">
        Create your first conference or event to start managing
        attendees and generating badges.
      </p>

      <Link
        href="/events/create"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/15 transition hover:-translate-y-0.5 hover:bg-[#C2410C]"
      >
        <Plus className="h-4 w-4" />
        Create your first event
      </Link>
    </div>
  );
}

/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-[#241000]/8 bg-[#faf8f5] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#EA580C] shadow-sm transition group-hover:bg-[#EA580C] group-hover:text-white">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-black/40">
          {description}
        </p>
      </div>

      <ArrowRight className="h-4 w-4 text-black/20 transition group-hover:translate-x-1 group-hover:text-[#EA580C]" />
    </Link>
  );
}

/* =========================================================
   MINI METRIC
========================================================= */

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[#faf8f5] p-2.5">
      <p className="text-[9px] text-black/35">
        {label}
      </p>

      <p className="mt-0.5 text-sm font-bold">
        {value}
      </p>
    </div>
  );
}

