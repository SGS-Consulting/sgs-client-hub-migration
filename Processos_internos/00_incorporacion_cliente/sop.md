# SOP-00: Incorporación Inicial del Cliente

## Información General

| Campo | Detalle |
|-------|---------|
| **Responsable Principal** | Abner (CEO) |
| **Miembros Involucrados** | Abner + miembros asignados según servicios contratados |
| **Disparador** | Un prospecto expresa interés en los servicios de SGS |
| **Duración Estimada** | Por definir |
| **Pipeline GHL** | `Incorporación de Cliente` |

---

## Pasos del Proceso

### Paso 1 — Envío del Formulario de Intake
- **Responsable:** Abner
- **Descripción:** Al recibir expresión de interés de un prospecto, Abner envía el formulario de intake personalizado de SGS vía correo electrónico. El formulario recopila información sobre las necesidades del cliente y los servicios que requiere.
- **Entregable:** Formulario de intake enviado al prospecto.

### Paso 1.1 — Distribución del Intake al Equipo
- **Responsable:** Abner
- **Descripción:** Una vez que el cliente completa el formulario de intake, Abner distribuye la información a todos los miembros del equipo. El objetivo es que cada integrante tenga contexto claro sobre las necesidades del cliente antes de que se agende la sesión de descubrimiento.
- **Entregable:** Información del intake enviada a todos los miembros del equipo.

### Paso 2 — Evaluación del Intake y Sesión de Descubrimiento
- **Responsable:** Abner
- **Descripción:** Abner revisa el formulario completado por el cliente, evalúa qué servicios requiere y agenda una sesión de descubrimiento para profundizar en sus necesidades. El equipo llega a esta sesión ya informado gracias al Paso 1.1.
- **Entregable:** Sesión de descubrimiento completada. Notas internas con necesidades del cliente documentadas.

### Paso 3 — Generación y Envío de Propuesta
- **Responsable:** Abner
- **Descripción:** Con base en la sesión de descubrimiento, Abner genera una propuesta de proyecto con los servicios recomendados y el costo correspondiente. La propuesta se envía al cliente vía correo electrónico.
- **Entregable:** Propuesta enviada al cliente.
- **Estructura de precios:**
  - Servicios recurrentes: $5,000/mes por empresa gestionada
  - Servicios de única vez: cargo único definido por Abner según el caso

### Paso 4 — Aceptación Formal: Contrato y Pago Inicial
- **Responsable:** Abner
- **Descripción:** Una vez que el cliente acepta la propuesta, debe completar dos acciones antes de que se inicie cualquier trabajo: (1) firmar el contrato de servicios de SGS de forma digital, y (2) realizar el pago inicial correspondiente. Ambas acciones deben completarse para continuar al siguiente paso.
- **Herramienta actual (contrato):** DocuSign
- **Objetivo futuro:** Firma digital + pago integrados en el portal SGS (actualmente en desarrollo)
- **Entregable:** Contrato firmado y pago inicial recibido. Ambos registrados en GHL.
- **Nota:** Este paso es el disparador de todos los flujos de trabajo de servicios. No se asignan tareas al equipo ni se inicia ningún SOP de servicio hasta que el contrato esté firmado y el pago confirmado.

### Paso 5 — Asignación de Tareas al Equipo
- **Responsable:** Abner
- **Descripción:** Con el contrato firmado y el pago inicial confirmado (Paso 4), Abner asigna las tareas a cada miembro del equipo según los servicios contratados. Esta asignación dispara los SOPs correspondientes a cada servicio. Las asignaciones deben quedar registradas en GHL (actualmente se hacen de forma verbal — migrar a GHL es objetivo del sistema interno).
- **Entregable:** Tareas asignadas a los miembros del equipo en GHL. SOPs de servicio iniciados.

### Paso 6 — Correo de Bienvenida al Cliente
- **Responsable:** Abner (automatizar vía GHL)
- **Descripción:** Se envía un correo de bienvenida al cliente confirmando que su cuenta está activa y que el equipo ha sido asignado. Idealmente este correo se dispara de forma automática desde GHL al completar el Paso 5.
- **Entregable:** Correo de bienvenida recibido por el cliente.

---

## KPIs

| KPI | Cómo se mide | Meta |
|-----|-------------|------|
| Tiempo de respuesta al intake | Horas desde que el cliente completa el formulario hasta que Abner agenda la sesión | Por definir |
| Tasa de conversión de propuesta | % de propuestas enviadas que resultan en cliente activo | Por definir |
| Tiempo total de onboarding | Días desde expresión de interés hasta correo de bienvenida enviado | Por definir |

---

## Herramientas
- Formulario de intake propio de SGS (enviado vía correo electrónico)
- GoHighLevel CRM (registro del contacto, pipeline, asignación de tareas, automatización del correo de bienvenida)

---

## Notas
- Al completar el onboarding, iniciar los SOPs correspondientes a cada servicio contratado.

---

## Estado Futuro — Implementación en el SGS Client Hub

> Este SOP será migrado al **SGS Client Hub** (`../../sgs-client-hub/`) en fases. La hoja de ruta completa vive en `_specs/client_dashboard/roadmap.md`. Mientras tanto, el proceso oficial sigue siendo el descrito arriba.

### Flujo objetivo (estado final tras Fase 3 del roadmap)

1. El prospecto envía el **formulario público de intake** en `/intake` del dashboard (sin cuenta requerida).
2. SGS revisa la submission desde el panel administrativo y la convierte en cliente, enviando invitación al portal.
3. El prospecto crea cuenta en el portal vía la invitación.
4. El prospecto entra al portal — ve todas las pestañas pero la mayoría están **bloqueadas con "disponible después del pago"** (vista de preview). Superficie activa: agendar descubrimiento, ver propuesta, pagar, soporte.
5. El prospecto auto-agenda la sesión de descubrimiento vía **Calendly** integrado.
6. SGS prepara la **propuesta-presentación** (subida manual en v1; generada por agente de IA a futuro).
7. El prospecto revisa la propuesta en el portal.
8. El prospecto paga vía **Stripe Checkout**.
9. Al confirmarse el pago, el portal se desbloquea por completo (tareas, documentos, facturas, servicios, soporte).

### Mapeo de herramientas

| Hoy | Estado final |
|---|---|
| Formulario de intake en GHL (enviado por correo) | Formulario público en `/intake` del dashboard |
| DocuSign para firma de contrato | Firma integrada en el portal (flujo de propuesta) |
| Agendamiento manual por correo | Calendly integrado en el portal |
| Propuesta enviada por correo | Propuesta-presentación visible en el portal |
| Pago manual / coordinación bancaria | Stripe Checkout |
| Asignación de tareas verbal / en GHL | Tareas auto-creadas al activar servicios (templates por servicio) |
| GHL como CRM operacional | Dashboard como fuente de verdad; GHL sincronizado para automatizaciones (Fase 2 del roadmap) |

### Implementación gradual

- **Fase 1** del roadmap construye el engine en el dashboard, pero los pasos 2–8 los ejecuta el equipo manualmente vía correo + herramientas administrativas. No hay portal de prospecto todavía.
- **Fase 2** conecta el dashboard con GHL (sincronización de contactos, pipelines y automatizaciones).
- **Fase 3** activa el portal del prospecto y la auto-servicio (embed de Calendly, Stripe Checkout, vista de propuesta, desbloqueo por pago).

Las herramientas actuales (GHL, DocuSign, correos manuales) siguen siendo el proceso oficial hasta que el dashboard absorba cada paso.
