import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { NewQueryDialog } from "@/components/admin/NewQueryDialog";
import { Plus, MessageCircle } from "lucide-react";

type QueryRow = {
  id: string;
  client_id: string;
  question: string;
  due_date: string;
  status: "open" | "answered" | "overdue";
  owner_id: string | null;
  created_at: string;
  responded_at: string | null;
  clients: { company_name: string; contact_name: string | null } | null;
  owner: { full_name: string | null; email: string } | null;
};

type FilterMode = "all" | "mine" | "overdue" | "answered";

const AdminQueries = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("client_queries")
      .select(
        "id, client_id, question, due_date, status, owner_id, created_at, responded_at, clients(company_name, contact_name)",
      )
      .order("created_at", { ascending: false });
    // Owner profile lookups (separate query — RLS may not allow joining profiles directly)
    const ownerIds = Array.from(
      new Set((data ?? []).map((r: any) => r.owner_id).filter(Boolean)),
    );
    let owners: Record<string, { full_name: string | null; email: string }> = {};
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ownerIds);
      profiles?.forEach((p: any) => {
        owners[p.id] = { full_name: p.full_name, email: p.email };
      });
    }
    setRows(
      ((data as any) ?? []).map((r: any) => ({
        ...r,
        owner: r.owner_id ? owners[r.owner_id] ?? null : null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return rows.filter((r) => {
      if (filter === "mine") return r.owner_id === user?.id;
      if (filter === "overdue")
        return r.status === "open" && r.due_date < today;
      if (filter === "answered") return r.status === "answered";
      return true;
    });
  }, [rows, filter, user?.id]);

  const counts = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      all: rows.length,
      mine: rows.filter((r) => r.owner_id === user?.id).length,
      overdue: rows.filter((r) => r.status === "open" && r.due_date < today)
        .length,
      answered: rows.filter((r) => r.status === "answered").length,
    };
  }, [rows, user?.id]);

  const statusBadge = (status: string, dueDate: string) => {
    const today = new Date().toISOString().split("T")[0];
    if (status === "answered") return <Badge variant="secondary">Respondida</Badge>;
    if (status === "open" && dueDate < today)
      return <Badge variant="destructive">Vencida</Badge>;
    return <Badge>Abierta</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" /> Consultas a clientes
          </h1>
          <p className="text-sm text-muted-foreground">
            Preguntas pendientes y respondidas — flujo del día a día (SOP-03 §3.1).
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva consulta
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
        <TabsList>
          <TabsTrigger value="all">Todas ({counts.all})</TabsTrigger>
          <TabsTrigger value="mine">Mías ({counts.mine})</TabsTrigger>
          <TabsTrigger value="overdue">
            Vencidas ({counts.overdue})
          </TabsTrigger>
          <TabsTrigger value="answered">
            Respondidas ({counts.answered})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filter === "all"
              ? "Todas las consultas"
              : filter === "mine"
                ? "Mías"
                : filter === "overdue"
                  ? "Vencidas"
                  : "Respondidas"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Cargando…
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay consultas en esta vista.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pregunta</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Responsable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        to={`/admin/clients/${r.client_id}`}
                        className="hover:underline"
                      >
                        {r.clients?.company_name ?? "(unknown)"}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {r.question}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.due_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{statusBadge(r.status, r.due_date)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.owner?.full_name || r.owner?.email || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewQueryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={load}
      />
    </div>
  );
};

export default AdminQueries;
