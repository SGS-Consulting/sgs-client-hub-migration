import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, Mail, Bell } from "lucide-react";

const AdminSettings = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold">Configuración</h1>
      <p className="text-sm text-muted-foreground">Integraciones y ajustes generales.</p>
    </div>

    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Plug className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>GoHighLevel</CardTitle>
              <CardDescription>Sincronización de contactos, etiquetas y automatizaciones.</CardDescription>
            </div>
          </div>
          <Badge variant="outline">Próximamente — Fase 2</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Conecta tu cuenta de GoHighLevel para etiquetar contactos, enviar mensajes automáticos y disparar workflows desde la ficha del cliente.
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Pagos online (Stripe)</CardTitle>
              <CardDescription>Permite a los clientes pagar facturas con tarjeta.</CardDescription>
            </div>
          </div>
          <Badge variant="outline">Próximamente — Fase 2</Badge>
        </div>
      </CardHeader>
    </Card>

    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Notificaciones por email</CardTitle>
              <CardDescription>Recordatorios automáticos de facturas y tareas.</CardDescription>
            </div>
          </div>
          <Badge variant="outline">Próximamente — Fase 2</Badge>
        </div>
      </CardHeader>
    </Card>
  </div>
);

export default AdminSettings;
