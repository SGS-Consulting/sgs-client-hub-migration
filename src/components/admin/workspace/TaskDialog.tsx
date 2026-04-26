import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIORITIES } from "@/lib/status";
import { toast } from "sonner";

export type ColumnLite = { id: string; name: string };
export type AdminLite = { id: string; full_name: string | null; email: string };

type Props = {
  workspaceId: string;
  columns: ColumnLite[];
  admins: AdminLite[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultColumnId?: string;
  onCreated: () => void;
};

export const TaskDialog = ({ workspaceId, columns, admins, open, onOpenChange, defaultColumnId, onCreated }: Props) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [columnId, setColumnId] = useState(defaultColumnId ?? columns[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState("none");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const reset = () => {
    setTitle(""); setDescription(""); setPriority("medium");
    setColumnId(defaultColumnId ?? columns[0]?.id ?? "");
    setAssigneeId("none"); setStartDate(""); setDueDate("");
  };

  const submit = async () => {
    if (!title.trim()) { toast.error("El título es obligatorio"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: description.trim() || null,
      priority: priority as any,
      status: "in_progress" as any,
      workspace_id: workspaceId,
      column_id: columnId || null,
      assignee_id: assigneeId === "none" ? null : assigneeId,
      start_date: startDate || null,
      due_date: dueDate || null,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Tarea creada");
    reset();
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
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
              <Label>Columna</Label>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
            <div className="space-y-2 col-span-2">
              <Label>Responsable</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin asignar —</SelectItem>
                  {admins.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name ?? a.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Inicio</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fecha límite</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
