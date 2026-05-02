import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Question = {
  id: string;
  question_number: number;
  category: "behavioral_control" | "financial_control" | "type_of_relationship";
  question_text: string;
};

type Response = {
  question_id: string;
  answer: "yes" | "no";
  notes: string | null;
};

type Props = {
  workerId: string | null;
  workerLabel?: string;
  onClose: () => void;
  onSaved: () => void;
};

// Map question_number → which side a YES answer indicates.
// Hardcoded to the seeded canonical 5 IRS Common Law Test questions
// (sop04_tax_compliance.sql). New seeded questions without an entry here
// don't contribute to the recommendation count; they still get saved.
const YES_TILTS: Record<number, "employee" | "contractor"> = {
  1: "employee",   // company controls how the work is performed
  2: "employee",   // company sets hours/schedule
  3: "contractor", // worker invests in own equipment
  4: "contractor", // worker can realize profit or loss
  5: "employee",   // written contract OR employee-type benefits (dominant signal: benefits → employee)
};

const CATEGORY_LABEL: Record<Question["category"], string> = {
  behavioral_control: "Control conductual",
  financial_control: "Control financiero",
  type_of_relationship: "Tipo de relación",
};

export const WorkerClassificationDialog = ({ workerId, workerLabel, onClose, onSaved }: Props) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, "yes" | "no" | undefined>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workerId) return;
    setLoading(true);
    (async () => {
      const [{ data: qs }, { data: rs }] = await Promise.all([
        supabase
          .from("worker_classification_questions")
          .select("id, question_number, category, question_text")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("worker_classification_responses")
          .select("question_id, answer, notes")
          .eq("worker_id", workerId),
      ]);
      const qList = (qs ?? []) as Question[];
      setQuestions(qList);

      // Pre-fill from existing responses (re-classification flow)
      const a: Record<string, "yes" | "no"> = {};
      const n: Record<string, string> = {};
      ((rs ?? []) as Response[]).forEach((r) => {
        if (r.answer === "yes" || r.answer === "no") a[r.question_id] = r.answer;
        if (r.notes) n[r.question_id] = r.notes;
      });
      setAnswers(a);
      setNotes(n);
      setLoading(false);
    })();
  }, [workerId]);

  // Tally recommendation as questions get answered.
  const tally = useMemo(() => {
    let employee = 0;
    let contractor = 0;
    let answered = 0;
    questions.forEach((q) => {
      const a = answers[q.id];
      if (!a) return;
      answered += 1;
      const tilt = YES_TILTS[q.question_number];
      if (!tilt) return; // unknown question, skip from recommendation
      if (a === "yes") {
        if (tilt === "employee") employee += 1;
        else contractor += 1;
      } else {
        // 'no' tilts the opposite way
        if (tilt === "employee") contractor += 1;
        else employee += 1;
      }
    });
    return { employee, contractor, answered, total: questions.length };
  }, [questions, answers]);

  const recommendationLabel = (() => {
    if (tally.answered === 0) return null;
    const diff = tally.employee - tally.contractor;
    if (diff === 0) return { label: "Ambiguo — el admin debe decidir", tone: "outline" as const };
    if (diff > 0)
      return {
        label: `${tally.employee} indicador(es) → EMPLEADO  ·  ${tally.contractor} → contratista`,
        tone: "default" as const,
        winner: "employee" as const,
      };
    return {
      label: `${tally.contractor} indicador(es) → CONTRATISTA  ·  ${tally.employee} → empleado`,
      tone: "default" as const,
      winner: "contractor" as const,
    };
  })();

  const allAnswered = tally.answered === tally.total && tally.total > 0;

  const save = async () => {
    if (!workerId) return;
    if (!allAnswered) {
      toast.error("Respondé todas las preguntas antes de guardar");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Overwrite existing responses (Q2 = A: re-classify replaces, no versioning)
    const { error: delErr } = await supabase
      .from("worker_classification_responses")
      .delete()
      .eq("worker_id", workerId);
    if (delErr) {
      setSaving(false);
      toast.error(`No pude limpiar respuestas previas: ${delErr.message}`);
      return;
    }

    const rows = questions.map((q) => ({
      worker_id: workerId,
      question_id: q.id,
      answer: answers[q.id]!,
      notes: notes[q.id]?.trim() || null,
      answered_by: user?.id ?? null,
      answered_at: new Date().toISOString(),
    }));
    const { error: insErr } = await supabase.from("worker_classification_responses").insert(rows);
    setSaving(false);

    if (insErr) {
      toast.error(`No pude guardar la clasificación: ${insErr.message}`);
      return;
    }
    toast.success("Clasificación guardada. Acordate de actualizar el flag de contratista en la edición del worker si querés que cambie.");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!workerId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Clasificación IRS Common Law Test</DialogTitle>
          <DialogDescription>
            {workerLabel ?? "Worker"} — respondé las 5 preguntas para evaluar si corresponde clasificar al worker como
            empleado o contratista. La recomendación es solo orientativa: el flag final lo decide vos en la edición del
            worker.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recommendation banner */}
            {recommendationLabel && (
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Recomendación ({tally.answered}/{tally.total} respondidas)
                </p>
                <Badge variant={recommendationLabel.tone}>{recommendationLabel.label}</Badge>
              </div>
            )}

            {/* Questions */}
            {questions.map((q, idx) => (
              <div key={q.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {idx + 1}. {CATEGORY_LABEL[q.category]}
                    </p>
                    <p className="text-sm mt-1">{q.question_text}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant={answers[q.id] === "yes" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAnswers({ ...answers, [q.id]: "yes" })}
                    >
                      Sí
                    </Button>
                    <Button
                      variant={answers[q.id] === "no" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAnswers({ ...answers, [q.id]: "no" })}
                    >
                      No
                    </Button>
                  </div>
                </div>
                <Textarea
                  placeholder="Notas opcionales (contexto, ejemplos, fuente)..."
                  value={notes[q.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [q.id]: e.target.value })}
                  rows={2}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={!allAnswered || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar clasificación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
