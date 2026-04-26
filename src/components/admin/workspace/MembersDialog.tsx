import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { MEMBER_ROLES } from "@/lib/workspace";

type Member = { id: string; user_id: string; role: string; full_name: string | null; email: string };
type Admin = { id: string; full_name: string | null; email: string };

export const MembersDialog = ({ workspaceId, open, onOpenChange, onChanged }: { workspaceId: string; open: boolean; onOpenChange: (v: boolean) => void; onChanged: () => void }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selected, setSelected] = useState("");
  const [role, setRole] = useState("editor");

  const load = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = (roles ?? []).map((r: any) => r.user_id);

    const [{ data: m }, { data: profs }] = await Promise.all([
      supabase.from("workspace_members").select("id, user_id, role").eq("workspace_id", workspaceId),
      adminIds.length ? supabase.from("profiles").select("id, full_name, email").in("id", adminIds) : Promise.resolve({ data: [] as any[] }),
    ]);

    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setMembers(((m ?? []) as any[]).map((mb) => ({
      id: mb.id, user_id: mb.user_id, role: mb.role,
      full_name: profMap.get(mb.user_id)?.full_name ?? null,
      email: profMap.get(mb.user_id)?.email ?? "",
    })));
    setAdmins((profs ?? []) as Admin[]);
  };

  useEffect(() => { if (open) load(); }, [open, workspaceId]);

  const add = async () => {
    if (!selected) return;
    const { error } = await supabase.from("workspace_members").insert({
      workspace_id: workspaceId, user_id: selected, role: role as any,
    });
    if (error) { toast.error(error.message); return; }
    setSelected("");
    load(); onChanged();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("workspace_members").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load(); onChanged();
  };

  const updateRole = async (id: string, r: string) => {
    await supabase.from("workspace_members").update({ role: r as any }).eq("id", id);
    load(); onChanged();
  };

  const available = admins.filter((a) => !members.find((m) => m.user_id === a.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Miembros del workspace</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 border rounded-lg p-2">
                <Avatar className="h-8 w-8"><AvatarFallback>{(m.full_name ?? m.email)[0]?.toUpperCase()}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.full_name ?? m.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                <Select value={m.role} onValueChange={(v) => updateRole(m.id, v)}>
                  <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEMBER_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {members.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">Sin miembros aún.</p>}
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex gap-2">
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Selecciona admin" /></SelectTrigger>
                <SelectContent>
                  {available.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name ?? a.email}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEMBER_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={add} disabled={!selected}><UserPlus className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
