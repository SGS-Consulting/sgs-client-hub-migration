import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, XCircle } from "lucide-react";

type InsuranceRecord = {
  has_gl_insurance: boolean;
  has_wc_insurance: boolean;
  coverage_status: "needs_assessment" | "needs_coverage" | "quote_requested" | "covered";
};

const COVERAGE_LABEL: Record<InsuranceRecord["coverage_status"], string> = {
  needs_assessment: "Pendiente de evaluación",
  needs_coverage: "Sin cobertura — en proceso",
  quote_requested: "Cotización en proceso",
  covered: "Cubierto",
};

const COVERAGE_TONE: Record<InsuranceRecord["coverage_status"], "default" | "secondary" | "outline"> = {
  needs_assessment: "outline",
  needs_coverage: "outline",
  quote_requested: "default",
  covered: "secondary",
};

const ClientInsurance = () => {
  const { clientId, loading: clientLoading } = useCurrentClientId();
  const [record, setRecord] = useState<InsuranceRecord | null>(null);

  useEffect(() => {
    if (!clientId) return;
    supabase
      .from("client_insurance")
      .select("has_gl_insurance, has_wc_insurance, coverage_status")
      .eq("client_id", clientId)
      .maybeSingle()
      .then(({ data }) => setRecord(data as InsuranceRecord | null));
  }, [clientId]);

  if (clientLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" /> Seguros y Riesgo
        </h1>
        <p className="text-sm text-muted-foreground">
          Estado de tu cobertura de seguro de responsabilidad civil (GL) y compensación de trabajadores (WC).
        </p>
      </div>

      {!record ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay registro de seguros para tu empresa. Abner te va a contactar para evaluarlo.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">General Liability (GL)</CardTitle>
                  {record.has_gl_insurance
                    ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                    : <XCircle className="h-5 w-5 text-muted-foreground" />}
                </div>
                <CardDescription>Seguro de responsabilidad civil general</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant={record.has_gl_insurance ? "default" : "outline"}>
                  {record.has_gl_insurance ? "Activo" : "Sin cobertura"}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Workers Compensation (WC)</CardTitle>
                  {record.has_wc_insurance
                    ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                    : <XCircle className="h-5 w-5 text-muted-foreground" />}
                </div>
                <CardDescription>Seguro de compensación para trabajadores</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant={record.has_wc_insurance ? "default" : "outline"}>
                  {record.has_wc_insurance ? "Activo" : "Sin cobertura"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estado general</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={COVERAGE_TONE[record.coverage_status]}>
                {COVERAGE_LABEL[record.coverage_status]}
              </Badge>
              {record.coverage_status !== "covered" && (
                <p className="text-xs text-muted-foreground mt-2">
                  Si tenés preguntas sobre tu cobertura, contactá a Abner directamente.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClientInsurance;
