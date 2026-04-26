import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Folder, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { WORKSPACE_STATUSES, WORKSPACE_VISIBILITY, WORKSPACE_COLORS } from "@/lib/workspace";
import { cn } from "@/lib/utils";

type Workspace = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  visibility: string;
  created_at: string;
};

const AdminWorkspaces = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Workspace[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  // form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(WORKSPACE_COLORS[0]);
  const [status, setStatus] = useState("planning");
  const [visibility, setVisibility] = useState("private");

  const load = async () => {
    const [ws, ts] = await Promise.all([
      supabase.from("workspaces").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("workspace_id"),
    ]);
    setItems((ws.data ?? []) as Workspace[]);
    const counts: Record<string, number> = {};
    (ts.data ?? []).forEach((t: any) => {
      if (t.workspace_id) counts[t.workspace_id] = (counts[t.workspace_id] ?? 0) + 1;
    });
    setTaskCounts(counts);
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((w) => {
    if (!showArchived && w.status === "archived") return false;
    if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("El nombre es obligatorio"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("workspaces").insert({
      name: name.trim(),
      description: description.trim() || null,
      color,
      status: status as any,
      visibility: visibility as any,
      created_by: user?.id,
    }).select().single();

    if (error) { toast.error(error.message); return; }
    toast.success("Workspace creado");
    setOpen(false);
    setName(""); setDescription(""); setColor(WORKSPACE_COLORS[0]); setStatus("planning"); setVisibility("private");
    navigate(`/admin/tasks/workspaces/${data.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar workspace y todas sus columnas? Las tareas quedarán sin workspace.")) return;
    const { error } = await supabase.from("workspaces").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Workspace eliminado");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/tasks"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Folder className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Workspaces</h1>
            <p className="text-sm text-muted-foreground">Gestiona tus espacios de trabajo</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workspace..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-[240px]"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={showArchived} onCheckedChange={(v) => setShowArchived(!!v)} />
            Show archived
          </label>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> New workspace</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo workspace</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. OPERATIONS Weekly Analysis - W16 2026" />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Propósito del workspace..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WORKSPACE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Visibilidad</Label>
                    <Select value={visibility} onValueChange={setVisibility}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WORKSPACE_VISIBILITY.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {WORKSPACE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn("h-7 w-7 rounded-md border-2 transition", color === c ? "border-foreground scale-110" : "border-transparent")}
                        style={{ backgroundColor: c }}
                      />
                    ))}
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Create card */}
        <button
          onClick={() => setOpen(true)}
          className="border-2 border-dashed rounded-lg p-6 min-h-[200px] flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/30 hover:text-primary hover:border-primary transition"
        >
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Plus className="h-6 w-6" />
          </div>
          <span className="text-sm font-medium">Create workspace</span>
        </button>

        {filtered.map((w) => {
          const statusOpt = WORKSPACE_STATUSES.find((s) => s.value === w.status);
          return (
            <Card key={w.id} className="border-t-4 hover:shadow-md transition" style={{ borderTopColor: w.color }}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-12 w-12 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: w.color }}>
                    <Folder className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-1">
                    {statusOpt && (
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", statusOpt.color)}>{statusOpt.label}</span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{w.visibility === "public" ? "Public" : "Private"}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(w.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Link to={`/admin/tasks/workspaces/${w.id}`} className="block group">
                  <h3 className="font-semibold group-hover:text-primary transition">{w.name}</h3>
                  {w.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{w.description}</p>}
                </Link>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>📋 {taskCounts[w.id] ?? 0} tasks</span>
                  <span>{new Date(w.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminWorkspaces;
