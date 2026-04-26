import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

const AdminTeam = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const load = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (ids.length === 0) { setAdmins([]); return; }
    const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
    setAdmins(profs ?? []);
  };
  useEffect(() => { load(); }, []);

  const promote = async () => {
    if (!email.trim()) { toast.error("Indica un email"); return; }
    const { data: prof, error } = await supabase
      .from("profiles").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
    if (error || !prof) { toast.error("Usuario no encontrado. Debe registrarse primero."); return; }
    const { error: roleError } = await supabase.from("user_roles").insert({ user_id: prof.id, role: "admin" });
    if (roleError) toast.error(roleError.message); else {
      toast.success("Administrador añadido");
      setOpen(false); setEmail(""); load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Equipo</h1>
          <p className="text-sm text-muted-foreground">Administradores con acceso al panel.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><UserPlus className="h-4 w-4" /> Añadir admin</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Promover a administrador</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">El usuario debe haberse registrado previamente con su correo.</p>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={promote}>Añadir</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardHeader><CardTitle>Administradores</CardTitle></CardHeader><CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead></TableRow></TableHeader>
          <TableBody>
            {admins.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Sin administradores</TableCell></TableRow>
            : admins.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.full_name ?? "—"}</TableCell>
                <TableCell>{a.email}</TableCell>
                <TableCell><Badge>Administrador</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminTeam;
