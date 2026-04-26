import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AppRole } from "@/contexts/AuthContext";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ASSIGNABLE_INTERNAL_ROLES } from "@/lib/permissions";

type Member = { id: string; full_name: string | null; email: string; roles: AppRole[] };

const ROLE_BADGE: Record<AppRole, string> = {
  admin: "bg-primary/15 text-primary border-primary/30",
  finance: "bg-success/10 text-success border-success/20",
  operations: "bg-info/10 text-info border-info/20",
  staff: "bg-muted text-muted-foreground border-border",
  client: "bg-muted text-muted-foreground border-border",
};

const AdminTeam = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("staff");

  const load = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .neq("role", "client");
    const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
    if (ids.length === 0) { setMembers([]); return; }
    const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
    const byUser: Record<string, AppRole[]> = {};
    (roles ?? []).forEach((r: any) => {
      byUser[r.user_id] = [...(byUser[r.user_id] ?? []), r.role];
    });
    setMembers((profs ?? []).map((p: any) => ({ ...p, roles: byUser[p.id] ?? [] })));
  };

  useEffect(() => { load(); }, []);

  const addMember = async () => {
    if (!email.trim()) { toast.error("Indica un email"); return; }
    const { data: prof } = await supabase
      .from("profiles").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
    if (!prof) { toast.error("Usuario no encontrado. Debe registrarse primero."); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: prof.id, role: newRole });
    if (error) toast.error(error.message);
    else {
      toast.success(`Asignado como ${ROLE_LABELS[newRole]}`);
      setOpen(false); setEmail(""); setNewRole("staff"); load();
    }
  };

  const setMemberRole = async (userId: string, currentRoles: AppRole[], targetRole: AppRole) => {
    // Replace any existing internal role with the target role
    const internal = currentRoles.filter((r) => r !== "client");
    if (internal.length > 0) {
      const { error: delErr } = await supabase
        .from("user_roles").delete().eq("user_id", userId).in("role", internal);
      if (delErr) { toast.error(delErr.message); return; }
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: targetRole });
    if (error) toast.error(error.message); else { toast.success("Rol actualizado"); load(); }
  };

  const removeMember = async (userId: string, currentRoles: AppRole[]) => {
    const internal = currentRoles.filter((r) => r !== "client");
    if (internal.length === 0) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).in("role", internal);
    if (error) toast.error(error.message); else { toast.success("Miembro eliminado"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Equipo</h1>
          <p className="text-sm text-muted-foreground">Gestiona roles y permisos del equipo interno.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><UserPlus className="h-4 w-4" /> Añadir miembro</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Añadir miembro al equipo</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">El usuario debe haberse registrado previamente con su correo.</p>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_INTERNAL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        <div className="flex flex-col">
                          <span className="font-medium">{ROLE_LABELS[r]}</span>
                          <span className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={addMember}>Añadir</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Miembros del equipo ({members.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nombre</TableHead><TableHead>Email</TableHead>
              <TableHead>Roles actuales</TableHead><TableHead>Cambiar rol</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin miembros del equipo</TableCell></TableRow>
              ) : members.map((m) => {
                const internalRole = m.roles.find((r) => r !== "client") ?? "staff";
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.full_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {m.roles.filter((r) => r !== "client").map((r) => (
                          <Badge key={r} variant="outline" className={ROLE_BADGE[r]}>{ROLE_LABELS[r]}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={internalRole} onValueChange={(v) => setMemberRole(m.id, m.roles, v as AppRole)}>
                        <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_INTERNAL_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeMember(m.id, m.roles)}>
                        <Trash2 className="h-4 w-4" /> Quitar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTeam;
