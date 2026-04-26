import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, KanbanSquare, AlertCircle, Receipt, DollarSign, Clock } from "lucide-react";

interface Stats {
  activeClients: number;
  openTasks: number;
  overdueTasks: number;
  pendingInvoices: number;
  amountDue: number;
  pendingDocuments: number;
}

const StatCard = ({
  label, value, icon: Icon, accent,
}: { label: string; value: string | number; icon: any; accent?: string }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accent ?? "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().split("T")[0];
      const [clients, tasksOpen, tasksOverdue, invoicesPending, invoicesAll, docsPending] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "closed").lt("due_date", today),
        supabase.from("invoices").select("id", { count: "exact", head: true }).in("status", ["sent", "overdue"]),
        supabase.from("invoices").select("total, status").in("status", ["sent", "overdue"]),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      ]);

      const amountDue = (invoicesAll.data ?? []).reduce((acc, inv: any) => acc + Number(inv.total ?? 0), 0);

      setStats({
        activeClients: clients.count ?? 0,
        openTasks: tasksOpen.count ?? 0,
        overdueTasks: tasksOverdue.count ?? 0,
        pendingInvoices: invoicesPending.count ?? 0,
        amountDue,
        pendingDocuments: docsPending.count ?? 0,
      });
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visión general de la operación.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Clientes activos" value={stats?.activeClients ?? "—"} icon={Users} />
        <StatCard label="Tareas abiertas" value={stats?.openTasks ?? "—"} icon={KanbanSquare} />
        <StatCard label="Tareas vencidas" value={stats?.overdueTasks ?? "—"} icon={AlertCircle} accent="bg-destructive/10 text-destructive" />
        <StatCard label="Facturas pendientes" value={stats?.pendingInvoices ?? "—"} icon={Receipt} accent="bg-warning/10 text-warning-foreground" />
        <StatCard label="Por cobrar" value={`$${(stats?.amountDue ?? 0).toLocaleString()}`} icon={DollarSign} accent="bg-success/10 text-success" />
        <StatCard label="Documentos por revisar" value={stats?.pendingDocuments ?? "—"} icon={Clock} accent="bg-info/10 text-info" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bienvenido al panel administrativo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Desde aquí puedes gestionar clientes, tareas, documentos, facturas y servicios.</p>
          <p>La integración con GoHighLevel y los pagos online estarán disponibles en una próxima fase.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
