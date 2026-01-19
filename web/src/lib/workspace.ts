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

    const activeWorkspaceId =
      typeof window !== "undefined" ? window.localStorage.getItem("active_workspace_id") : null;

    const { data, error } = await supabase
      .from("workspace_members")
      .select(`role,workspace:workspaces(${select})`)
      .eq("user_id", session.session.user.id)
      .order("created_at", { ascending: true });

    if (error) {
      return { workspace: null as T | null, role: null as WorkspaceRole | null, error: error.message };
    }

    const rows = (data as unknown as WorkspaceMemberRow<T>[] | null) ?? [];
    const list = rows
      .map((row) => {
        const ws = Array.isArray(row.workspace) ? row.workspace[0] : row.workspace;
        if (!ws) return null;
        return { role: row.role, workspace: ws };
      })
      .filter(Boolean) as Array<{ role: WorkspaceRole; workspace: T }>;

    if (list.length === 0) {
      return { workspace: null as T | null, role: null as WorkspaceRole | null };
    }

    const activePick = activeWorkspaceId
      ? list.find((item) => {
          const ws = item.workspace as unknown as { id?: string } | undefined;
          return ws?.id === activeWorkspaceId;
        })
      : null;
    const nonOwner = list.find((item) => item.role !== "owner");
    const pick = activePick ?? nonOwner ?? list[0];
    return { workspace: pick.workspace, role: pick.role };
  }