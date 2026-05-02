import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, UserMinus, RotateCcw, FileText, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { requestWorkerW9 } from "@/lib/workerW9";

type Worker = {
  id: string;
  client_id: string;
  full_name: string;
  email: string | null;
  worker_type: "employee" | "contractor";
  start_date: string | null;
  end_date: string | null;
  status: "active" | "terminated";
};

const blankForm = () => ({
  full_name: "",
  email: "",
  worker_type: "contractor" as "employee" | "contractor",
  start_date: new Date().toISOString().split("T")[0],
});

const ClientWorkers = () => {
  const { clientId, loading } = useCurrentClientId();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [busy, setBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm());

  const [terminateFor, setTerminateFor] = useState<Worker | null>(null);
  const [terminateEndDate, setTerminateEndDate] = useState("");

  const [companyName, setCompanyName] = useState<string>("");
  const [lastIssuedLink, setLastIssuedLink] = useState<string | null>(null);
  const [w9Status, setW9Status] = useState<Record<string, string>>({});
  const [forms1099, setForms1099] = useState<Record<string, { id: string; tax_year: number | null; file_path: string }[]>>({});
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const load = async () => {
    if (!clientId) return;
    const [{ data, error }, { data: cli }] = await Promise.all([
      supabase
        .from("client_workers")
        .select("id, client_id, full_name, email, worker_type, start_date, end_date, status")
        .eq("client_id", clientId)
        .order("status", { ascending: true })
        .order("full_name", { ascending: true }),
      supabase.from("clients").select("company_name").eq("id", clientId).maybeSingle(),
    ]);
    if (error) {
      toast.error(`No pude cargar tu equipo: ${error.message}`);
      return;
    }
    setWorkers((data ?? []) as Worker[]);
    setCompanyName(cli?.company_name ?? "");

    // Pull derived W-9 status per worker via SECURITY DEFINER RPC
    // (the underlying tables are admin-only, so we go through the function).
    const { data: statusRows } = await supabase.rpc("get_workers_w9_status");
    const map: Record<string, string> = {};
    (statusRows ?? []).forEach((r: any) => (map[r.worker_id] = r.w9_status));
    setW9Status(map);

    // 1099s — clients have RLS SELECT on documents where client_id matches
    if ((data ?? []).length > 0) {
      const ids = (data ?? []).map((w: any) => w.id);
      const { data: docs } = await supabase
        .from("documents")
        .select("id, worker_id, tax_year, file_path")
        .in("worker_id", ids)
        .eq("category", "1099_form")
        .order("tax_year", { ascending: false });
      const byWorker: Record<string, { id: string; tax_year: number | null; file_path: string }[]> = {};
      (docs ?? []).forEach((d: any) => {
        if (!d.worker_id) return;
        (byWorker[d.worker_id] ??= []).push(d);
      });
      setForms1099(byWorker);
    } else {
      setForms1099({});
    }
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
      start_date: w.start_date ?? new Date().toISOString().split("T")[0],
    });
    setEditOpen(true);
  };

  const saveWorker = async () => {
    if (!clientId) return;
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
      is_contractor: form.worker_type === "contractor",
      start_date: form.start_date || null,
      ...(editingId
        ? { updated_by: user?.id ?? null }
        : { created_by: user?.id ?? null, updated_by: user?.id ?? null }),
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
    let displayName = "tu cliente";
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
      companyName,
      { user_id: user?.id ?? null, display_name: displayName },
    );
    setBusy(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setLastIssuedLink(result.link);
      toast.success("W-9 solicitado — le enviamos el link al worker");
      load();
    }
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

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mi equipo</h1>
          <p className="text-sm text-muted-foreground">
            Empleados y contratistas que trabajan para tu empresa. SGS usa esta lista para gestionar W-9s y 1099s.
            Mantenelo actualizado — agregá nuevos workers cuando los contrates y dales de baja cuando dejen de trabajar.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Agregar worker
        </Button>
      </div>

      {lastIssuedLink && (
        <div className="rounded-md border bg-muted/40 p-3 flex items-start justify-between gap-2 text-sm">
          <div className="flex-1">
            <p className="font-medium">Le mandamos el formulario a tu worker.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Si querés reenviárselo vos directamente, este es el link (válido por 30 días):
            </p>
            <p className="text-xs text-muted-foreground break-all mt-1">{lastIssuedLink}</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workers ({workers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>W-9</TableHead>
                <TableHead>1099</TableHead>
                <TableHead>Inicio / Baja</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Aún no agregaste workers. Agregá el primero con el botón de arriba.
                  </TableCell>
                </TableRow>
              ) : (
                workers.map((w) => (
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
                      {(() => {
                        const s = w9Status[w.id] ?? "none";
                        if (s === "verified") return <Badge variant="default">Verificado</Badge>;
                        if (s === "submitted") return <Badge variant="secondary">Recibido</Badge>;
                        if (s === "sent") return <Badge variant="secondary">Solicitado</Badge>;
                        return <Badge variant="outline">No solicitado</Badge>;
                      })()}
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
                    <TableCell className="text-xs text-muted-foreground">
                      {w.start_date ?? "—"}
                      {w.end_date ? ` → ${w.end_date}` : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => requestW9(w)}
                          disabled={!w.email || busy}
                          title={w.email ? "Solicitar W-9" : "El worker necesita email"}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        {w.status === "active" ? (
                          <Button variant="ghost" size="sm" onClick={() => openTerminate(w)}>
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => restore(w)} disabled={busy}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar worker" : "Agregar worker"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="cw-name">Nombre completo *</Label>
              <Input id="cw-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="cw-email">Email</Label>
              <Input id="cw-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">
                Necesario para enviarle el formulario de W-9 cuando esté disponible.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.worker_type} onValueChange={(v) => setForm({ ...form, worker_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contractor">Contratista</SelectItem>
                    <SelectItem value="employee">Empleado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cw-start">Fecha de inicio</Label>
                <Input id="cw-start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveWorker} disabled={busy}>{editingId ? "Guardar" : "Agregar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!terminateFor} onOpenChange={(open) => !open && setTerminateFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dar de baja a {terminateFor?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              El worker queda marcado como dado de baja con la fecha que indiques. Si fue un error, podés reactivarlo después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-3">
            <Label htmlFor="cw-end">Fecha de baja</Label>
            <Input id="cw-end" type="date" value={terminateEndDate} onChange={(e) => setTerminateEndDate(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={terminate}>Dar de baja</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientWorkers;
