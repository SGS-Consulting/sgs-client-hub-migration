import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type HistoryRow = {
  id: string;
  worker_id: string;
  action: "insert" | "update" | "delete";
  old_row: Record<string, any> | null;
  new_row: Record<string, any> | null;
  changed_by: string | null;
  changed_at: string;
};

type Profile = { id: string; full_name: string | null; email: string | null };

type Props = {
  workerId: string | null;
  workerLabel?: string;
  onOpenChange: (open: boolean) => void;
};

const FIELD_LABELS: Record<string, string> = {
  full_name: "Nombre",
  email: "Email",
  worker_type: "Tipo",
  is_contractor: "Es contratista",
  start_date: "Fecha de inicio",
  end_date: "Fecha de baja",
  status: "Estado",
  notes: "Notas",
};

const HIDDEN_KEYS = new Set(["id", "client_id", "created_at", "updated_at", "created_by", "updated_by"]);

function diffOf(action: HistoryRow["action"], oldRow: any, newRow: any) {
  if (action === "insert") {
    return Object.entries(newRow ?? {})
      .filter(([k, v]) => !HIDDEN_KEYS.has(k) && v !== null && v !== "")
      .map(([k, v]) => ({ key: k, before: null as any, after: v }));
  }
  if (action === "delete") {
    return Object.entries(oldRow ?? {})
      .filter(([k, v]) => !HIDDEN_KEYS.has(k) && v !== null && v !== "")
      .map(([k, v]) => ({ key: k, before: v, after: null as any }));
  }
  // update — only the keys that actually changed
  const keys = new Set([...Object.keys(oldRow ?? {}), ...Object.keys(newRow ?? {})]);
  const out: { key: string; before: any; after: any }[] = [];
  keys.forEach((k) => {
    if (HIDDEN_KEYS.has(k)) return;
    const before = oldRow?.[k] ?? null;
    const after = newRow?.[k] ?? null;
    if (JSON.stringify(before) !== JSON.stringify(after)) out.push({ key: k, before, after });
  });
  return out;
}

const fmtVal = (v: any) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "sí" : "no";
  return String(v);
};

const ACTION_TONES: Record<HistoryRow["action"], "default" | "secondary" | "destructive"> = {
  insert: "default",
  update: "secondary",
  delete: "destructive",
};

export const WorkerAuditLog = ({ workerId, workerLabel, onOpenChange }: Props) => {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workerId) return;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("client_workers_history")
        .select("*")
        .eq("worker_id", workerId)
        .order("changed_at", { ascending: false });
      if (error) {
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as HistoryRow[];
      setHistory(rows);
      const userIds = Array.from(new Set(rows.map((r) => r.changed_by).filter(Boolean) as string[]));
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        const map: Record<string, Profile> = {};
        (profs ?? []).forEach((p: any) => (map[p.id] = p));
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [workerId]);

  return (
    <Sheet open={!!workerId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Historial de cambios</SheetTitle>
          <SheetDescription>
            {workerLabel ?? "Worker"} — todas las modificaciones registradas en{" "}
            <code className="text-xs">client_workers_history</code>.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando historial...
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>
          ) : (
            history.map((h) => {
              const diff = diffOf(h.action, h.old_row, h.new_row);
              const who = h.changed_by ? profiles[h.changed_by] : null;
              const whoLabel = who?.full_name || who?.email || h.changed_by || "Sistema";
              return (
                <div key={h.id} className="rounded-md border bg-card p-3 text-sm">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant={ACTION_TONES[h.action]}>{h.action}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(h.changed_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">por {whoLabel}</p>
                  {diff.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Sin diferencias visibles.</p>
                  ) : (
                    <ul className="space-y-1">
                      {diff.map((d) => (
                        <li key={d.key} className="text-xs">
                          <span className="font-medium">{FIELD_LABELS[d.key] ?? d.key}:</span>{" "}
                          {h.action === "insert" ? (
                            <span className="text-muted-foreground">{fmtVal(d.after)}</span>
                          ) : h.action === "delete" ? (
                            <span className="text-muted-foreground line-through">{fmtVal(d.before)}</span>
                          ) : (
                            <>
                              <span className="text-muted-foreground line-through">{fmtVal(d.before)}</span>{" "}
                              → <span>{fmtVal(d.after)}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
