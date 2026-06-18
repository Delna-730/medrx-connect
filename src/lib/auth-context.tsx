import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "retailer";
export type RetailerStatus = "pending" | "approved" | "rejected";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  retailerStatus: RetailerStatus | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [retailerStatus, setRetailerStatus] = useState<RetailerStatus | null>(null);

  async function loadProfile(u: User | null) {
    if (!u) {
      setRole(null);
      setRetailerStatus(null);
      return;
    }
    const [{ data: roles }, { data: retailer }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.id),
      supabase.from("retailers").select("status").eq("user_id", u.id).maybeSingle(),
    ]);
    const isAdmin = roles?.some((r) => r.role === "admin");
    const isRetailer = roles?.some((r) => r.role === "retailer");
    setRole(isAdmin ? "admin" : isRetailer ? "retailer" : null);
    setRetailerStatus((retailer?.status as RetailerStatus) ?? null);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setTimeout(() => loadProfile(s?.user ?? null), 0);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await loadProfile(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => loadProfile(user);
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthCtx.Provider value={{ user, session, loading, role, retailerStatus, refresh, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
