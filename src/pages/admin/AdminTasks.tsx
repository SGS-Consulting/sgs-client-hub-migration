import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { TASK_STATUSES, PRIORITIES, StatusBadge } from "@/lib/status";
import { Plus, Calendar, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  client_id: string | null;
  assignee_id: string | null;
};

type Client = { id: string; company_name: string };
type Profile = { id: string; full_name: string | null; email: string };

const AdminTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("open");
  const [clientId, setClientId] = useState<string>("none");
  const [assigneeId, setAssigneeId] = useState<string>("none");
  const [dueDate, setDueDate] = useState("");

  const load = async () => {
    const [t, c, roles] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("id, company_name").order("company_name"),
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
    ]);
    setTasks((t.data ?? []) as Task[]);
    setClients((c.data ?? []) as Client[]);

    const adminIds = (roles.data ?? []).map((r: any) => r.user_id);
    if (adminIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", adminIds);
      setAdmins((profs ?? []) as Profile[]);
    }
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    TASK_STATUSES.forEach((s) => (map[s.value] = []));
    tasks.forEach((t) => { (map[t.status] ??= []).push(t); });
    return map;
  }, [tasks]);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: description.trim() || null,
      priority: priority as any,
      status: status as any,
      client_id: clientId === "none" ? null : clientId,
      assignee_id: assigneeId === "none" ? null : assigneeId,
      due_date: dueDate || null,
      created_by: user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Tarea creada");
    setOpen(false);
    setTitle(""); setDescription(""); setPriority("medium"); setStatus("open");
    setClientId("none"); setAssigneeId("none"); setDueDate("");
    load();
  };

  const handleDrop = async (newStatus: string) => {
    if (!draggedId) return;
    const task = tasks.find((t) => t.id === draggedId);
    if (!task || task.status === newStatus) { setDraggedId(null); return; }
    setTasks((prev) => prev.map((t) => t.id === draggedId ? { ...t, status: newStatus } : t));
    const { error } = await supabase.from("tasks").update({ status: newStatus as any }).eq("id", draggedId);
    if (error) { toast.error("No se pudo actualizar"); load(); }
    setDraggedId(null);
  };

  const clientName = (id: string | null) => id ? clients.find((c) => c.id === id)?.company_name ?? "—" : null;
  const assigneeName = (id: string | null) => id ? admins.find((a) => a.id === id)?.full_name ?? admins.find((a) => a.id === id)?.email ?? "—" : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Tareas</h1>
          <p className="text-sm text-muted-foreground">Tablero Kanban — arrastra para cambiar estado.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nueva tarea</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sin cliente —</SelectItem>
                      {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Responsable</Label>
                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sin asignar —</SelectItem>
                      {admins.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.full_name ?? a.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Fecha límite</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate}>Crear</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {TASK_STATUSES.map((col) => (
          <div
            key={col.value}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.value)}
            className="rounded-lg bg-muted/30 p-3 min-h-[400px] flex flex-col"
          >
            <div className="flex items-center justify-between mb-3">
              <StatusBadge value={col.value} options={TASK_STATUSES} />
              <span className="text-xs text-muted-foreground">{grouped[col.value]?.length ?? 0}</span>
            </div>
            <div className="space-y-2 flex-1">
              {(grouped[col.value] ?? []).map((task) => {
                const overdue = task.due_date && task.due_date < new Date().toISOString().split("T")[0] && task.status !== "closed";
                return (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={() => setDraggedId(task.id)}
                    className={cn("cursor-grab active:cursor-grabbing transition", overdue && "border-destructive/50")}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{task.title}</p>
                        <StatusBadge value={task.priority} options={PRIORITIES} />
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        {clientName(task.client_id) && <span>{clientName(task.client_id)}</span>}
                        {assigneeName(task.assignee_id) && (
                          <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{assigneeName(task.assignee_id)}</span>
                        )}
                        {task.due_date && (
                          <span className={cn("flex items-center gap-1 ml-auto", overdue && "text-destructive")}>
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminTasks;
