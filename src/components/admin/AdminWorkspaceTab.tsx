import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KanbanSquare, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Workspace = {
  id: string;
  name: string;
  status: string;
  color: string;
  created_at: string;
};

type TaskCounts = {
  total: number;
  open: number;
  in_progress: number;
  pending: number;
  blocked: number;
  closed: number;
  progressAvg: number;
};

const EMPTY_COUNTS: TaskCounts = {
  total: 0, open: 0, in_progress: 0, pending: 0, blocked: 0, closed: 0, progressAvg: 0,
};

interface AdminWorkspaceTabProps {
  clientId: string;
}

export const AdminWorkspaceTab = ({ clientId }: AdminWorkspaceTabProps) => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [counts, setCounts] = useState<TaskCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id, name, status, color, created_at")
      .eq("client_id", clientId)
      .maybeSingle();
    setWorkspace(ws as Workspace | null);

    if (ws) {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("status, progress")
        .eq("workspace_id", ws.id);
      const next: TaskCounts = { ...EMPTY_COUNTS };
      let progressSum = 0;
      (tasks ?? []).forEach((t: any) => {
        next.total += 1;
        if (t.status in next) (next as any)[t.status] += 1;
        progressSum += t.progress ?? 0;
      });
      next.progressAvg = next.total > 0 ? Math.round(progressSum / next.total) : 0;
      setCounts(next);
    } else {
      setCounts(EMPTY_COUNTS);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId]);

  const createWorkspace = async () => {
    setCreating(true);
    const { data: client } = await supabase
      .from("clients")
      .select("company_name")
      .eq("id", clientId)
      .maybeSingle();
    const { error } = await supabase.from("workspaces").insert({
      client_id: clientId,
      name: client?.company_name ?? "Workspace",
      status: "active",
      visibility: "private",
      color: "#3b82f6",
      icon: "briefcase",
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Workspace creado");
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>;

  if (!workspace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KanbanSquare className="h-5 w-5" /> Sin workspace
          </CardTitle>
          <CardDescription>
            Este cliente no tiene workspace todavía. Los workspaces se crean automáticamente cuando un cliente
            pasa a estado "Activo". Si querés podés crear uno ahora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={createWorkspace} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Crear workspace
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: workspace.color }}
              >
                <KanbanSquare className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">{workspace.name}</CardTitle>
                <CardDescription>
                  Workspace creado {new Date(workspace.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
            </div>
            <Button asChild>
              <Link to={`/admin/tasks/workspaces/${workspace.id}`}>
                Abrir kanban <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen de tareas</CardTitle>
          <CardDescription>
            Todas las tareas de este cliente — incluyendo las generadas automáticamente por servicios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {counts.total > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm font-medium">Progreso global</span>
                <span className="text-2xl font-bold tabular-nums">{counts.progressAvg}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${counts.progressAvg}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Promedio del avance de las {counts.total} tarea(s) en el kanban.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatTile label="Total" value={counts.total} />
            <StatTile label="Abiertas" value={counts.open} />
            <StatTile label="En proceso" value={counts.in_progress} />
            <StatTile label="Pendientes" value={counts.pending} />
            <StatTile label="Bloqueadas" value={counts.blocked} />
            <StatTile label="Cerradas" value={counts.closed} />
          </div>
          {counts.total === 0 && (
            <p className="text-xs text-muted-foreground mt-4">
              Sin tareas todavía. Activá un servicio para generar tareas automáticamente, o creá una manualmente
              desde el kanban.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StatTile = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border bg-card p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-bold">{value}</p>
  </div>
);
