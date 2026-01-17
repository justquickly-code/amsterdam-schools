"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";

const HIDE_NAV_PREFIXES = ["/login", "/auth", "/admin"];

function shouldHideNav(pathname: string) {
  if (pathname.startsWith("/shortlist/print")) return true;
  return HIDE_NAV_PREFIXES.some((p) => pathname.startsWith(p));
}

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = shouldHideNav(pathname);

  return (
    <div className={hideNav ? "" : "pb-20"}>
      {children}
      {!hideNav && <BottomNav />}
    </div>
  );
}
