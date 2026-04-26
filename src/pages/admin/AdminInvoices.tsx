import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, INVOICE_STATUSES } from "@/lib/status";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

type Item = { description: string; quantity: number; unit_price: number };

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  // Form
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [taxPct, setTaxPct] = useState(0);

  const load = async () => {
    const [i, c] = await Promise.all([
      supabase.from("invoices").select("*, clients(company_name)").order("created_at", { ascending: false }),
      supabase.from("clients").select("id, company_name").order("company_name"),
    ]);
    setInvoices(i.data ?? []);
    setClients(c.data ?? []);
  };

  useEffect(() => { load(); }, []);

  const subtotal = items.reduce((acc, it) => acc + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const tax = (subtotal * taxPct) / 100;
  const total = subtotal + tax;

  const create = async () => {
    if (!clientId) { toast.error("Selecciona un cliente"); return; }
    if (items.some((i) => !i.description.trim())) { toast.error("Cada línea necesita descripción"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: inv, error } = await supabase.from("invoices").insert({
      client_id: clientId, issue_date: issueDate, due_date: dueDate || null,
      subtotal, tax, total, notes: notes || null, status: "draft", created_by: user?.id,
    }).select().single();
    if (error || !inv) { toast.error(error?.message); return; }

    const itemRows = items.map((it, idx) => ({
      invoice_id: inv.id, description: it.description, quantity: it.quantity,
      unit_price: it.unit_price, line_total: Number(it.quantity) * Number(it.unit_price),
      sort_order: idx,
    }));
    await supabase.from("invoice_items").insert(itemRows);

    toast.success("Factura creada");
    setOpen(false);
    setClientId(""); setNotes(""); setDueDate(""); setTaxPct(0);
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
    load();
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("invoices").update({ status: "paid" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Marcada como pagada"); load(); }
  };

  const totals = {
    pending: invoices.filter((i) => ["sent", "overdue"].includes(i.status)).reduce((a, i) => a + Number(i.total), 0),
    paid: invoices.filter((i) => i.status === "paid").reduce((a, i) => a + Number(i.total), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Facturas</h1>
          <p className="text-sm text-muted-foreground">Crea y gestiona las facturas a tus clientes.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nueva factura</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Nueva factura</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-3">
                  <Label>Cliente</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                    <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Emisión</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Vencimiento</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Impuesto %</Label><Input type="number" min={0} value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value))} /></div>
              </div>

              <div className="space-y-2">
                <Label>Líneas</Label>
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-6" placeholder="Descripción" value={it.description}
                      onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} />
                    <Input className="col-span-2" type="number" placeholder="Cant." value={it.quantity}
                      onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))} />
                    <Input className="col-span-3" type="number" placeholder="Precio" value={it.unit_price}
                      onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, unit_price: Number(e.target.value) } : x))} />
                    <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0 }])}>
                  <Plus className="h-4 w-4" /> Añadir línea
                </Button>
              </div>

              <div className="space-y-2"><Label>Notas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>

              <div className="border-t pt-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Impuesto</span><span>${tax.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>${total.toFixed(2)}</span></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={create}>Crear</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Por cobrar</p><p className="text-2xl font-bold">${totals.pending.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Cobrado</p><p className="text-2xl font-bold">${totals.paid.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Número</TableHead><TableHead>Cliente</TableHead><TableHead>Total</TableHead>
            <TableHead>Estado</TableHead><TableHead>Vencimiento</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {invoices.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin facturas</TableCell></TableRow>
            : invoices.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                <TableCell>{i.clients?.company_name}</TableCell>
                <TableCell>${Number(i.total).toLocaleString()}</TableCell>
                <TableCell><StatusBadge value={i.status} options={INVOICE_STATUSES} /></TableCell>
                <TableCell className="text-muted-foreground">{i.due_date ? new Date(i.due_date).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="text-right">
                  {i.status !== "paid" && i.status !== "cancelled" && (
                    <Button size="sm" variant="ghost" onClick={() => markPaid(i.id)} className="text-success">
                      <CheckCircle2 className="h-4 w-4" /> Marcar pagada
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminInvoices;
