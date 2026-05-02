import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Loader2, Scale, Lock, Paperclip } from "lucide-react";
import { toast } from "sonner";

type LegalCase = {
  id: string;
  subject: string;
  description: string;
  status: "received" | "under_review" | "advisory_delivered" | "closed";
  law_firm_consulted: boolean;
  resolved_at: string | null;
  created_at: string;
};

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

const ClientLegal = () => {
  const { clientId, loading: clientLoading } = useCurrentClientId();
  const { user } = useAuth();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [busy, setBusy] = useState(false);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachFile, setAttachFile] = useState<File | null>(null);

  const load = async () => {
    if (!clientId) return;
    const [{ data: cs }, { data: subs }] = await Promise.all([
      supabase
        .from("legal_cases")
        .select("id, subject, description, status, law_firm_consulted, resolved_at, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("client_services")
        .select("id, services(name)")
        .eq("client_id", clientId)
        .eq("is_active", true),
    ]);
    setCases((cs ?? []) as LegalCase[]);
    setHasSubscription(
      (subs ?? []).some((s: any) => s.services?.name === "Legal & Corporate Support"),
    );
  };

  useEffect(() => {
    if (clientId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const submitCase = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error("Tanto el asunto como la descripción son obligatorios");
      return;
    }
    setBusy(true);
    const { data: caseId, error } = await supabase.rpc("submit_legal_case", {
      p_subject: subject.trim(),
      p_description: description.trim(),
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    if (attachFile && caseId && clientId && user) {
      const safeName = attachFile.name.replace(/[^\w.-]/g, "_");
      const path = `${clientId}/legal_query_attachments/${caseId}_${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from("client-documents").upload(path, attachFile);
      if (upErr) {
        toast.warning("Consulta enviada, pero el adjunto falló — podés adjuntar un archivo desde tu lista de casos más adelante.");
      } else {
        await supabase.from("documents").insert({
          client_id: clientId,
          file_name: attachFile.name,
          file_size: attachFile.size,
          mime_type: attachFile.type || null,
          category: "legal_query_attachments",
          storage_path: path,
          legal_case_id: caseId,
          uploaded_by: user.id,
        });
        toast.success("Consulta legal enviada — Abner se va a poner en contacto");
      }
    } else {
      toast.success("Consulta legal enviada — Abner se va a poner en contacto");
    }

    setBusy(false);
    setSubmitOpen(false);
    setSubject("");
    setDescription("");
    setAttachFile(null);
    load();
  };

  if (clientLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" /> Consulta legal
          </h1>
          <p className="text-sm text-muted-foreground">
            Consultas legales corporativas con SGS. Abner revisa cada caso y, si hace falta, coordina con nuestra firma legal.
          </p>
        </div>
        <Button onClick={() => setSubmitOpen(true)} disabled={!hasSubscription}>
          <Plus className="h-4 w-4 mr-2" /> Nueva consulta
        </Button>
      </div>

      {!hasSubscription && (
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Suscripción no activa</CardTitle>
            </div>
            <CardDescription>
              Para enviar consultas legales necesitás tener activa la suscripción "Legal & Corporate Support". Contactá a SGS para activarla.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {cases.length === 0 ? (
        hasSubscription && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aún no enviaste consultas. Hacé click en "Nueva consulta" cuando tengas una.
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{c.subject}</CardTitle>
                    <CardDescription>
                      Enviada {new Date(c.created_at).toLocaleDateString()}
                      {c.resolved_at ? ` · Cerrada ${new Date(c.resolved_at).toLocaleDateString()}` : ""}
                    </CardDescription>
                  </div>
                  <Badge variant={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{c.description}</p>
                {c.law_firm_consulted && (
                  <p className="text-xs text-muted-foreground mt-3">
                    🔍 Coordinado con nuestra firma legal externa
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={submitOpen} onOpenChange={(open) => { setSubmitOpen(open); if (!open) setAttachFile(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva consulta legal</DialogTitle>
            <DialogDescription>
              Contanos qué necesitás. Abner va a revisarlo y agendar una reunión para entregarte la asesoría.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="lc-subject">Asunto *</Label>
              <Input
                id="lc-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej: Revisión de contrato con proveedor X"
              />
            </div>
            <div>
              <Label htmlFor="lc-desc">Descripción *</Label>
              <Textarea
                id="lc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Detallá el contexto, qué necesitás resolver, urgencia, documentos relacionados..."
              />
            </div>
            <div>
              <Label htmlFor="lc-attach" className="flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" /> Adjunto (opcional)
              </Label>
              <Input
                id="lc-attach"
                type="file"
                onChange={(e) => setAttachFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>Cancelar</Button>
            <Button onClick={submitCase} disabled={busy || !subject.trim() || !description.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar consulta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientLegal;
