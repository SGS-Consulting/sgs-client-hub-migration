import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CalendarDays } from "lucide-react";

type AdvisoryCase = {
  id: string;
  status: "initial_meeting" | "internal_strategy" | "recommendation" | "check_ins" | "closed";
  created_at: string;
  closed_at: string | null;
};

type Checkin = {
  id: string;
  session_date: string;
};

const STATUS_LABEL: Record<AdvisoryCase["status"], string> = {
  initial_meeting: "Reunión inicial",
  internal_strategy: "Estrategia interna",
  recommendation: "Recomendación",
  check_ins: "Seguimientos activos",
  closed: "Cerrado",
};

const STATUS_TONE: Record<AdvisoryCase["status"], "default" | "secondary" | "outline"> = {
  initial_meeting: "outline",
  internal_strategy: "outline",
  recommendation: "default",
  check_ins: "default",
  closed: "secondary",
};

const ClientAdvisory = () => {
  const { clientId, loading: clientLoading } = useCurrentClientId();
  const [cases, setCases] = useState<AdvisoryCase[]>([]);
  const [checkins, setCheckins] = useState<Record<string, Checkin[]>>({});

  const load = async () => {
    if (!clientId) return;
    const { data: cs } = await supabase
      .from("advisory_cases")
      .select("id, status, created_at, closed_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    const caseList = (cs ?? []) as AdvisoryCase[];
    setCases(caseList);

    const checkinMap: Record<string, Checkin[]> = {};
    await Promise.all(
      caseList.map(async (c) => {
        const { data: cis } = await supabase
          .from("advisory_checkins")
          .select("id, session_date")
          .eq("case_id", c.id)
          .order("session_date", { ascending: false });
        checkinMap[c.id] = (cis ?? []) as Checkin[];
      }),
    );
    setCheckins(checkinMap);
  };

  useEffect(() => {
    if (clientId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (clientLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> Asesoría Empresarial
        </h1>
        <p className="text-sm text-muted-foreground">
          Asesorías estratégicas con Abner: análisis de situación, plan de acción y seguimientos hasta la implementación.
        </p>
      </div>

      {cases.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay asesorías activas. Si querés arrancar una, contactá a Abner directamente.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {cases.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Asesoría estratégica</CardTitle>
                    <CardDescription>
                      Iniciada {new Date(c.created_at).toLocaleDateString()}
                      {c.closed_at ? ` · Cerrada ${new Date(c.closed_at).toLocaleDateString()}` : ""}
                    </CardDescription>
                  </div>
                  <Badge variant={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                </div>
              </CardHeader>
              {(checkins[c.id] ?? []).length > 0 && (
                <CardContent>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
                    <CalendarDays className="h-3.5 w-3.5" /> Seguimientos
                  </p>
                  <div className="space-y-1">
                    {(checkins[c.id] ?? []).map((ci) => (
                      <p key={ci.id} className="text-xs text-muted-foreground">
                        {new Date(ci.session_date).toLocaleDateString()}
                      </p>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientAdvisory;
