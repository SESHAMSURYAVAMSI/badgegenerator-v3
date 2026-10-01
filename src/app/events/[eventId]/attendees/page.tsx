"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";

import ExportAttendeesButton from "@/components/attendees/ExportAttendeesButton";

import {
  ArrowLeft,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Mail,
  Pencil,
  Save,
  Trash2,
  MapPin,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";

interface Attendee {
  _id: string;
  eventId: string;

  name: string;
  email: string;
  phone?: string;
  medicalCouncilNumber?: string;

  registrationNumber: string;
  category: string;
  qrValue: string;

  badgeGenerated: boolean;
  badgeUrl: string;
  badgeGeneratedAt?: string;
  badgeGenerationCount: number;

  createdAt: string;
  updatedAt: string;
}

interface EventInfo {
  _id: string;
  name: string;
  code: string;
  location?: string;
  status:
    | "draft"
    | "active"
    | "completed";
  attendeeCount: number;
  badgeCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface AttendeeForm {
  name: string;
  email: string;
  phone: string;
  medicalCouncilNumber: string;
  registrationNumber: string;
  category: string;
  qrValue: string;
}

const initialForm: AttendeeForm = {
  name: "",
  email: "",
  phone: "",
  medicalCouncilNumber: "",
  registrationNumber: "",
  category: "",
  qrValue: "",
};

function formatDate(date?: string) {
  if (!date) {
    return "—";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function badgeStatusClasses(
  badgeGenerated: boolean,
) {
  if (badgeGenerated) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-orange-200 bg-orange-50 text-orange-700";
}

export default function AttendeesPage() {
  const params = useParams<{
    eventId: string;
  }>();

  const eventId = params.eventId;

  const [event, setEvent] =
    useState<EventInfo | null>(null);

  const [attendees, setAttendees] =
    useState<Attendee[]>([]);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });

  const [search, setSearch] =
    useState("");

  const [searchInput, setSearchInput] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [formError, setFormError] =
    useState("");

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [editingAttendee, setEditingAttendee] =
    useState<Attendee | null>(null);

  const [form, setForm] =
    useState<AttendeeForm>(initialForm);

  const [editForm, setEditForm] =
    useState<AttendeeForm>(initialForm);

  const [editFormError, setEditFormError] =
    useState("");

  const [isEditing, setIsEditing] =
    useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<Attendee | null>(null);

  const [isDeleting, setIsDeleting] =
    useState(false);

  async function loadEvent() {
    if (!eventId) {
      return;
    }

    try {
      const response = await fetch(
        `/api/events/${eventId}`,
        {
          cache: "no-store",
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch event.",
        );
      }

      setEvent(data.event);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadAttendees(
    requestedPage = 1,
    requestedSearch = search,
  ) {
    if (!eventId) {
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const params =
        new URLSearchParams({
          page: String(
            requestedPage,
          ),
          limit: "10",
        });

      if (
        requestedSearch.trim()
      ) {
        params.set(
          "search",
          requestedSearch.trim(),
        );
      }

      const response =
        await fetch(
          `/api/events/${eventId}/attendees?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch attendees.",
        );
      }

      setAttendees(
        data.attendees ?? [],
      );

      setPagination(
        data.pagination ?? {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch attendees.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEvent();
    loadAttendees(1, "");
  }, [eventId]);

  function handleSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nextSearch =
      searchInput.trim();

    setSearch(nextSearch);

    loadAttendees(
      1,
      nextSearch,
    );
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");

    loadAttendees(1, "");
  }

  function updateForm(
    field: keyof AttendeeForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateEditForm(
    field: keyof AttendeeForm,
    value: string,
  ) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openEditModal(attendee: Attendee) {
    setEditingAttendee(attendee);
    setEditForm({
      name: attendee.name,
      email: attendee.email,
      phone: attendee.phone ?? "",
      medicalCouncilNumber:
        attendee.medicalCouncilNumber ?? "",
      registrationNumber:
        attendee.registrationNumber,
      category: attendee.category ?? "",
      qrValue: attendee.qrValue ?? "",
    });
    setEditFormError("");
    setShowEditModal(true);
  }

  function closeEditModal() {
    if (isEditing) return;
    setShowEditModal(false);
    setEditingAttendee(null);
    setEditForm(initialForm);
    setEditFormError("");
  }

  async function handleEditAttendee(
    submitEvent: FormEvent<HTMLFormElement>,
  ) {
    submitEvent.preventDefault();

    if (!editingAttendee) return;

    setEditFormError("");

    if (!editForm.name.trim()) {
      setEditFormError(
        "Attendee name is required.",
      );
      return;
    }

    if (!editForm.email.trim()) {
      setEditFormError("Email is required.");
      return;
    }

    if (!editForm.registrationNumber.trim()) {
      setEditFormError(
        "Registration number cannot be empty.",
      );
      return;
    }

    try {
      setIsEditing(true);

      const response = await fetch(
        `/api/events/${eventId}/attendees`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "update",
            attendeeId: editingAttendee._id,
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            phone: editForm.phone.trim(),
            medicalCouncilNumber:
              editForm.medicalCouncilNumber.trim(),
            registrationNumber:
              editForm.registrationNumber.trim(),
            category: editForm.category.trim(),
            qrValue: editForm.qrValue.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update attendee.",
        );
      }

      setShowEditModal(false);
      setEditingAttendee(null);
      setEditForm(initialForm);
      setEditFormError("");

      await loadAttendees(
        pagination.page,
        search,
      );
      await loadEvent();
    } catch (error) {
      console.error(error);
      setEditFormError(
        error instanceof Error
          ? error.message
          : "Failed to update attendee.",
      );
    } finally {
      setIsEditing(false);
    }
  }

  function openDeleteConfirmation(attendee: Attendee) {
    if (isDeleting) return;
    setDeleteTarget(attendee);
  }

  function closeDeleteConfirmation() {
    if (isDeleting) return;
    setDeleteTarget(null);
  }

  async function handleDeleteAttendee() {
    if (!deleteTarget || !eventId) return;

    try {
      setIsDeleting(true);
      setError("");

      const response = await fetch(
        `/api/events/${eventId}/attendees`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attendeeId: deleteTarget._id,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete attendee.",
        );
      }

      const nextPage =
        pagination.page > 1 &&
        attendees.length === 1
          ? pagination.page - 1
          : pagination.page;

      setDeleteTarget(null);

      await loadAttendees(
        nextPage,
        search,
      );
      await loadEvent();
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete attendee.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleAddAttendee(
    submitEvent: FormEvent<HTMLFormElement>,
  ) {
    submitEvent.preventDefault();

    setFormError("");

    if (!form.name.trim()) {
      setFormError(
        "Attendee name is required.",
      );

      return;
    }

    if (!form.email.trim()) {
      setFormError(
        "Email is required.",
      );

      return;
    }

    /*
     * Registration number is intentionally
     * NOT validated here.
     *
     * If it is empty, the backend will
     * automatically generate one using
     * the event code.
     */
    try {
      setIsSubmitting(true);

      const response =
        await fetch(
          `/api/events/${eventId}/attendees`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              name: form.name.trim(),
              email: form.email.trim(),
              phone: form.phone.trim(),
              registrationNumber:
                form.registrationNumber.trim(),
              category:
                form.category.trim(),
              qrValue:
                form.qrValue.trim(),
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to add attendee.",
        );
      }

      setForm(initialForm);
      setFormError("");
      setShowAddModal(false);

      await loadAttendees(
        1,
        search,
      );

      await loadEvent();
    } catch (error) {
      console.error(error);

      setFormError(
        error instanceof Error
          ? error.message
          : "Failed to add attendee.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#241000]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-orange-200/20 blur-3xl" />

        <div className="absolute right-[-12rem] top-[20rem] h-[30rem] w-[30rem] rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8 lg:px-10">
          <Link
            href="/dashboard"
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA580C] text-white shadow-lg shadow-orange-600/20 transition-transform group-hover:scale-105">
              <BadgeCheck className="h-5 w-5" />
            </div>

            <div className="hidden sm:block">
              <div className="text-lg font-bold tracking-tight">
                Badge
                <span className="text-[#EA580C]">
                  Flow
                </span>
              </div>

              <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                Attendee Management
              </div>
            </div>
          </Link>

          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C]"
          >
            <ArrowLeft className="h-4 w-4" />

            <span className="hidden sm:inline">
              Back to Event
            </span>

            <span className="sm:hidden">
              Back
            </span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#EA580C]">
              <Sparkles className="h-3.5 w-3.5" />
              Attendee Management
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {event?.name ||
                "Attendees"}
            </h1>

            <div className="mt-3 flex flex-col gap-2 text-sm text-stone-500 sm:flex-row sm:flex-wrap sm:gap-x-5">
              {event?.code && (
                <span className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-[#EA580C]" />
                  {event.code}
                </span>
              )}

              {event?.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#EA580C]" />
                  {event.location}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/events/${eventId}/attendees/import`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-semibold text-[#EA580C] transition hover:bg-orange-100"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Import Excel / CSV
            </Link>

            <ExportAttendeesButton
              eventId={eventId}
            />

            <button
              type="button"
              onClick={() => {
                setForm(initialForm);
                setFormError("");
                setShowAddModal(
                  true,
                );
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#c2410c]"
            >
              <UserPlus className="h-4 w-4" />
              Add Attendee
            </button>
          </div>
        </motion.div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
              <Users className="h-5 w-5" />
            </div>

            <p className="mt-4 text-2xl font-bold">
              {pagination.total.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Total attendees
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
              <QrCode className="h-5 w-5" />
            </div>

            <p className="mt-4 text-2xl font-bold">
              {event?.badgeCount?.toLocaleString() ||
                "0"}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Badges generated
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <BadgeCheck className="h-5 w-5" />
            </div>

            <p className="mt-4 text-2xl font-bold">
              Ready
            </p>

            <p className="mt-1 text-xs text-stone-500">
              QR data available
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />

              <input
                type="text"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value,
                  )
                }
                placeholder="Search name, email, registration number, category..."
                className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50/60 pl-10 pr-4 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 text-sm font-semibold text-white transition hover:bg-[#c2410c]"
            >
              <Search className="h-4 w-4" />
              Search
            </button>

            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </form>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Unable to load attendees.
                </p>

                <p className="mt-1 text-xs text-red-500">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadAttendees(
                    pagination.page,
                    search,
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-16 animate-pulse rounded-xl bg-stone-100"
                    />
                  ),
                )}
              </div>
            </div>
          ) : attendees.length ===
            0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C]">
                <Users className="h-8 w-8" />
              </div>

              <h2 className="mt-5 text-xl font-bold">
                {search
                  ? "No attendees found"
                  : "No attendees yet"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
                {search
                  ? "Try a different search term."
                  : "Add attendees manually or import your Excel/CSV registration list."}
              </p>

              {!search && (
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(
                        initialForm,
                      );
                      setFormError("");
                      setShowAddModal(
                        true,
                      );
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 hover:bg-[#c2410c]"
                  >
                    <Plus className="h-4 w-4" />
                    Add Attendee
                  </button>

                  <Link
                    href={`/events/${eventId}/attendees/import`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-semibold text-[#EA580C] hover:bg-orange-100"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Import Excel / CSV
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50/70">
                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                        Attendee
                      </th>

                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                        Registration
                      </th>

                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                        Medical Council Number
                      </th>

                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                        Category
                      </th>

                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                        QR Value
                      </th>

                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                        Badge Status
                      </th>

                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                        Added
                      </th>

                      <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {attendees.map(
                      (
                        attendee,
                        index,
                      ) => (
                        <motion.tr
                          key={
                            attendee._id
                          }
                          initial={{
                            opacity: 0,
                            y: 8,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          transition={{
                            delay: Math.min(
                              index *
                                0.03,
                              0.2,
                            ),
                          }}
                          className="border-b border-stone-100 last:border-0 hover:bg-orange-50/30"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-bold text-[#EA580C]">
                                {attendee.name
                                  .charAt(
                                    0,
                                  )
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                  {
                                    attendee.name
                                  }
                                </p>

                                {attendee.email && (
                                  <span className="mt-1 flex items-center gap-1.5 text-xs text-stone-400">
                                    <Mail className="h-3 w-3" />
                                    {
                                      attendee.email
                                    }
                                  </span>
                                )}

                                {attendee.phone && (
                                  <span className="mt-1 flex items-center gap-1.5 text-xs text-stone-400">
                                    <Phone className="h-3 w-3" />
                                    {
                                      attendee.phone
                                    }
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="rounded-lg bg-stone-50 px-2.5 py-1.5 text-xs font-bold text-stone-600">
                              {
                                attendee.registrationNumber
                              }
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-[#241000]">
                              {attendee.medicalCouncilNumber || "—"}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-xs text-stone-500">
                              {attendee.category ||
                                "General"}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <QrCode className="h-4 w-4 text-[#EA580C]" />

                              <span className="max-w-32 truncate text-xs text-stone-500">
                                {
                                  attendee.qrValue
                                }
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badgeStatusClasses(
                                attendee.badgeGenerated,
                              )}`}
                            >
                              {attendee.badgeGenerated
                                ? "Generated"
                                : "Pending"}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-xs text-stone-400">
                            {formatDate(
                              attendee.createdAt,
                            )}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(attendee)
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-[#EA580C] transition hover:bg-orange-100"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openDeleteConfirmation(attendee)
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-stone-100 md:hidden">
                {attendees.map(
                  (
                    attendee,
                    index,
                  ) => (
                    <motion.div
                      key={
                        attendee._id
                      }
                      initial={{
                        opacity: 0,
                        y: 8,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: Math.min(
                          index *
                            0.03,
                          0.2,
                        ),
                      }}
                      className="p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-bold text-[#EA580C]">
                            {attendee.name
                              .charAt(
                                0,
                              )
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {
                                attendee.name
                              }
                            </p>

                            <p className="mt-1 text-xs text-stone-400">
                              {
                                attendee.registrationNumber
                              }
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(attendee)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-[#EA580C] transition hover:bg-orange-100"
                            aria-label={`Edit ${attendee.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openDeleteConfirmation(attendee)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                            aria-label={`Delete ${attendee.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase ${badgeStatusClasses(
                              attendee.badgeGenerated,
                            )}`}
                          >
                            {attendee.badgeGenerated
                              ? "Generated"
                              : "Pending"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-stone-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                            Category
                          </p>

                          <p className="mt-1 text-xs font-semibold">
                            {attendee.category ||
                              "General"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-stone-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                            Medical Council Number
                          </p>

                          <p className="mt-1 truncate text-xs font-semibold">
                            {attendee.medicalCouncilNumber || "—"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-stone-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                            QR Value
                          </p>

                          <p className="mt-1 truncate text-xs font-semibold">
                            {
                              attendee.qrValue
                            }
                          </p>
                        </div>
                      </div>

                      {attendee.email && (
                        <p className="mt-3 flex items-center gap-2 text-xs text-stone-400">
                          <Mail className="h-3.5 w-3.5" />
                          {
                            attendee.email
                          }
                        </p>
                      )}

                      {attendee.phone && (
                        <p className="mt-2 flex items-center gap-2 text-xs text-stone-400">
                          <Phone className="h-3.5 w-3.5" />
                          {
                            attendee.phone
                          }
                        </p>
                      )}
                    </motion.div>
                  ),
                )}
              </div>
            </>
          )}

          {!isLoading &&
            attendees.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-stone-100 bg-stone-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-stone-500">
                  Showing{" "}
                  <span className="font-semibold text-stone-700">
                    {(pagination.page -
                      1) *
                      pagination.limit +
                      1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-stone-700">
                    {Math.min(
                      pagination.page *
                        pagination.limit,
                      pagination.total,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-stone-700">
                    {
                      pagination.total
                    }
                  </span>{" "}
                  attendees
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      !pagination.hasPreviousPage
                    }
                    onClick={() =>
                      loadAttendees(
                        pagination.page -
                          1,
                        search,
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#EA580C] px-3 text-xs font-bold text-white">
                    {pagination.page}
                  </span>

                  <button
                    type="button"
                    disabled={
                      !pagination.hasNextPage
                    }
                    onClick={() =>
                      loadAttendees(
                        pagination.page +
                          1,
                        search,
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
        </div>
      </section>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241000]/40 p-4 backdrop-blur-sm">
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
              y: 10,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-stone-200 bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white/95 px-6 py-5 backdrop-blur-xl sm:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                  <UserPlus className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    Add Attendee
                  </h2>

                  <p className="text-xs text-stone-400">
                    Registration number can be entered manually or generated automatically.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddModal(
                    false,
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={
                handleAddAttendee
              }
              className="space-y-5 p-6 sm:p-8"
            >
              <div>
                <label
                  htmlFor="attendee-name"
                  className="mb-2 block text-sm font-semibold"
                >
                  Full name
                  <span className="ml-1 text-[#EA580C]">
                    *
                  </span>
                </label>

                <input
                  id="attendee-name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateForm(
                      "name",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Rahul Sharma"
                  required
                  maxLength={150}
                  autoFocus
                  className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm outline-none transition focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="attendee-email"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Email
                    <span className="ml-1 text-[#EA580C]">
                      *
                    </span>
                  </label>

                  <input
                    id="attendee-email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateForm(
                        "email",
                        event.target.value,
                      )
                    }
                    placeholder="rahul@example.com"
                    required
                    className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm outline-none transition focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="attendee-phone"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Phone
                  </label>

                  <input
                    id="attendee-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateForm(
                        "phone",
                        event.target.value,
                      )
                    }
                    placeholder="+91 98765 43210"
                    className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm outline-none transition focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="attendee-medical-council-number"
                  className="mb-2 block text-sm font-semibold"
                >
                  Medical Council Number
                </label>

                <input
                  id="attendee-medical-council-number"
                  type="text"
                  value={form.medicalCouncilNumber}
                  onChange={(event) =>
                    updateForm(
                      "medicalCouncilNumber",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. TS-MCI-12345"
                  maxLength={100}
                  className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm uppercase outline-none transition focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="registration-number"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Registration number
                    <span className="ml-1 text-xs font-medium text-stone-400">
                      Optional
                    </span>
                  </label>

                  <input
                    id="registration-number"
                    type="text"
                    value={
                      form.registrationNumber
                    }
                    onChange={(event) =>
                      updateForm(
                        "registrationNumber",
                        event.target.value,
                      )
                    }
                    placeholder={`Leave blank for ${event?.code || "EVENT"}-001`}
                    maxLength={100}
                    className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm uppercase outline-none transition placeholder:normal-case placeholder:text-stone-400 focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />

                  <p className="mt-2 text-xs leading-5 text-stone-400">
                    Leave this blank and BadgeFlow will automatically generate a unique registration number using the event code.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="attendee-category"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Category
                  </label>

                  <input
                    id="attendee-category"
                    type="text"
                    value={
                      form.category
                    }
                    onChange={(event) =>
                      updateForm(
                        "category",
                        event.target.value,
                      )
                    }
                    placeholder="e.g. Delegate"
                    maxLength={100}
                    className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm outline-none transition focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="qr-value"
                  className="mb-2 block text-sm font-semibold"
                >
                  QR value
                </label>

                <div className="relative">
                  <QrCode className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#EA580C]" />

                  <input
                    id="qr-value"
                    type="text"
                    value={
                      form.qrValue
                    }
                    onChange={(event) =>
                      updateForm(
                        "qrValue",
                        event.target.value,
                      )
                    }
                    placeholder="Leave blank to use registration number"
                    maxLength={500}
                    className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 pl-10 pr-4 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>

                <p className="mt-2 text-xs text-stone-400">
                  Leave blank to automatically use the final registration number as the QR value.
                </p>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setShowAddModal(
                      false,
                    )
                  }
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-200 bg-white px-5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSubmitting
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-6 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Attendee
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showEditModal && editingAttendee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241000]/40 p-4 backdrop-blur-sm">
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
              y: 10,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-stone-200 bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white/95 px-6 py-5 backdrop-blur-xl sm:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                  <Pencil className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    Edit Attendee
                  </h2>
                  <p className="text-xs text-stone-400">
                    Update attendee details without changing the event.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={isEditing}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleEditAttendee}
              className="space-y-5 p-6 sm:p-8"
            >
              <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#EA580C]">
                  Current attendee
                </p>
                <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-[#241000]">
                    {editingAttendee.name}
                  </p>
                  <p className="text-xs font-bold text-stone-500">
                    {editingAttendee.registrationNumber}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-attendee-name"
                  className="mb-2 block text-sm font-semibold"
                >
                  Full name
                  <span className="ml-1 text-[#EA580C]">*</span>
                </label>
                <input
                  id="edit-attendee-name"
                  type="text"
                  value={editForm.name}
                  onChange={(event) =>
                    updateEditForm(
                      "name",
                      event.target.value,
                    )
                  }
                  required
                  maxLength={150}
                  className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm outline-none transition focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-attendee-email"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Email
                    <span className="ml-1 text-[#EA580C]">*</span>
                  </label>
                  <input
                    id="edit-attendee-email"
                    type="email"
                    value={editForm.email}
                    onChange={(event) =>
                      updateEditForm(
                        "email",
                        event.target.value,
                      )
                    }
                    required
                    className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm outline-none transition focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-attendee-phone"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Phone
                  </label>
                  <input
                    id="edit-attendee-phone"
                    type="tel"
                    value={editForm.phone}
                    onChange={(event) =>
                      updateEditForm(
                        "phone",
                        event.target.value,
                      )
                    }
                    className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm outline-none transition focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-medical-council-number"
                  className="mb-2 block text-sm font-semibold"
                >
                  Medical Council Number
                </label>
                <input
                  id="edit-medical-council-number"
                  type="text"
                  value={editForm.medicalCouncilNumber}
                  onChange={(event) =>
                    updateEditForm(
                      "medicalCouncilNumber",
                      event.target.value,
                    )
                  }
                  maxLength={100}
                  className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm uppercase outline-none transition focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-registration-number"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Registration number
                  </label>
                  <input
                    id="edit-registration-number"
                    type="text"
                    value={editForm.registrationNumber}
                    onChange={(event) =>
                      updateEditForm(
                        "registrationNumber",
                        event.target.value,
                      )
                    }
                    required
                    maxLength={100}
                    className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm uppercase outline-none transition focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />
                  <p className="mt-2 text-xs text-stone-400">
                    Must be unique within this event.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="edit-attendee-category"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Category
                  </label>
                  <input
                    id="edit-attendee-category"
                    type="text"
                    value={editForm.category}
                    onChange={(event) =>
                      updateEditForm(
                        "category",
                        event.target.value,
                      )
                    }
                    maxLength={100}
                    className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm outline-none transition focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-qr-value"
                  className="mb-2 block text-sm font-semibold"
                >
                  QR value
                </label>
                <div className="relative">
                  <QrCode className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#EA580C]" />
                  <input
                    id="edit-qr-value"
                    type="text"
                    value={editForm.qrValue}
                    onChange={(event) =>
                      updateEditForm(
                        "qrValue",
                        event.target.value,
                      )
                    }
                    maxLength={500}
                    className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 pl-10 pr-4 text-sm outline-none transition focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>
                <p className="mt-2 text-xs text-stone-400">
                  You can keep a custom QR value or change it manually.
                </p>
              </div>

              {editFormError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {editFormError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isEditing}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-200 bg-white px-5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isEditing}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-6 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isEditing ? (
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
            </form>
          </motion.div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#241000]/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-attendee-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-red-100 bg-white shadow-2xl"
          >
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <Trash2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2
                    id="delete-attendee-title"
                    className="text-lg font-bold text-[#241000]"
                  >
                    Delete attendee?
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-stone-500">
                    This will permanently remove this attendee from the event. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-stone-100 bg-stone-50 p-4">
                <p className="truncate text-sm font-bold text-[#241000]">
                  {deleteTarget.name}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#EA580C]">
                  {deleteTarget.registrationNumber}
                </p>
                {deleteTarget.email && (
                  <p className="mt-1 truncate text-xs text-stone-400">
                    {deleteTarget.email}
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDeleteConfirmation}
                  disabled={isDeleting}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-200 bg-white px-5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDeleteAttendee}
                  disabled={isDeleting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Attendee
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </main>
  );
}