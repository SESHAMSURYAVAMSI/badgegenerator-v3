import type { ReactNode } from "react";

import PublicPortalHeader from "@/components/public/PublicPortalHeader";

interface PublicPortalLayoutProps {
  children: ReactNode;
}

export default function PublicPortalLayout({
  children,
}: PublicPortalLayoutProps) {
  return (
    <div className="min-h-screen bg-[#fffaf7]">
      <PublicPortalHeader />

      {children}
    </div>
  );
}