# Conexiones a Plataformas Externas — Hand-off para Karen

**Audiencia:** Karen (Head of IT, líder del proyecto SGS Client Hub).
**Autor:** Javi + Claude.
**Última actualización:** 2026-05-01.

Este documento lista todo lo que el dashboard necesita conectar con plataformas externas (GoHighLevel, Stripe, Calendly, etc.) para funcionar end-to-end. Está organizado por sistema, en orden de dependencia: lo que tiene que hacerse primero está arriba.

> **Cómo usar este documento:** revisá cada sección, marcá lo completado, y agregá notas/credenciales en los lugares marcados con **TBD**. Cuando todo esté en verde, hablamos para hacer el switch del dashboard a producción.

> **Estado actual del dashboard:** la base está construida y funcionando contra Supabase de desarrollo (de Javi). El dashboard ya genera los eventos correctos (filas en `email_log`, status en `client_services.ghl_pipeline_stage`, etc.) — falta el lado de "GHL/Stripe/Calendly los lee y dispara las acciones reales".

---

## Tabla de prioridades

| # | Sistema | Por qué importa | Esfuerzo | Bloquea |
|---|---------|-----------------|----------|---------|
| 1 | Hosting + dominio | Sin URL público, nadie del equipo puede usar el dashboard | ~30 min de DNS | Todo lo demás |
| 2 | Supabase (proyecto de producción) | El dashboard de desarrollo está en la cuenta de Javi; producción tiene que ser de SGS | ~1 hora | Todo lo demás |
| 3 | GoHighLevel | Pipelines de cada SOP + despacho de email | ~2-4 horas (tu dominio) | Funcionalidades operativas |
| 4 | Stripe | Pagos de facturas (SOP-00, SOP-01, futuras facturas) | ~1-2 horas | Pagos online |
| 5 | Calendly | Auto-agendamiento de reuniones (SOP-00 discovery, SOP-03 mensual, SOP-07) | ~30 min | Self-scheduling |
| 6 | Email transaccional de Supabase | Branding del email de invitación al portal | ~15 min | Polish (no bloquea) |

---

## 1. Hosting y dominio

### Recomendación

- **Hosting:** Vercel (plan gratuito alcanza para v1; ~$20/mes si crecemos).
- **Dominio:** subdominio en `sgsconsulting.net` (ejemplo: `dashboard.sgsconsulting.net`).
- **DNS:** un registro `CNAME` apuntando a Vercel.

### Por qué Vercel

- Auto-deploy en cada `git push` — Javi puede iterar sin que vos tengas que hacer nada.
- HTTPS automático.
- Optimizado para Vite/React (que es lo que usa el dashboard).
- Permite "preview deployments" por branch — útil para que vos veas cambios antes de que vayan a producción.

### Pasos

1. **Vos creás una cuenta en Vercel** (con tu email de SGS) y conectás el repo `Javiasturiasb/sgs-client-hub` (o cuando movamos el código a un repo de SGS, ese).
2. En Vercel, configurar las variables de entorno (ver §2 — son las mismas que tenemos en `.env`):
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Vercel asigna un dominio temporal (ej: `sgs-client-hub.vercel.app`).
4. **En tu DNS de `sgsconsulting.net`** (probablemente Cloudflare, Namecheap, GoDaddy, etc.):
   - Crear un registro **CNAME** llamado `dashboard` (o el nombre que quieras) apuntando a `cname.vercel-dns.com`
5. En Vercel → Project Settings → Domains → agregar `dashboard.sgsconsulting.net` (el dominio que creaste). Vercel verifica el CNAME automáticamente.
6. Ya está. La URL real del dashboard es `dashboard.sgsconsulting.net`.

### TBD

- [ ] ¿Qué subdominio querés usar? (`dashboard.`, `clients.`, `app.`, otro?) → **TBD**
- [ ] ¿Hay alguna política de TI de SGS que requiera hospedar in-house en lugar de Vercel? → **TBD**

---

## 2. Supabase (proyecto de producción)

### Estado actual

El dashboard está conectado al **Supabase de desarrollo de Javi** (`rvxonlgfasbkjdmtidky`). Esto es solo para que Javi pueda iterar sin tocar datos reales. Para producción necesitamos un Supabase de SGS.

### Lo que existe en el Supabase original (Lovable)

El proyecto que originalmente creó Lovable está en `ezccdcxncsivsqtbgcyv.supabase.co`. Ese proyecto:
- Está en una cuenta de Supabase ligada a Lovable (no de SGS).
- Tiene la versión "vieja" del schema (antes de las 11 migraciones que aplicamos en abril 2026).
- **No tiene aplicadas** las migraciones de SOP-00 (intake), SOP-01 (Business Formation), ni SOP-03 (Managed Accounting).

### Recomendación

Creá un **Supabase de SGS** nuevo:

1. **Crear proyecto Supabase** con tu email de SGS.
2. **Aplicar todas las migraciones** que están en `supabase/migrations/` del repo. Hoy son:
   - `20260426...` (varias) — schema base de SOP-00
   - `20260428120000_intake_submissions.sql`
   - `20260428130000_sop00_slice_schema.sql`
   - `20260429154331_sop01_slice_schema.sql`
   - `20260429182958_sop01_acknowledge_service.sql`
   - `20260429200021_sop03_slice_schema.sql`
   - `20260429204940_sop03_semi_annual_report.sql`
   - `20260429205220_sop03_cron_schedulers.sql`

   Se aplican con: `npx supabase db push --include-all` después de hacer `npx supabase link --project-ref <tu-project-ref>`.

3. **Aplicar los seeds** del directorio `supabase/seeds/`:
   - `dev_seed.sql` — admin de prueba + servicios catálogo + clientes ejemplo. **OJO:** esto incluye un usuario admin con email/password por defecto. Antes de abrirlo a producción, cambiá las credenciales y borrá los clientes de prueba.
   - `sop00_onboarding_templates.sql`
   - `sop01_business_formation.sql`
   - `sop03_managed_accounting.sql`

4. **Habilitar la extensión `pg_cron`** en el dashboard de Supabase (Database → Extensions → buscá pg_cron → enable). El último migration intenta habilitarla pero a veces requiere permisos de super-admin que la migración no tiene.

5. **Configurar las URLs de redirect de auth** (importante para el flujo de invitación al portal):
   - Authentication → URL Configuration → agregar `https://dashboard.sgsconsulting.net/auth/callback` a **Redirect URLs**
   - Si todavía no está deployado, agregá también `http://localhost:8080/auth/callback` para dev
   - **Site URL:** `https://dashboard.sgsconsulting.net`

6. **Service role key** (lo necesita la Edge Function `invite-portal-user`): viene auto-disponible en las Edge Functions, no hay que setearla manualmente.

### Variables de entorno que el dashboard espera

```
VITE_SUPABASE_PROJECT_ID="<project-ref>"
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon-key>"
```

(El `SUPABASE_DB_PASSWORD` solo se usa local para CLI; no va a Vercel.)

### TBD

- [ ] ¿Querés que Javi te ayude a setear el proyecto de producción la primera vez? → Sí/No
- [ ] ¿Vamos a migrar los datos del proyecto Lovable original, o empezamos limpio? → **TBD**

---

## 3. GoHighLevel

### Rol de GHL

Por decisión del 2026-04-29, **GHL es el motor de email/SMS y el sistema de pipelines del dashboard.** Esto significa:

1. **Email dispatch:** el dashboard escribe filas en la tabla `email_log` de Supabase con `status='pending'`. GHL las recoge y las despacha (vía sus automation rules). Esto evita correr un servicio paralelo de email (Resend, SendGrid, SMTP custom).

2. **Pipelines:** cada SOP del negocio tiene su pipeline en GHL. El dashboard escribe a `client_services.ghl_pipeline_stage` para indicar en qué etapa va cada servicio del cliente. GHL refleja esa etapa en su UI.

3. **Contactos:** los clientes (filas de `clients` en Supabase) deben mirrorearse como contactos en GHL para que las automatizaciones existentes (SMS de bienvenida, recordatorios, etc.) sigan funcionando.

### Pipelines a crear/conectar en GHL

Cada SOP tiene un pipeline. Los nombres y etapas vienen de los `sop.md` y los `sopNN_design.md`:

| SOP | Nombre del pipeline en GHL | Etapas (sugerencia inicial) |
|-----|----------------------------|-----------------------------|
| SOP-00 | `Client Onboarding` | Submitted → Reviewed → Discovery scheduled → Proposal sent → Paid → Active |
| SOP-01 | `Business Formation & Structure` | Activated → Awaiting docs → Evaluating → With law firm → Kit delivered → Closed |
| SOP-03 | `Managed Accounting & Financial Operations` | Activated → QB setup → Active recurring → Cancelled |
| SOP-04, 05, 06, 07, 09 | Por definir cuando esos SOPs entren en construcción | — |

**Cómo se conecta:** el dashboard escribe a `client_services.ghl_pipeline_stage TEXT` (campo agregado en la migración `20260429154331`). El valor que guardamos ahí es el nombre exacto de la etapa en GHL. La sincronización (vía webhook desde Supabase a GHL) es trabajo de Phase 2 (todavía no construido — Karen dirige cuando estemos listos).

### Despacho de email desde `email_log`

El dashboard ya está escribiendo a `email_log` para todos los emails que componemos. GHL necesita hacer dos cosas:

1. **Detectar nuevas filas** con `status='pending'`. Opciones:
   - **(a) Webhook desde Supabase:** trigger de Postgres que llama a un endpoint de GHL cada vez que se inserta una fila en `email_log`. Más reactivo, requiere más setup.
   - **(b) Polling desde GHL:** un workflow de GHL que cada N minutos llama a la API REST de Supabase para traer filas pendientes. Más simple de configurar.

   Recomiendo **(a) webhook** para producción, pero **(b) polling** está bien para empezar.

2. **Renderizar y enviar el email.** El campo `body` de cada fila de `email_log` ya viene con el HTML completo (variables como `{{client_name}}` ya están sustituidas). GHL puede simplemente despachar ese HTML al `recipient_email`.

3. **Actualizar el status** después del envío:
   - Éxito: `status='sent'`, `sent_at=now()`, `provider_message_id=<el id de GHL>`.
   - Falla: `status='failed'`, `error_message='<descripción>'`.

### Templates de email actualmente en el sistema

| `template_key` | Cuándo se usa | Variables |
|----------------|---------------|-----------|
| `portal_invite` | Bienvenida + magic link | `client_name`, `company_name`, `invite_link` |
| `sop01_kit_delivery` | Entrega del corporate kit | `client_name`, `company_name` |
| `client_query_new` | Nueva pregunta de bookkeeping al cliente | `client_name`, `company_name`, `portal_link`, `question_preview`, `due_in_days` |
| `query_overdue_reminder` | Recordatorio cuando una pregunta está vencida | `client_name`, `portal_link`, `question_preview`, `days_overdue` |
| `quarterly_report_ready` | Reporte trimestral subido al portal | `client_name`, `company_name`, `quarter`, `year`, `quarter_label`, `report_link` |

**Importante:** las variables ya vienen sustituidas en `email_log.body`. GHL no tiene que renderizar nada — solo despachar.

### TBD

- [ ] ¿Las etapas de los pipelines existentes en tu GHL ya están definidas? Si sí, mandalas para que ajustemos los nombres en el dashboard. → **TBD**
- [ ] ¿Webhook (a) o polling (b) para `email_log`? → **TBD**
- [ ] ¿Querés que sincronicemos contactos `clients ↔ GHL contacts`, o que GHL solo lea? → **TBD**

---

## 4. Stripe

### Estado actual

- En `invoices` ya hay un campo `payment_link_url` donde el admin pega el link de Stripe Checkout que crea manualmente.
- El admin marca la factura como pagada manualmente con un botón en el dashboard.
- **No hay integración con Stripe API todavía.** Ni webhook, ni creación automática de payment links.

### Recomendación para v1.5

1. **Crear cuenta Stripe** (si no existe ya para SGS).
2. **Configurar productos** en Stripe que correspondan a los `services` del dashboard:
   - Business Formation & Structure → $500 (one-time)
   - Managed Accounting — 1 Company → $5,000/mes (recurring)
   - Managed Accounting — 2 Companies → $7,500/mes (recurring)
   - Managed Accounting — 3+ Companies → $10,000/mes (recurring)
   - Tax-Season Bookkeeping → $2,000 (one-time)
   - **OJO:** los precios actuales son **placeholders**. Confirmar con Germain antes de crear productos reales.
3. **Webhook hacia Supabase:** cuando un pago se completa en Stripe, dispara una Edge Function que actualiza la fila correspondiente de `invoices` a `status='paid'` y crea una fila en `payments`.
4. **Stripe Checkout integrado en el portal del cliente** (Phase 3) — para que el cliente pueda pagar sin que el admin tenga que mandar el link manualmente.

### Variables de entorno necesarias

```
STRIPE_SECRET_KEY="sk_live_..."   # Solo para Edge Functions
STRIPE_WEBHOOK_SECRET="whsec_..."  # Para validar webhooks entrantes
```

Estas se configuran en **Supabase Edge Function secrets**, no en Vercel:
```
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### TBD

- [ ] ¿Tenés cuenta Stripe activa para SGS? Si sí, ¿en qué moneda y país? → **TBD**
- [ ] Confirmar precios reales con Germain antes de crear productos en Stripe → **TBD**
- [ ] ¿Suscripciones recurrentes para SOP-03 las maneja Stripe Subscriptions, o invoicing manual mensual? → **TBD**

---

## 5. Calendly

### Para qué se usa

- **SOP-00:** sesión de discovery con prospectos.
- **SOP-03:** reunión mensual de revisión contable con Germain.
- **SOP-07:** check-ins recurrentes de asesoría con Abner.

### Estado actual

- El dashboard tiene una tabla `discovery_sessions` (con campo `kind` para distinguir tipo de reunión) que captura las reuniones cuando un admin las loggea manualmente.
- **Edge Function `calendly-webhook` ya construida** (2026-04-30, `supabase/functions/calendly-webhook/index.ts`). Recibe `invitee.created`, identifica al cliente por email, crea automáticamente la fila en `discovery_sessions`. Idempotente: si Calendly reintenta el mismo evento no duplica. Falta solamente: que vos hagas el setup en Calendly (cuenta + event types + webhook subscription) y que configuremos el secret en Supabase.

### Plan

1. **Cuenta Calendly** para Germain, Abner y otros que reciben clientes (probablemente ya existen).
2. Cada uno configura sus event types:
   - Germain: "Reunión mensual de contabilidad" (30 min, recurrente)
   - Abner: "Sesión de discovery" (45 min)
   - Abner: "Check-in de asesoría" (30 min)
3. **En Calendly → Integrations → Webhooks:**
   - URL: `https://<tu-project-ref>.supabase.co/functions/v1/calendly-webhook`
   - Eventos: `invitee.created` (cuando alguien agenda)
   - Header de autenticación: `Authorization: Bearer <CALENDLY_WEBHOOK_SECRET>` para validar
4. **Edge Function `calendly-webhook`** (ya construida): identifica al cliente por email (case-insensitive contra `clients.email`), determina el `kind` por palabras clave en el nombre del event type ("mensual" → `monthly_accounting`, "discovery" → `discovery`, "asesoría" / "checkin" → `advisory_checkin`, default `discovery` con warning en logs), e inserta la fila en `discovery_sessions`. Si el email del invitee no matchea ningún cliente, devuelve 200 OK pero loggea el caso para revisión.
   - **Deploy:** `npx supabase functions deploy calendly-webhook` (Javi en su Supabase de dev; cuando pasemos a producción, lo corrés vos contra el proyecto de SGS).
5. **Embed del Calendly** en el portal del cliente: el cliente puede agendar desde adentro del portal sin salir.

### Variables de entorno necesarias

```
CALENDLY_WEBHOOK_SECRET="..."  # Token de validación que Calendly manda con cada request
```

Se setea con: `npx supabase secrets set CALENDLY_WEBHOOK_SECRET=xxx`.

### TBD

- [ ] ¿Cada miembro del equipo (Germain, Abner) tiene su propio Calendly, o hay uno corporativo? → **TBD**
- [ ] ¿Qué planes de Calendly están activos? (el plan "Free" no permite webhooks; necesitás "Standard" o superior) → **TBD**

---

## 6. Supabase Auth — branding del email de invitación

### Estado actual

Cuando un admin invita a un cliente al portal (botón "Invite to portal" en `AdminClientDetail`), Supabase manda automáticamente un email de invitación. Por defecto ese email viene con el branding genérico de Supabase y un asunto en inglés.

### Recomendación

Personalizar el template en el dashboard de Supabase:

1. **Authentication → Email Templates → Invite User**
2. Editar:
   - **Subject:** `Bienvenido a SGS Consulting Group — configurá tu acceso al portal`
   - **Body (HTML):** versión SGS-branded (logo, colores, copy en español).

3. **Configurar SMTP custom** (opcional pero recomendable):
   - Por defecto Supabase manda desde `noreply@mail.app.supabase.io` y limita a 4 emails/hora en plan gratuito.
   - Si configuramos un SMTP de tu Google Workspace (`noreply@sgsconsulting.net` o similar), los emails llegan más confiables y el límite sube.
   - Authentication → SMTP Settings → setear servidor + credenciales.

### TBD

- [ ] ¿Querés personalizar el email de invitación antes de abrir a clientes reales? → **TBD**
- [ ] ¿SMTP custom de Workspace ahora, o lo dejamos como está hasta que crezca el volumen? → **TBD**

---

## 7. DocuSign — desactivación gradual

### Estado actual

Per los SOPs existentes (SOP-00, SOP-01), la firma digital de contratos hoy se hace por DocuSign. El plan es reemplazarlo por flujos in-portal eventualmente.

### Plan

Por ahora **DocuSign sigue siendo la herramienta de firma**. Cuando avancemos al plano de Phase 3 (mejoras del portal cliente), construiremos:

- Flujo "Firmar contrato" en el portal del cliente.
- Ya sea una integración con HelloSign / Dropbox Sign (más simple) o un sistema casero (más control, más trabajo).

Por ahora **no hay nada que conectes con DocuSign desde el dashboard**.

### TBD

- [ ] ¿Cuándo querés que migremos del flujo DocuSign al in-portal? → **TBD** (Phase 3, no urgente)

---

## Apéndice: variables de entorno

Resumen de TODAS las variables que el sistema necesita en algún momento (no todas al mismo tiempo).

### Vercel (frontend)
```
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

### Supabase Edge Functions (backend)

Las que vienen automáticas (no hay que setearlas):
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
```

Las que hay que agregar manualmente con `npx supabase secrets set`:
```
CALENDLY_WEBHOOK_SECRET    # Cuando configures Calendly (§5)
STRIPE_SECRET_KEY          # Cuando integremos Stripe (§4)
STRIPE_WEBHOOK_SECRET      # Idem
```

### En Supabase dashboard (no son env vars pero se configuran)
- Auth → URL Configuration → Site URL + Redirect URLs (§2)
- Auth → Email Templates (§6)
- Database → Extensions → pg_cron (§2)

---

## Cosas que NO necesitás conectar

Para evitar confusión, esto **NO** te requiere acción:

- **Resend / SendGrid / SMTP de email transaccional:** decidimos no usarlos. GHL es el motor de email.
- **QuickBooks API:** para SOP-03 v1, el dashboard solo trackea status manual ("QuickBooks configurado: ✓"). No hay integración con la API de QB todavía.
- **Firma digital integrada:** DocuSign sigue siendo la herramienta hasta que construyamos el reemplazo en Phase 3.
- **Github Actions / CI:** Vercel maneja el build/deploy automáticamente. No hace falta CI separado.

---

## ⚠️ Pre-prod gates (bloquean producción — resolver antes de salir a clientes reales)

### G1. Encriptar `tin_full` en `client_workers_w9_data` (SOP-04)

**Contexto:** la tabla `client_workers_w9_data` (creada en migración `20260501121841_sop04_slice_schema.sql`) almacena el TIN/SSN/EIN completo del worker en texto plano. Hoy está protegido solo por RLS admin-only — funciona para dev. Para producción, esto es exactamente lo que un audit de seguridad de EE.UU. flaggea como crítico.

**Acción requerida antes de SOP-04 ir a producción:**

1. Decidir esquema de key management (recomendado: Supabase Vault con una key por proyecto, rotación anual; alternativa: KMS externo).
2. Crear nueva migración que:
   - Agrega `tin_full_encrypted BYTEA` (o `tin_full_ciphertext TEXT` si usás Vault)
   - Agrega RPC `encrypt_tin(plaintext TEXT)` y `decrypt_tin(ciphertext, requester_uid UUID)` con `SECURITY DEFINER`
   - Migra todos los `tin_full` plaintext existentes al campo encriptado, después dropea la columna plaintext
   - Recrea `tin_last4` como columna no-generada poblada por trigger antes de encriptar
3. Actualizar el Edge Function `worker-w9-submit` para encriptar antes de insertar.
4. Actualizar la admin UI para usar `decrypt_tin` solo cuando el admin necesita ver el TIN completo (default: mostrar solo last-4).

**Quién:** Karen + Javi (decisión de arquitectura) → migration-author agent (implementación).

**Tracking:** este gate sale de la lista cuando la migración encriptada esté aplicada y los plaintext columns dropeados.

---

## Próximos pasos recomendados (orden sugerido)

1. **Esta semana:** crear el Supabase de producción y aplicar las migraciones (§2). Decidir el subdominio y configurar el DNS (§1). Estos dos desbloquean todo lo demás.
2. **Próxima semana:** definir las etapas de los pipelines en GHL para SOP-00, SOP-01, SOP-03 (§3). Compartir con Javi para que las codifique en el dashboard.
3. **Cuando estés lista:** Calendly webhook (§5) — es la pieza más chica y desbloquea self-scheduling. Javi tiene el Edge Function listo para construir cuando vos hayas configurado los webhooks de Calendly.
4. **Cuando Stripe esté en regla:** integración de pagos (§4). Esto cierra el ciclo de SOP-00/SOP-01 sin intervención manual.
5. **Phase 3 (lejano):** DocuSign replacement, Stripe Checkout in-portal, etc.

---

¿Preguntas? Cualquier duda, dale ping a Javi y revisamos juntos. Este documento se va actualizando a medida que cerramos secciones — cuando algo esté hecho, marcalo como completado y agregá una nota.
