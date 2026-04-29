import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Per-client SOP-03 service configuration:
//   - QuickBooks configured (admin marks done after external setup)
//   - Tax-firm cadence (per-client cadence for sending docs to firm —
//     quarterly | semi_annual | tax_season_only)
//
// Drives the recurring-task spawner (when the cron is built) which
// reads tax_firm_cadence to decide when to spawn the next "Send tax-
// prep docs to firm" task for this client.

type Cadence = "quarterly" | "semi_annual" | "tax_season_only";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientServiceId: string;
  initial: {
    qb_configured_at: string | null;
    tax_firm_cadence: Cadence | null;
  };
  onSaved?: () => void;
}

export const Sop03ServiceConfigDialog = ({
  open,
  onOpenChange,
  clientServiceId,
  initial,
  onSaved,
}: Props) => {
  const [qbConfigured, setQbConfigured] = useState(false);
  const [cadence, setCadence] = useState<Cadence | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQbConfigured(!!initial.qb_configured_at);
    setCadence(initial.tax_firm_cadence ?? "");
  }, [open, initial.qb_configured_at, initial.tax_firm_cadence]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("client_services")
      .update({
        qb_configured_at:
          qbConfigured && !initial.qb_configured_at
            ? new Date().toISOString()
            : qbConfigured
              ? initial.qb_configured_at
              : null,
        tax_firm_cadence: cadence === "" ? null : cadence,
      })
      .eq("id", clientServiceId);
    setSaving(false);
    if (error) {
      toast.error(`Could not save: ${error.message}`);
      return;
    }
    toast.success("Configuration saved.");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar Managed Accounting</DialogTitle>
          <DialogDescription>
            QuickBooks status + cadencia para envío de documentos a la firma contable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* QuickBooks toggle */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Checkbox
                id="qb-configured"
                checked={qbConfigured}
                onCheckedChange={(v) => setQbConfigured(v === true)}
              />
              <Label htmlFor="qb-configured" className="font-medium">
                QuickBooks configurado para este cliente
              </Label>
            </div>
            {qbConfigured && initial.qb_configured_at && (
              <p className="text-xs text-muted-foreground pl-7">
                Marcado el {new Date(initial.qb_configured_at).toLocaleDateString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground pl-7">
              Marcalo cuando hayas creado la cuenta de QuickBooks del cliente y conectado los feeds bancarios.
            </p>
          </div>

          {/* Tax-firm cadence */}
          <div className="space-y-3">
            <Label className="font-medium">Cadencia para envío a firma contable</Label>
            <p className="text-xs text-muted-foreground">
              ¿Con qué frecuencia se envía el paquete de documentos del cliente a la firma contable tercera? (SOP-03 §8.1)
            </p>
            <RadioGroup
              value={cadence}
              onValueChange={(v) => setCadence(v as Cadence | "")}
              className="space-y-2"
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="quarterly" id="cad-quarterly" className="mt-1" />
                <div className="space-y-0.5">
                  <Label htmlFor="cad-quarterly" className="font-normal cursor-pointer">
                    Trimestral
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Cliente con presentación de impuestos trimestral.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="semi_annual" id="cad-semi" className="mt-1" />
                <div className="space-y-0.5">
                  <Label htmlFor="cad-semi" className="font-normal cursor-pointer">
                    Semestral
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Cliente con presentación de impuestos semestral.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="tax_season_only" id="cad-tax-season" className="mt-1" />
                <div className="space-y-0.5">
                  <Label htmlFor="cad-tax-season" className="font-normal cursor-pointer">
                    Solo en temporada de impuestos
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Para clientes que sólo contratan SGS para libros + presentación una vez al año.
                  </p>
                </div>
              </div>
            </RadioGroup>
            {cadence !== "" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setCadence("")}
              >
                Limpiar selección
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
