import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

type TaxStrategy = {
  id: string;
  client_id: string;
  client_service_id: string | null;
  identified_at: string | null;
  strategy_summary: string;
  rationale: string | null;
  expected_savings_usd: number | null;
  status: "proposed" | "active" | "implemented" | "retired";
  created_at: string;
};

type Meeting = {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  attendees: string[];
  outcome_notes: string | null;
  kind: "tax_strategy_initial" | "tax_strategy_quarterly";
};

type NewStrategyDraft = {
  summary: string;
  rationale: string;
  expected_savings_usd: string;
};

const STATUS_TONE: Record<TaxStrategy["status"], "default" | "secondary" | "outline" | "destructive"> = {
  proposed: "outline",
  active: "default",
  implemented: "secondary",
  retired: "destructive",
};

const STATUS_LABEL: Record<TaxStrategy["status"], string> = {
  proposed: "Propuesta",
  active: "Activa",
  implemented: "Implementada",
  retired: "Retirada",
};

const KIND_LABEL: Record<Meeting["kind"], string> = {
  tax_strategy_initial: "Inicial",
  tax_strategy_quarterly: "Trimestral",
};

const fmtMoney = (n: number | null) =>
  n === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const blankNewStrategy = (): NewStrategyDraft => ({ summary: "", rationale: "", expected_savings_usd: "" });

type Props = { clientId: string };

export const AdminTaxStrategyTab = ({ clientId }: Props) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [strategies, setStrategies] = useState<TaxStrategy[]>([]);
  const [busy, setBusy] = useState(false);

  // Meeting log dialog (used for both initial and quarterly)
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingKind, setMeetingKind] = useState<Meeting["kind"]>("tax_strategy_quarterly");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [attendees, setAttendees] = useState("Abner Quiroga, Germain Tovar");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [newStrategies, setNewStrategies] = useState<NewStrategyDraft[]>([blankNewStrategy()]);

  // Strategy edit dialog
  const [editingStrategy, setEditingStrategy] = useState<TaxStrategy | null>(null);
  const [stratSummary, setStratSummary] = useState("");
  const [stratRationale, setStratRationale] = useState("");
  const [stratSavings, setStratSavings] = useState("");
  const [stratStatus, setStratStatus] = useState<TaxStrategy["status"]>("proposed");

  const load = async () => {
    const [{ data: ms }, { data: ts }] = await Promise.all([
      supabase
        .from("discovery_sessions")
        .select("id, scheduled_at, duration_minutes, attendees, outcome_notes, kind")
        .eq("client_id", clientId)
        .in("kind", ["tax_strategy_initial", "tax_strategy_quarterly"])
        .order("scheduled_at", { ascending: false }),
      supabase
        .from("tax_strategies")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
    ]);
    setMeetings((ms ?? []) as Meeting[]);
    setStrategies((ts ?? []) as TaxStrategy[]);
  };

  useEffect(() => {
    if (clientId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const openMeetingDialog = (kind: Meeting["kind"]) => {
    setMeetingKind(kind);
    setScheduledAt(new Date().toISOString().slice(0, 16));
    setDuration(60);
    setAttendees("Abner Quiroga, Germain Tovar");
    setOutcomeNotes("");
    setNewStrategies([blankNewStrategy()]);
    setMeetingOpen(true);
  };

  const updateNewStrategy = (idx: number, patch: Partial<NewStrategyDraft>) => {
    setNewStrategies((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addStrategyRow = () => setNewStrategies((prev) => [...prev, blankNewStrategy()]);
  const removeStrategyRow = (idx: number) =>
    setNewStrategies((prev) => (prev.length === 1 ? [blankNewStrategy()] : prev.filter((_, i) => i !== idx)));

  const saveMeeting = async () => {
    if (!scheduledAt) {
      toast.error("La fecha es obligatoria");
      return;
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Insert meeting
    const attendeeList = attendees.split(",").map((s) => s.trim()).filter(Boolean);
    const { error: meetingErr } = await supabase.from("discovery_sessions").insert({
      client_id: clientId,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration,
      attendees: attendeeList,
      outcome_notes: outcomeNotes || null,
      kind: meetingKind,
      created_by: user?.id ?? null,
    });
    if (meetingErr) {
      setBusy(false);
      toast.error(meetingErr.message);
      return;
    }

    // 2. Insert any non-empty strategies (status defaults to 'proposed')
    const strategyRows = newStrategies
      .filter((s) => s.summary.trim().length > 0)
      .map((s) => ({
        client_id: clientId,
        identified_at: scheduledAt ? new Date(scheduledAt).toISOString().split("T")[0] : null,
        strategy_summary: s.summary.trim(),
        rationale: s.rationale.trim() || null,
        expected_savings_usd: s.expected_savings_usd.trim() ? Number(s.expected_savings_usd) : null,
        status: "proposed" as const,
        created_by: user?.id ?? null,
      }));

    if (strategyRows.length > 0) {
      const { error: stratErr } = await supabase.from("tax_strategies").insert(strategyRows);
      if (stratErr) {
        setBusy(false);
        toast.error(`Reunión guardada, pero falló agregar estrategias: ${stratErr.message}`);
        return;
      }
    }

    setBusy(false);
    toast.success(`Reunión ${KIND_LABEL[meetingKind].toLowerCase()} registrada${strategyRows.length > 0 ? ` + ${strategyRows.length} estrategia(s)` : ""}.`);
    setMeetingOpen(false);
    load();
  };

  const openEditStrategy = (s: TaxStrategy) => {
    setEditingStrategy(s);
    setStratSummary(s.strategy_summary);
    setStratRationale(s.rationale ?? "");
    setStratSavings(s.expected_savings_usd?.toString() ?? "");
    setStratStatus(s.status);
  };

  const saveStrategy = async () => {
    if (!editingStrategy) return;
    if (!stratSummary.trim()) {
      toast.error("El resumen es obligatorio");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("tax_strategies")
      .update({
        strategy_summary: stratSummary.trim(),
        rationale: stratRationale.trim() || null,
        expected_savings_usd: stratSavings.trim() ? Number(stratSavings) : null,
        status: stratStatus,
      })
      .eq("id", editingStrategy.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Estrategia actualizada");
    setEditingStrategy(null);
    load();
  };

  const totalSavings = strategies
    .filter((s) => s.status === "active" || s.status === "implemented")
    .reduce((acc, s) => acc + (s.expected_savings_usd ?? 0), 0);
  const activeCount = strategies.filter((s) => s.status === "active" || s.status === "implemented").length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Reuniones internas de estrategia fiscal (Abner + Germain) y las estrategias identificadas para el cliente. Todo
        es internal-only — el cliente solo ve un contador de "estrategias activas" en su portal.
      </p>

      {/* Reuniones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Reuniones de estrategia ({meetings.length})</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openMeetingDialog("tax_strategy_initial")}>
                <Plus className="h-4 w-4 mr-2" /> Reunión inicial
              </Button>
              <Button size="sm" onClick={() => openMeetingDialog("tax_strategy_quarterly")}>
                <Plus className="h-4 w-4 mr-2" /> Reunión trimestral
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Asistentes</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Duración</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    Sin reuniones registradas.
                  </TableCell>
                </TableRow>
              ) : (
                meetings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{new Date(m.scheduled_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{KIND_LABEL[m.kind]}</Badge></TableCell>
                    <TableCell className="text-xs">{m.attendees.join(", ")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[400px] truncate">
                      {m.outcome_notes ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{m.duration_minutes} min</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Estrategias */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Estrategias identificadas ({strategies.length})
              {activeCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  · {activeCount} activa(s) · {fmtMoney(totalSavings)} ahorro estimado total
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resumen</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ahorro estimado</TableHead>
                <TableHead>Identificada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {strategies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    Sin estrategias. Agregalas al loguear una reunión, o usá el botón de reunión trimestral arriba.
                  </TableCell>
                </TableRow>
              ) : (
                strategies.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="max-w-[400px]">
                      <p className="text-sm font-medium truncate">{s.strategy_summary}</p>
                      {s.rationale && <p className="text-xs text-muted-foreground truncate">{s.rationale}</p>}
                    </TableCell>
                    <TableCell><Badge variant={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge></TableCell>
                    <TableCell className="text-right text-sm">{fmtMoney(s.expected_savings_usd)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.identified_at ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditStrategy(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Meeting log dialog */}
      <Dialog open={meetingOpen} onOpenChange={setMeetingOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Loguear reunión {KIND_LABEL[meetingKind].toLowerCase()} de estrategia fiscal
            </DialogTitle>
            <DialogDescription>
              {meetingKind === "tax_strategy_quarterly"
                ? "Registrá la reunión y, si querés, agregá las estrategias identificadas en el mismo paso."
                : "Reunión inicial — solo se registra una vez por activación de SOP-04."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="ts-when">Fecha/hora *</Label>
                <Input id="ts-when" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ts-dur">Duración (min)</Label>
                <Input id="ts-dur" type="number" min={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <Label htmlFor="ts-att">Asistentes (separados por coma)</Label>
              <Input id="ts-att" value={attendees} onChange={(e) => setAttendees(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ts-notes">Notas / outcome</Label>
              <Textarea id="ts-notes" rows={4} value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)} />
            </div>

            {meetingKind === "tax_strategy_quarterly" && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Estrategias identificadas en esta reunión</Label>
                  <Button variant="outline" size="sm" onClick={addStrategyRow}>
                    <Plus className="h-4 w-4 mr-2" /> Otra
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Las que agregues acá se guardan con status <strong>Propuesta</strong>. Después podés activarlas /
                  marcarlas como implementadas desde la tabla de abajo.
                </p>
                {newStrategies.map((s, idx) => (
                  <div key={idx} className="rounded-md border p-3 space-y-2 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Estrategia #{idx + 1}</span>
                      {newStrategies.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeStrategyRow(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Resumen (ej: Reclasificar 8 empleados a contratistas)"
                      value={s.summary}
                      onChange={(e) => updateNewStrategy(idx, { summary: e.target.value })}
                    />
                    <Textarea
                      placeholder="Rationale (por qué tiene sentido para este cliente)"
                      rows={2}
                      value={s.rationale}
                      onChange={(e) => updateNewStrategy(idx, { rationale: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Ahorro estimado en USD (opcional)"
                      value={s.expected_savings_usd}
                      onChange={(e) => updateNewStrategy(idx, { expected_savings_usd: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMeetingOpen(false)}>Cancelar</Button>
            <Button onClick={saveMeeting} disabled={busy}>Guardar reunión</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Strategy edit dialog */}
      <Dialog open={!!editingStrategy} onOpenChange={(open) => !open && setEditingStrategy(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar estrategia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="es-summary">Resumen *</Label>
              <Input id="es-summary" value={stratSummary} onChange={(e) => setStratSummary(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="es-rationale">Rationale</Label>
              <Textarea id="es-rationale" rows={3} value={stratRationale} onChange={(e) => setStratRationale(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="es-savings">Ahorro estimado (USD)</Label>
                <Input id="es-savings" type="number" value={stratSavings} onChange={(e) => setStratSavings(e.target.value)} />
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={stratStatus} onValueChange={(v) => setStratStatus(v as TaxStrategy["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposed">Propuesta</SelectItem>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="implemented">Implementada</SelectItem>
                    <SelectItem value="retired">Retirada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStrategy(null)}>Cancelar</Button>
            <Button onClick={saveStrategy} disabled={busy}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
