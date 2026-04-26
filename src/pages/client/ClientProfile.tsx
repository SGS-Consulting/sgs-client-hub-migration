import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";

const ClientProfile = () => {
  const { clientId } = useCurrentClientId();
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    if (!clientId) return;
    supabase.from("clients").select("*").eq("id", clientId).single().then(({ data }) => setClient(data));
  }, [clientId]);

  const save = async () => {
    if (!client) return;
    // Only fields the client can change
    const { error } = await supabase.from("clients").update({
      contact_name: client.contact_name, phone: client.phone,
      address_line1: client.address_line1, address_line2: client.address_line2,
      city: client.city, state: client.state, zip: client.zip,
    }).eq("id", client.id);
    if (error) toast.error(error.message); else toast.success("Datos actualizados");
  };

  if (!client) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi información</h1>
        <p className="text-sm text-muted-foreground">Mantén tus datos al día.</p>
      </div>
      <Card><CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Empresa</Label><Input disabled value={client.company_name ?? ""} /></div>
          <div className="space-y-2"><Label>Email</Label><Input disabled value={client.email ?? ""} /></div>
          <div className="space-y-2"><Label>Persona de contacto</Label><Input value={client.contact_name ?? ""} onChange={(e) => setClient({ ...client, contact_name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Teléfono</Label><Input value={client.phone ?? ""} onChange={(e) => setClient({ ...client, phone: e.target.value })} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Dirección</Label><Input value={client.address_line1 ?? ""} onChange={(e) => setClient({ ...client, address_line1: e.target.value })} /></div>
          <div className="space-y-2"><Label>Ciudad</Label><Input value={client.city ?? ""} onChange={(e) => setClient({ ...client, city: e.target.value })} /></div>
          <div className="space-y-2"><Label>Estado</Label><Input value={client.state ?? ""} onChange={(e) => setClient({ ...client, state: e.target.value })} /></div>
          <div className="space-y-2"><Label>Código postal</Label><Input value={client.zip ?? ""} onChange={(e) => setClient({ ...client, zip: e.target.value })} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Para cambiar empresa, EIN o email, contacta a tu administrador.</p>
        <div className="flex justify-end"><Button onClick={save}><Save className="h-4 w-4" /> Guardar</Button></div>
      </CardContent></Card>
    </div>
  );
};

export default ClientProfile;
