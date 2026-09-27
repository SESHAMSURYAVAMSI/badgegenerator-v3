"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const features = [
  {
    icon: BadgeCheck,
    title: "Smart Badge Management",
    description:
      "Create professional event badges with configurable layouts and attendee information.",
  },
  {
    icon: QrCode,
    title: "Dynamic QR Codes",
    description:
      "Generate unique QR codes for attendees using the information configured for each event.",
  },
  {
    icon: Users,
    title: "Attendee Management",
    description:
      "Organize attendee records, categories, registration details and badge information in one place.",
  },
  {
    icon: CalendarDays,
    title: "Event Management",
    description:
      "Manage multiple conferences and events from a centralized administration system.",
  },
];

const highlights = [
  "Unlimited events",
  "Configurable badge layouts",
  "QR-powered identification",
  "Attendee data management",
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#faf9f7] text-[#241000]">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-[32rem] w-[32rem] rounded-full bg-orange-100/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-amber-100/30 blur-3xl" />
      </div>

      {/* Navigation */}
      <header className="mx-auto w-full max-w-7xl px-5 py-5 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="BadgeFlow home"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA580C] text-white shadow-lg shadow-orange-600/20">
              <BadgeCheck className="h-5 w-5" />
            </div>

            <div>
              <div className="text-lg font-bold tracking-tight">
                Badge<span className="text-[#EA580C]">Flow</span>
              </div>

              <div className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400 sm:block">
                Event Management
              </div>
            </div>
          </Link>

          <Link
            href="/admin-login"
            className="group inline-flex items-center gap-2 rounded-xl bg-[#241000] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#241000]/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3a1b08] sm:px-5"
          >
            Admin Sign In
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-7xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:px-10 lg:pb-28 lg:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          {/* Hero content */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-700">
              <Sparkles className="h-3.5 w-3.5" />
              Modern Event & Badge Management
            </div>

            <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Manage events.
              <br />
              <span className="badgeflow-text-gradient">
                Create better badges.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
              BadgeFlow brings event management, attendee registration and
              professional badge generation together in one streamlined
              platform.
            </p>

            {/* Highlights */}
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 text-sm font-medium text-stone-700"
                >
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-[#EA580C]" />
                  {item}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin-login"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-orange-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#c2410c]"
              >
                Enter Admin Panel
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50"
              >
                Explore Features
              </a>
            </div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative mx-auto w-full max-w-xl"
          >
            <div className="badgeflow-gradient relative overflow-hidden rounded-[2rem] p-5 shadow-2xl shadow-orange-950/20 sm:p-7">
              {/* Decorative circles */}
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 h-48 w-48 rounded-full border border-white/10"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full border border-white/10"
              />

              {/* Dashboard mockup */}
              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/95 shadow-2xl">
                <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                      <BadgeCheck className="h-4 w-4 text-[#EA580C]" />
                    </div>

                    <div>
                      <p className="text-xs font-bold text-[#241000]">
                        BadgeFlow
                      </p>
                      <p className="text-[9px] text-stone-400">
                        Event Dashboard
                      </p>
                    </div>
                  </div>

                  <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-600">
                    Live
                  </div>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                      Current Event
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-[#241000]">
                      Annual Medical Conference
                    </h2>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["Events", "12"],
                      ["Attendees", "2,480"],
                      ["Badges", "2,314"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-xl border border-stone-100 bg-stone-50 p-3"
                      >
                        <p className="text-[9px] text-stone-400">{label}</p>
                        <p className="mt-1 text-base font-bold text-[#241000]">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-orange-600">
                          Badge Generation
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#241000]">
                          Ready to generate
                        </p>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
                        <QrCode className="h-6 w-6 text-[#EA580C]" />
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-orange-100">
                      <div className="h-full w-[84%] rounded-full bg-[#EA580C]" />
                    </div>

                    <p className="mt-2 text-[9px] text-stone-500">
                      84% of attendee badges processed
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating security card */}
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -bottom-5 -left-3 hidden rounded-2xl border border-stone-200 bg-white p-4 shadow-xl sm:block lg:-left-8"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>

                <div>
                  <p className="text-xs font-bold text-[#241000]">
                    Secure Management
                  </p>
                  <p className="mt-0.5 text-[10px] text-stone-400">
                    Built for event teams
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-stone-200/70 bg-white/60"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#EA580C]">
              Platform
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#241000] sm:text-4xl">
              Everything your events need
            </h2>

            <p className="mt-4 text-sm leading-6 text-stone-500 sm:text-base">
              A centralized workspace for managing events, attendees and
              professional event badges.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    duration: 0.45,
                    delay: index * 0.08,
                  }}
                  className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-950/5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C] transition-colors group-hover:bg-[#EA580C] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="mt-5 text-base font-bold text-[#241000]">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-[#241000]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EA580C] text-white">
              <BadgeCheck className="h-4 w-4" />
            </div>

            <span className="text-sm font-semibold text-white">
              Badge<span className="text-orange-400">Flow</span>
            </span>
          </div>

          <p className="text-xs text-stone-400">
            Event management & professional badge generation.
          </p>
        </div>
      </footer>
    </main>
  );
}