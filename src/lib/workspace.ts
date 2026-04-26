export const WORKSPACE_STATUSES = [
  { value: "planning", label: "Planning", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  { value: "active", label: "Active", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  { value: "on_hold", label: "On hold", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  { value: "completed", label: "Completed", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  { value: "archived", label: "Archived", color: "bg-muted text-muted-foreground" },
] as const;

export const WORKSPACE_VISIBILITY = [
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
] as const;

export const MEMBER_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
] as const;

export const COLUMN_PRESETS = [
  { name: "New", color: "#3b82f6" },
  { name: "In Progress", color: "#a855f7" },
  { name: "In Review", color: "#ec4899" },
  { name: "Changes Requested", color: "#ef4444" },
  { name: "Approved", color: "#22c55e" },
  { name: "Published", color: "#f59e0b" },
  { name: "Blocked", color: "#dc2626" },
  { name: "Done", color: "#10b981" },
];

export const WORKSPACE_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#64748b", "#14181F",
];
