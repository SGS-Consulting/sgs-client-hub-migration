import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { can, isInternal, type Capability } from "@/lib/permissions";

interface Props {
  children: React.ReactNode;
  /** "internal" = any non-client role, "client" = only client portal */
  requireArea?: "internal" | "client";
  /** Optional capability — if missing the user is redirected to the area's home. */
  requireCap?: Capability;
}

export const ProtectedRoute = ({ children, requireArea, requireCap }: Props) => {
  const { user, role, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireArea === "internal" && !isInternal(role)) {
    return <Navigate to="/portal" replace />;
  }
  if (requireArea === "client" && role !== "client") {
    return <Navigate to="/admin" replace />;
  }

  if (requireCap && !can(roles, requireCap)) {
    // No permission for this section — bounce to admin home
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
