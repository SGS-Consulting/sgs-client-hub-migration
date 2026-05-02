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
import { TrendingUp, Eye, Loader2, Plus, CalendarDays } from "lucide-react";
import { toast } from "sonner";

type AdvisoryCase = {
  id: string;
  client_id: string;
  status: "initial_meeting" | "internal_strategy" | "recommendation" | "check_ins" | "closed";
  abner_notes: string | null;
  closed_at: string | null;
  created_at: string;
  clients: { company_name: string; contact_name: string | null; email: string | null } | null;
};

type Checkin = {
  id: string;
  session_date: string;
  notes: string | null;
};

type Client = { id: string; company_name: string };
type FilterMode = "active" | "all" | "closed";

const STATUS_LABEL: Record<AdvisoryCase["status"], string> = {
  initial_meeting: "Reunión inicial",
  internal_strategy: "Estrategia interna",
  recommendation: "Recomendación",
  check_ins: "Seguimientos",
  closed: "Cerrado",
};

const STATUS_TONE: Record<AdvisoryCase["status"], "default" | "secondary" | "outline"> = {
  initial_meeting: "outline",
  internal_strategy: "outline",
  recommendation: "default",
  check_ins: "default",
  closed: "secondary",
};

const AdminAdvisory = () => {
  const [rows, setRows] = useState<AdvisoryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("active");
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<AdvisoryCase | null>(null);
  const [editStatus, setEditStatus] = useState<AdvisoryCase["status"]>("initial_meeting");
  const [editNotes, setEditNotes] = useState("");
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [newCheckinDate, setNewCheckinDate] = useState("");
  const [newCheckinNotes, setNewCheckinNotes] = useState("");
  const [checkinBusy, setCheckinBusy] = useState(false);

  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [newClientId, setNewClientId] = useState("");
  const [newCaseBusy, setNewCaseBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("advisory_cases")
      .select("id, client_id, status, abner_notes, closed_at, created_at, clients(company_name, contact_name, email)")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as AdvisoryCase[]);
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

  const loadCheckins = async (caseId: string) => {
    const { data } = await supabase
      .from("advisory_checkins")
      .select("id, session_date, notes")
      .eq("case_id", caseId)
      .order("session_date", { ascending: false });
    setCheckins((data ?? []) as Checkin[]);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (filter === "active") return r.status !== "closed";
    if (filter === "closed") return r.status === "closed";
    return true;
  });

  const openEdit = async (c: AdvisoryCase) => {
    setEditing(c);
    setEditStatus(c.status);
    setEditNotes(c.abner_notes ?? "");
    setNewCheckinDate("");
    setNewCheckinNotes("");
    await loadCheckins(c.id);
  };

  const createCase = async () => {
    if (!newClientId) { toast.error("Seleccioná un cliente"); return; }
    setNewCaseBusy(true);
    const { error } = await supabase.from("advisory_cases").insert({ client_id: newClientId });
    setNewCaseBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Caso de asesoría creado");
    setNewCaseOpen(false);
    setNewClientId("");
    load();
  };

  const saveCase = async () => {
    if (!editing) return;
    setBusy(true);
    const { error } = await supabase
      .from("advisory_cases")
      .update({
        status: editStatus,
        abner_notes: editNotes.trim() || null,
        ...(editStatus === "closed" && !editing.closed_at ? { closed_at: new Date().toISOString() } : {}),
      })
      .eq("id", editing.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Caso actualizado");
    setEditing(null);
    load();
  };

  const addCheckin = async () => {
    if (!editing || !newCheckinDate) { toast.error("La fecha es obligatoria"); return; }
    setCheckinBusy(true);
    const { error } = await supabase.from("advisory_checkins").insert({
      case_id: editing.id,
      client_id: editing.client_id,
      session_date: newCheckinDate,
      notes: newCheckinNotes.trim() || null,
    });
    setCheckinBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Seguimiento registrado");
    setNewCheckinDate("");
    setNewCheckinNotes("");
    await loadCheckins(editing.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" /> Asesoría Empresarial
          </h1>
          <p className="text-sm text-muted-foreground">
            Casos de asesoría estratégica con Abner. Fases: reunión inicial → estrategia interna → recomendación → seguimientos → cierre.
          </p>
        </div>
        <Button onClick={() => { loadClients(); setNewCaseOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo caso
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
        <TabsList>
          <TabsTrigger value="active">Activos</TabsTrigger>
          <TabsTrigger value="closed">Cerrados</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{filtered.length} caso(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Cargando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin casos.</TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{c.clients?.company_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.clients?.contact_name ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
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
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.clients?.company_name} — Asesoría</DialogTitle>
            <DialogDescription>
              Abierto {editing && new Date(editing.created_at).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Fase</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as AdvisoryCase["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial_meeting">Reunión inicial</SelectItem>
                  <SelectItem value="internal_strategy">Estrategia interna</SelectItem>
                  <SelectItem value="recommendation">Recomendación</SelectItem>
                  <SelectItem value="check_ins">Seguimientos</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="adv-notes">Notas internas (Abner)</Label>
              <Textarea
                id="adv-notes"
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> Seguimientos ({checkins.length})
              </p>
              {checkins.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin seguimientos registrados.</p>
              ) : (
                <div className="space-y-1">
                  {checkins.map((ci) => (
                    <div key={ci.id} className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground text-xs min-w-[90px]">
                        {new Date(ci.session_date).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-muted-foreground">{ci.notes ?? "—"}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end pt-2">
                <div className="flex-1">
                  <Label className="text-xs">Fecha del seguimiento</Label>
                  <Input
                    type="date"
                    value={newCheckinDate}
                    onChange={(e) => setNewCheckinDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Nota (opcional)</Label>
                  <Input
                    value={newCheckinNotes}
                    onChange={(e) => setNewCheckinNotes(e.target.value)}
                    placeholder="Breve nota..."
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addCheckin}
                  disabled={checkinBusy || !newCheckinDate}
                >
                  {checkinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveCase} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New case dialog */}
      <Dialog open={newCaseOpen} onOpenChange={setNewCaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo caso de asesoría</DialogTitle>
            <DialogDescription>Seleccioná el cliente para el que querés abrir el caso.</DialogDescription>
          </DialogHeader>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCaseOpen(false)}>Cancelar</Button>
            <Button onClick={createCase} disabled={newCaseBusy || !newClientId}>
              {newCaseBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Crear caso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAdvisory;
