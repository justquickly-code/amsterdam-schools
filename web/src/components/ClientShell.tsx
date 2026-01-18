"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import SetupGate from "@/components/SetupGate";
import TopMenu from "@/components/TopMenu";

const HIDE_NAV_PREFIXES = ["/login", "/auth", "/admin", "/invite"];
const BYPASS_SETUP_PREFIXES = ["/login", "/auth", "/admin", "/settings", "/setup", "/invite"];
const HIDE_MENU_PREFIXES = ["/login", "/auth", "/setup", "/invite"];

function shouldHideNav(pathname: string) {
  if (pathname.startsWith("/shortlist/print")) return true;
  return HIDE_NAV_PREFIXES.some((p) => pathname.startsWith(p));
}

function shouldBypassSetup(pathname: string) {
  if (pathname.startsWith("/shortlist/print")) return true;
  return BYPASS_SETUP_PREFIXES.some((p) => pathname.startsWith(p));
}

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = shouldHideNav(pathname);
  const bypass = shouldBypassSetup(pathname);
  const nav = <BottomNav />;
  const showMenu = !HIDE_MENU_PREFIXES.some((p) => pathname.startsWith(p)) && !pathname.startsWith("/shortlist/print");

  return (
    <>
      {showMenu && <TopMenu />}
      <SetupGate bypass={bypass} showNav={!hideNav} nav={nav}>
        {children}
      </SetupGate>
    </>
  );
}
