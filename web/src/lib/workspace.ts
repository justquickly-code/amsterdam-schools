"use client";

import { supabase } from "@/lib/supabaseClient";

export type WorkspaceRole = "owner" | "editor" | "viewer";

type WorkspaceMemberRow<T> = {
  role: WorkspaceRole;
  workspace?: T | T[] | null;
};

export async function fetchCurrentWorkspace<T>(select: string) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) {
    return { workspace: null as T | null, role: null as WorkspaceRole | null };
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select(`role,workspace:workspaces(${select})`)
    .eq("user_id", session.session.user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return { workspace: null as T | null, role: null as WorkspaceRole | null, error: error.message };
  }

  const list = (data ?? [])
    .map((row) => {
      const r = row as WorkspaceMemberRow<T>;
      const ws = Array.isArray(r.workspace) ? r.workspace[0] : r.workspace;
      if (!ws) return null;
      return { role: r.role, workspace: ws };
    })
    .filter(Boolean) as Array<{ role: WorkspaceRole; workspace: T }>;

  if (list.length === 0) {
    return { workspace: null as T | null, role: null as WorkspaceRole | null };
  }

  const nonOwner = list.find((item) => item.role !== "owner");
  const pick = nonOwner ?? list[0];
  return { workspace: pick.workspace, role: pick.role };
}
