import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { COLUMN_PRESETS } from "@/lib/workspace";
import { cn } from "@/lib/utils";

export type WorkspaceColumn = {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_done_column: boolean;
};

type Props = {
  workspaceId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged: () => void;
};

export const ColumnsDialog = ({ workspaceId, open, onOpenChange, onChanged }: Props) => {
  const [cols, setCols] = useState<WorkspaceColumn[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");

  const load = async () => {
    const { data } = await supabase.from("workspace_columns").select("*").eq("workspace_id", workspaceId).order("sort_order");
    setCols((data ?? []) as WorkspaceColumn[]);
  };

  useEffect(() => { if (open) load(); }, [open, workspaceId]);

  const addColumn = async (name: string, color: string) => {
    if (!name.trim()) return;
    const maxOrder = cols.reduce((m, c) => Math.max(m, c.sort_order), -1);
    const { error } = await supabase.from("workspace_columns").insert({
      workspace_id: workspaceId,
      name: name.trim(),
      color,
      sort_order: maxOrder + 1,
    });
    if (error) { toast.error(error.message); return; }
    setNewName(""); setNewColor("#6366f1");
    load(); onChanged();
  };

  const updateColumn = async (id: string, patch: Partial<WorkspaceColumn>) => {
    const { error } = await supabase.from("workspace_columns").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    load(); onChanged();
  };

  const removeColumn = async (id: string) => {
    if (!confirm("¿Eliminar columna? Las tareas en ella quedarán sin columna.")) return;
    const { error } = await supabase.from("workspace_columns").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load(); onChanged();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = cols.findIndex((c) => c.id === id);
    const swap = cols[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("workspace_columns").update({ sort_order: swap.sort_order }).eq("id", id),
      supabase.from("workspace_columns").update({ sort_order: cols[idx].sort_order }).eq("id", swap.id),
    ]);
    load(); onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Configurar columnas</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            {cols.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2 border rounded-lg p-2">
                <div className="flex flex-col">
                  <button onClick={() => move(c.id, -1)} disabled={i === 0} className="text-xs text-muted-foreground disabled:opacity-30">▲</button>
                  <button onClick={() => move(c.id, 1)} disabled={i === cols.length - 1} className="text-xs text-muted-foreground disabled:opacity-30">▼</button>
                </div>
                <input
                  type="color"
                  value={c.color}
                  onChange={(e) => updateColumn(c.id, { color: e.target.value })}
                  className="h-8 w-10 rounded cursor-pointer border"
                />
                <Input
                  value={c.name}
                  onChange={(e) => setCols((prev) => prev.map((p) => p.id === c.id ? { ...p, name: e.target.value } : p))}
                  onBlur={(e) => updateColumn(c.id, { name: e.target.value })}
                  className="flex-1"
                />
                <label className="flex items-center gap-2 text-xs whitespace-nowrap">
                  <Switch checked={c.is_done_column} onCheckedChange={(v) => updateColumn(c.id, { is_done_column: v })} />
                  Final
                </label>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeColumn(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-2">
            <Label>Añadir columna</Label>
            <div className="flex gap-2">
              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre" />
              <Button onClick={() => addColumn(newName, newColor)}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              <span className="text-xs text-muted-foreground mr-1">Presets:</span>
              {COLUMN_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => addColumn(p.name, p.color)}
                  className="text-xs px-2 py-0.5 rounded-full border hover:bg-muted"
                  style={{ borderColor: p.color, color: p.color }}
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
