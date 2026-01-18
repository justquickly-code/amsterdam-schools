"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchCurrentWorkspace, WorkspaceRole } from "@/lib/workspace";

type WorkspaceRow = {
  child_name: string | null;
  home_postcode: string | null;
  home_house_number: string | null;
  advies_levels: string[] | null;
};

export default function SetupGate({
  children,
  bypass,
  showNav,
  nav,
}: {
  children: React.ReactNode;
  bypass: boolean;
  showNav: boolean;
  nav: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [gate, setGate] = useState(false);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      if (bypass) {
        setLoading(false);
        return;
      }

      const { workspace, role, error: wErr } = await fetchCurrentWorkspace<WorkspaceRow>(
        "child_name,home_postcode,home_house_number,advies_levels"
      );

      if (!mounted) return;

      if (wErr) {
        setLoading(false);
        return;
      }

      setRole(role ?? null);
      const ws = (workspace ?? null) as WorkspaceRow | null;
      const hasChild = Boolean((ws?.child_name ?? "").trim());
      const hasAddress = Boolean(ws?.home_postcode && ws?.home_house_number);
      const hasAdvies = (ws?.advies_levels ?? []).length > 0;
      setGate(!(hasChild && hasAddress && hasAdvies));
      setLoading(false);
    }

    check();
    return () => {
      mounted = false;
    };
  }, [bypass]);

  useEffect(() => {
    if (!gate) return;
    if (role && role !== "owner") return;
    if (pathname === "/setup") return;
    setRedirecting(true);
    router.replace("/setup");
  }, [gate, role, pathname, router]);

  if (loading) {
    return (
      <div className={showNav ? "pb-20" : ""}>
        {children}
        {showNav ? nav : null}
      </div>
    );
  }

  if (gate) {
    if (role && role !== "owner") {
      return (
        <main className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-xl border p-6 space-y-3 text-sm">
            <div className="text-base font-semibold">Setup required</div>
            <p className="text-muted-foreground">
              The workspace owner needs to finish setup before you can use the app.
            </p>
          </div>
        </main>
      );
    }
    if (redirecting) {
      return (
        <div className={showNav ? "pb-20" : ""}>
          {children}
          {showNav ? nav : null}
        </div>
      );
    }
  }

  return (
    <div className={showNav ? "pb-20" : ""}>
      {children}
      {showNav ? nav : null}
    </div>
  );
}
