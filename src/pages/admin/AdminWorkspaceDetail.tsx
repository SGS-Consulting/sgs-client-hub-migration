import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Folder, Plus, Settings as SettingsIcon, Users, KanbanSquare, List, Calendar, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { WORKSPACE_STATUSES } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { KanbanView, type Column, type Task } from "@/components/admin/workspace/KanbanView";
import { ListView } from "@/components/admin/workspace/ListView";
import { CalendarView } from "@/components/admin/workspace/CalendarView";
import { GanttView } from "@/components/admin/workspace/GanttView";
import { ColumnsDialog } from "@/components/admin/workspace/ColumnsDialog";
import { MembersDialog } from "@/components/admin/workspace/MembersDialog";
import { TaskDialog } from "@/components/admin/workspace/TaskDialog";
import { TaskAssignDialog } from "@/components/admin/workspace/TaskAssignDialog";

type Workspace = {
  id: string; name: string; description: string | null; color: string;
  status: string; visibility: string; due_date: string | null;
};

const AdminWorkspaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [admins, setAdmins] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [view, setView] = useState<"kanban" | "list" | "calendar" | "gantt">("kanban");
  const [colDialog, setColDialog] = useState(false);
  const [memDialog, setMemDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [assignTaskId, setAssignTaskId] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const [{ data: w }, { data: cols }, { data: ts }, { data: roles }] = await Promise.all([
      supabase.from("workspaces").select("*").eq("id", id).single(),
      supabase.from("workspace_columns").select("*").eq("workspace_id", id).order("sort_order"),
      supabase.from("tasks").select("id, title, description, priority, due_date, start_date, column_id, assignee_id, progress").eq("workspace_id", id),
      supabase.from("user_roles").select("user_id, role").neq("role", "client"),
    ]);
    setWs(w as Workspace);
    setColumns((cols ?? []) as Column[]);
    setTasks((ts ?? []) as Task[]);

    // All internal users (admin, heads, analysts) become assignable
    const internalIds = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
    if (internalIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", internalIds);
      setAdmins((profs ?? []) as any);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleMove = async (taskId: string, newColumnId: string) => {
    const col = columns.find((c) => c.id === newColumnId);
    const maxSort = Math.max(...columns.map((c) => c.sort_order), 0);
    const newProgress = col?.is_done_column || col?.sort_order === maxSort
      ? 100
      : maxSort === 0
        ? 0
        : Math.round(((col?.sort_order ?? 0) * 100) / maxSort);
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, column_id: newColumnId, progress: newProgress } : t));
    const update: any = { column_id: newColumnId };
    if (col?.is_done_column) update.status = "closed";
    const { error } = await supabase.from("tasks").update(update).eq("id", taskId);
    if (error) { toast.error("No se pudo actualizar"); load(); }
  };

  const assigneeName = (uid: string | null) => {
    if (!uid) return null;
    const a = admins.find((x) => x.id === uid);
    return a?.full_name ?? a?.email ?? null;
  };

  if (!ws) return <div className="text-sm text-muted-foreground">Cargando...</div>;

  const statusOpt = WORKSPACE_STATUSES.find((s) => s.value === ws.status);
  const counts: Record<string, number> = {};
  columns.forEach((c) => { counts[c.id] = tasks.filter((t) => t.column_id === c.id).length; });

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="border-t-4" style={{ borderTopColor: ws.color }}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/admin/tasks/workspaces"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div className="h-12 w-12 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: ws.color }}>
                <Folder className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{ws.name}</h1>
                  {statusOpt && <span className={cn("text-xs px-2 py-0.5 rounded-full", statusOpt.color)}>{statusOpt.label}</span>}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{ws.visibility === "public" ? "Público" : "Privado"}</span>
                </div>
                {ws.description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{ws.description}</p>}
                {ws.due_date && (
                  <p className="text-xs mt-1.5">
                    <span className="font-medium">Fecha límite:</span>{" "}
                    <span className="text-destructive">{new Date(ws.due_date).toLocaleDateString()}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
              <Button variant="outline" onClick={() => setMemDialog(true)}><Users className="h-4 w-4" /> Miembros</Button>
              <Button variant="outline" onClick={() => setColDialog(true)}><SettingsIcon className="h-4 w-4" /> Columnas</Button>
              <Button onClick={() => setTaskDialog(true)}><Plus className="h-4 w-4" /> Nueva tarea</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="kanban"><KanbanSquare className="h-4 w-4 mr-1" /> Kanban</TabsTrigger>
            <TabsTrigger value="list"><List className="h-4 w-4 mr-1" /> Lista</TabsTrigger>
            <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-1" /> Calendario</TabsTrigger>
            <TabsTrigger value="gantt"><BarChart3 className="h-4 w-4 mr-1" /> Gantt</TabsTrigger>
          </TabsList>

          {/* Column count chips like the screenshot */}
          <div className="flex items-center gap-2 flex-wrap">
            {columns.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 text-xs border rounded-full px-2 py-0.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name} <span className="text-muted-foreground">{counts[c.id] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        <TabsContent value="kanban" className="mt-4">
          <KanbanView columns={columns} tasks={tasks} assigneeName={assigneeName} onMove={handleMove} onAssignClick={(tid) => setAssignTaskId(tid)} />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <ListView columns={columns} tasks={tasks} assigneeName={assigneeName} onMove={handleMove} />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <CalendarView tasks={tasks} columns={columns} />
        </TabsContent>
        <TabsContent value="gantt" className="mt-4">
          <GanttView tasks={tasks} columns={columns} />
        </TabsContent>
      </Tabs>

      <ColumnsDialog workspaceId={ws.id} open={colDialog} onOpenChange={setColDialog} onChanged={load} />
      <MembersDialog workspaceId={ws.id} open={memDialog} onOpenChange={setMemDialog} onChanged={load} />
      <TaskDialog
        workspaceId={ws.id}
        columns={columns.map((c) => ({ id: c.id, name: c.name }))}
        admins={admins}
        open={taskDialog}
        onOpenChange={setTaskDialog}
        onCreated={load}
      />
      <TaskAssignDialog
        taskId={assignTaskId}
        taskTitle={tasks.find((t) => t.id === assignTaskId)?.title}
        currentAssigneeId={tasks.find((t) => t.id === assignTaskId)?.assignee_id ?? null}
        admins={admins}
        onClose={() => setAssignTaskId(null)}
        onSaved={load}
      />
    </div>
  );
};

export default AdminWorkspaceDetail;
