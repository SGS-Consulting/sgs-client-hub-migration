import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Check, X, UserPlus, ExternalLink } from "lucide-react";
import { StatusBadge, INTAKE_STATUSES } from "@/lib/status";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/permissions";
import { toast } from "sonner";

type Submission = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  company_name: string | null;
  incorporation_state: string | null;
  services_of_interest: string[];
  explanation: string | null;
  non_marketing_consent: boolean;
  marketing_consent: boolean;
  status: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  converted_client_id: string | null;
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className="text-sm">{value || "—"}</p>
  </div>
);

const AdminIntakeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const canManage = can(roles, "manage:clients");

  const [s, setS] = useState<Submission | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"reject" | "convert" | null>(null);

  const load = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("intake_submissions")
      .select("*")
      .eq("id", id)
      .single();
    if (error) { toast.error(error.message); return; }
    setS(data as Submission);
  };

  useEffect(() => { load(); }, [id]);

  const stamp = async (status: "reviewed" | "rejected") => {
    if (!s) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("intake_submissions")
      .update({
        status,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", s.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "reviewed" ? "Marked as reviewed" : "Marked as rejected");
    setConfirmAction(null);
    load();
  };

  const convert = async () => {
    if (!s) return;
    setBusy(true);
    const fullName = `${s.first_name} ${s.last_name}`.trim();
    const companyName = s.company_name?.trim() || fullName;

    const { data: newClient, error: insertErr } = await supabase
      .from("clients")
      .insert({
        company_name: companyName,
        contact_name: fullName,
        email: s.email,
        phone: s.phone,
        status: "prospect",
      })
      .select("id")
      .single();

    if (insertErr || !newClient) {
      setBusy(false);
      toast.error(insertErr?.message ?? "Failed to create client");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error: updateErr } = await supabase
      .from("intake_submissions")
      .update({
        status: "converted",
        converted_client_id: newClient.id,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", s.id);

    setBusy(false);
    if (updateErr) {
      toast.error(`Client created but failed to link submission: ${updateErr.message}`);
      return;
    }

    toast.success("Converted to client");
    navigate(`/admin/clients/${newClient.id}`);
  };

  if (!s) return <p className="text-muted-foreground">Loading…</p>;

  const isOpen = s.status === "pending" || s.status === "reviewed";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/intake"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{s.first_name} {s.last_name}</h1>
          <p className="text-sm text-muted-foreground">
            Submitted {new Date(s.created_at).toLocaleString()}
          </p>
        </div>
        <StatusBadge value={s.status} options={INTAKE_STATUSES} />
      </div>

      <Card>
        <CardHeader><CardTitle>Submission</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="First Name" value={s.first_name} />
          <Field label="Last Name" value={s.last_name} />
          <Field label="Email" value={s.email} />
          <Field label="Phone" value={s.phone} />
          <Field label="Company" value={s.company_name} />
          <Field label="State of Incorporation" value={s.incorporation_state} />
          <div className="md:col-span-2">
            <Field
              label="Services of Interest"
              value={
                s.services_of_interest.length > 0
                  ? <ul className="list-disc list-inside">{s.services_of_interest.map((x) => <li key={x}>{x}</li>)}</ul>
                  : "—"
              }
            />
          </div>
          <div className="md:col-span-2">
            <Field label="Explanation" value={s.explanation} />
          </div>
          <Field label="Non-marketing consent" value={s.non_marketing_consent ? "Yes" : "No"} />
          <Field label="Marketing consent" value={s.marketing_consent ? "Yes" : "No"} />
        </CardContent>
      </Card>

      {s.status === "converted" && s.converted_client_id && (
        <Card>
          <CardContent className="p-4">
            <Button asChild variant="outline">
              <Link to={`/admin/clients/${s.converted_client_id}`}>
                <ExternalLink className="h-4 w-4" /> View linked client
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {canManage && isOpen && (
        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {s.status === "pending" && (
              <Button variant="outline" disabled={busy} onClick={() => stamp("reviewed")}>
                <Check className="h-4 w-4" /> Mark as reviewed
              </Button>
            )}
            <Button variant="outline" disabled={busy} onClick={() => setConfirmAction("reject")}>
              <X className="h-4 w-4" /> Reject
            </Button>
            <Button disabled={busy} onClick={() => setConfirmAction("convert")}>
              <UserPlus className="h-4 w-4" /> Convert to client
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmAction !== null} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "convert" ? "Convert to client?" : "Reject submission?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "convert"
                ? `A new client record will be created for ${s.first_name} ${s.last_name}${s.company_name ? ` (${s.company_name})` : ""}. This submission will be marked as converted and linked to the new client.`
                : "This submission will be marked as rejected. You can still view it later but it won't appear in the pending queue."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => confirmAction === "convert" ? convert() : stamp("rejected")}
            >
              {confirmAction === "convert" ? "Create client" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminIntakeDetail;
