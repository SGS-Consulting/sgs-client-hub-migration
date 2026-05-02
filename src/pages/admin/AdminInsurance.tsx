import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Eye, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

type InsuranceRecord = {
  id: string;
  client_id: string;
  has_gl_insurance: boolean;
  has_wc_insurance: boolean;
  coverage_status: "needs_assessment" | "needs_coverage" | "quote_requested" | "covered";
  notes: string | null;
  created_at: string;
  clients: { company_name: string; contact_name: string | null; email: string | null } | null;
};

type Client = { id: string; company_name: string };

const STATUS_LABEL: Record<InsuranceRecord["coverage_status"], string> = {
  needs_assessment: "Evaluar",
  needs_coverage: "Sin cobertura",
  quote_requested: "Cotización solicitada",
  covered: "Cubierto",
};

const STATUS_TONE: Record<InsuranceRecord["coverage_status"], "default" | "secondary" | "outline"> = {
  needs_assessment: "outline",
  needs_coverage: "outline",
  quote_requested: "default",
  covered: "secondary",
};

const AdminInsurance = () => {
  const [rows, setRows] = useState<InsuranceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<InsuranceRecord | null>(null);
  const [editGL, setEditGL] = useState(false);
  const [editWC, setEditWC] = useState(false);
  const [editStatus, setEditStatus] = useState<InsuranceRecord["coverage_status"]>("needs_assessment");
  const [editNotes, setEditNotes] = useState("");

  const [newRecordOpen, setNewRecordOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [newClientId, setNewClientId] = useState("");
  const [newBusy, setNewBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("client_insurance")
      .select("id, client_id, has_gl_insurance, has_wc_insurance, coverage_status, notes, created_at, clients(company_name, contact_name, email)")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as InsuranceRecord[]);
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

  const openEdit = (r: InsuranceRecord) => {
    setEditing(r);
    setEditGL(r.has_gl_insurance);
    setEditWC(r.has_wc_insurance);
    setEditStatus(r.coverage_status);
    setEditNotes(r.notes ?? "");
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    const { error } = await supabase
      .from("client_insurance")
      .update({
        has_gl_insurance: editGL,
        has_wc_insurance: editWC,
        coverage_status: editStatus,
        notes: editNotes.trim() || null,
      })
      .eq("id", editing.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Registro actualizado");
    setEditing(null);
    load();
  };

  const createRecord = async () => {
    if (!newClientId) { toast.error("Seleccioná un cliente"); return; }
    setNewBusy(true);
    const { error } = await supabase.from("client_insurance").insert({ client_id: newClientId });
    setNewBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Registro de seguros creado");
    setNewRecordOpen(false);
    setNewClientId("");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" /> Seguros y Riesgo
          </h1>
          <p className="text-sm text-muted-foreground">
            Cobertura de seguro de responsabilidad civil (GL) y compensación de trabajadores (WC) por cliente.
          </p>
        </div>
        <Button onClick={() => { loadClients(); setNewRecordOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Agregar cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{rows.length} cliente(s) registrado(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>GL Insurance</TableHead>
                <TableHead>WC Insurance</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Cargando...</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin registros.</TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{r.clients?.company_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.clients?.contact_name ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.has_gl_insurance ? "default" : "outline"}>
                        {r.has_gl_insurance ? "Sí" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.has_wc_insurance ? "default" : "outline"}>
                        {r.has_wc_insurance ? "Sí" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_TONE[r.coverage_status]}>{STATUS_LABEL[r.coverage_status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
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

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.clients?.company_name} — Seguros</DialogTitle>
            <DialogDescription>Actualizá el estado de cobertura del cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>GL Insurance</Label>
                <Select value={editGL ? "yes" : "no"} onValueChange={(v) => setEditGL(v === "yes")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Sí</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>WC Insurance</Label>
                <Select value={editWC ? "yes" : "no"} onValueChange={(v) => setEditWC(v === "yes")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Sí</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Estado de cobertura</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as InsuranceRecord["coverage_status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="needs_assessment">Evaluar</SelectItem>
                  <SelectItem value="needs_coverage">Sin cobertura</SelectItem>
                  <SelectItem value="quote_requested">Cotización solicitada</SelectItem>
                  <SelectItem value="covered">Cubierto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ins-notes">Notas internas</Label>
              <Textarea
                id="ins-notes"
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New record dialog */}
      <Dialog open={newRecordOpen} onOpenChange={setNewRecordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar registro de seguros</DialogTitle>
            <DialogDescription>Seleccioná el cliente para registrar su estado de cobertura.</DialogDescription>
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
            <Button variant="outline" onClick={() => setNewRecordOpen(false)}>Cancelar</Button>
            <Button onClick={createRecord} disabled={newBusy || !newClientId}>
              {newBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInsurance;
