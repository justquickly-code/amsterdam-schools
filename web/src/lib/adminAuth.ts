import { createClient } from "@supabase/supabase-js";

type AdminCheckResult = { ok: true } | { ok: false; error: string; status: number };

type AdminCheckOptions = {
  requireTokenInDev?: boolean;
};

type AdminUserResult = { ok: true } | { ok: false; error: string; status: number };

async function getAdminUser(req: Request): Promise<AdminUserResult & { userEmail?: string }> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, error: "Missing Authorization", status: 401 };
  }
  const jwt = authHeader.slice("Bearer ".length).trim();
  if (!jwt) {
    return { ok: false, error: "Missing Authorization", status: 401 };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: false, error: "Missing env vars", status: 500 };
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  const adminList = (process.env.ADMIN_ALLOWLIST_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (adminList.length === 0) {
    return { ok: false, error: "Admin allowlist not configured", status: 403 };
  }

  const userEmail = (userData.user.email ?? "").toLowerCase();
  if (!userEmail || !adminList.includes(userEmail)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  return { ok: true, userEmail };
}

export async function requireAdminUser(req: Request): Promise<AdminUserResult> {
  const base = await getAdminUser(req);
  if (!base.ok) return base;
  return { ok: true };
}

export async function requireAdminSession(
  req: Request,
  options: AdminCheckOptions = {}
): Promise<AdminCheckResult> {
  const adminToken = req.headers.get("x-admin-token") ?? "";
  const expected = process.env.ADMIN_SYNC_TOKEN ?? "";

  const base = await getAdminUser(req);
  if (!base.ok) return base;

  if (process.env.NODE_ENV === "production" || options.requireTokenInDev) {
    if (!expected || adminToken !== expected) {
      return { ok: false, error: "Unauthorized", status: 401 };
    }
  } else if (expected && adminToken !== expected) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  return { ok: true };
}
