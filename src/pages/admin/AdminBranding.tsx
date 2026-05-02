import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Palette, Eye, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

type BrandingProject = {
  id: string;
  client_id: string;
  web_included: boolean;
  status:
    | "brief_received"
    | "in_design"
    | "presented_to_client"
    | "client_approved"
    | "web_development"
    | "digital_profiles_updated"
    | "delivered"
    | "support";
  abner_notes: string | null;
  delivered_at: string | null;
  created_at: string;
  clients: { company_name: string; contact_name: string | null; email: string | null } | null;
};

type Client = { id: string; company_name: string };
type FilterMode = "active" | "all" | "delivered";

const STATUS_LABEL: Record<BrandingProject["status"], string> = {
  brief_received: "Brief recibido",
  in_design: "En diseño",
  presented_to_client: "Presentado al cliente",
  client_approved: "Aprobado por cliente",
  web_development: "Desarrollo web",
  digital_profiles_updated: "Perfiles actualizados",
  delivered: "Entregado",
  support: "Soporte",
};

const STATUS_TONE: Record<BrandingProject["status"], "default" | "secondary" | "outline"> = {
  brief_received: "outline",
  in_design: "outline",
  presented_to_client: "default",
  client_approved: "default",
  web_development: "default",
  digital_profiles_updated: "default",
  delivered: "secondary",
  support: "secondary",
};

const AdminBranding = () => {
  const [rows, setRows] = useState<BrandingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("active");
  const [busy, setBusy] = useState(false);
  const [docBusy, setDocBusy] = useState(false);

  const [editing, setEditing] = useState<BrandingProject | null>(null);
  const [editStatus, setEditStatus] = useState<BrandingProject["status"]>("brief_received");
  const [editWebIncluded, setEditWebIncluded] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [newClientId, setNewClientId] = useState("");
  const [newWebIncluded, setNewWebIncluded] = useState(false);
  const [newProjectBusy, setNewProjectBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("branding_projects")
      .select("id, client_id, web_included, status, abner_notes, delivered_at, created_at, clients(company_name, contact_name, email)")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as BrandingProject[]);
    setLoading(false);
  };

  const loadClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, company_name")
      .eq("status", "active")
      .order("company_name");
    setClients((data ?? []) as Client[]);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (filter === "active") return r.status !== "delivered" && r.status !== "support";
    if (filter === "delivered") return r.status === "delivered" || r.status === "support";
    return true;
  });

  const openEdit = (p: BrandingProject) => {
    setEditing(p);
    setEditStatus(p.status);
    setEditWebIncluded(p.web_included);
    setEditNotes(p.abner_notes ?? "");
    setDocFile(null);
  };

  const uploadDoc = async () => {
    if (!editing || !docFile) return;
    setDocBusy(true);
    const safeName = docFile.name.replace(/[^\w.-]/g, "_");
    const path = `${editing.client_id}/brand_kit/${editing.id}_${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from("client-documents").upload(path, docFile);
    if (upErr) { toast.error(upErr.message); setDocBusy(false); return; }
    const { error: dbErr } = await supabase.from("documents").insert({
      client_id: editing.client_id,
      file_name: docFile.name,
      file_size: docFile.size,
      mime_type: docFile.type || null,
      category: "brand_kit",
      storage_path: path,
      branding_project_id: editing.id,
      uploaded_by: null,
    });
    setDocBusy(false);
    if (dbErr) { toast.error(dbErr.message); return; }
    setDocFile(null);
    toast.success("Documento subido");
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    const { error } = await supabase
      .from("branding_projects")
      .update({
        status: editStatus,
        web_included: editWebIncluded,
        abner_notes: editNotes.trim() || null,
        ...(editStatus === "delivered" && !editing.delivered_at ? { delivered_at: new Date().toISOString() } : {}),
      })
      .eq("id", editing.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Proyecto actualizado");
    setEditing(null);
    load();
  };

  const createProject = async () => {
    if (!newClientId) { toast.error("Seleccioná un cliente"); return; }
    setNewProjectBusy(true);
    const { error } = await supabase.from("branding_projects").insert({
      client_id: newClientId,
      web_included: newWebIncluded,
    });
    setNewProjectBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Proyecto de branding creado");
    setNewProjectOpen(false);
    setNewClientId("");
    setNewWebIncluded(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" /> Branding & Identidad
          </h1>
          <p className="text-sm text-muted-foreground">
            Proyectos de identidad visual y marca. Conduce Jesus; coordina Karen para el desarrollo web.
          </p>
        </div>
        <Button onClick={() => { loadClients(); setNewProjectOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo proyecto
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
        <TabsList>
          <TabsTrigger value="active">Activos</TabsTrigger>
          <TabsTrigger value="delivered">Entregados</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{filtered.length} proyecto(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Web</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Cargando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin proyectos.</TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{p.clients?.company_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.clients?.contact_name ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.web_included ? "default" : "outline"}>
                        {p.web_included ? "Sí" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit / detail dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) { setEditing(null); setDocFile(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.clients?.company_name} — Branding</DialogTitle>
            <DialogDescription>
              Iniciado {editing && new Date(editing.created_at).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fase</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as BrandingProject["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brief_received">Brief recibido</SelectItem>
                    <SelectItem value="in_design">En diseño</SelectItem>
                    <SelectItem value="presented_to_client">Presentado al cliente</SelectItem>
                    <SelectItem value="client_approved">Aprobado por cliente</SelectItem>
                    <SelectItem value="web_development">Desarrollo web</SelectItem>
                    <SelectItem value="digital_profiles_updated">Perfiles actualizados</SelectItem>
                    <SelectItem value="delivered">Entregado</SelectItem>
                    <SelectItem value="support">Soporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Incluye desarrollo web</Label>
                <Select value={editWebIncluded ? "yes" : "no"} onValueChange={(v) => setEditWebIncluded(v === "yes")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Sí</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="br-notes">Notas internas</Label>
              <Textarea
                id="br-notes"
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium">Subir entregable (brand kit, manual, etc.)</p>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                className="flex-1"
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              />
              <Button size="sm" variant="outline" disabled={!docFile || docBusy} onClick={uploadDoc}>
                {docBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Subir
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              El archivo quedará vinculado a este proyecto y visible en Documentos del cliente.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New project dialog */}
      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo proyecto de branding</DialogTitle>
            <DialogDescription>Seleccioná el cliente y configurá las opciones iniciales.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Cliente</Label>
              <Select value={newClientId} onValueChange={setNewClientId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>¿Incluye desarrollo web?</Label>
              <Select value={newWebIncluded ? "yes" : "no"} onValueChange={(v) => setNewWebIncluded(v === "yes")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Sí</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProjectOpen(false)}>Cancelar</Button>
            <Button onClick={createProject} disabled={newProjectBusy || !newClientId}>
              {newProjectBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Crear proyecto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBranding;
