import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Reusable across SOPs. Loads an email_templates row by key, substitutes
// {{variable}} placeholders against the provided variables map, lets the
// admin edit subject and body, then writes to email_log on Send.
//
// v1: status='pending' — actual delivery happens when Resend is wired.
// v1.5: a new Edge Function will pick up pending email_log rows and send.

interface Recipient {
  email: string;
  name?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateKey: string;
  recipient: Recipient;
  variables: Record<string, string>;
  clientId?: string | null;
  clientServiceId?: string | null;
  onSent?: () => void;
}

const substitute = (template: string, variables: Record<string, string>): string =>
  template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    variables[key] !== undefined ? variables[key] : `{{${key}}}`,
  );

export const SendTemplatedEmailDialog = ({
  open,
  onOpenChange,
  templateKey,
  recipient,
  variables,
  clientId,
  clientServiceId,
  onSent,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      const { data, error } = await supabase
        .from("email_templates")
        .select("subject, body_html")
        .eq("template_key", templateKey)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setSubject(substitute(data.subject, variables));
      setBody(substitute(data.body_html, variables));
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, templateKey, JSON.stringify(variables)]);

  const handleSend = async () => {
    setSending(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("email_log").insert({
      template_key: templateKey,
      recipient_email: recipient.email,
      subject,
      body,
      status: "pending",
      sent_by: user?.id ?? null,
      client_id: clientId ?? null,
      client_service_id: clientServiceId ?? null,
    });
    setSending(false);
    if (error) {
      toast.error(`Could not save email: ${error.message}`);
      return;
    }
    toast.success(
      "Email queued. Real delivery will fire once Resend is wired in the next session.",
    );
    onOpenChange(false);
    onSent?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Send email to {recipient.name ?? recipient.email}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notFound ? (
          <div className="py-6 space-y-2">
            <p className="text-sm">
              Email template <code className="text-xs bg-muted px-1 rounded">{templateKey}</code>{" "}
              was not found or is inactive.
            </p>
            <p className="text-xs text-muted-foreground">
              Check `email_templates` in Supabase, or re-run the SOP-01 seed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">To</p>
              <p className="text-sm">{recipient.email}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-body">Body (HTML supported)</Label>
              <Textarea
                id="email-body"
                rows={14}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Variables like <code className="bg-muted px-1 rounded">{`{{client_name}}`}</code>{" "}
              have already been substituted. You can edit subject and body
              freely before sending.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || loading || notFound}
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
