import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, DOCUMENT_STATUSES } from "@/lib/status";
import { Download, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const AdminDocuments = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    let q = supabase.from("documents").select("*, clients(company_name)").order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
    const { data } = await q;
    setDocs(data ?? []);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const download = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(filePath, 60);
    if (error || !data) { toast.error("No se pudo generar el enlace"); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl; a.download = fileName; a.click();
  };

  const approve = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("documents").update({
      status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Aprobado"); load(); }
  };

  const reject = async () => {
    if (!rejectFor || !rejectReason.trim()) { toast.error("Indica un motivo"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("documents").update({
      status: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      rejection_reason: rejectReason.trim(),
    }).eq("id", rejectFor);
    if (error) toast.error(error.message); else { toast.success("Rechazado"); setRejectFor(null); setRejectReason(""); load(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documentos</h1>
        <p className="text-sm text-muted-foreground">Revisa los documentos enviados por los clientes.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending_review">Pendientes de revisión</SelectItem>
                <SelectItem value="approved">Aprobados</SelectItem>
                <SelectItem value="rejected">Rechazados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Archivo</TableHead><TableHead>Cliente</TableHead><TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead><TableHead>Subido</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {docs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin documentos</TableCell></TableRow>
              : docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.file_name}</TableCell>
                  <TableCell>{d.clients?.company_name ?? "—"}</TableCell>
                  <TableCell>{d.category}</TableCell>
                  <TableCell><StatusBadge value={d.status} options={DOCUMENT_STATUSES} /></TableCell>
                  <TableCell className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => download(d.file_path, d.file_name)}><Download className="h-4 w-4" /></Button>
                    {d.status === "pending_review" && (<>
                      <Button size="sm" variant="ghost" onClick={() => approve(d.id)} className="text-success"><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setRejectFor(d.id)} className="text-destructive"><X className="h-4 w-4" /></Button>
                    </>)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rechazar documento</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={reject}>Rechazar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDocuments;
