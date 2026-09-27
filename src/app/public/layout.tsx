import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Your Badge | BadgeFlow",
  description:
    "Find and download your event badge.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      nosnippet: true,
      noarchive: true,
    },
  },
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}