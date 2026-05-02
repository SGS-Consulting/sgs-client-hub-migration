import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Folder, FolderOpen, Plus, RefreshCw, Inbox, ListChecks, Users, Calendar as CalendarIcon, UserPlus } from "lucide-react";
import { PRIORITIES, StatusBadge } from "@/lib/status";
import { cn } from "@/lib/utils";
import { TaskAssignDialog } from "@/components/admin/workspace/TaskAssignDialog";

type Workspace = { id: string; name: string; color: string; status: string };
type ColumnAgg = { id: string; name: string; color: string; workspace_id: string; count: number };
type Task = {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  workspace_id: string | null;
  column_id: string | null;
  assignee_id: string | null;
  status: string;
};
type Admin = { id: string; full_name: string | null; email: string };

const AdminTasks = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [columns, setColumns] = useState<ColumnAgg[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [assignTaskId, setAssignTaskId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setMe(user?.id ?? null);

    const [ws, cols, ts, roles] = await Promise.all([
      supabase.from("workspaces").select("id, name, color, status").neq("status", "archived").order("created_at", { ascending: false }),
      supabase.from("workspace_columns").select("id, name, color, workspace_id").order("sort_order"),
      supabase.from("tasks").select("id, title, priority, due_date, workspace_id, column_id, assignee_id, status").order("updated_at", { ascending: false }).limit(200),
      supabase.from("user_roles").select("user_id").neq("role", "client"),
    ]);

    setWorkspaces((ws.data ?? []) as Workspace[]);
    setTasks((ts.data ?? []) as Task[]);

    const internalIds = Array.from(new Set((roles.data ?? []).map((r: any) => r.user_id)));
    if (internalIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", internalIds);
      setAdmins((profs ?? []) as Admin[]);
    }

    const colArr: ColumnAgg[] = (cols.data ?? []).map((c: any) => ({
      ...c,
      count: (ts.data ?? []).filter((t: any) => t.column_id === c.id).length,
    }));
    setColumns(colArr);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredTasks = tasks.filter((t) => filter === "all" || t.workspace_id === filter);

  // Global stats: group columns by name across all workspaces
  const statsByName = columns.reduce<Record<string, { count: number; color: string }>>((acc, c) => {
    if (!acc[c.name]) acc[c.name] = { count: 0, color: c.color };
    acc[c.name].count += c.count;
    return acc;
  }, {});

  const myAssigned = filteredTasks.filter((t) => t.assignee_id === me && t.status !== "closed");
  const unassigned = filteredTasks.filter((t) => !t.assignee_id && t.status !== "closed");
  const teamAssigned = filteredTasks.filter((t) => t.assignee_id && t.assignee_id !== me && t.status !== "closed");

  const wsName = (id: string | null) => workspaces.find((w) => w.id === id)?.name ?? "—";
  const wsColor = (id: string | null) => workspaces.find((w) => w.id === id)?.color ?? "#94a3b8";
  const adminName = (id: string | null) => {
    if (!id) return null;
    const a = admins.find((x) => x.id === id);
    return a?.full_name ?? a?.email ?? null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary">
                <FolderOpen className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Centro de trabajo</h1>
                <p className="text-sm text-muted-foreground">Panel de gestión de trabajo del equipo SGS</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Todos los workspaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los workspaces</SelectItem>
                  {workspaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={load} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button asChild>
                <Link to="/admin/tasks/workspaces">
                  <Folder className="h-4 w-4" /> Ver workspaces
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(statsByName).slice(0, 5).map(([name, { count, color }]) => (
          <Card key={name} className="border-l-4" style={{ borderLeftColor: color }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{name}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}22`, color }}>
                <ListChecks className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
        {Object.keys(statsByName).length === 0 && (
          <Card className="md:col-span-3 lg:col-span-5">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Aún no hay workspaces. <Link to="/admin/tasks/workspaces" className="text-primary underline">Crea el primero</Link>.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mis tareas (assigned to me) — always shown */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> Mis tareas</h2>
            <Badge variant="secondary">{myAssigned.length}</Badge>
          </div>
          <div className="divide-y">
            {myAssigned.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No tenés tareas asignadas.</p>
            ) : (
              myAssigned.slice(0, 10).map((t) => (
                <TaskRow key={t.id} task={t} wsName={wsName(t.workspace_id)} wsColor={wsColor(t.workspace_id)} />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sin asignar (head's inbox; admin sees global unassigned) */}
      {unassigned.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><Inbox className="h-4 w-4 text-primary" /> Sin asignar</h2>
              <Badge variant="outline">{unassigned.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Tareas de tu departamento que todavía no tienen responsable. Hacé clic en "Asignar" para distribuirlas.
            </p>
            <div className="divide-y max-h-[480px] overflow-y-auto">
              {unassigned.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 gap-3">
                  <Link to={t.workspace_id ? `/admin/tasks/workspaces/${t.workspace_id}` : "#"} className="flex items-center gap-2 min-w-0 flex-1 hover:bg-muted/30 -mx-2 px-2 py-1 rounded">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: wsColor(t.workspace_id) }} />
                    <div className="min-w-0">
                      <p className="text-sm truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{wsName(t.workspace_id)}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge value={t.priority} options={PRIORITIES} />
                    {t.due_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {new Date(t.due_date).toLocaleDateString()}
                      </span>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setAssignTaskId(t.id)}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Asignar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Asignadas al equipo (visible to head/admin only — analysts won't see others' tasks) */}
      {teamAssigned.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Asignadas al equipo</h2>
              <Badge variant="outline">{teamAssigned.length}</Badge>
            </div>
            <div className="divide-y max-h-[480px] overflow-y-auto">
              {teamAssigned.map((t) => (
                <Link to={t.workspace_id ? `/admin/tasks/workspaces/${t.workspace_id}` : "#"} key={t.id} className="flex items-center justify-between py-2.5 gap-3 hover:bg-muted/30 px-2 rounded">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: wsColor(t.workspace_id) }} />
                    <div className="min-w-0">
                      <p className="text-sm truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {wsName(t.workspace_id)} · {adminName(t.assignee_id) ?? "—"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge value={t.priority} options={PRIORITIES} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <TaskAssignDialog
        taskId={assignTaskId}
        taskTitle={tasks.find((t) => t.id === assignTaskId)?.title}
        currentAssigneeId={tasks.find((t) => t.id === assignTaskId)?.assignee_id ?? null}
        admins={admins}
        onClose={() => setAssignTaskId(null)}
        onSaved={load}
      />

      {/* My Workspaces strip */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2"><Folder className="h-4 w-4 text-primary" /> Mis workspaces</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/tasks/workspaces">Ver todos →</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {workspaces.slice(0, 6).map((w) => {
              const count = tasks.filter((t) => t.workspace_id === w.id).length;
              return (
                <Link key={w.id} to={`/admin/tasks/workspaces/${w.id}`} className="border rounded-lg p-3 hover:bg-muted/30 transition flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md flex items-center justify-center text-white shrink-0" style={{ backgroundColor: w.color }}>
                    <Folder className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{count} tareas</p>
                  </div>
                </Link>
              );
            })}
            <Link to="/admin/tasks/workspaces" className="border-2 border-dashed rounded-lg p-3 hover:bg-muted/30 transition flex items-center justify-center text-muted-foreground hover:text-primary">
              <Plus className="h-4 w-4 mr-1" /> Nuevo
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const TaskRow = ({ task, wsName, wsColor }: { task: Task; wsName: string; wsColor: string }) => (
  <Link
    to={task.workspace_id ? `/admin/tasks/workspaces/${task.workspace_id}` : "#"}
    className="flex items-center justify-between py-2.5 gap-3 hover:bg-muted/30 -mx-2 px-2 rounded"
  >
    <div className="flex items-center gap-2 min-w-0">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: wsColor }} />
      <div className="min-w-0">
        <p className="text-sm truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground">{wsName}</p>
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <StatusBadge value={task.priority} options={PRIORITIES} />
      {task.due_date && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <CalendarIcon className="h-3 w-3" />
          {new Date(task.due_date).toLocaleDateString()}
        </span>
      )}
    </div>
  </Link>
);

export default AdminTasks;
