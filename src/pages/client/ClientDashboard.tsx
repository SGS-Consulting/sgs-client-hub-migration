import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, FileText, Briefcase, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ClientDashboard = () => {
  const { clientId } = useCurrentClientId();
  const [stats, setStats] = useState({ pendingInvoices: 0, amountDue: 0, pendingDocs: 0, services: 0 });
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const [c, inv, docs, svc] = await Promise.all([
        supabase.from("clients").select("company_name, contact_name").eq("id", clientId).single(),
        supabase.from("invoices").select("total, status").eq("client_id", clientId).in("status", ["sent", "overdue"]),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "pending_review"),
        supabase.from("client_services").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("is_active", true),
      ]);
      setClient(c.data);
      setStats({
        pendingInvoices: (inv.data ?? []).length,
        amountDue: (inv.data ?? []).reduce((a, i: any) => a + Number(i.total), 0),
        pendingDocs: docs.count ?? 0,
        services: svc.count ?? 0,
      });
    })();
  }, [clientId]);

  if (!clientId) {
    return (
      <Card><CardContent className="p-6 text-center space-y-2">
        <AlertCircle className="h-8 w-8 mx-auto text-warning" />
        <p className="font-medium">Tu cuenta aún no está vinculada a un cliente.</p>
        <p className="text-sm text-muted-foreground">Contacta a SGS Consulting Group para activar tu portal.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hola, {client?.contact_name ?? client?.company_name ?? "bienvenido"}</h1>
        <p className="text-sm text-muted-foreground">Resumen de tu cuenta con SGS Consulting Group.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Facturas pendientes</p><p className="text-2xl font-bold mt-1">{stats.pendingInvoices}</p></div>
            <Receipt className="h-6 w-6 text-warning-foreground" />
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Por pagar</p><p className="text-2xl font-bold mt-1">${stats.amountDue.toLocaleString()}</p></div>
            <Receipt className="h-6 w-6 text-destructive" />
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Documentos en revisión</p><p className="text-2xl font-bold mt-1">{stats.pendingDocs}</p></div>
            <FileText className="h-6 w-6 text-info" />
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Servicios activos</p><p className="text-2xl font-bold mt-1">{stats.services}</p></div>
            <Briefcase className="h-6 w-6 text-success" />
          </div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-base">Subir documento</CardTitle></CardHeader><CardContent>
          <Button asChild className="w-full"><Link to="/portal/documents">Ir a documentos</Link></Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Ver facturas</CardTitle></CardHeader><CardContent>
          <Button asChild variant="outline" className="w-full"><Link to="/portal/invoices">Ver facturas</Link></Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Solicitar soporte</CardTitle></CardHeader><CardContent>
          <Button asChild variant="outline" className="w-full"><Link to="/portal/support">Abrir solicitud</Link></Button>
        </CardContent></Card>
      </div>
    </div>
  );
};

export default ClientDashboard;
