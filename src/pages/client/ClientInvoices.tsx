import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, INVOICE_STATUSES } from "@/lib/status";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { toast } from "sonner";

const ClientInvoices = () => {
  const { clientId } = useCurrentClientId();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    if (!clientId) return;
    supabase.from("invoices").select("*, invoice_items(*)").eq("client_id", clientId)
      .order("created_at", { ascending: false }).then(({ data }) => setInvoices(data ?? []));
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle().then(({ data }) => setClient(data));
  }, [clientId]);

  const downloadPdf = async (inv: any) => {
    if (!client) return;
    try {
      await generateInvoicePdf({
        invoice_number: inv.invoice_number,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        notes: inv.notes,
        subtotal: Number(inv.subtotal),
        tax: Number(inv.tax),
        total: Number(inv.total),
        status: inv.status,
        client,
        items: (inv.invoice_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((it: any) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          line_total: Number(it.line_total),
        })),
      });
    } catch {
      toast.error("Error al generar el PDF");
    }
  };

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
            <TableHead>Total</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">PDF</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {invoices.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin facturas</TableCell></TableRow>
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
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => downloadPdf(i)}>
                      <FileDown className="h-4 w-4" /> Descargar
                    </Button>
                  </TableCell>
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
