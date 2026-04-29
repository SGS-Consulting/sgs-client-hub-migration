# SOP-01 Business Formation & Structure — Dashboard Design

**Status:** Drafting questions for Abner. **No code yet** — implementation starts after answers are captured below.
**Reference:** `Processos_internos/01_formacion_empresarial/sop.md`
**Pipeline (GHL):** `Business Formation & Structure`
**Last updated:** 2026-04-29

---

## How to use this doc

1. Javi reviews the questions below.
2. Javi takes them to **Abner** (sole runner of SOP-01) — async (email) or in a 30-min sync.
3. Each answer is captured inline below, with the date and Abner's confirmation.
4. Once every "OPEN" item flips to "ANSWERED," we start implementation.

The questions are written so Abner can react to a default proposal rather than answer open-ended — faster and produces sharper decisions. Each item: **proposed default** + **what we'd build if confirmed** + **what changes if not.**

---

## 1. Service activation (when SOP-01 starts)

### 1.1 How does Abner know a client needs SOP-01?

**Default proposal:** Two paths, both supported.
- **(a) From onboarding (SOP-00):** during the discovery session, if the client lacks a corporate structure or wants to restructure, Abner activates "Business Formation & Structure" service in `AdminClientDetail → Services`.
- **(b) Standalone request:** an existing active client emails or calls Abner asking to restructure → Abner activates the service the same way.

**If confirmed:** no new UI — reuses the existing service-activation flow built in Phase 1.
**If different:** we may need a "Request this service" client-side action, or a separate intake flow for prospects who only want SOP-01 (not full onboarding).

**Status:** OPEN

---

## 2. Step 1 — Current structure intake

The SOP says: *"Abner solicita al cliente que envíe su estructura de entidad actual."* This is vague; the dashboard needs to capture **what** the client sends.

### 2.1 What documents does the client typically send?

**Default proposal:** Three categories, all uploaded by client to a "Current structure" section in their portal:
- Articles of incorporation / formation documents (PDF)
- Operating agreement or bylaws (PDF)
- Recent IRS letter showing EIN (PDF or image)
- Optional: prior tax returns (last 1–2 years), if they're forming a holding for an existing entity

**If confirmed:** Build a "Document request" UX — admin requests these specific document types; client sees a checklist on their portal until uploaded.
**If different:** Abner specifies the exact list; we adjust the request template.

**Status:** OPEN

### 2.2 What if the client doesn't have a current structure (forming from scratch)?

**Default proposal:** Then Step 1 collapses to a short questionnaire — no docs to upload. Form fields:
- Owner(s) and ownership %
- State of operation
- Type of business (LLC / C-Corp / S-Corp / etc. — preference, if any)
- Industry
- Anticipated revenue / employees in year 1

**If confirmed:** Build a small "Business profile" form for the client to complete instead of upload.
**If different:** Abner gives us the right questionnaire fields, OR we just tell the client "send Abner an email" and handle it outside the dashboard for v1.

**Status:** OPEN

---

## 3. Step 2 — Evaluation & design (internal)

The SOP says: *"Abner evalúa la situación y determina cuál sería la estructura más eficiente."* This is internal-only (client doesn't see it).

### 3.1 Does Abner record the evaluation in any structured way?

**Default proposal:** A free-form internal notes field on the SOP-01 service record in the dashboard. Just a textarea labeled "Structure evaluation — internal." Captures Abner's analysis before law-firm coordination.

**If confirmed:** Add a `service_notes` table or an `internal_notes` text field on `client_services`; only admins see it.
**If different (e.g., Abner uses a structured framework):** we capture the framework as fields. Or if Abner does this entirely outside the dashboard, we skip and just track "evaluation done" as a task checkbox.

**Status:** OPEN

---

## 4. Step 3 — Law firm coordination (third-party)

This is the most ambiguous step. The SOP says Abner works with the law firm; the dashboard needs to show **status without exposing the firm to the client.**

### 4.1 How does Abner currently communicate with the law firm?

**Default assumption:** email — Abner emails the firm with the client's structure info; firm replies with the new structure document. No shared portal.

**If confirmed:** dashboard tracks this as an internal-only task with fields:
- Firm name (preset to the standard firm)
- Brief sent on (date)
- Last contact (date)
- Next-touch deadline (date)
- Outcome / received-on (date + uploaded artifact)

**If different (e.g., they use a shared Drive folder, or the firm has its own portal):** we may need to add a link/reference field, or skip dashboard tracking entirely for this step.

**Status:** OPEN

### 4.2 Is the law firm always the same one?

**Default assumption:** yes — single standing relationship, name is internal info.

**If confirmed:** firm name is hardcoded in admin views; client never sees it.
**If different:** add a `legal_partners` lookup table.

**Status:** OPEN

### 4.3 What's the typical turnaround time the law firm gives?

**Why we need this:** to set the default due-date offset on the "Coordinate with law firm" task and to flag overdue cases.

**Status:** OPEN — Abner gives a number of business days.

---

## 5. Step 4 — Corporate kit delivery

The SOP says: *"Abner entrega al cliente un corporate kit con toda la documentación de la nueva estructura empresarial."*

### 5.1 What goes inside a corporate kit?

**Default assumption (based on SGS glossary + general practice):**
- Articles of incorporation/formation (filed with the state)
- Bylaws or operating agreement
- Stock/membership ledger
- Initial resolutions
- EIN confirmation letter
- Optional: stock certificates (if C-Corp)

**Why we need this:** to know what document categories to surface in the client portal, and whether the kit is one bundled PDF or multiple files.

**Status:** OPEN

### 5.2 One bundled PDF, or multiple files?

**Default proposal:** Multiple files, surfaced in the client portal under a "Corporate Kit" section grouped by document type. A bundled PDF is also fine — admin uploads it to the same section, client sees it as a single deliverable.

**If confirmed:** No special UX — just a `corporate_kit` document category; staff uploads however many files they have.
**If different:** Abner tells us the format Abner uses today.

**Status:** OPEN

### 5.3 Where are kits stored today, and where should they live going forward?

**Per Processos_internos `_reference/tools.md`:** Google Drive is current document storage. The dashboard uses Supabase Storage (`client-documents` bucket).

**Default proposal:** Going forward, kits live in Supabase. Admin uploads via dashboard; client downloads via portal. Drive copies are optional but no longer the source of truth.

**If different:** Karen / Abner may want the source of truth to stay in Drive (with the dashboard storing only a Drive link). We can support that with a `external_url` field on documents.

**Status:** OPEN

### 5.4 The personalized email — does the dashboard send it?

The SOP explicitly mentions a "correo personalizado." Two options:

- **(a) Dashboard sends it:** template + admin-edited body, dashboard handles delivery.
- **(b) Dashboard tracks "email sent" as an action:** admin sends the email from Gmail/whatever they normally use, then marks "email sent" in the dashboard. Email body lives outside.

**Default proposal:** (b) for v1 — too much tooling to build (a) just for one email type. When we build the broader notifications/email-templates feature later (Phase 3 area), (a) becomes available everywhere.

**If different:** Abner wants (a) and we prioritize email templating sooner.

**Status:** OPEN

---

## 6. Step 5 — Closure

The SOP says: *"Una vez que el cliente confirma haber recibido y entendido la nueva estructura, se cierra el servicio."*

### 6.1 How does the client confirm understanding?

**Default proposal:** A simple "Acknowledge receipt" button in the client portal next to the corporate kit. Clicking it timestamps the acknowledgment + flips the service status to closed.

**If confirmed:** New `client_services.acknowledged_at` field; closure is two-sided (client clicks, admin sees the status change).
**If different (e.g., Abner wants a phone-call confirmation):** the closure stays admin-driven — admin marks closed after talking to the client.

**Status:** OPEN

### 6.2 Is there an artifact at closure (signed acknowledgment, certificate)?

**Default assumption:** No. Closure is just a status change.

**If different:** if Abner wants a closure receipt PDF generated, we add that as a separate doc.

**Status:** OPEN

---

## 7. GHL pipeline mapping

Karen needs the dashboard to keep GHL in sync. SOP-01 maps to the GHL pipeline `Business Formation & Structure`.

### 7.1 What are the stages of that GHL pipeline?

**Default proposal (placeholder — Karen confirms):**
1. New request received
2. Awaiting client structure docs
3. Evaluating structure
4. With law firm
5. Kit delivered
6. Closed

**Why we need this:** the dashboard needs to know which task-completions map to which pipeline stage advances. Phase 2 (GHL bridge) will wire the actual webhooks; Phase 1b only needs the *mapping table*.

**Status:** OPEN — needs **Karen** to share the actual GHL stages.

### 7.2 What custom fields on the GHL contact reflect SOP-01 state?

**Default assumption:** None today, beyond the pipeline stage. Karen would create custom fields if/when we wire the bridge.

**Status:** OPEN — Karen confirms or specifies fields.

---

## 8. Pricing & billing

### 8.1 Is SOP-01 priced per case or fixed?

The team-level pricing model says recurring services are $5,000/month and one-time services are case-by-case (Abner sets the price). SOP-01 is one-time.

**Default proposal:** Admin enters the agreed price when activating the service for a client. Dashboard generates an invoice line item; payment uses the same Stripe-link flow as SOP-00.

**If different:** Abner has a standard price; we set a default `services.base_price`.

**Status:** OPEN

### 8.2 When is SOP-01 billed?

**Default proposal:** Upfront — invoice generated on service activation; client must pay before the law-firm coordination kicks off.

**If different:** 50/50 (activation + delivery), or net-30 after delivery.

**Status:** OPEN

---

## 9. Implementation summary (filled in after answers)

Once questions above are resolved, this section captures what we're building:

- New `service_task_templates` rows for SOP-01 (5–6 tasks per the slice steps)
- (Optional) `internal_notes` field on `client_services` if §3.1 confirms internal-notes UI
- (Optional) `acknowledged_at` field on `client_services` if §6.1 confirms client acknowledgment
- (Optional) Document category `corporate_kit` if §5.2 confirms grouped delivery
- (Optional) `external_url` on documents if §5.3 keeps Drive as source of truth
- Admin UI: SOP-01 service card on `AdminClientDetail` with status, internal notes, third-party-tracking fields
- Client UI: portal section showing requested documents (Step 1) → kit deliverables (Step 4) → acknowledgment button (Step 5)
- GHL pipeline mapping table (per §7.1)

---

## Decision log

(append answers here as Abner / Karen respond — date + decider + verbatim answer + which question it resolves)

| Date | Question # | Decider | Answer |
|------|------------|---------|--------|
|      |            |         |        |
