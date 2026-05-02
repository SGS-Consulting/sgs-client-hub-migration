import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Pencil, History, UserMinus, RotateCcw, ClipboardList, MoreHorizontal, FileText, Copy, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { WorkerAuditLog } from "@/components/admin/WorkerAuditLog";
import { WorkerClassificationDialog } from "@/components/admin/WorkerClassificationDialog";
import { requestWorkerW9 } from "@/lib/workerW9";

type Worker = {
  id: string;
  client_id: string;
  full_name: string;
  email: string | null;
  worker_type: "employee" | "contractor";
  is_contractor: boolean;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "terminated";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type W9Row = { worker_id: string; verified_at: string | null };
type Form1099 = { id: string; worker_id: string; tax_year: number | null; file_path: string; file_name: string; created_at: string };

type Props = { clientId: string };

const blankForm = () => ({
  full_name: "",
  email: "",
  worker_type: "contractor" as "employee" | "contractor",
  is_contractor: true,
  start_date: new Date().toISOString().split("T")[0],
  notes: "",
});

const W9_BADGE: Record<string, { label: string; tone: "secondary" | "default" | "outline" }> = {
  none: { label: "No solicitado", tone: "outline" },
  submitted: { label: "Recibido", tone: "secondary" },
  verified: { label: "Verificado", tone: "default" },
};

export const AdminWorkersTab = ({ clientId }: Props) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [w9Map, setW9Map] = useState<Record<string, W9Row>>({});
  const [classifiedSet, setClassifiedSet] = useState<Set<string>>(new Set());
  const [forms1099, setForms1099] = useState<Record<string, Form1099[]>>({}); // worker_id → list of 1099s desc by tax_year
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // 1099 upload dialog
  const [uploadFor, setUploadFor] = useState<Worker | null>(null);
  const [uploadFile1099, setUploadFile1099] = useState<File | null>(null);
  const [uploadTaxYear, setUploadTaxYear] = useState<number>(new Date().getFullYear() - 1);
  const [busy, setBusy] = useState(false);

  // Add/edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm());

  // Terminate / restore dialog
  const [terminateFor, setTerminateFor] = useState<Worker | null>(null);
  const [terminateEndDate, setTerminateEndDate] = useState("");

  // Audit log
  const [auditFor, setAuditFor] = useState<Worker | null>(null);

  // Classification dialog
  const [classifyFor, setClassifyFor] = useState<Worker | null>(null);

  // Last issued W-9 link (for copy-to-clipboard convenience)
  const [lastIssuedLink, setLastIssuedLink] = useState<string | null>(null);
  const [clientCompanyName, setClientCompanyName] = useState<string>("");

  const load = async () => {
    const [{ data: ws, error }, { data: cli }] = await Promise.all([
      supabase
        .from("client_workers")
        .select("*")
        .eq("client_id", clientId)
        .order("status", { ascending: true })
        .order("full_name", { ascending: true }),
      supabase.from("clients").select("company_name").eq("id", clientId).maybeSingle(),
    ]);
    if (error) {
      toast.error(`No pude cargar workers: ${error.message}`);
      return;
    }
    setClientCompanyName(cli?.company_name ?? "");
    const list = (ws ?? []) as Worker[];
    setWorkers(list);

    if (list.length > 0) {
      const ids = list.map((w) => w.id);
      const [{ data: w9s }, { data: cls }, { data: docs }] = await Promise.all([
        supabase.from("client_workers_w9_data").select("worker_id, verified_at").in("worker_id", ids),
        supabase.from("worker_classification_responses").select("worker_id").in("worker_id", ids),
        supabase
          .from("documents")
          .select("id, worker_id, tax_year, file_path, file_name, created_at")
          .in("worker_id", ids)
          .eq("category", "1099_form")
          .order("tax_year", { ascending: false }),
      ]);
      const w9: Record<string, W9Row> = {};
      (w9s ?? []).forEach((r: any) => (w9[r.worker_id] = r));
      setW9Map(w9);
      setClassifiedSet(new Set((cls ?? []).map((r: any) => r.worker_id)));

      const byWorker: Record<string, Form1099[]> = {};
      (docs ?? []).forEach((d: any) => {
        if (!d.worker_id) return;
        (byWorker[d.worker_id] ??= []).push(d as Form1099);
      });
      setForms1099(byWorker);
    } else {
      setW9Map({});
      setClassifiedSet(new Set());
      setForms1099({});
    }
  };

  useEffect(() => {
    if (clientId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const openAdd = () => {
    setEditingId(null);
    setForm(blankForm());
    setEditOpen(true);
  };

  const openEdit = (w: Worker) => {
    setEditingId(w.id);
    setForm({
      full_name: w.full_name,
      email: w.email ?? "",
      worker_type: w.worker_type,
      is_contractor: w.is_contractor,
      start_date: w.start_date ?? new Date().toISOString().split("T")[0],
      notes: w.notes ?? "",
    });
    setEditOpen(true);
  };

  const saveWorker = async () => {
    if (!form.full_name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      client_id: clientId,
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      worker_type: form.worker_type,
      is_contractor: form.is_contractor,
      start_date: form.start_date || null,
      notes: form.notes.trim() || null,
      ...(editingId ? { updated_by: user?.id ?? null } : { created_by: user?.id ?? null, updated_by: user?.id ?? null }),
    };
    const { error } = editingId
      ? await supabase.from("client_workers").update(payload).eq("id", editingId)
      : await supabase.from("client_workers").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? "Worker actualizado" : "Worker agregado");
    setEditOpen(false);
    load();
  };

  const openTerminate = (w: Worker) => {
    setTerminateFor(w);
    setTerminateEndDate(new Date().toISOString().split("T")[0]);
  };

  const terminate = async () => {
    if (!terminateFor) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("client_workers")
      .update({
        status: "terminated",
        end_date: terminateEndDate || new Date().toISOString().split("T")[0],
        updated_by: user?.id ?? null,
      })
      .eq("id", terminateFor.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Worker dado de baja");
    setTerminateFor(null);
    load();
  };

  const requestW9 = async (w: Worker) => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    let displayName = "el equipo de SGS";
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      displayName = prof?.full_name || prof?.email || displayName;
    }
    const result = await requestWorkerW9(
      { id: w.id, client_id: w.client_id, full_name: w.full_name, email: w.email },
      clientCompanyName,
      { user_id: user?.id ?? null, display_name: displayName },
    );
    setBusy(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setLastIssuedLink(result.link);
      toast.success("W-9 solicitado — email queueado para el worker");
      load();
    }
  };

  const open1099Upload = (w: Worker) => {
    setUploadFor(w);
    setUploadFile1099(null);
    setUploadTaxYear(new Date().getFullYear() - 1);
  };

  const upload1099 = async () => {
    if (!uploadFor || !uploadFile1099) {
      toast.error("Seleccioná un archivo PDF");
      return;
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const ts = Date.now();
    const safeName = uploadFile1099.name.replace(/[^\w.-]/g, "_");
    const path = `${uploadFor.client_id}/1099/${uploadFor.id}_${uploadTaxYear}_${ts}_${safeName}`;
    const { error: upErr } = await supabase.storage.from("client-documents").upload(path, uploadFile1099);
    if (upErr) {
      setBusy(false);
      toast.error(`Upload falló: ${upErr.message}`);
      return;
    }
    const { error: dbErr } = await supabase.from("documents").insert({
      client_id: uploadFor.client_id,
      worker_id: uploadFor.id,
      tax_year: uploadTaxYear,
      file_path: path,
      file_name: uploadFile1099.name,
      file_size: uploadFile1099.size,
      mime_type: uploadFile1099.type || null,
      category: "1099_form",
      status: "approved",
      uploaded_by: user?.id ?? null,
      notes: `1099 ${uploadTaxYear} para ${uploadFor.full_name}`,
    });
    if (dbErr) {
      setBusy(false);
      toast.error(`Archivo subido pero falló el registro: ${dbErr.message}`);
      return;
    }

    // Queue 1099_ready notification email to the client
    const { data: tpl } = await supabase
      .from("email_templates")
      .select("subject, body_html")
      .eq("template_key", "1099_ready")
      .eq("is_active", true)
      .maybeSingle();
    const { data: cli } = await supabase
      .from("clients")
      .select("email, contact_name, company_name")
      .eq("id", uploadFor.client_id)
      .maybeSingle();

    if (tpl && cli?.email) {
      const portalLink = `${window.location.origin}/portal/workers`;
      const sub = (s: string) =>
        s
          .replace(/\{\{client_name\}\}/g, cli.contact_name ?? cli.company_name ?? "")
          .replace(/\{\{tax_year\}\}/g, String(uploadTaxYear))
          .replace(/\{\{worker_count\}\}/g, "1")
          .replace(/\{\{portal_link\}\}/g, portalLink);
      await supabase.from("email_log").insert({
        template_key: "1099_ready",
        recipient_email: cli.email,
        subject: sub(tpl.subject),
        body: sub(tpl.body_html),
        status: "pending",
        client_id: uploadFor.client_id,
      });
    }

    setBusy(false);
    toast.success(`1099 ${uploadTaxYear} subido + email queueado`);
    setUploadFor(null);
    load();
  };

  const downloadDoc = async (doc: { id: string; file_path: string }) => {
    setDownloadingDocId(doc.id);
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(doc.file_path, 60 * 5);
    setDownloadingDocId(null);
    if (error || !data?.signedUrl) {
      toast.error(`Link falló: ${error?.message ?? "unknown"}`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const restore = async (w: Worker) => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("client_workers")
      .update({ status: "active", end_date: null, updated_by: user?.id ?? null })
      .eq("id", w.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Worker reactivado");
    load();
  };

  const w9Status = (workerId: string) => {
    const row = w9Map[workerId];
    if (!row) return W9_BADGE.none;
    if (row.verified_at) return W9_BADGE.verified;
    return W9_BADGE.submitted;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Lista de empleados y contratistas del cliente. Tanto SGS como el cliente pueden agregar, editar y dar de baja.
          Cada cambio queda registrado en el historial.
        </p>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Agregar worker
        </Button>
      </div>

      {lastIssuedLink && (
        <div className="rounded-md border bg-muted/40 p-3 flex items-start justify-between gap-2 text-sm">
          <div className="flex-1">
            <p className="font-medium">Último link de W-9 generado:</p>
            <p className="text-xs text-muted-foreground break-all mt-1">{lastIssuedLink}</p>
            <p className="text-xs text-muted-foreground mt-1">
              El email queda en <code>email_log</code> con status <code>pending</code> — GHL lo despacha en producción.
              Por ahora podés copiarlo y mandárselo al worker manualmente para testear.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(lastIssuedLink);
              toast.success("Link copiado");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Clasificación</TableHead>
            <TableHead>W-9</TableHead>
            <TableHead>1099</TableHead>
            <TableHead>Inicio / Baja</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                Sin workers registrados.
              </TableCell>
            </TableRow>
          ) : (
            workers.map((w) => {
              const w9 = w9Status(w.id);
              const classified = classifiedSet.has(w.id);
              return (
                <TableRow key={w.id} className={w.status === "terminated" ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">{w.full_name}</TableCell>
                  <TableCell className="text-sm">{w.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{w.worker_type === "employee" ? "Empleado" : "Contratista"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={w.status === "active" ? "default" : "secondary"}>
                      {w.status === "active" ? "Activo" : "Baja"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={classified ? "default" : "outline"}>
                      {classified ? "Clasificado" : "Sin clasificar"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={w9.tone}>{w9.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {(forms1099[w.id]?.length ?? 0) === 0 ? (
                      <Badge variant="outline">No disponible</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {forms1099[w.id].map((doc) => (
                          <Button
                            key={doc.id}
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => downloadDoc(doc)}
                            disabled={downloadingDocId === doc.id}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            {doc.tax_year ?? "—"}
                          </Button>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {w.start_date ?? "—"}
                    {w.end_date ? ` → ${w.end_date}` : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(w)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setClassifyFor(w)}>
                          <ClipboardList className="h-4 w-4 mr-2" /> Clasificar (IRS test)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => requestW9(w)} disabled={!w.email || busy}>
                          <FileText className="h-4 w-4 mr-2" /> Solicitar W-9
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => open1099Upload(w)}>
                          <Upload className="h-4 w-4 mr-2" /> Subir 1099
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAuditFor(w)}>
                          <History className="h-4 w-4 mr-2" /> Historial de cambios
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {w.status === "active" ? (
                          <DropdownMenuItem onClick={() => openTerminate(w)}>
                            <UserMinus className="h-4 w-4 mr-2" /> Dar de baja
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => restore(w)} disabled={busy}>
                            <RotateCcw className="h-4 w-4 mr-2" /> Reactivar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Add / edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar worker" : "Agregar worker"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="w-name">Nombre completo *</Label>
              <Input id="w-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="w-email">Email</Label>
              <Input id="w-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.worker_type}
                  onValueChange={(v) =>
                    setForm({ ...form, worker_type: v as "employee" | "contractor", is_contractor: v === "contractor" })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contractor">Contratista</SelectItem>
                    <SelectItem value="employee">Empleado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="w-start">Fecha de inicio</Label>
                <Input id="w-start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_contractor}
                  onChange={(e) => setForm({ ...form, is_contractor: e.target.checked })}
                />
                <span className="text-sm">Marcar como contratista (override manual)</span>
              </Label>
            </div>
            <div>
              <Label htmlFor="w-notes">Notas internas</Label>
              <Textarea id="w-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveWorker} disabled={busy}>{editingId ? "Guardar" : "Agregar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate confirm */}
      <AlertDialog open={!!terminateFor} onOpenChange={(open) => !open && setTerminateFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dar de baja a {terminateFor?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              El worker se marca como terminado y se setea la fecha de baja. Podés reactivarlo después si fue un error.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-3">
            <Label htmlFor="end-date">Fecha de baja</Label>
            <Input id="end-date" type="date" value={terminateEndDate} onChange={(e) => setTerminateEndDate(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={terminate}>Dar de baja</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 1099 upload dialog */}
      <Dialog open={!!uploadFor} onOpenChange={(open) => !open && setUploadFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir 1099 — {uploadFor?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="ty-year">Año fiscal *</Label>
              <Input
                id="ty-year"
                type="number"
                min={2020}
                max={new Date().getFullYear()}
                value={uploadTaxYear}
                onChange={(e) => setUploadTaxYear(Number(e.target.value))}
                className="max-w-[150px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                El año al que corresponden los pagos reportados en el 1099 (típicamente, el año anterior al actual).
              </p>
            </div>
            <div>
              <Label htmlFor="ty-file">Archivo PDF *</Label>
              <Input
                id="ty-file"
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setUploadFile1099(e.target.files?.[0] ?? null)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              El cliente recibirá un email automático cuando esté disponible (template <code>1099_ready</code>).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadFor(null)}>Cancelar</Button>
            <Button onClick={upload1099} disabled={busy || !uploadFile1099}>Subir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit log */}
      <WorkerAuditLog
        workerId={auditFor?.id ?? null}
        workerLabel={auditFor?.full_name}
        onOpenChange={(open) => !open && setAuditFor(null)}
      />

      {/* Classification dialog */}
      <WorkerClassificationDialog
        workerId={classifyFor?.id ?? null}
        workerLabel={classifyFor?.full_name}
        onClose={() => setClassifyFor(null)}
        onSaved={load}
      />
    </div>
  );
};
