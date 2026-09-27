"use client";

import {
  Download,
  Loader2,
  Search,
  ShieldCheck,
  Ticket,
  UserRound,
  Mail,
  Hash,
  MapPin,
} from "lucide-react";

import { useParams } from "next/navigation";
import { useState } from "react";

interface PublicAttendee {
  _id: string;
  name: string;
  email?: string;
  registrationNumber: string;
  category: string;
  qrValue: string;
  status: string;
}

interface PublicEvent {
  name: string;
  description: string;
  location: string;
}

export default function PublicBadgePage() {
  const params = useParams();

  const publicId = String(
    params.publicId,
  );

  const [query, setQuery] =
    useState("");

  const [event, setEvent] =
    useState<PublicEvent | null>(null);

  const [attendees, setAttendees] =
    useState<PublicAttendee[]>([]);

  const [selectedAttendee, setSelectedAttendee] =
    useState<PublicAttendee | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [searched, setSearched] =
    useState(false);

  const [error, setError] =
    useState("");

  const searchBadge = async () => {
    if (!query.trim()) {
      setError(
        "Enter your name, email or registration number.",
      );

      return;
    }

    try {
      setLoading(true);
      setError("");
      setSearched(true);
      setSelectedAttendee(null);

      const response = await fetch(
        `/api/public/events/${publicId}/badge?q=${encodeURIComponent(
          query.trim(),
        )}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to search badges.",
        );
      }

      setEvent(data.event || null);

      setAttendees(
        Array.isArray(data.attendees)
          ? data.attendees
          : [],
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to search badges.",
      );

      setAttendees([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadBadge = async (
    attendee: PublicAttendee,
  ) => {
    /*
     * The public download will use the same badge
     * renderer/configuration as the admin designer.
     *
     * This section will be connected to the existing
     * renderBadge() pipeline in the next integration step.
     */

    try {
      setSelectedAttendee(attendee);

      const badgeUrl =
        `/api/public/events/${publicId}/badge/${attendee._id}/download`;

      const response = await fetch(
        badgeUrl,
      );

      if (!response.ok) {
        const data =
          await response.json().catch(
            () => null,
          );

        throw new Error(
          data?.message ||
            "Badge download failed.",
        );
      }

      const blob =
        await response.blob();

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `${attendee.registrationNumber || attendee.name}-badge.png`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error
          ? err.message
          : "Unable to download badge.",
      );
    } finally {
      setSelectedAttendee(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#fffaf5] via-white to-[#fff1e7]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-4 py-2 shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EA580C] text-white">
              <Ticket className="h-4 w-4" />
            </div>

            <span className="text-sm font-bold text-[#241000]">
              BadgeFlow
            </span>
          </div>
        </div>

        {/* Hero */}
        <div className="mx-auto mt-8 max-w-2xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#EA580C] to-[#9a3412] text-white shadow-xl shadow-orange-200">
            <Ticket className="h-8 w-8" />
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-[#241000] sm:text-4xl">
            Find Your Badge
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#8b6f5c] sm:text-base">
            Search for your event badge using
            your registration number, name or
            email address.
          </p>
        </div>

        {/* Search */}
        <div className="mx-auto mt-8 max-w-2xl">
          <div className="rounded-3xl border border-[#f1dfd0] bg-white p-3 shadow-xl shadow-orange-100/50">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a58a78]" />

                <input
                  type="text"
                  value={query}
                  onChange={(event) =>
                    setQuery(
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter"
                    ) {
                      searchBadge();
                    }
                  }}
                  placeholder="Registration number, name or email"
                  className="h-12 w-full rounded-2xl border border-transparent bg-[#fffaf5] pl-12 pr-4 text-sm text-[#241000] outline-none transition focus:border-orange-200 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <button
                type="button"
                onClick={searchBadge}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#EA580C] px-6 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search Badge
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Event */}
        {event && (
          <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#EA580C]">
              Event
            </p>

            <h2 className="mt-1 text-xl font-bold text-[#241000]">
              {event.name}
            </h2>

            {event.location && (
              <p className="mt-2 flex items-center gap-2 text-sm text-[#8b6f5c]">
                <MapPin className="h-4 w-4" />
                {event.location}
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {searched && !loading && (
          <div className="mx-auto mt-8 max-w-3xl">
            {attendees.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#e8cdbc] bg-white px-6 py-14 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                  <Search className="h-7 w-7 text-[#EA580C]" />
                </div>

                <h3 className="mt-5 text-lg font-bold text-[#241000]">
                  No generated badge found
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8b6f5c]">
                  We couldn't find a generated
                  badge matching your search.
                  Please check your registration
                  number or email and try again.
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-[#241000]">
                    Your Badge
                  </h2>

                  <p className="mt-1 text-sm text-[#8b6f5c]">
                    Select your registration below.
                  </p>
                </div>

                <div className="space-y-4">
                  {attendees.map(
                    (attendee) => {
                      const isDownloading =
                        selectedAttendee?._id ===
                        attendee._id;

                      return (
                        <div
                          key={attendee._id}
                          className="rounded-3xl border border-[#f1dfd0] bg-white p-5 shadow-sm"
                        >
                          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50">
                                <UserRound className="h-5 w-5 text-[#EA580C]" />
                              </div>

                              <div className="min-w-0">
                                <h3 className="truncate text-base font-bold text-[#241000]">
                                  {
                                    attendee.name
                                  }
                                </h3>

                                <div className="mt-2 flex flex-col gap-1 text-xs text-[#8b6f5c] sm:flex-row sm:gap-4">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Hash className="h-3.5 w-3.5" />
                                    {
                                      attendee.registrationNumber
                                    }
                                  </span>

                                  {attendee.email && (
                                    <span className="inline-flex items-center gap-1.5 truncate">
                                      <Mail className="h-3.5 w-3.5" />
                                      {
                                        attendee.email
                                      }
                                    </span>
                                  )}
                                </div>

                                {attendee.category && (
                                  <span className="mt-2 inline-flex rounded-full bg-[#fff3e9] px-2.5 py-1 text-[11px] font-semibold text-[#9a3412]">
                                    {
                                      attendee.category
                                    }
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                downloadBadge(
                                  attendee,
                                )
                              }
                              disabled={
                                isDownloading
                              }
                              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDownloading ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Preparing...
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4" />
                                  Download Badge
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Security */}
        <div className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-2 text-center text-xs text-[#a58a78]">
          <ShieldCheck className="h-4 w-4" />
          <span>
            Only generated badges are available
            for download.
          </span>
        </div>
      </div>
    </main>
  );
}