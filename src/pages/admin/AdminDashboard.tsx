import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, KanbanSquare, AlertCircle, Receipt, DollarSign, FileText,
  ArrowUpRight, ArrowDownRight, Download, Plus, ArrowRight, Briefcase, Clock,
} from "lucide-react";
import dashboardHero from "@/assets/dashboard-hero.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";

interface Stats {
  activeClients: number;
  openTasks: number;
  overdueTasks: number;
  pendingInvoices: number;
  amountDue: number;
  pendingDocuments: number;
  monthRevenue: number;
}

const today = () => {
  const d = new Date();
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

const Delta = ({ value, positive = true }: { value: string; positive?: boolean }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
    }`}
  >
    {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
    {value}
  </span>
);

const MetricCard = ({
  label, value, icon: Icon, delta, deltaPositive = true, deltaLabel = "vs mes anterior", iconBg = "bg-primary/10 text-primary",
}: {
  label: string; value: string | number; icon: any; delta?: string; deltaPositive?: boolean; deltaLabel?: string; iconBg?: string;
}) => (
  <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </div>
      {delta && (
        <div className="flex items-center gap-2 text-xs">
          <Delta value={delta} positive={deltaPositive} />
          <span className="text-muted-foreground">{deltaLabel}</span>
        </div>
      )}
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const { roles } = useAuth();
  const canFinance = can(roles, "view:finance");
  const canClients = can(roles, "view:clients");
  const canTasks = can(roles, "view:tasks");
  const canDocs = can(roles, "view:documents");

  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [adminName, setAdminName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split("T")[0];

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
        setAdminName(prof?.full_name || prof?.email?.split("@")[0] || "");
      }

      const [clients, tasksOpen, tasksOverdue, invoicesPending, invoicesAll, docsPending, paidMonth, recentInv] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "closed").lt("due_date", todayStr),
        supabase.from("invoices").select("id", { count: "exact", head: true }).in("status", ["sent", "overdue"]),
        supabase.from("invoices").select("total, status").in("status", ["sent", "overdue"]),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("invoices").select("total").eq("status", "paid").gte("issue_date", monthStartStr),
        supabase.from("invoices")
          .select("id, invoice_number, total, status, issue_date, client_id, clients(company_name)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const amountDue = (invoicesAll.data ?? []).reduce((acc, inv: any) => acc + Number(inv.total ?? 0), 0);
      const monthRevenue = (paidMonth.data ?? []).reduce((acc, inv: any) => acc + Number(inv.total ?? 0), 0);

      setStats({
        activeClients: clients.count ?? 0,
        openTasks: tasksOpen.count ?? 0,
        overdueTasks: tasksOverdue.count ?? 0,
        pendingInvoices: invoicesPending.count ?? 0,
        amountDue,
        pendingDocuments: docsPending.count ?? 0,
        monthRevenue,
      });
      setRecent(recentInv.data ?? []);
    })();
  }, []);

  const fmtMoney = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      paid: "bg-success/10 text-success border-success/20",
      sent: "bg-info/10 text-info border-info/20",
      overdue: "bg-destructive/10 text-destructive border-destructive/20",
      draft: "bg-muted text-muted-foreground border-border",
      cancelled: "bg-muted text-muted-foreground border-border",
    };
    const labels: Record<string, string> = { paid: "Pagada", sent: "Enviada", overdue: "Vencida", draft: "Borrador", cancelled: "Cancelada" };
    return <Badge variant="outline" className={`font-medium ${map[s] ?? "bg-muted"}`}>{labels[s] ?? s}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header / Hero */}
      <div className="rounded-2xl bg-brand text-brand-foreground p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 overflow-hidden relative">
        <div className="flex-1 space-y-4 relative z-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-brand-foreground/60">Panel administrativo</p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2">
              Bienvenido{adminName ? `, ${adminName}` : ""}
            </h1>
            <p className="text-sm text-brand-foreground/70 capitalize mt-1">{today()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button asChild size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/admin/clients"><Plus className="h-4 w-4" /> Nuevo cliente</Link>
            </Button>
          </div>
        </div>
        <img
          src={dashboardHero}
          alt=""
          width={1920}
          height={1080}
          className="hidden sm:block w-72 h-auto object-contain relative z-10 mix-blend-screen opacity-90"
        />
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Clientes activos"
          value={stats?.activeClients ?? "—"}
          icon={Users}
          delta="4.9%"
          iconBg="bg-info/10 text-info"
        />
        <MetricCard
          label="Tareas abiertas"
          value={stats?.openTasks ?? "—"}
          icon={KanbanSquare}
          delta="2.7%"
          iconBg="bg-primary/15 text-primary"
        />
        <MetricCard
          label="Ingresos del mes"
          value={fmtMoney(stats?.monthRevenue ?? 0)}
          icon={DollarSign}
          delta="4.9%"
          iconBg="bg-success/10 text-success"
        />
        <MetricCard
          label="Por cobrar"
          value={fmtMoney(stats?.amountDue ?? 0)}
          icon={Receipt}
          delta="3.4%"
          deltaPositive={false}
          iconBg="bg-warning/15 text-warning-foreground"
        />
      </div>

      {/* Operations + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Operación</CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              <Link to="/admin/tasks">Ver todo <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-0">
            <Link to="/admin/tasks" className="rounded-xl border border-border/60 p-4 hover:border-primary/50 hover:bg-muted/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-3">{stats?.overdueTasks ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">Tareas vencidas</p>
            </Link>
            <Link to="/admin/documents" className="rounded-xl border border-border/60 p-4 hover:border-primary/50 hover:bg-muted/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-3">{stats?.pendingDocuments ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">Documentos por revisar</p>
            </Link>
            <Link to="/admin/invoices" className="rounded-xl border border-border/60 p-4 hover:border-primary/50 hover:bg-muted/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-warning/15 text-warning-foreground flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-3">{stats?.pendingInvoices ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">Facturas pendientes</p>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-brand text-brand-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-brand-foreground">Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Button asChild variant="secondary" className="w-full justify-between">
              <Link to="/admin/tasks/workspaces"><span className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Workspaces</span><ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="secondary" className="w-full justify-between">
              <Link to="/admin/invoices"><span className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Nueva factura</span><ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="secondary" className="w-full justify-between">
              <Link to="/admin/team"><span className="flex items-center gap-2"><Users className="h-4 w-4" /> Equipo</span><ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="secondary" className="w-full justify-between">
              <Link to="/admin/services"><span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Servicios</span><ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Facturas recientes</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Últimas 5 emitidas</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <Link to="/admin/invoices">Ver todas <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aún no hay facturas registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                    <th className="font-medium py-3 px-2">Factura</th>
                    <th className="font-medium py-3 px-2">Cliente</th>
                    <th className="font-medium py-3 px-2">Fecha</th>
                    <th className="font-medium py-3 px-2">Estado</th>
                    <th className="font-medium py-3 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((inv: any) => (
                    <tr key={inv.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                      <td className="py-3 px-2 font-medium">{inv.invoice_number}</td>
                      <td className="py-3 px-2 text-muted-foreground">{inv.clients?.company_name ?? "—"}</td>
                      <td className="py-3 px-2 text-muted-foreground">{new Date(inv.issue_date).toLocaleDateString("es-ES")}</td>
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

export default AdminDashboard;
