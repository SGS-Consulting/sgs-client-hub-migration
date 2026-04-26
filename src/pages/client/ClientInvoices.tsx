import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, INVOICE_STATUSES } from "@/lib/status";
import { cn } from "@/lib/utils";

const ClientInvoices = () => {
  const { clientId } = useCurrentClientId();
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!clientId) return;
    supabase.from("invoices").select("*, invoice_items(*)").eq("client_id", clientId)
      .order("created_at", { ascending: false }).then(({ data }) => setInvoices(data ?? []));
  }, [clientId]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis facturas</h1>
        <p className="text-sm text-muted-foreground">Historial y estado de tus facturas.</p>
      </div>
      <Card><CardContent className="p-4">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Número</TableHead><TableHead>Emisión</TableHead><TableHead>Vencimiento</TableHead>
            <TableHead>Total</TableHead><TableHead>Estado</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {invoices.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin facturas</TableCell></TableRow>
            : invoices.map((i) => {
              const overdue = i.due_date && i.due_date < today && i.status !== "paid" && i.status !== "cancelled";
              return (
                <TableRow key={i.id} className={cn(overdue && "bg-destructive/5")}>
                  <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                  <TableCell>{new Date(i.issue_date).toLocaleDateString()}</TableCell>
                  <TableCell className={cn(overdue && "text-destructive font-medium")}>
                    {i.due_date ? new Date(i.due_date).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="font-semibold">${Number(i.total).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge value={overdue ? "overdue" : i.status} options={INVOICE_STATUSES} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default ClientInvoices;
