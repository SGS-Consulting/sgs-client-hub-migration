import type { AppRole } from "@/contexts/AuthContext";

/**
 * Capabilities map. Single source of truth for "who can see/do what" in the admin panel.
 * Keep in sync with the RLS policies in the database.
 *
 * Hierarchy (2026-05-02):
 *   admin (Abner) — sees everything, only one who sees pricing/revenue
 *   head_<dept> + analyst_<dept> — same visibility scope (all clients),
 *     write access scoped to their dept's tables. Analysts have a few
 *     read-only restrictions (no service activation, no closing legal/advisory cases).
 *   Departments: accounting (Germain), branding (Jesus), it (Karen)
 */
export type Capability =
  // Top-level navigation
  | "view:dashboard"
  | "view:tasks" | "manage:tasks"
  | "view:workspaces" | "manage:workspaces"
  | "view:clients" | "manage:clients"
  | "view:documents" | "manage:documents"
  | "view:queries" | "manage:queries"
  | "view:team" | "manage:team"
  | "view:settings" | "manage:settings"
  | "view:intake"
  // Money — admin only
  | "view:finance" | "manage:invoices" | "view:services_pricing"
  | "view:services" | "manage:services"
  // Per-SOP / per-dept scopes
  | "view:advisory" | "manage:advisory"            // SOP-07 — admin
  | "view:legal_cases" | "manage:legal_cases"      // SOP-05 — admin
  | "view:insurance" | "manage:insurance"          // SOP-06 — admin
  | "view:branding" | "manage:branding"            // SOP-09 — admin + branding
  | "view:workers" | "manage:workers"              // SOP-04 workers — admin + accounting
  | "view:tax_strategy" | "manage:tax_strategy";   // SOP-04 tax — admin + accounting

const ALL_INTERNAL_VIEW: Capability[] = [
  "view:dashboard",
  "view:tasks", "manage:tasks",
  "view:workspaces",
  "view:clients",
  "view:documents", "manage:documents",
  "view:queries", "manage:queries",
  "view:services",      // can see service names + which are active per client (UI hides prices)
];

const RULES: Record<AppRole, Capability[]> = {
  // ---- Abner: full access ----
  admin: [
    "view:dashboard",
    "view:finance", "manage:invoices", "view:services_pricing",
    "view:clients", "manage:clients", "view:intake",
    "view:tasks", "manage:tasks",
    "view:workspaces", "manage:workspaces",
    "view:documents", "manage:documents",
    "view:services", "manage:services",
    "view:queries", "manage:queries",
    "view:team", "manage:team",
    "view:settings", "manage:settings",
    "view:advisory", "manage:advisory",
    "view:legal_cases", "manage:legal_cases",
    "view:insurance", "manage:insurance",
    "view:branding", "manage:branding",
    "view:workers", "manage:workers",
    "view:tax_strategy", "manage:tax_strategy",
  ],

  // ---- Heads ----
  head_accounting: [
    ...ALL_INTERNAL_VIEW,
    "view:workers", "manage:workers",
    "view:tax_strategy", "manage:tax_strategy",
  ],
  head_branding: [
    ...ALL_INTERNAL_VIEW,
    "view:branding", "manage:branding",
  ],
  head_it: [
    ...ALL_INTERNAL_VIEW,
    "manage:workspaces",
    "view:settings", "manage:settings",
  ],

  // ---- Analysts: same visibility, read-only on activation/closure ----
  analyst_accounting: [
    ...ALL_INTERNAL_VIEW,
    "view:workers", "manage:workers",      // can edit workers + W-9
    "view:tax_strategy",                    // read-only on tax strategies (no manage)
  ],
  analyst_branding: [
    ...ALL_INTERNAL_VIEW,
    "view:branding", "manage:branding",     // can advance phases, upload docs
  ],
  analyst_it: [
    ...ALL_INTERNAL_VIEW,
    "view:settings",                        // read settings, no manage
  ],

  // ---- Legacy (kept for backwards compat with seeded data) ----
  finance: [
    "view:dashboard",
    "view:finance", "manage:invoices",
    "view:clients",
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
    "view:tasks",
    "view:workspaces",
    "view:queries", "manage:queries",
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
  head_accounting: "Jefe de Contabilidad",
  head_branding: "Jefe de Branding",
  head_it: "Jefe de IT",
  analyst_accounting: "Analista de Contabilidad",
  analyst_branding: "Analista de Branding",
  analyst_it: "Analista de IT",
  finance: "Finanzas",
  operations: "Operaciones",
  staff: "Miembro",
  client: "Cliente",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Acceso total: clientes, finanzas, todos los SOPs",
  head_accounting: "Contabilidad y impuestos (SOP-03, SOP-04)",
  head_branding: "Branding e identidad (SOP-09)",
  head_it: "Infraestructura, workspaces, configuración",
  analyst_accounting: "Contabilidad e impuestos (sin activación de servicios)",
  analyst_branding: "Branding (ejecución de fases)",
  analyst_it: "IT (lectura de configuración)",
  finance: "Facturación, pagos e ingresos",
  operations: "Clientes, tareas y workspaces (sin finanzas)",
  staff: "Sólo sus tareas asignadas",
  client: "Portal de cliente",
};

export const ASSIGNABLE_INTERNAL_ROLES: AppRole[] = [
  "admin",
  "head_accounting", "head_branding", "head_it",
  "analyst_accounting", "analyst_branding", "analyst_it",
];
