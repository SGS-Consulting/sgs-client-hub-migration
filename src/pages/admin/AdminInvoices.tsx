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
import { Plus, Trash2, CheckCircle2, FileDown, Package } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { generateInvoicePdf } from "@/lib/invoicePdf";

type Item = { description: string; quantity: number; unit_price: number; service_id?: string | null };

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  // Form
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [taxPct, setTaxPct] = useState(0);

  const load = async () => {
    const [i, c, s] = await Promise.all([
      supabase.from("invoices").select("*, clients(*), invoice_items(*)").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("company_name"),
      supabase.from("services").select("id, name, base_price, description").eq("is_active", true).order("name"),
    ]);
    setInvoices(i.data ?? []);
    setClients(c.data ?? []);
    setServices(s.data ?? []);
  };

  useEffect(() => { load(); }, []);

  const subtotal = items.reduce((acc, it) => acc + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const tax = (subtotal * taxPct) / 100;
  const total = subtotal + tax;

  const addServiceLine = (serviceId: string) => {
    const s = services.find((x) => x.id === serviceId);
    if (!s) return;
    const blankIdx = items.findIndex((it) => !it.description.trim() && !it.unit_price);
    const newLine: Item = {
      description: s.name,
      quantity: 1,
      unit_price: Number(s.base_price ?? 0),
      service_id: s.id,
    };
    if (blankIdx >= 0) {
      setItems(items.map((it, i) => (i === blankIdx ? newLine : it)));
    } else {
      setItems([...items, newLine]);
    }
  };

  const resetForm = () => {
    setClientId(""); setNotes(""); setDueDate(""); setTaxPct(0); setPaymentLink("");
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
    setIssueDate(new Date().toISOString().split("T")[0]);
  };

  const create = async () => {
    if (!clientId) { toast.error("Selecciona un cliente"); return; }
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) { toast.error("Agrega al menos una línea con descripción"); return; }
    if (validItems.some((i) => Number(i.quantity) <= 0 || Number(i.unit_price) < 0)) {
      toast.error("Verifica cantidades y precios"); return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: inv, error } = await supabase.from("invoices").insert({
      client_id: clientId, issue_date: issueDate, due_date: dueDate || null,
      subtotal, tax, total, notes: notes || null, status: "draft",
      payment_link_url: paymentLink || null, created_by: user?.id,
    }).select().single();
    if (error || !inv) { toast.error(error?.message); return; }

    const itemRows = validItems.map((it, idx) => ({
      invoice_id: inv.id, description: it.description, quantity: it.quantity,
      unit_price: it.unit_price, line_total: Number(it.quantity) * Number(it.unit_price),
      sort_order: idx,
    }));
    await supabase.from("invoice_items").insert(itemRows);

    toast.success("Factura creada");
    setOpen(false);
    resetForm();
    load();
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("invoices").update({ status: "paid" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Marcada como pagada"); load(); }
  };

  const downloadPdf = async (inv: any) => {
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
        client: inv.clients,
        items: (inv.invoice_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((it: any) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          line_total: Number(it.line_total),
        })),
      });
    } catch (e: any) {
      toast.error("Error al generar el PDF");
    }
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
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nueva factura</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva factura</DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              {/* Total destacado arriba */}
              <div className="rounded-lg border bg-muted/40 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Monto a cobrar</p>
                  <p className="text-3xl font-bold tabular-nums">{fmt(total)}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground space-y-0.5">
                  <div>Subtotal: <span className="font-medium text-foreground">{fmt(subtotal)}</span></div>
                  <div>Impuesto ({taxPct}%): <span className="font-medium text-foreground">{fmt(tax)}</span></div>
                </div>
              </div>

              {/* Datos generales */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Datos generales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Cliente</Label>
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger><SelectValue placeholder="Selecciona un cliente…" /></SelectTrigger>
                      <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Fecha de emisión</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Fecha de vencimiento</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                </div>
              </div>

              {/* Conceptos / Servicios */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold">Conceptos a facturar</h3>
                  <div className="flex items-center gap-2">
                    <Select value="" onValueChange={addServiceLine}>
                      <SelectTrigger className="h-8 w-[220px] text-xs">
                        <Package className="h-3.5 w-3.5 mr-1" />
                        <SelectValue placeholder="Añadir desde servicios…" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.length === 0
                          ? <div className="px-2 py-1.5 text-xs text-muted-foreground">Sin servicios activos</div>
                          : services.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} {s.base_price ? `· ${fmt(Number(s.base_price))}` : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                    <div className="col-span-6">Descripción</div>
                    <div className="col-span-2 text-right">Cant.</div>
                    <div className="col-span-2 text-right">Precio</div>
                    <div className="col-span-2 text-right">Total</div>
                  </div>
                  <div className="divide-y">
                    {items.map((it, idx) => {
                      const lineTotal = Number(it.quantity || 0) * Number(it.unit_price || 0);
                      return (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center px-3 py-2">
                          <Input
                            className="col-span-6 h-9"
                            placeholder="Descripción del servicio o producto"
                            value={it.description}
                            onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                          />
                          <Input
                            className="col-span-2 h-9 text-right"
                            type="number" min={0} step="1"
                            value={it.quantity}
                            onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))}
                          />
                          <Input
                            className="col-span-2 h-9 text-right"
                            type="number" min={0} step="0.01"
                            value={it.unit_price}
                            onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, unit_price: Number(e.target.value) } : x))}
                          />
                          <div className="col-span-1 text-right text-sm font-medium tabular-nums">{fmt(lineTotal)}</div>
                          <div className="col-span-1 flex justify-end">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              disabled={items.length === 1}
                              onClick={() => setItems(items.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-3 py-2 border-t bg-muted/20">
                    <Button
                      variant="ghost" size="sm" className="h-8"
                      onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0 }])}
                    >
                      <Plus className="h-4 w-4" /> Añadir línea
                    </Button>
                  </div>
                </div>
              </div>

              {/* Impuestos y notas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Impuesto (%)</Label>
                  <Input type="number" min={0} step="0.01" value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notas (opcional)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Información de pago, términos, etc." />
                </div>
              </div>

              {/* Stripe payment link */}
              <div className="space-y-2">
                <Label>Stripe payment link (optional)</Label>
                <Input
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                  placeholder="https://buy.stripe.com/..."
                />
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={create}>Crear factura · {fmt(total)}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Por cobrar</p><p className="text-2xl font-bold">{fmt(totals.pending)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Cobrado</p><p className="text-2xl font-bold">{fmt(totals.paid)}</p></CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Número</TableHead><TableHead>Cliente</TableHead><TableHead>Total</TableHead>
            <TableHead>Estado</TableHead><TableHead>Vencimiento</TableHead><TableHead className="text-right">Acciones</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {invoices.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin facturas</TableCell></TableRow>
            : invoices.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                <TableCell>{i.clients?.company_name}</TableCell>
                <TableCell className="font-medium tabular-nums">{fmt(Number(i.total))}</TableCell>
                <TableCell><StatusBadge value={i.status} options={INVOICE_STATUSES} /></TableCell>
                <TableCell className="text-muted-foreground">{i.due_date ? new Date(i.due_date).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => downloadPdf(i)} title="Descargar PDF">
                      <FileDown className="h-4 w-4" /> PDF
                    </Button>
                    {i.status !== "paid" && i.status !== "cancelled" && (
                      <Button size="sm" variant="ghost" onClick={() => markPaid(i.id)} className="text-success">
                        <CheckCircle2 className="h-4 w-4" /> Pagada
                      </Button>
                    )}
                  </div>
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
