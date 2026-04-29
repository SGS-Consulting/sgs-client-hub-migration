import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";
import { Download, Check, FileText, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

type ClientService = {
  id: string;
  service_id: string;
  is_active: boolean;
  acknowledged_at: string | null;
  started_at: string;
  qb_configured_at: string | null;
  tax_firm_cadence: string | null;
  services: { name: string; category: string | null; description: string | null } | null;
};

type ClientDocument = {
  id: string;
  file_path: string;
  file_name: string;
  category: string;
  created_at: string;
};

const ClientServices = () => {
  const { clientId } = useCurrentClientId();
  const [active, setActive] = useState<ClientService[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [openQueriesCount, setOpenQueriesCount] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [confirmAckFor, setConfirmAckFor] = useState<ClientService | null>(null);

  const load = async () => {
    const { data: cat } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("name");
    setCatalog(cat ?? []);
    if (!clientId) return;
    const { data: cs } = await supabase
      .from("client_services")
      .select("*, services(*)")
      .eq("client_id", clientId)
      .order("started_at", { ascending: false });
    setActive((cs as ClientService[] | null) ?? []);
    const { data: docs } = await supabase
      .from("documents")
      .select("id, file_path, file_name, category, created_at")
      .eq("client_id", clientId)
      .in("category", [
        "corporate_kit",
        "completion_certificate",
        "quarterly_report",
        "annual_iul_review",
      ])
      .order("created_at", { ascending: false });
    setDocuments((docs as ClientDocument[] | null) ?? []);
    const { count } = await supabase
      .from("client_queries")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .neq("status", "answered");
    setOpenQueriesCount(count ?? 0);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const downloadDocument = async (doc: ClientDocument) => {
    setDownloadingId(doc.id);
    const { data, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(doc.file_path, 60 * 5);
    setDownloadingId(null);
    if (error || !data?.signedUrl) {
      toast.error(`Could not generate download link: ${error?.message ?? "unknown error"}`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const acknowledge = async (cs: ClientService) => {
    setAcknowledgingId(cs.id);
    const { data, error } = await supabase.rpc("acknowledge_client_service", {
      p_id: cs.id,
    });
    setAcknowledgingId(null);
    setConfirmAckFor(null);
    if (error) {
      toast.error(`Could not acknowledge: ${error.message}`);
      return;
    }
    toast.success("Service closed. Thank you for confirming receipt.");
    await load();
  };

  // Helpers for SOP-01 card content
  const kitDocsFor = (cs: ClientService) =>
    documents.filter(
      (d) =>
        d.category === "corporate_kit" &&
        new Date(d.created_at) >= new Date(cs.started_at),
    );
  const certDocFor = (cs: ClientService) =>
    documents.find(
      (d) =>
        d.category === "completion_certificate" &&
        new Date(d.created_at) >= new Date(cs.started_at),
    );

  const renderSop01Card = (cs: ClientService) => {
    const kit = kitDocsFor(cs);
    const cert = certDocFor(cs);
    const hasKit = kit.length > 0;
    const isAcknowledged = !!cs.acknowledged_at;

    let status: { label: string; tone: "in_progress" | "ready" | "closed" } = {
      label: "In progress — preparing your corporate structure",
      tone: "in_progress",
    };
    if (isAcknowledged) {
      status = {
        label: `Closed on ${new Date(cs.acknowledged_at!).toLocaleDateString()}`,
        tone: "closed",
      };
    } else if (hasKit) {
      status = {
        label: "Ready for your review",
        tone: "ready",
      };
    }

    return (
      <Card key={cs.id} className="border-primary/50 md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">{cs.services?.name}</CardTitle>
              <CardDescription>{cs.services?.category}</CardDescription>
            </div>
            <Badge
              variant={
                status.tone === "closed"
                  ? "secondary"
                  : status.tone === "ready"
                    ? "default"
                    : "outline"
              }
            >
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {cs.services?.description && (
            <p className="text-muted-foreground">{cs.services.description}</p>
          )}

          {/* Corporate Kit */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Corporate Kit
            </h3>
            {hasKit ? (
              <ul className="space-y-1">
                {kit.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{d.file_name}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadDocument(d)}
                      disabled={downloadingId === d.id}
                    >
                      {downloadingId === d.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Your corporate kit will appear here once it's ready. We'll
                email you when it's available.
              </p>
            )}
          </div>

          {/* Completion certificate */}
          {cert && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Completion Certificate
              </h3>
              <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2">
                <span className="flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{cert.file_name}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadDocument(cert)}
                  disabled={downloadingId === cert.id}
                >
                  {downloadingId === cert.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Acknowledge & close */}
          {hasKit && !isAcknowledged && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-3">
                When you've reviewed everything and feel comfortable with the
                new structure, click below to formally close the engagement.
              </p>
              <Button
                onClick={() => setConfirmAckFor(cs)}
                disabled={acknowledgingId === cs.id}
              >
                {acknowledgingId === cs.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Acknowledge & close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSop03Card = (cs: ClientService) => {
    const reports = documents.filter(
      (d) =>
        d.category === "quarterly_report" &&
        new Date(d.created_at) >= new Date(cs.started_at),
    );
    const iulReviews = documents.filter(
      (d) =>
        d.category === "annual_iul_review" &&
        new Date(d.created_at) >= new Date(cs.started_at),
    );
    const isInSetup = !cs.qb_configured_at;
    const status = cs.is_active
      ? isInSetup
        ? { label: "En configuración", tone: "in_progress" as const }
        : { label: "Activo", tone: "active" as const }
      : { label: "Cerrado", tone: "closed" as const };

    return (
      <Card key={cs.id} className="border-primary/50 md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">{cs.services?.name}</CardTitle>
              <CardDescription>{cs.services?.category}</CardDescription>
            </div>
            <Badge
              variant={
                status.tone === "closed"
                  ? "secondary"
                  : status.tone === "active"
                    ? "default"
                    : "outline"
              }
            >
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {cs.services?.description && (
            <p className="text-muted-foreground">{cs.services.description}</p>
          )}

          {/* Pending questions surface */}
          {openQueriesCount > 0 && (
            <Link
              to="/portal/queries"
              className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 hover:bg-muted transition-colors"
            >
              <span className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <span>
                  Tenés{" "}
                  <strong>
                    {openQueriesCount}{" "}
                    {openQueriesCount === 1 ? "pregunta" : "preguntas"}
                  </strong>{" "}
                  pendientes de tu equipo de contabilidad.
                </span>
              </span>
              <span className="text-xs text-primary font-medium">Ver →</span>
            </Link>
          )}

          {/* Quarterly reports */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reportes trimestrales
            </h3>
            {reports.length > 0 ? (
              <ul className="space-y-1">
                {reports.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{d.file_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString()}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadDocument(d)}
                      disabled={downloadingId === d.id}
                    >
                      {downloadingId === d.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tus reportes trimestrales de pérdidas y ganancias aparecerán acá cuando estén listos.
              </p>
            )}
          </div>

          {/* Annual IUL reviews */}
          {iulReviews.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Revisión anual de IUL (Octubre)
              </h3>
              <ul className="space-y-1">
                {iulReviews.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{d.file_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString()}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadDocument(d)}
                      disabled={downloadingId === d.id}
                    >
                      {downloadingId === d.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderGenericCard = (cs: ClientService) => (
    <Card key={cs.id} className="border-primary/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{cs.services?.name}</CardTitle>
          <Badge>Activo</Badge>
        </div>
        <CardDescription>{cs.services?.category}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {cs.services?.description}
      </CardContent>
    </Card>
  );

  const activeIds = new Set(active.filter((a) => a.is_active).map((a) => a.service_id));

  // We show inactive (closed) SOP-01 services too, so the client can still
  // download the kit and see the closure date — they just don't appear in
  // the main "active" grid. For now, "active or recently acknowledged"
  // shows in the same panel.
  const visibleActive = active.filter(
    (a) => a.is_active || a.services?.name === "Business Formation & Structure",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis servicios</h1>
        <p className="text-sm text-muted-foreground">
          Servicios contratados y catálogo disponible.
        </p>
      </div>

      {visibleActive.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Activos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleActive.map((cs) => {
              const name = cs.services?.name ?? "";
              if (name === "Business Formation & Structure") return renderSop01Card(cs);
              if (name.startsWith("Managed Accounting") || name === "Tax-Season Bookkeeping (One-Time)")
                return renderSop03Card(cs);
              return renderGenericCard(cs);
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Catálogo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  {activeIds.has(s.id) && <Badge variant="secondary">Contratado</Badge>}
                </div>
                <CardDescription>{s.category}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{s.description}</CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Acknowledge confirmation */}
      <AlertDialog
        open={!!confirmAckFor}
        onOpenChange={(open) => !open && setConfirmAckFor(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acknowledge & close this service?</AlertDialogTitle>
            <AlertDialogDescription>
              This confirms you've received and reviewed your corporate kit
              for {confirmAckFor?.services?.name}. The engagement will be
              formally closed. You'll still be able to download all documents
              from your portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAckFor && acknowledge(confirmAckFor)}
            >
              Yes, acknowledge & close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientServices;
