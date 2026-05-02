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
import { Scale, Eye, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type LegalCase = {
  id: string;
  client_id: string;
  client_service_id: string | null;
  subject: string;
  description: string;
  status: "received" | "under_review" | "advisory_delivered" | "closed";
  law_firm_consulted: boolean;
  abner_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  clients: { company_name: string; contact_name: string | null; email: string | null } | null;
};

type FilterMode = "open" | "all" | "closed";

const STATUS_LABEL: Record<LegalCase["status"], string> = {
  received: "Recibida",
  under_review: "En revisión",
  advisory_delivered: "Asesoría entregada",
  closed: "Cerrada",
};

const STATUS_TONE: Record<LegalCase["status"], "default" | "secondary" | "outline"> = {
  received: "outline",
  under_review: "default",
  advisory_delivered: "secondary",
  closed: "secondary",
};

const AdminLegalCases = () => {
  const [rows, setRows] = useState<LegalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("open");
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<LegalCase | null>(null);
  const [editStatus, setEditStatus] = useState<LegalCase["status"]>("received");
  const [editLawFirm, setEditLawFirm] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docBusy, setDocBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("legal_cases")
      .select(
        "id, client_id, client_service_id, subject, description, status, law_firm_consulted, abner_notes, resolved_at, created_at, clients(company_name, contact_name, email)",
      )
      .order("created_at", { ascending: false });
    setRows((data ?? []) as LegalCase[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) => {
    if (filter === "open") return r.status !== "closed";
    if (filter === "closed") return r.status === "closed";
    return true;
  });

  const openEdit = (c: LegalCase) => {
    setEditing(c);
    setEditStatus(c.status);
    setEditLawFirm(c.law_firm_consulted);
    setEditNotes(c.abner_notes ?? "");
    setDocFile(null);
  };

  const uploadAdvisoryDoc = async () => {
    if (!editing || !docFile) return;
    setDocBusy(true);
    const safeName = docFile.name.replace(/[^\w.-]/g, "_");
    const path = `${editing.client_id}/advisory_documents/${editing.id}_${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from("client-documents").upload(path, docFile);
    if (upErr) {
      toast.error(upErr.message);
      setDocBusy(false);
      return;
    }
    const { error: dbErr } = await supabase.from("documents").insert({
      client_id: editing.client_id,
      file_name: docFile.name,
      file_size: docFile.size,
      mime_type: docFile.type || null,
      category: "advisory_documents",
      storage_path: path,
      legal_case_id: editing.id,
      uploaded_by: null,
    });
    setDocBusy(false);
    if (dbErr) {
      toast.error(dbErr.message);
      return;
    }
    setDocFile(null);
    toast.success("Documento subido");
  };

  const saveCase = async () => {
    if (!editing) return;
    setBusy(true);
    const { error } = await supabase
      .from("legal_cases")
      .update({
        status: editStatus,
        law_firm_consulted: editLawFirm,
        abner_notes: editNotes.trim() || null,
        ...(editStatus === "closed" && !editing.resolved_at ? { resolved_at: new Date().toISOString() } : {}),
      })
      .eq("id", editing.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Caso actualizado");
    setEditing(null);
    load();
  };

  const closeCase = async () => {
    if (!editing) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("close_legal_case", {
      p_case_id: editing.id,
      p_notes: editNotes.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    // Queue the legal_advisory_ready email
    if (editing.clients?.email) {
      const { data: tpl } = await supabase
        .from("email_templates")
        .select("subject, body_html")
        .eq("template_key", "legal_advisory_ready")
        .eq("is_active", true)
        .maybeSingle();
      if (tpl) {
        const sub = (s: string) =>
          s
            .replace(/\{\{client_name\}\}/g, editing.clients?.contact_name ?? editing.clients?.company_name ?? "")
            .replace(/\{\{subject\}\}/g, editing.subject);
        await supabase.from("email_log").insert({
          template_key: "legal_advisory_ready",
          recipient_email: editing.clients.email,
          subject: sub(tpl.subject),
          body: sub(tpl.body_html),
          status: "pending",
          client_id: editing.client_id,
        });
      }
    }

    toast.success(`Caso cerrado · email de asesoría queueado`);
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" /> Consultas legales
          </h1>
          <p className="text-sm text-muted-foreground">
            Casos legales abiertos por todos los clientes con suscripción activa al Legal & Corporate Support.
          </p>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
        <TabsList>
          <TabsTrigger value="open">Abiertos</TabsTrigger>
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
                <TableHead>Asunto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Firma legal</TableHead>
                <TableHead>Recibida</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin casos.</TableCell></TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{c.clients?.company_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.clients?.contact_name ?? ""}</div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="text-sm font-medium truncate">{c.subject}</p>
                    </TableCell>
                    <TableCell><Badge variant={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge></TableCell>
                    <TableCell><Badge variant={c.law_firm_consulted ? "default" : "outline"}>{c.law_firm_consulted ? "Sí" : "No"}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
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
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) { setEditing(null); setDocFile(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.subject}</DialogTitle>
            <DialogDescription>
              {editing?.clients?.company_name} · enviada {editing && new Date(editing.created_at).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Descripción del cliente</p>
              <p className="text-sm whitespace-pre-wrap">{editing?.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estado</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as LegalCase["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Recibida</SelectItem>
                    <SelectItem value="under_review">En revisión</SelectItem>
                    <SelectItem value="advisory_delivered">Asesoría entregada</SelectItem>
                    <SelectItem value="closed">Cerrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Coordinado con firma legal</Label>
                <Select value={editLawFirm ? "yes" : "no"} onValueChange={(v) => setEditLawFirm(v === "yes")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Sí</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="lc-notes">Notas internas (Abner)</Label>
              <Textarea id="lc-notes" rows={4} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">
                Estas notas no se exponen al cliente en el portal v1 (RLS limita pero la columna es visible si consulta directo — evitar info sensible).
              </p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium">Subir documento de asesoría</p>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                className="flex-1"
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!docFile || docBusy}
                onClick={uploadAdvisoryDoc}
              >
                {docBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Subir
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              El archivo quedará vinculado a este caso y visible en la pestaña Documentos del cliente.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button variant="outline" onClick={saveCase} disabled={busy}>Guardar cambios</Button>
            {editing?.status !== "closed" && (
              <Button onClick={closeCase} disabled={busy}>Cerrar caso + enviar email</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLegalCases;
