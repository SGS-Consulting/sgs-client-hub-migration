import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, DOCUMENT_STATUSES } from "@/lib/status";
import { Upload, Download } from "lucide-react";
import { toast } from "sonner";

const ClientDocuments = () => {
  const { clientId } = useCurrentClientId();
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [category, setCategory] = useState("other");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!clientId) return;
    const { data } = await supabase.from("documents").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
    setDocs(data ?? []);
  };

  useEffect(() => { load(); }, [clientId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clientId || !user) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("Máximo 25MB"); return; }

    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${clientId}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("client-documents").upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }

    const { error: dbErr } = await supabase.from("documents").insert({
      client_id: clientId, file_path: path, file_name: file.name,
      file_size: file.size, mime_type: file.type, category: category as any,
      uploaded_by: user.id, status: "pending_review",
    });
    if (dbErr) toast.error(dbErr.message); else toast.success("Documento subido");
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const download = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(filePath, 60);
    if (error || !data) { toast.error("No se pudo descargar"); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl; a.download = fileName; a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis documentos</h1>
        <p className="text-sm text-muted-foreground">Sube tus documentos y revisa su estado.</p>
      </div>

      <Card><CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2 md:col-span-1">
            <Label>Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contrato</SelectItem>
                <SelectItem value="identification">Identificación</SelectItem>
                <SelectItem value="tax">Fiscal</SelectItem>
                <SelectItem value="financial">Financiero</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" id="upload" />
            <Button asChild disabled={uploading} className="w-full">
              <label htmlFor="upload" className="cursor-pointer">
                <Upload className="h-4 w-4" /> {uploading ? "Subiendo…" : "Subir documento"}
              </label>
            </Button>
          </div>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-4">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Archivo</TableHead><TableHead>Categoría</TableHead>
            <TableHead>Estado</TableHead><TableHead>Fecha</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {docs.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aún no has subido documentos</TableCell></TableRow>
            : docs.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">
                  {d.file_name}
                  {d.status === "rejected" && d.rejection_reason && (
                    <p className="text-xs text-destructive mt-1">Motivo: {d.rejection_reason}</p>
                  )}
                </TableCell>
                <TableCell>{d.category}</TableCell>
                <TableCell><StatusBadge value={d.status} options={DOCUMENT_STATUSES} /></TableCell>
                <TableCell className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => download(d.file_path, d.file_name)}><Download className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default ClientDocuments;
