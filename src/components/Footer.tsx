"use client";

import {ShieldCheck} from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-orange-100 bg-[#fffaf7] px-4 py-4">
      <p className="text-center text-sm text-[#78513e]">
        © {currentYear} BadgeFlow. All rights reserved.
      </p>
      {/* <div className="w-full border-t border-orange-100 bg-[#fffaf7] px-4 py-4">
           <ShieldCheck className="h-3.5 w-3.5" />
        Secure Admin Workspace
        </div> */}
    </footer>
    // <footer className="flex flex-col gap-3 py-8 text-xs text-black/30 sm:flex-row sm:items-center sm:justify-between">
        // <footer className="w-full border-t border-orange-100 bg-[#fffaf7] px-4 py-4">
        //   <p className="text-center text-sm text-[#78513e]">
        //     © {new Date().getFullYear()} BadgeFlow. All rights
        //     reserved.
        //   </p>

        //   <div className="flex items-center gap-2">
        //     <ShieldCheck className="h-3.5 w-3.5" />
        //     Secure Admin Workspace
        //   </div>
        // </footer>
  );
}