import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { toast } from "sonner";

const ClientSupport = () => {
  const { clientId } = useCurrentClientId();
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!clientId) return;
    const { data } = await supabase.from("support_requests").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
    setRequests(data ?? []);
  };
  useEffect(() => { load(); }, [clientId]);

  const send = async () => {
    if (!subject.trim() || !message.trim() || !clientId || !user) { toast.error("Completa todos los campos"); return; }
    const { error } = await supabase.from("support_requests").insert({
      client_id: clientId, subject: subject.trim(), message: message.trim(), created_by: user.id,
    });
    if (error) toast.error(error.message); else { toast.success("Solicitud enviada"); setSubject(""); setMessage(""); load(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Soporte</h1>
        <p className="text-sm text-muted-foreground">Envía una solicitud y nuestro equipo te contactará.</p>
      </div>

      <Card><CardContent className="p-6 space-y-3">
        <div className="space-y-2"><Label>Asunto</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        <div className="space-y-2"><Label>Mensaje</Label><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
        <div className="flex justify-end"><Button onClick={send}><Send className="h-4 w-4" /> Enviar</Button></div>
      </CardContent></Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mis solicitudes</h2>
        {requests.length === 0 ? <p className="text-sm text-muted-foreground">Sin solicitudes previas</p>
        : requests.map((r) => (
          <Card key={r.id}><CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium">{r.subject}</p>
              <Badge variant="outline">{r.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{r.message}</p>
            <p className="text-xs text-muted-foreground mt-2">{new Date(r.created_at).toLocaleString()}</p>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
};

export default ClientSupport;
