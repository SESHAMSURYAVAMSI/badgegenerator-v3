"use client";

import {
  Check,
  Search,
  UserRound,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

export interface BadgeAttendee {
  _id: string;
  name: string;
  email?: string;
  registrationNumber: string;
  category: string;
  qrValue: string;
}

interface AttendeeSelectorProps {
  attendees: BadgeAttendee[];
  selectedId: string;
  onSelect: (
    attendee: BadgeAttendee,
  ) => void;
}

export default function AttendeeSelector({
  attendees,
  selectedId,
  onSelect,
}: AttendeeSelectorProps) {
  const [search, setSearch] =
    useState("");

  const filteredAttendees = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return attendees;
    }

    return attendees.filter(
      (attendee) => {
        return (
          attendee.name
            .toLowerCase()
            .includes(query) ||
          attendee.registrationNumber
            .toLowerCase()
            .includes(query) ||
          attendee.category
            .toLowerCase()
            .includes(query) ||
          (attendee.email ?? "")
            .toLowerCase()
            .includes(query)
        );
      },
    );
  }, [attendees, search]);

  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-black text-[#241000]">
          Preview attendee
        </h3>

        <p className="mt-1 text-xs text-stone-500">
          Select an attendee to preview
          their real badge information.
        </p>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search attendees..."
          className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
        />
      </div>

      {attendees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center">
          <UserRound className="mx-auto mb-2 h-6 w-6 text-stone-300" />

          <p className="text-xs font-bold text-stone-500">
            No attendees found
          </p>

          <p className="mt-1 text-[11px] text-stone-400">
            Add attendees to this event first.
          </p>
        </div>
      ) : filteredAttendees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center">
          <p className="text-xs font-bold text-stone-500">
            No matching attendees
          </p>
        </div>
      ) : (
        <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {filteredAttendees.map(
            (attendee) => {
              const selected =
                attendee._id ===
                selectedId;

              return (
                <button
                  key={attendee._id}
                  type="button"
                  onClick={() =>
                    onSelect(attendee)
                  }
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                    selected
                      ? "border-orange-300 bg-orange-50 shadow-sm"
                      : "border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      selected
                        ? "bg-[#EA580C] text-white"
                        : "bg-orange-50 text-[#EA580C]"
                    }`}
                  >
                    {selected ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <UserRound className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-[#241000]">
                      {attendee.name}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] font-semibold text-stone-500">
                      {attendee.registrationNumber}
                    </p>

                    {attendee.category && (
                      <p className="mt-0.5 truncate text-[10px] text-stone-400">
                        {attendee.category}
                      </p>
                    )}
                  </div>
                </button>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}