"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  KeyRound,
  Loader2,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface LoginPageProps {
  params: Promise<{
    publicId: string;
  }>;
}

interface LoginResponse {
  success?: boolean;
  message?: string;
  data?: {
    eventId?: string;
    publicId?: string;
    name?: string;
  };
}

export default function PublicEventLoginPage({ params }: LoginPageProps) {
  const [publicId, setPublicId] = useState("");

  const [eventName, setEventName] = useState("");

  const [code, setCode] = useState("");

  const [error, setError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isLoadingEvent, setIsLoadingEvent] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadEvent() {
      try {
        const resolvedParams = await params;

        const resolvedPublicId = resolvedParams.publicId;

        if (!mounted) {
          return;
        }

        setPublicId(resolvedPublicId);

        /*
         * We intentionally do not call the protected
         * event API here.
         *
         * The event details become available only after
         * successful authentication.
         */
        setIsLoadingEvent(false);
      } catch {
        if (!mounted) {
          return;
        }

        setError("Unable to open this event.");

        setIsLoadingEvent(false);
      }
    }

    void loadEvent();

    return () => {
      mounted = false;
    };
  }, [params]);

  function handleCodeChange(value: string) {
    const normalized = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 30);

    setCode(normalized);

    if (error) {
      setError("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!publicId) {
      setError("Invalid event link.");
      return;
    }

    const normalizedCode = code
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    if (!normalizedCode) {
      setError("Please enter the event code.");
      return;
    }

    if (normalizedCode.length < 3) {
      setError("Please enter a valid event code.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch(
        `/api/public/events/${encodeURIComponent(publicId)}/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            code: normalizedCode,
          }),
        },
      );

      const data = (await response.json()) as LoginResponse;

      if (!response.ok) {
        throw new Error(data.message || "Incorrect event code.");
      }

      const destination = `/public/${encodeURIComponent(publicId)}/dashboard`;

      window.location.assign(destination);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to access this event.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingEvent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm font-semibold text-stone-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[#EA580C]" />
          Preparing secure event access...
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#faf9f7] text-[#241000]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-orange-200/30 blur-3xl" />

        <div className="absolute -bottom-48 -right-40 h-[34rem] w-[34rem] rounded-full bg-orange-100/50 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-50/60 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-stone-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA580C] text-white shadow-lg shadow-orange-600/20">
              <BadgeCheck className="h-5 w-5" />
            </div>

            <div>
              <div className="text-lg font-bold tracking-tight">
                Badge
                <span className="text-[#EA580C]">Flow</span>
              </div>

              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400">
                Event Portal
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-[#EA580C] sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure Access
          </div>
        </div>
      </header>

      {/* Main */}
      <section className="relative z-10 flex min-h-[calc(100vh-73px)] items-center justify-center px-5 py-10 sm:px-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_30px_100px_rgba(36,16,0,0.10)] lg:grid-cols-[0.9fr_1.1fr]">
          {/* Left information */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#241000] via-[#3a1700] to-[#EA580C] p-8 text-white sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

            <div className="relative">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm">
                <LockKeyhole className="h-5 w-5 text-orange-200" />
              </div>

              <div className="mt-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-200">
                  Private Event Portal
                </p>

                <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
                  Welcome to your
                  <br />
                  event workspace.
                </h1>

                <p className="mt-5 max-w-md text-sm leading-6 text-white/65">
                  Enter the event access code provided by your event
                  administrator to continue.
                </p>
              </div>

              <div className="mt-10 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    <ShieldCheck className="h-4 w-4 text-orange-200" />
                  </div>

                  <div>
                    <p className="text-xs font-bold">Protected Event Access</p>

                    <p className="mt-0.5 text-[11px] text-white/50">
                      Access is restricted to this event.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    <KeyRound className="h-4 w-4 text-orange-200" />
                  </div>

                  <div>
                    <p className="text-xs font-bold">
                      Event Code Authentication
                    </p>

                    <p className="mt-0.5 text-[11px] text-white/50">
                      Your code is never shown in the URL.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                <Sparkles className="h-3.5 w-3.5" />
                Powered by BadgeFlow
              </div>
            </div>
          </div>

          {/* Login */}
          <div className="p-7 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C]">
                <KeyRound className="h-5 w-5" />
              </div>

              <h2 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
                Enter event code
              </h2>

              <p className="mt-2 text-sm leading-6 text-stone-500">
                Use the access code provided by the event organizer to continue.
              </p>

              <form onSubmit={handleSubmit} className="mt-8">
                <label
                  htmlFor="event-code"
                  className="mb-2 block text-sm font-semibold"
                >
                  Event code
                </label>

                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />

                  <input
                    id="event-code"
                    type="text"
                    value={code}
                    onChange={(event) => handleCodeChange(event.target.value)}
                    placeholder="Enter event code"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={30}
                    autoFocus
                    className="h-14 w-full rounded-2xl border border-stone-200 bg-stone-50/70 pl-11 pr-4 text-sm font-bold tracking-[0.1em] outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-stone-400 focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>

                <div className="mt-2 flex justify-between text-[11px] text-stone-400">
                  <span>Letters and numbers only</span>

                  <span>{code.length}/30</span>
                </div>

                {error && (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !code.trim()}
                  className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#EA580C] px-5 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#c2410c] hover:shadow-orange-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying access...
                    </>
                  ) : (
                    <>
                      Continue to Event
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 border-t border-stone-100 pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-50 text-stone-500">
                    <ShieldCheck className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-stone-700">
                      Secure access
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-stone-400">
                      Your access is securely tied to this event and expires
                      automatically.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-medium text-stone-400">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" />
                  Event Portal
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  Secure Session
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
