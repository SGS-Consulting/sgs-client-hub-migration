import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Save, Plus, Upload, Mail, Copy, Receipt } from "lucide-react";
import { StatusBadge, INVOICE_STATUSES, DOCUMENT_STATUSES, TASK_STATUSES } from "@/lib/status";
import { toast } from "sonner";

type DiscoverySession = {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  attendees: string[];
  outcome_notes: string | null;
  calendly_event_id: string | null;
};

const DOC_CATEGORIES: { value: string; label: string }[] = [
  { value: "proposal", label: "Proposal" },
  { value: "contract", label: "Contract" },
  { value: "identification", label: "Identification" },
  { value: "tax", label: "Tax" },
  { value: "financial", label: "Financial" },
  { value: "legal", label: "Legal" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "card", label: "Card / Stripe" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const AdminClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);
  const [discoveries, setDiscoveries] = useState<DiscoverySession[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [invs, setInvs] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  // Discovery dialog
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [attendees, setAttendees] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [calendlyEventId, setCalendlyEventId] = useState("");

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>("proposal");
  const [uploadNotes, setUploadNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Invoice dialog
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invDescription, setInvDescription] = useState("Services rendered");
  const [invAmount, setInvAmount] = useState("");
  const [invDueDate, setInvDueDate] = useState("");
  const [invPaymentLink, setInvPaymentLink] = useState("");
  const [invNotes, setInvNotes] = useState("");

  // Payment dialog
  const [paymentFor, setPaymentFor] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("card");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payRef, setPayRef] = useState("");

  const load = async () => {
    if (!id) return;
    const [c, dsq, t, d, i, cs, s] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("discovery_sessions").select("*").eq("client_id", id).order("scheduled_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("documents").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("client_services").select("*, services(*)").eq("client_id", id),
      supabase.from("services").select("*").eq("is_active", true),
    ]);
    setClient(c.data);
    setDiscoveries((dsq.data ?? []) as DiscoverySession[]);
    setTasks(t.data ?? []);
    setDocs(d.data ?? []);
    setInvs(i.data ?? []);
    setServices(cs.data ?? []);
    setAllServices(s.data ?? []);
  };

  useEffect(() => { load(); }, [id]);

  const save = async () => {
    if (!client) return;
    const { id: _id, created_at: _c, updated_at: _u, ...payload } = client;
    const { error } = await supabase.from("clients").update(payload).eq("id", client.id);
    if (error) toast.error(error.message); else toast.success("Cliente actualizado");
  };

  // ---- Discovery ----
  const logDiscovery = async () => {
    if (!id || !scheduledAt) { toast.error("Scheduled date is required"); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const attendeeList = attendees.split(",").map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("discovery_sessions").insert({
      client_id: id,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration,
      attendees: attendeeList,
      outcome_notes: outcomeNotes || null,
      calendly_event_id: calendlyEventId || null,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Discovery session logged");
    setDiscoveryOpen(false);
    setScheduledAt(""); setDuration(30); setAttendees(""); setOutcomeNotes(""); setCalendlyEventId("");
    load();
  };

  // ---- Upload ----
  const upload = async () => {
    if (!id || !uploadFile) { toast.error("Select a file"); return; }
    setBusy(true);
    const ts = Date.now();
    const safeName = uploadFile.name.replace(/[^\w.-]/g, "_");
    const path = `${id}/${ts}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("client-documents")
      .upload(path, uploadFile);
    if (upErr) {
      setBusy(false);
      toast.error(`Upload failed: ${upErr.message}`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error: dbErr } = await supabase.from("documents").insert({
      client_id: id,
      file_path: path,
      file_name: uploadFile.name,
      file_size: uploadFile.size,
      mime_type: uploadFile.type || null,
      category: uploadCategory as any,
      status: "approved",
      uploaded_by: user?.id ?? null,
      notes: uploadNotes || null,
    });
    setBusy(false);
    if (dbErr) { toast.error(`File saved but record failed: ${dbErr.message}`); return; }
    toast.success("Document uploaded");
    setUploadOpen(false);
    setUploadFile(null);
    setUploadCategory("proposal");
    setUploadNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    load();
  };

  // ---- Invoice (simple create; full line-item editor lives on AdminInvoices) ----
  const createInvoice = async () => {
    if (!id) return;
    const amount = Number(invAmount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("Amount must be > 0"); return; }
    if (!invDescription.trim()) { toast.error("Description is required"); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: inv, error } = await supabase.from("invoices").insert({
      client_id: id,
      issue_date: new Date().toISOString().split("T")[0],
      due_date: invDueDate || null,
      subtotal: amount,
      tax: 0,
      total: amount,
      status: "draft",
      payment_link_url: invPaymentLink || null,
      notes: invNotes || null,
      created_by: user?.id ?? null,
    }).select().single();
    if (error || !inv) { setBusy(false); toast.error(error?.message ?? "Failed"); return; }
    await supabase.from("invoice_items").insert({
      invoice_id: inv.id,
      description: invDescription,
      quantity: 1,
      unit_price: amount,
      line_total: amount,
      sort_order: 0,
    });
    setBusy(false);
    toast.success("Invoice created");
    setInvoiceOpen(false);
    setInvDescription("Services rendered"); setInvAmount(""); setInvDueDate(""); setInvPaymentLink(""); setInvNotes("");
    load();
  };

  const copyPaymentLink = async (url: string | null) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("Payment link copied");
  };

  // ---- Payment ----
  const openPaymentDialog = (inv: any) => {
    setPaymentFor(inv);
    setPayAmount(String(Number(inv.total)));
    setPayMethod("card");
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayRef("");
  };

  const recordPayment = async () => {
    if (!paymentFor) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("Invalid amount"); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: payErr } = await supabase.from("payments").insert({
      invoice_id: paymentFor.id,
      amount,
      method: payMethod as any,
      paid_on: payDate,
      reference: payRef || null,
      recorded_by: user?.id ?? null,
    });
    if (payErr) { setBusy(false); toast.error(payErr.message); return; }
    if (amount >= Number(paymentFor.total)) {
      await supabase.from("invoices").update({ status: "paid" }).eq("id", paymentFor.id);
    }
    setBusy(false);
    toast.success("Payment recorded");
    setPaymentFor(null);
    load();
  };

  // ---- Service activation with auto-tasks ----
  const activateService = async (serviceId: string) => {
    if (!id || !serviceId) return;
    setBusy(true);
    const { data: csRow, error: csErr } = await supabase
      .from("client_services")
      .insert({ client_id: id, service_id: serviceId })
      .select()
      .single();
    if (csErr || !csRow) { setBusy(false); toast.error(csErr?.message ?? "Failed"); return; }

    const { data: templates } = await supabase
      .from("service_task_templates")
      .select("*")
      .eq("service_id", serviceId)
      .order("sort_order", { ascending: true });

    if (templates && templates.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date();
      const taskRows = templates.map((t: any, idx: number) => ({
        title: t.title,
        description: t.description,
        status: "open" as const,
        priority: t.default_priority,
        client_id: id,
        service_id: serviceId,
        due_date: t.default_due_offset_days != null
          ? new Date(today.getTime() + t.default_due_offset_days * 86400000).toISOString().split("T")[0]
          : null,
        sort_order: idx,
        created_by: user?.id ?? null,
      }));
      const { error: tasksErr } = await supabase.from("tasks").insert(taskRows);
      if (tasksErr) {
        setBusy(false);
        toast.error(`Service activated but task creation failed: ${tasksErr.message}`);
        load();
        return;
      }
    }

    setBusy(false);
    toast.success(
      templates && templates.length > 0
        ? `Service activated (${templates.length} task${templates.length === 1 ? "" : "s"} created)`
        : "Service activated (no task templates configured)"
    );
    load();
  };

  // ---- Portal invite ----
  const [invitingPortal, setInvitingPortal] = useState(false);
  const sendPortalInvite = async () => {
    if (!client) return;
    setInvitingPortal(true);
    const { data, error } = await supabase.functions.invoke("invite-portal-user", {
      body: { client_id: client.id },
    });
    setInvitingPortal(false);

    if (error) {
      toast.error(`Could not send invite: ${error.message}`);
      return;
    }
    if (data?.error) {
      toast.error(data.error);
      return;
    }
    toast.success(
      `Portal invite sent to ${client.email}. They'll receive an email to set their password and access the portal.`
    );
  };

  if (!client) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/clients"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{client.company_name}</h1>
          <p className="text-sm text-muted-foreground">{client.email}</p>
        </div>
        {client.user_id ? (
          <span className="text-xs text-muted-foreground border rounded-full px-3 py-1">
            Portal account linked
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={sendPortalInvite}
            disabled={invitingPortal}
          >
            <Mail className="h-4 w-4" />
            {invitingPortal ? "Sending..." : "Invite to portal"}
          </Button>
        )}
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="tasks">Tareas</TabsTrigger>
          <TabsTrigger value="invoices">Facturas</TabsTrigger>
          <TabsTrigger value="services">Servicios</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Empresa</Label><Input value={client.company_name ?? ""} onChange={(e) => setClient({ ...client, company_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Contacto</Label><Input value={client.contact_name ?? ""} onChange={(e) => setClient({ ...client, contact_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={client.email ?? ""} onChange={(e) => setClient({ ...client, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Teléfono</Label><Input value={client.phone ?? ""} onChange={(e) => setClient({ ...client, phone: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Tipo de entidad</Label>
                  <Select value={client.entity_type ?? "none"} onValueChange={(v) => setClient({ ...client, entity_type: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="LLC">LLC</SelectItem>
                      <SelectItem value="S_Corp">S Corporation</SelectItem>
                      <SelectItem value="C_Corp">C Corporation</SelectItem>
                      <SelectItem value="Sole_Proprietor">Sole Proprietor</SelectItem>
                      <SelectItem value="Partnership">Partnership</SelectItem>
                      <SelectItem value="Other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>EIN</Label><Input value={client.ein ?? ""} onChange={(e) => setClient({ ...client, ein: e.target.value })} /></div>
                <div className="space-y-2"><Label>Fecha de formación</Label><Input type="date" value={client.formation_date ?? ""} onChange={(e) => setClient({ ...client, formation_date: e.target.value || null })} /></div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={client.status} onValueChange={(v) => setClient({ ...client, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospecto</SelectItem>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2"><Label>Dirección</Label><Input value={client.address_line1 ?? ""} onChange={(e) => setClient({ ...client, address_line1: e.target.value })} /></div>
                <div className="space-y-2"><Label>Ciudad</Label><Input value={client.city ?? ""} onChange={(e) => setClient({ ...client, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>Estado/Provincia</Label><Input value={client.state ?? ""} onChange={(e) => setClient({ ...client, state: e.target.value })} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Notas internas</Label><Textarea rows={3} value={client.internal_notes ?? ""} onChange={(e) => setClient({ ...client, internal_notes: e.target.value })} /></div>
              </div>
              <div className="flex justify-end"><Button onClick={save}><Save className="h-4 w-4" /> Guardar</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discovery">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Discovery sessions</CardTitle>
              <Button size="sm" onClick={() => setDiscoveryOpen(true)}>
                <Plus className="h-4 w-4" /> Log session
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Attendees</TableHead>
                    <TableHead>Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discoveries.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No sessions logged</TableCell></TableRow>
                  ) : discoveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{new Date(d.scheduled_at).toLocaleString()}</TableCell>
                      <TableCell>{d.duration_minutes} min</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {d.attendees.length > 0 ? d.attendees.join(", ") : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-md truncate">
                        {d.outcome_notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                <Upload className="h-4 w-4" /> Upload
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Archivo</TableHead><TableHead>Categoría</TableHead><TableHead>Estado</TableHead><TableHead>Subido</TableHead></TableRow></TableHeader>
                <TableBody>
                  {docs.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin documentos</TableCell></TableRow>
                  : docs.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.file_name}</TableCell>
                      <TableCell>{d.category}</TableCell>
                      <TableCell><StatusBadge value={d.status} options={DOCUMENT_STATUSES} /></TableCell>
                      <TableCell className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card><CardContent className="p-4">
            <Table>
              <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Estado</TableHead><TableHead>Vence</TableHead></TableRow></TableHeader>
              <TableBody>
                {tasks.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Sin tareas</TableCell></TableRow>
                : tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.title}</TableCell>
                    <TableCell><StatusBadge value={t.status} options={TASK_STATUSES} /></TableCell>
                    <TableCell className="text-muted-foreground">{t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Invoices</CardTitle>
              <Button size="sm" onClick={() => setInvoiceOpen(true)}>
                <Plus className="h-4 w-4" /> Create invoice
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead>Payment link</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin facturas</TableCell></TableRow>
                  : invs.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                      <TableCell>{fmt(Number(i.total))}</TableCell>
                      <TableCell><StatusBadge value={i.status} options={INVOICE_STATUSES} /></TableCell>
                      <TableCell className="text-muted-foreground">{i.due_date ? new Date(i.due_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        {i.payment_link_url ? (
                          <Button size="sm" variant="ghost" onClick={() => copyPaymentLink(i.payment_link_url)}>
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </Button>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {i.status !== "paid" && i.status !== "cancelled" && (
                          <Button size="sm" variant="ghost" onClick={() => openPaymentDialog(i)}>
                            <Receipt className="h-4 w-4" /> Record payment
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card><CardContent className="p-4 space-y-4">
            <div className="flex gap-2 items-center">
              <Select onValueChange={activateService}>
                <SelectTrigger className="w-[300px]"><SelectValue placeholder="Activate service…" /></SelectTrigger>
                <SelectContent>
                  {allServices.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Activating creates standard tasks from the service's task templates.
              </p>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Servicio</TableHead><TableHead>Categoría</TableHead><TableHead>Inicio</TableHead><TableHead>Activo</TableHead></TableRow></TableHeader>
              <TableBody>
                {services.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin servicios contratados</TableCell></TableRow>
                : services.map((cs) => (
                  <TableRow key={cs.id}>
                    <TableCell>{cs.services?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cs.services?.category}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(cs.started_at).toLocaleDateString()}</TableCell>
                    <TableCell>{cs.is_active ? "Sí" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={discoveryOpen} onOpenChange={setDiscoveryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log discovery session</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Scheduled at</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Attendees (comma-separated)</Label>
              <Input value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="Abner, client name" />
            </div>
            <div className="space-y-2">
              <Label>Outcome notes</Label>
              <Textarea rows={4} value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Calendly event ID (optional)</Label>
              <Input value={calendlyEventId} onChange={(e) => setCalendlyEventId(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscoveryOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={logDiscovery} disabled={busy}>Log session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>File</Label>
              <Input
                type="file"
                ref={fileInputRef}
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={upload} disabled={busy || !uploadFile}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={invDescription} onChange={(e) => setInvDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount (USD)</Label>
                <Input type="number" min={0} step="0.01" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input type="date" value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Stripe payment link</Label>
              <Input
                value={invPaymentLink}
                onChange={(e) => setInvPaymentLink(e.target.value)}
                placeholder="https://buy.stripe.com/..."
              />
              <p className="text-xs text-muted-foreground">
                Generate the link in your Stripe dashboard, paste here. The "Copy" button on the invoice row makes it easy to share with the client.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={invNotes} onChange={(e) => setInvNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={createInvoice} disabled={busy}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentFor !== null} onOpenChange={(o) => !o && setPaymentFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment{paymentFor ? ` · ${paymentFor.invoice_number}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min={0} step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paid on</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Stripe charge ID, check #, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentFor(null)} disabled={busy}>Cancel</Button>
            <Button onClick={recordPayment} disabled={busy}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClientDetail;
