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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Reusable dialog for creating a client query (SOP-03 §3.1).
// Triggered from AdminQueries page or anywhere else (e.g., a future
// "Ask client" button in the global header).

type Client = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string;
  user_id: string | null;
  status: "active" | "prospect" | "inactive";
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
  defaultClientServiceId?: string;
  onCreated?: () => void;
}

const addBusinessDays = (start: Date, days: number): Date => {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return d;
};

export const NewQueryDialog = ({
  open,
  onOpenChange,
  defaultClientId,
  defaultClientServiceId,
  onCreated,
}: Props) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [dueDate, setDueDate] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Reset state on open
    setQuestion("");
    setContext("");
    setClientId(defaultClientId ?? "");
    setDueDate(addBusinessDays(new Date(), 3).toISOString().split("T")[0]);

    // Load all clients for the picker (only if not pinned to one).
    // No status filter — queries can go to any client we have a record for,
    // not just `active` — prospects need bookkeeping setup questions too,
    // and tax-season-only clients are typically `prospect` until activated.
    if (!defaultClientId) {
      supabase
        .from("clients")
        .select("id, company_name, contact_name, email, user_id, status")
        .order("company_name")
        .then(({ data }) => setClients((data as Client[]) ?? []));
    }
  }, [open, defaultClientId]);

  const handleSubmit = async () => {
    if (!clientId) {
      toast.error("Pick a client");
      return;
    }
    if (question.trim().length === 0) {
      toast.error("Question is required");
      return;
    }
    if (!dueDate) {
      toast.error("Set a due date");
      return;
    }

    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Look up client info for email/notification context
    const { data: client } = await supabase
      .from("clients")
      .select("id, contact_name, company_name, email, user_id")
      .eq("id", clientId)
      .single();

    const { data: query, error } = await supabase
      .from("client_queries")
      .insert({
        client_id: clientId,
        client_service_id: defaultClientServiceId ?? null,
        question: question.trim(),
        context: context.trim() || null,
        due_date: dueDate,
        created_by: user?.id ?? null,
        owner_id: user?.id ?? null,
      })
      .select()
      .single();

    if (error || !query) {
      setSubmitting(false);
      toast.error(`Could not create query: ${error?.message ?? "unknown error"}`);
      return;
    }

    // Fire-and-forget: queue notification + email_log (Karen's GHL bridge dispatches)
    if (client) {
      const portalLink = `${window.location.origin}/portal/queries`;
      const dueIn = Math.max(
        1,
        Math.ceil(
          (new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        ),
      );

      // In-portal notification (only works if client has a portal user)
      if (client.user_id) {
        await supabase.from("notifications").insert({
          user_id: client.user_id,
          title: "New question about your books",
          body: question.trim().slice(0, 200),
          link: "/portal/queries",
        });
      }

      // Email_log row for GHL to dispatch
      const subject = `Quick question about your books — ${client.company_name}`;
      const body =
        `<p>Hi ${client.contact_name ?? client.company_name},</p>` +
        `<p>We have a quick question about a transaction in your books that we need help clarifying.</p>` +
        `<p><a href="${portalLink}">Open my pending questions →</a></p>` +
        `<p>Question: <em>${question.trim().slice(0, 200)}</em></p>` +
        `<p>If you can answer within ${dueIn} business day${dueIn === 1 ? "" : "s"}, we can keep your books fully current.</p>`;
      await supabase.from("email_log").insert({
        template_key: "client_query_new",
        recipient_email: client.email,
        subject,
        body,
        status: "pending",
        sent_by: user?.id ?? null,
        client_id: clientId,
        client_service_id: defaultClientServiceId ?? null,
      });
    }

    setSubmitting(false);
    toast.success("Query sent. Client will see it in their portal.");
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Ask the client a question</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!defaultClientId && (
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a client…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name}
                      {c.contact_name ? ` — ${c.contact_name}` : ""}
                      {c.status !== "active" ? ` (${c.status})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="query-question">Question</Label>
            <Textarea
              id="query-question"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Transaction on 2026-04-15 for $432 — what was this for?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="query-context">Additional context (optional)</Label>
            <Textarea
              id="query-context"
              rows={2}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Reference a transaction ID, document, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="query-due">Response due by</Label>
            <Input
              id="query-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Defaults to +3 business days. Auto-reminder fires if unanswered past the due date.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Send query
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
