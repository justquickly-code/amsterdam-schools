"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

  useEffect(() => {
    let mounted = true;

    async function check() {
      if (bypass) {
        setLoading(false);
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setLoading(false);
        return;
      }

      const { data, error: wErr } = await supabase
        .from("workspaces")
        .select("child_name,home_postcode,home_house_number,advies_levels")
        .limit(1)
        .maybeSingle();

      if (!mounted) return;

      if (wErr) {
        setLoading(false);
        return;
      }

      const ws = (data ?? null) as WorkspaceRow | null;
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

  if (loading) {
    return (
      <div className={showNav ? "pb-20" : ""}>
        {children}
        {showNav ? nav : null}
      </div>
    );
  }

  if (gate) {
    if (pathname !== "/setup") {
      router.replace("/setup");
      return null;
    }
  }

  return (
    <div className={showNav ? "pb-20" : ""}>
      {children}
      {showNav ? nav : null}
    </div>
  );
}
