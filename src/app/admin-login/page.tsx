"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Invalid email or password.");
        setIsLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#faf9f7] text-[#241000]">
      {/* Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-orange-200/30 blur-3xl" />

        <div className="absolute -right-40 top-1/4 h-[36rem] w-[36rem] rounded-full bg-orange-100/40 blur-3xl" />

        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-amber-100/30 blur-3xl" />
      </div>

      <div className="grid min-h-screen lg:grid-cols-[1fr_0.95fr]">
        {/* =====================================================
            LEFT BRANDING PANEL
           ===================================================== */}
        <section className="relative hidden overflow-hidden bg-[#241000] lg:flex lg:flex-col">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(234,88,12,0.35),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(234,88,12,0.2),transparent_35%)]"
          />

          <div
            aria-hidden="true"
            className="absolute -left-32 top-1/3 h-80 w-80 rounded-full border border-orange-500/10"
          />

          <div
            aria-hidden="true"
            className="absolute -right-32 bottom-10 h-96 w-96 rounded-full border border-orange-500/10"
          />

          {/* Logo */}
          <div className="relative z-10 p-10">
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-white"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EA580C] shadow-lg shadow-orange-950/30">
                <BadgeCheck className="h-6 w-6" />
              </div>

              <div>
                <div className="text-xl font-bold tracking-tight">
                  Badge<span className="text-orange-400">Flow</span>
                </div>

                <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-stone-400">
                  Event Management
                </div>
              </div>
            </Link>
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-1 items-center px-10 pb-20">
            <motion.div
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65 }}
              className="max-w-xl"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3.5 py-2 text-xs font-medium text-orange-300">
                <Sparkles className="h-3.5 w-3.5" />
                Admin Workspace
              </div>

              <h1 className="text-5xl font-bold leading-[1.08] tracking-tight text-white">
                Everything your event team needs,
                <span className="block text-orange-400">
                  in one place.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-stone-400">
                Manage conferences, attendees and professional event badges
                through a centralized workspace designed for modern event
                teams.
              </p>

              <div className="mt-10 grid gap-3">
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                    <BadgeCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Professional badge generation
                    </p>

                    <p className="mt-0.5 text-xs text-stone-500">
                      Create configurable event badges.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Centralized administration
                    </p>

                    <p className="mt-0.5 text-xs text-stone-500">
                      Manage your event ecosystem from one workspace.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="relative z-10 px-10 pb-8">
            <p className="text-xs text-stone-600">
              © {new Date().getFullYear()} BadgeFlow. All rights reserved.
            </p>
          </div>
        </section>

        {/* =====================================================
            RIGHT LOGIN PANEL
           ===================================================== */}
        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="w-full max-w-md"
          >
            {/* Mobile logo */}
            <div className="mb-10 lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA580C] text-white shadow-lg shadow-orange-600/20">
                  <BadgeCheck className="h-5 w-5" />
                </div>

                <div>
                  <div className="text-lg font-bold tracking-tight">
                    Badge<span className="text-[#EA580C]">Flow</span>
                  </div>

                  <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-stone-400">
                    Event Management
                  </div>
                </div>
              </Link>
            </div>

            {/* Back */}
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition-colors hover:text-[#EA580C]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            {/* Heading */}
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-[#241000] sm:text-4xl">
                Welcome back
              </h2>

              <p className="mt-3 text-sm leading-6 text-stone-500">
                Sign in to access your BadgeFlow administration workspace.
              </p>
            </div>

            {/* Login card */}
            <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-900/5 sm:p-8">
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-[#241000]"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      placeholder="admin@example.com"
                      required
                      className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/50 pl-11 pr-4 text-sm text-[#241000] outline-none transition-all placeholder:text-stone-400 focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-[#241000]"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />

                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Enter your password"
                      required
                      className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/50 pl-11 pr-12 text-sm text-[#241000] outline-none transition-all placeholder:text-stone-400 focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((value) => !value)
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 transition-colors hover:text-[#EA580C]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4.5 w-4.5" />
                      ) : (
                        <Eye className="h-4.5 w-4.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                  >
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#c2410c] hover:shadow-xl hover:shadow-orange-600/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in to BadgeFlow
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Security notice */}
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50/60 p-3.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" />

                <p className="text-[11px] leading-5 text-stone-600">
                  Your administrator account is protected with secure
                  authentication.
                </p>
              </div>
            </div>

            {/* Footer */}
            <p className="mt-8 text-center text-xs text-stone-400">
              BadgeFlow Administration Portal
            </p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}