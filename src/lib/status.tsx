import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const TASK_STATUSES = [
  { value: "open", label: "Abierta", color: "bg-info text-info-foreground" },
  { value: "in_progress", label: "En proceso", color: "bg-primary text-primary-foreground" },
  { value: "pending", label: "Pendiente", color: "bg-warning text-warning-foreground" },
  { value: "blocked", label: "Bloqueada", color: "bg-destructive text-destructive-foreground" },
  { value: "closed", label: "Cerrada", color: "bg-success text-success-foreground" },
] as const;

export const PRIORITIES = [
  { value: "low", label: "Baja", color: "bg-muted text-muted-foreground" },
  { value: "medium", label: "Media", color: "bg-info/15 text-info" },
  { value: "high", label: "Alta", color: "bg-warning/20 text-warning-foreground" },
  { value: "urgent", label: "Urgente", color: "bg-destructive/15 text-destructive" },
] as const;

export const INVOICE_STATUSES = [
  { value: "draft", label: "Borrador", color: "bg-muted text-muted-foreground" },
  { value: "sent", label: "Enviada", color: "bg-info/15 text-info" },
  { value: "paid", label: "Pagada", color: "bg-success/15 text-success" },
  { value: "overdue", label: "Vencida", color: "bg-destructive/15 text-destructive" },
  { value: "cancelled", label: "Cancelada", color: "bg-muted text-muted-foreground" },
] as const;

export const DOCUMENT_STATUSES = [
  { value: "pending_review", label: "En revisión", color: "bg-warning/20 text-warning-foreground" },
  { value: "approved", label: "Aprobado", color: "bg-success/15 text-success" },
  { value: "rejected", label: "Rechazado", color: "bg-destructive/15 text-destructive" },
] as const;

export const INTAKE_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-warning/20 text-warning-foreground" },
  { value: "reviewed", label: "Reviewed", color: "bg-info/15 text-info" },
  { value: "converted", label: "Converted", color: "bg-success/15 text-success" },
  { value: "rejected", label: "Rejected", color: "bg-destructive/15 text-destructive" },
] as const;

type AnyOption = { value: string; label: string; color: string };

export const StatusBadge = ({ value, options }: { value: string; options: readonly AnyOption[] }) => {
  const opt = options.find((o) => o.value === value);
  if (!opt) return <Badge variant="outline">{value}</Badge>;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", opt.color)}>
      {opt.label}
    </span>
  );
};
