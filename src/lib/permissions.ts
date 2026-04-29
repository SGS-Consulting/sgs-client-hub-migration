import type { AppRole } from "@/contexts/AuthContext";

/**
 * Capabilities map. Single source of truth for "who can see/do what" in the admin panel.
 * Keep in sync with the RLS policies in the database.
 */
export type Capability =
  | "view:dashboard"
  | "view:finance"        // facturas, ingresos, por cobrar, pagos
  | "manage:invoices"
  | "view:clients"
  | "manage:clients"
  | "view:tasks"
  | "manage:tasks"
  | "view:workspaces"
  | "manage:workspaces"
  | "view:documents"
  | "manage:documents"
  | "view:services"
  | "manage:services"
  | "view:queries"
  | "manage:queries"
  | "view:team"
  | "manage:team"
  | "view:settings";

const RULES: Record<AppRole, Capability[]> = {
  admin: [
    "view:dashboard",
    "view:finance", "manage:invoices",
    "view:clients", "manage:clients",
    "view:tasks", "manage:tasks",
    "view:workspaces", "manage:workspaces",
    "view:documents", "manage:documents",
    "view:services", "manage:services",
    "view:queries", "manage:queries",
    "view:team", "manage:team",
    "view:settings",
  ],
  finance: [
    "view:dashboard",
    "view:finance", "manage:invoices",
    "view:clients", // sólo lectura para contexto
  ],
  operations: [
    "view:dashboard",
    "view:clients", "manage:clients",
    "view:tasks", "manage:tasks",
    "view:workspaces", "manage:workspaces",
    "view:documents", "manage:documents",
    "view:services",
    "view:queries", "manage:queries",
  ],
  staff: [
    "view:dashboard",
    "view:tasks", // solo asignadas (RLS)
    "view:workspaces",
    "view:queries", "manage:queries", // staff create queries during bookkeeping
  ],
  client: [],
};

export const can = (roles: AppRole[] | null | undefined, cap: Capability): boolean => {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => RULES[r]?.includes(cap));
};

export const isInternal = (role: AppRole | null): boolean =>
  role !== null && role !== "client";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  finance: "Finanzas",
  operations: "Operaciones",
  staff: "Miembro",
  client: "Cliente",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Acceso total al sistema",
  finance: "Facturación, pagos e ingresos",
  operations: "Clientes, tareas y workspaces (sin finanzas)",
  staff: "Sólo sus tareas asignadas",
  client: "Portal de cliente",
};

export const ASSIGNABLE_INTERNAL_ROLES: AppRole[] = ["admin", "finance", "operations", "staff"];
