import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ClientServices = () => {
  const { clientId } = useCurrentClientId();
  const [active, setActive] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: cat } = await supabase.from("services").select("*").eq("is_active", true).order("name");
      setCatalog(cat ?? []);
      if (clientId) {
        const { data: cs } = await supabase.from("client_services")
          .select("*, services(*)").eq("client_id", clientId).eq("is_active", true);
        setActive(cs ?? []);
      }
    })();
  }, [clientId]);

  const activeIds = new Set(active.map((a) => a.service_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis servicios</h1>
        <p className="text-sm text-muted-foreground">Servicios contratados y catálogo disponible.</p>
      </div>

      {active.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Activos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.map((cs) => (
              <Card key={cs.id} className="border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{cs.services?.name}</CardTitle>
                    <Badge>Activo</Badge>
                  </div>
                  <CardDescription>{cs.services?.category}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {cs.services?.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Catálogo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  {activeIds.has(s.id) && <Badge variant="secondary">Contratado</Badge>}
                </div>
                <CardDescription>{s.category}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{s.description}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientServices;
