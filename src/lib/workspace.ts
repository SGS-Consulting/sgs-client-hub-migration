export const WORKSPACE_STATUSES = [
  { value: "planning", label: "Planificación", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  { value: "active", label: "Activo", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  { value: "on_hold", label: "En pausa", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  { value: "completed", label: "Completado", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  { value: "archived", label: "Archivado", color: "bg-muted text-muted-foreground" },
] as const;

export const WORKSPACE_VISIBILITY = [
  { value: "private", label: "Privado" },
  { value: "public", label: "Público" },
] as const;

export const MEMBER_ROLES = [
  { value: "owner", label: "Propietario" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Lector" },
] as const;

export const COLUMN_PRESETS = [
  { name: "Nuevo", color: "#3b82f6" },
  { name: "En proceso", color: "#a855f7" },
  { name: "En revisión", color: "#ec4899" },
  { name: "Cambios solicitados", color: "#ef4444" },
  { name: "Aprobado", color: "#22c55e" },
  { name: "Publicado", color: "#f59e0b" },
  { name: "Bloqueado", color: "#dc2626" },
  { name: "Hecho", color: "#10b981" },
];

export const WORKSPACE_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#64748b", "#14181F",
];
