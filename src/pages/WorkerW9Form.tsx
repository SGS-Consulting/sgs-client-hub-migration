import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Context = {
  ok: true;
  already_completed: boolean;
  worker: { full_name: string; email: string | null };
  client: { company_name: string | null };
  expires_at: string;
};

const CLASSIFICATIONS = [
  { value: "individual_sole_prop", label: "Individual / sole proprietor / single-member LLC" },
  { value: "c_corp", label: "C Corporation" },
  { value: "s_corp", label: "S Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "trust_estate", label: "Trust / estate" },
  { value: "llc_c", label: "LLC taxed as C corp" },
  { value: "llc_s", label: "LLC taxed as S corp" },
  { value: "llc_p", label: "LLC taxed as partnership" },
  { value: "other", label: "Other" },
];

const blankForm = () => ({
  legal_name: "",
  business_name: "",
  federal_tax_classification: "" as "" | (typeof CLASSIFICATIONS)[number]["value"],
  llc_classification_letter: "",
  other_classification_text: "",
  exempt_payee_code: "",
  exempt_fatca_code: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  zip: "",
  requester_name_address: "",
  account_numbers: "",
  tin_type: "ssn" as "ssn" | "ein",
  tin_full: "",
  signature_typed_name: "",
});

const WorkerW9Form = () => {
  const { token } = useParams<{ token: string }>();
  const [ctx, setCtx] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(blankForm());

  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string;
  const fnUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/worker-w9`;

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const r = await fetch(`${fnUrl}?token=${encodeURIComponent(token)}`, { method: "GET" });
        const data = await r.json();
        if (!r.ok) {
          setError(data?.error ?? "Token inválido");
        } else {
          setCtx(data as Context);
          if ((data as Context).already_completed) setSubmitted(true);
        }
      } catch (e: any) {
        setError(e?.message ?? "No pudimos cargar el formulario");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const isLLC = ["llc_c", "llc_s", "llc_p"].includes(form.federal_tax_classification);
  const isOther = form.federal_tax_classification === "other";

  const submit = async () => {
    if (!token) return;
    if (!form.legal_name.trim()) return toast.error("Legal name is required");
    if (!form.federal_tax_classification) return toast.error("Pick a federal tax classification");
    if (isLLC && !form.llc_classification_letter.trim()) return toast.error("Pick the LLC tax classification letter (C, S, or P)");
    if (isOther && !form.other_classification_text.trim()) return toast.error("Describe the 'other' classification");
    if (!form.address_line1.trim() || !form.city.trim() || !form.state.trim() || !form.zip.trim())
      return toast.error("Address is required");
    if (!form.tin_full.trim()) return toast.error("Tax ID is required");
    if (!form.signature_typed_name.trim()) return toast.error("Type your name as your signature");

    setSubmitting(true);
    try {
      const r = await fetch(fnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? "Submission failed");
      setSubmitted(true);
      toast.success("W-9 enviado");
    } catch (e: any) {
      toast.error(e?.message ?? "No pudimos enviar el formulario");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Link no válido</CardTitle>
            </div>
            <CardDescription>
              {error === "token expired"
                ? "Este link de W-9 expiró. Pediles a SGS o al cliente que te envíen uno nuevo."
                : error === "token not found"
                  ? "No encontramos este link. Verificá que copiaste la URL completa."
                  : (error ?? "No pudimos cargar el formulario.")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <CardTitle>W-9 recibido</CardTitle>
            </div>
            <CardDescription>
              Gracias, {ctx.worker.full_name.split(" ")[0]}. Tu W-9 quedó registrado para {ctx.client.company_name ?? "tu empresa contratante"}.
              Ya podés cerrar esta ventana — te enviamos un email de confirmación.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Formulario W-9</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ctx.client.company_name ?? "Tu empresa contratante"} solicita tu información tributaria.
            Esta es una versión digital del formulario W-9 del IRS — los datos quedan guardados de forma segura para que SGS pueda emitir tu 1099 a fin de año.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Link expira: {new Date(ctx.expires_at).toLocaleDateString()}
          </p>
        </div>

        {/* Section 1 — Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Identidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="w9-legal-name">Nombre legal completo *</Label>
              <Input
                id="w9-legal-name"
                value={form.legal_name}
                onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                placeholder="Como aparece en tu declaración de impuestos"
              />
            </div>
            <div>
              <Label htmlFor="w9-business-name">Nombre de negocio (DBA) — opcional</Label>
              <Input
                id="w9-business-name"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Clasificación fiscal federal *</Label>
              <Select
                value={form.federal_tax_classification}
                onValueChange={(v) => setForm({ ...form, federal_tax_classification: v as any })}
              >
                <SelectTrigger><SelectValue placeholder="Elegí una opción" /></SelectTrigger>
                <SelectContent>
                  {CLASSIFICATIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isLLC && (
              <div>
                <Label>Letra de clasificación LLC *</Label>
                <Select
                  value={form.llc_classification_letter}
                  onValueChange={(v) => setForm({ ...form, llc_classification_letter: v })}
                >
                  <SelectTrigger><SelectValue placeholder="C, S, o P" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C">C — taxed as C corp</SelectItem>
                    <SelectItem value="S">S — taxed as S corp</SelectItem>
                    <SelectItem value="P">P — taxed as partnership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {isOther && (
              <div>
                <Label htmlFor="w9-other">Describí "Other" *</Label>
                <Input
                  id="w9-other"
                  value={form.other_classification_text}
                  onChange={(e) => setForm({ ...form, other_classification_text: e.target.value })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2 — Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Dirección</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="w9-addr1">Dirección (línea 1) *</Label>
              <Input id="w9-addr1" value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="w9-addr2">Dirección (línea 2) — opcional</Label>
              <Input id="w9-addr2" value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="w9-city">Ciudad *</Label>
                <Input id="w9-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="w9-state">Estado *</Label>
                <Input id="w9-state" maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} placeholder="DE" />
              </div>
            </div>
            <div>
              <Label htmlFor="w9-zip">ZIP *</Label>
              <Input id="w9-zip" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className="max-w-[150px]" />
            </div>
          </CardContent>
        </Card>

        {/* Section 3 — Tax ID */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Tax ID</CardTitle>
            <CardDescription>
              Tu SSN o EIN. Esta información viaja encriptada y solo SGS puede acceder a ella.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={form.tin_type} onValueChange={(v) => setForm({ ...form, tin_type: v as "ssn" | "ein" })}>
                <SelectTrigger className="max-w-[260px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ssn">Social Security Number (SSN)</SelectItem>
                  <SelectItem value="ein">Employer Identification Number (EIN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="w9-tin">Número *</Label>
              <Input
                id="w9-tin"
                value={form.tin_full}
                onChange={(e) => setForm({ ...form, tin_full: e.target.value })}
                placeholder={form.tin_type === "ssn" ? "XXX-XX-XXXX" : "XX-XXXXXXX"}
                className="max-w-[260px] font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 4 — Signature */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">4. Firma</CardTitle>
            <CardDescription>
              Al escribir tu nombre acá certificás que la información es correcta y completa, equivalente a firmar el W-9.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="w9-sig">Tu nombre como firma *</Label>
            <Input
              id="w9-sig"
              value={form.signature_typed_name}
              onChange={(e) => setForm({ ...form, signature_typed_name: e.target.value })}
              placeholder={ctx.worker.full_name}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={submitting} size="lg">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enviar W-9
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkerW9Form;
