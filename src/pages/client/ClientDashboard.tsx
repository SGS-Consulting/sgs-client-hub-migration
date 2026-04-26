import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Receipt, FileText, Briefcase, AlertCircle, ArrowRight, Upload,
  HelpCircle, DollarSign, CheckCircle2, Clock,
} from "lucide-react";

const today = () => new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const MetricCard = ({
  label, value, icon: Icon, iconBg = "bg-primary/10 text-primary", hint,
}: { label: string; value: string | number; icon: any; iconBg?: string; hint?: string }) => (
  <Card className="border-border/60 shadow-sm">
    <CardContent className="p-5 space-y-4">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </CardContent>
  </Card>
);

const ClientDashboard = () => {
  const { clientId } = useCurrentClientId();
  const [stats, setStats] = useState({ pendingInvoices: 0, amountDue: 0, pendingDocs: 0, services: 0, openTasks: 0 });
  const [client, setClient] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const [c, inv, docs, svc, tasks, recentInv] = await Promise.all([
        supabase.from("clients").select("company_name, contact_name, entity_type, status").eq("id", clientId).single(),
        supabase.from("invoices").select("total, status").eq("client_id", clientId).in("status", ["sent", "overdue"]),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "pending_review"),
        supabase.from("client_services").select("id, services(name, category)", { count: "exact" }).eq("client_id", clientId).eq("is_active", true).limit(5),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("client_id", clientId).neq("status", "closed"),
        supabase.from("invoices").select("id, invoice_number, total, status, issue_date, due_date").eq("client_id", clientId).order("created_at", { ascending: false }).limit(4),
      ]);
      setClient(c.data);
      setStats({
        pendingInvoices: (inv.data ?? []).length,
        amountDue: (inv.data ?? []).reduce((a, i: any) => a + Number(i.total), 0),
        pendingDocs: docs.count ?? 0,
        services: svc.count ?? 0,
        openTasks: tasks.count ?? 0,
      });
      setServices(svc.data ?? []);
      setInvoices(recentInv.data ?? []);
    })();
  }, [clientId]);

  const fmtMoney = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!clientId) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-warning/15 text-warning-foreground flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="font-semibold text-lg">Tu cuenta aún no está vinculada a un cliente</p>
          <p className="text-sm text-muted-foreground">Contacta a SGS Consulting Group para activar tu portal.</p>
        </CardContent>
      </Card>
    );
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      paid: "bg-success/10 text-success border-success/20",
      sent: "bg-info/10 text-info border-info/20",
      overdue: "bg-destructive/10 text-destructive border-destructive/20",
      draft: "bg-muted text-muted-foreground border-border",
    };
    const labels: Record<string, string> = { paid: "Pagada", sent: "Pendiente", overdue: "Vencida", draft: "Borrador" };
    return <Badge variant="outline" className={`font-medium ${map[s] ?? "bg-muted"}`}>{labels[s] ?? s}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Hola, {client?.contact_name ?? client?.company_name ?? "bienvenido"}
          </h1>
          <p className="text-sm text-muted-foreground capitalize mt-1">{today()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-success/10 text-success border-success/20 capitalize">
            {client?.status === "active" ? "Cuenta activa" : client?.status}
          </Badge>
          {client?.entity_type && (
            <Badge variant="outline" className="bg-muted">{client.entity_type}</Badge>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Por pagar"
          value={fmtMoney(stats.amountDue)}
          icon={DollarSign}
          iconBg="bg-destructive/10 text-destructive"
          hint={`${stats.pendingInvoices} factura${stats.pendingInvoices === 1 ? "" : "s"} pendiente${stats.pendingInvoices === 1 ? "" : "s"}`}
        />
        <MetricCard
          label="Documentos en revisión"
          value={stats.pendingDocs}
          icon={FileText}
          iconBg="bg-info/10 text-info"
        />
        <MetricCard
          label="Servicios activos"
          value={stats.services}
          icon={Briefcase}
          iconBg="bg-success/10 text-success"
        />
        <MetricCard
          label="Tareas en curso"
          value={stats.openTasks}
          icon={Clock}
          iconBg="bg-primary/15 text-primary"
        />
      </div>

      {/* Quick actions + Services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-brand text-brand-foreground lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-brand-foreground">¿Qué quieres hacer?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Button asChild variant="secondary" className="w-full justify-between">
              <Link to="/portal/documents"><span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Subir documento</span><ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="secondary" className="w-full justify-between">
              <Link to="/portal/invoices"><span className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Ver facturas</span><ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="secondary" className="w-full justify-between">
              <Link to="/portal/services"><span className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Mis servicios</span><ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="secondary" className="w-full justify-between">
              <Link to="/portal/support"><span className="flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Solicitar soporte</span><ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Servicios contratados</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Servicios activos en tu cuenta</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              <Link to="/portal/services">Ver todos <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No tienes servicios activos.</p>
            ) : (
              <ul className="space-y-2">
                {services.map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 hover:bg-muted/40">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{s.services?.name ?? "Servicio"}</p>
                        {s.services?.category && (
                          <p className="text-xs text-muted-foreground">{s.services.category}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">Activo</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Mis facturas recientes</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Últimas emisiones</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <Link to="/portal/invoices">Ver todas <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aún no tienes facturas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                    <th className="font-medium py-3 px-2">Factura</th>
                    <th className="font-medium py-3 px-2">Emisión</th>
                    <th className="font-medium py-3 px-2">Vence</th>
                    <th className="font-medium py-3 px-2">Estado</th>
                    <th className="font-medium py-3 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                      <td className="py-3 px-2 font-medium">{inv.invoice_number}</td>
                      <td className="py-3 px-2 text-muted-foreground">{new Date(inv.issue_date).toLocaleDateString("es-ES")}</td>
                      <td className="py-3 px-2 text-muted-foreground">{inv.due_date ? new Date(inv.due_date).toLocaleDateString("es-ES") : "—"}</td>
                      <td className="py-3 px-2">{statusBadge(inv.status)}</td>
                      <td className="py-3 px-2 text-right font-semibold">{fmtMoney(Number(inv.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDashboard;
