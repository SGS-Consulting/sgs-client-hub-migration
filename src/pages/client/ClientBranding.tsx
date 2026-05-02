import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Globe } from "lucide-react";

type BrandingProject = {
  id: string;
  web_included: boolean;
  status:
    | "brief_received"
    | "in_design"
    | "presented_to_client"
    | "client_approved"
    | "web_development"
    | "digital_profiles_updated"
    | "delivered"
    | "support";
  created_at: string;
  delivered_at: string | null;
};

const STATUS_LABEL: Record<BrandingProject["status"], string> = {
  brief_received: "Brief recibido",
  in_design: "En diseño",
  presented_to_client: "Presentado",
  client_approved: "Aprobado",
  web_development: "Desarrollo web",
  digital_profiles_updated: "Perfiles actualizados",
  delivered: "Entregado",
  support: "Soporte post-entrega",
};

const STATUS_TONE: Record<BrandingProject["status"], "default" | "secondary" | "outline"> = {
  brief_received: "outline",
  in_design: "outline",
  presented_to_client: "default",
  client_approved: "default",
  web_development: "default",
  digital_profiles_updated: "default",
  delivered: "secondary",
  support: "secondary",
};

const ALL_PHASES: BrandingProject["status"][] = [
  "brief_received",
  "in_design",
  "presented_to_client",
  "client_approved",
  "web_development",
  "digital_profiles_updated",
  "delivered",
  "support",
];

const ClientBranding = () => {
  const { clientId, loading: clientLoading } = useCurrentClientId();
  const [project, setProject] = useState<BrandingProject | null>(null);

  useEffect(() => {
    if (!clientId) return;
    supabase
      .from("branding_projects")
      .select("id, web_included, status, created_at, delivered_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setProject(data as BrandingProject | null));
  }, [clientId]);

  if (clientLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>;

  const visiblePhases = project
    ? ALL_PHASES.filter(
        (p) => project.web_included || (p !== "web_development" && p !== "digital_profiles_updated"),
      )
    : [];
  const currentPhaseIndex = project ? ALL_PHASES.indexOf(project.status) : -1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="h-6 w-6" /> Branding & Identidad
        </h1>
        <p className="text-sm text-muted-foreground">
          Tu proyecto de identidad visual: logo, manual de marca
          {project?.web_included ? ", sitio web" : ""} y perfiles digitales.
        </p>
      </div>

      {!project ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay proyecto de branding activo. Contactá a SGS para comenzar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Estado del proyecto</CardTitle>
                  <CardDescription>
                    Iniciado {new Date(project.created_at).toLocaleDateString()}
                    {project.delivered_at
                      ? ` · Entregado ${new Date(project.delivered_at).toLocaleDateString()}`
                      : ""}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {project.web_included && (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Badge variant={STATUS_TONE[project.status]}>{STATUS_LABEL[project.status]}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {visiblePhases.map((phase) => {
                  const phaseIdx = ALL_PHASES.indexOf(phase);
                  const done = phaseIdx < currentPhaseIndex;
                  const current = phaseIdx === currentPhaseIndex;
                  return (
                    <div key={phase} className="flex items-center gap-2 text-sm">
                      <span
                        className={`h-2 w-2 rounded-full flex-shrink-0 ${
                          done
                            ? "bg-primary"
                            : current
                            ? "bg-primary/60 ring-2 ring-primary/30"
                            : "bg-muted"
                        }`}
                      />
                      <span
                        className={
                          current
                            ? "font-medium"
                            : done
                            ? "text-muted-foreground line-through"
                            : "text-muted-foreground"
                        }
                      >
                        {STATUS_LABEL[phase]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entregables</CardTitle>
              <CardDescription>
                Los archivos de tu proyecto están disponibles en la sección Documentos.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClientBranding;
