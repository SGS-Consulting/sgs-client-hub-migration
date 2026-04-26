import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const AdminServices = () => {
  const [services, setServices] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState<string>("");

  const load = async () => {
    const { data } = await supabase.from("services").select("*").order("name");
    setServices(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) { toast.error("El nombre es obligatorio"); return; }
    const { error } = await supabase.from("services").insert({
      name, category: category || null, description: description || null,
      base_price: basePrice ? Number(basePrice) : null,
    });
    if (error) toast.error(error.message); else {
      toast.success("Servicio creado"); setOpen(false);
      setName(""); setCategory(""); setDescription(""); setBasePrice("");
      load();
    }
  };

  const toggle = async (id: string, value: boolean) => {
    await supabase.from("services").update({ is_active: value }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Servicios</h1>
          <p className="text-sm text-muted-foreground">Catálogo de servicios ofrecidos.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nuevo servicio</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo servicio</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Categoría</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
              <div className="space-y-2"><Label>Descripción</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
              <div className="space-y-2"><Label>Precio base (opcional)</Label><Input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={create}>Crear</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-4">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Servicio</TableHead><TableHead>Categoría</TableHead><TableHead>Precio</TableHead><TableHead>Activo</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground line-clamp-1">{s.description}</div></TableCell>
                <TableCell>{s.category ?? "—"}</TableCell>
                <TableCell>{s.base_price ? `$${Number(s.base_price).toLocaleString()}` : "—"}</TableCell>
                <TableCell><Switch checked={s.is_active} onCheckedChange={(v) => toggle(s.id, v)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminServices;
