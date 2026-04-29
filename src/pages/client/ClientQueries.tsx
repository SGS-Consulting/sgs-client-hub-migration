import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentClientId } from "@/hooks/useCurrentClientId";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, MessageCircle, Check } from "lucide-react";
import { toast } from "sonner";

type Query = {
  id: string;
  question: string;
  context: string | null;
  due_date: string;
  status: "open" | "answered" | "overdue";
  response: string | null;
  responded_at: string | null;
  created_at: string;
};

const ClientQueries = () => {
  const { clientId } = useCurrentClientId();
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const load = async () => {
    if (!clientId) return;
    setLoading(true);
    const { data } = await supabase
      .from("client_queries")
      .select("id, question, context, due_date, status, response, responded_at, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setQueries(((data as Query[]) ?? []));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const submitAnswer = async (id: string) => {
    const response = responseDrafts[id]?.trim() ?? "";
    if (response.length === 0) {
      toast.error("Please write a response before submitting.");
      return;
    }
    setSubmittingId(id);
    const { error } = await supabase.rpc("answer_client_query", {
      p_id: id,
      p_response: response,
    });
    setSubmittingId(null);
    if (error) {
      toast.error(`Could not submit: ${error.message}`);
      return;
    }
    toast.success("Thanks — your response was sent.");
    setResponseDrafts((d) => {
      const copy = { ...d };
      delete copy[id];
      return copy;
    });
    await load();
  };

  const isOverdue = (q: Query) => {
    if (q.status !== "open") return false;
    return q.due_date < new Date().toISOString().split("T")[0];
  };

  const open = queries.filter((q) => q.status !== "answered");
  const answered = queries.filter((q) => q.status === "answered");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6" /> Preguntas pendientes
        </h1>
        <p className="text-sm text-muted-foreground">
          Cuando nuestro equipo necesita aclarar algo de tus libros, lo verás aquí.
          Respondé directamente desde el portal y mantendremos tu contabilidad al día.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Open & overdue */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pendientes ({open.length})
            </h2>
            {open.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No tenés preguntas pendientes. ¡Buen trabajo!
                </CardContent>
              </Card>
            ) : (
              open.map((q) => (
                <Card
                  key={q.id}
                  className={isOverdue(q) ? "border-destructive/50" : "border-primary/30"}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base">{q.question}</CardTitle>
                      {isOverdue(q) ? (
                        <Badge variant="destructive">Vencida</Badge>
                      ) : (
                        <Badge>Pendiente</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {q.context && (
                      <p className="text-muted-foreground">
                        <strong>Contexto:</strong> {q.context}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Recibida el {new Date(q.created_at).toLocaleDateString()} ·{" "}
                      Vencimiento {new Date(q.due_date).toLocaleDateString()}
                    </p>
                    <div className="space-y-2 pt-2 border-t">
                      <Label htmlFor={`response-${q.id}`}>Tu respuesta</Label>
                      <Textarea
                        id={`response-${q.id}`}
                        rows={3}
                        value={responseDrafts[q.id] ?? ""}
                        onChange={(e) =>
                          setResponseDrafts((d) => ({
                            ...d,
                            [q.id]: e.target.value,
                          }))
                        }
                        placeholder="Escribí tu respuesta…"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={() => submitAnswer(q.id)}
                          disabled={submittingId === q.id}
                          size="sm"
                        >
                          {submittingId === q.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Enviar respuesta
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Answered */}
          {answered.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Respondidas ({answered.length})
              </h2>
              {answered.map((q) => (
                <Card key={q.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base text-muted-foreground">
                        {q.question}
                      </CardTitle>
                      <Badge variant="secondary">Respondida</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      <strong>Tu respuesta:</strong> {q.response}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Respondida el{" "}
                      {q.responded_at
                        ? new Date(q.responded_at).toLocaleDateString()
                        : "—"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClientQueries;
