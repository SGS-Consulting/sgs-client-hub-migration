import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export type AdminLite = { id: string; full_name: string | null; email: string };

interface Props {
  taskId: string | null;
  taskTitle?: string;
  currentAssigneeId: string | null;
  admins: AdminLite[];
  onClose: () => void;
  onSaved: () => void;
}

export const TaskAssignDialog = ({
  taskId,
  taskTitle,
  currentAssigneeId,
  admins,
  onClose,
  onSaved,
}: Props) => {
  const [assigneeId, setAssigneeId] = useState<string>("none");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAssigneeId(currentAssigneeId ?? "none");
  }, [currentAssigneeId, taskId]);

  const save = async () => {
    if (!taskId) return;
    setBusy(true);
    const { error } = await supabase
      .from("tasks")
      .update({ assignee_id: assigneeId === "none" ? null : assigneeId })
      .eq("id", taskId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(assigneeId === "none" ? "Asignación removida" : "Tarea asignada");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!taskId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Asignar tarea
          </DialogTitle>
          <DialogDescription>{taskTitle}</DialogDescription>
        </DialogHeader>
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
