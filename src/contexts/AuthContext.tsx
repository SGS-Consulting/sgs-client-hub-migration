import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "head_accounting" | "head_branding" | "head_it"
  | "analyst_accounting" | "analyst_branding" | "analyst_it"
  | "finance" | "operations" | "staff"
  | "client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** Highest-privilege internal role (admin > finance/operations > staff), or "client", or null */
  role: AppRole | null;
  /** All roles the user has (an internal user can have several). */
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PRIORITY: AppRole[] = [
  "admin",
  "head_accounting", "head_branding", "head_it",
  "analyst_accounting", "analyst_branding", "analyst_it",
  "finance", "operations", "staff",
  "client",
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (!data || data.length === 0) {
      setRoles([]);
      setRole(null);
      return;
    }
    const list = data.map((r: any) => r.role as AppRole);
    setRoles(list);
    const top = PRIORITY.find((p) => list.includes(p)) ?? null;
    setRole(top);
  };

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setTimeout(() => fetchRole(newSession.user.id), 0);
      } else {
        setRoles([]);
        setRole(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchRole(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setRole(null);
  };

  const refreshRole = async () => {
    if (user) await fetchRole(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, roles, loading, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
