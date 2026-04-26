import { useEffect, useState } from "react";
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
import { ArrowLeft, Save } from "lucide-react";
import { StatusBadge, INVOICE_STATUSES, DOCUMENT_STATUSES, TASK_STATUSES } from "@/lib/status";
import { toast } from "sonner";

const AdminClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [invs, setInvs] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);

  const load = async () => {
    if (!id) return;
    const [c, t, d, i, cs, s] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("tasks").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("documents").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("client_services").select("*, services(*)").eq("client_id", id),
      supabase.from("services").select("*").eq("is_active", true),
    ]);
    setClient(c.data);
    setTasks(t.data ?? []);
    setDocs(d.data ?? []);
    setInvs(i.data ?? []);
    setServices(cs.data ?? []);
    setAllServices(s.data ?? []);
  };

  useEffect(() => { load(); }, [id]);

  const save = async () => {
    if (!client) return;
    const { id: _, created_at, updated_at, ...payload } = client;
    const { error } = await supabase.from("clients").update(payload).eq("id", client.id);
    if (error) toast.error(error.message); else toast.success("Cliente actualizado");
  };

  const addService = async (serviceId: string) => {
    if (!id || serviceId === "none") return;
    const { error } = await supabase.from("client_services").insert({ client_id: id, service_id: serviceId });
    if (error) toast.error(error.message); else { toast.success("Servicio asignado"); load(); }
  };

  if (!client) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link to="/admin/clients"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold">{client.company_name}</h1>
          <p className="text-sm text-muted-foreground">{client.email}</p>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
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

        <TabsContent value="documents">
          <Card><CardContent className="p-4">
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
          </CardContent></Card>
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
          <Card><CardContent className="p-4">
            <Table>
              <TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Total</TableHead><TableHead>Estado</TableHead><TableHead>Vence</TableHead></TableRow></TableHeader>
              <TableBody>
                {invs.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin facturas</TableCell></TableRow>
                : invs.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                    <TableCell>${Number(i.total).toLocaleString()}</TableCell>
                    <TableCell><StatusBadge value={i.status} options={INVOICE_STATUSES} /></TableCell>
                    <TableCell className="text-muted-foreground">{i.due_date ? new Date(i.due_date).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="services">
          <Card><CardContent className="p-4 space-y-4">
            <div className="flex gap-2">
              <Select onValueChange={addService}>
                <SelectTrigger className="w-[300px]"><SelectValue placeholder="Asignar servicio…" /></SelectTrigger>
                <SelectContent>
                  {allServices.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
    </div>
  );
};

export default AdminClientDetail;
