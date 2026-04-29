# SOP-01 Business Formation & Structure — Dashboard Design

**Status:** Design **LOCKED** as of 2026-04-29 with Abner. Karen still needed for GHL §7. Implementation can start.
**Reference:** `Processos_internos/01_formacion_empresarial/sop.md`
**Pipeline (GHL):** `Business Formation & Structure`
**Last updated:** 2026-04-29

---

## Quick reference — what we're building

| Area | Decision |
|------|----------|
| Activation | Two paths: from SOP-00 discovery, or as standalone request from existing client |
| Step 1 intake | Free-form document upload — no fixed checklist |
| Step 1 (no existing entity) | Short questionnaire form for clients forming from scratch |
| Internal evaluation | Not recorded in dashboard — Abner does this in his head **(pain point logged)** |
| Law firm comms | Email, same firm every time, ~5–10 business days turnaround |
| Corporate kit | Multiple files (articles + bylaws/op.agreement + stock ledger + initial resolutions + EIN letter) |
| Kit storage | Supabase Storage (dashboard is source of truth); Drive optional copy |
| Delivery email | Dashboard sends a template Abner edits before sending — **new infrastructure needed** |
| Closure | Client clicks "Acknowledge" in portal → service closes |
| Closure artifact | Formal completion certificate (signed/branded) — **needs generation or template** |
| Pricing | Standard $500 USD, billed upfront before law firm work starts |
| GHL pipeline | Stages and custom fields → still to confirm with Karen |

---

## How to use this doc

1. ✅ Javi takes questions to Abner (verbal sync 2026-04-29 — done).
2. ✅ Answers captured below + in Decision log at the bottom.
3. Karen still needs to answer §7 (GHL); doesn't block implementation, only Phase 2 wiring.
4. Implementation starts next session.

---

## 1. Service activation (when SOP-01 starts)

### 1.1 How does Abner know a client needs SOP-01?

**Decision:** **C — both paths supported.**
- **(a) From onboarding (SOP-00):** during the discovery session, if the client lacks a corporate structure or wants to restructure, Abner activates "Business Formation & Structure" service in `AdminClientDetail → Services`.
- **(b) Standalone request:** an existing active client emails or calls Abner asking to restructure → Abner activates the service the same way.

**Build implication:** No new UI — reuses existing service-activation flow built in Phase 1.

**Status:** ✅ ANSWERED — Abner, 2026-04-29

---

## 2. Step 1 — Current structure intake

### 2.1 What documents does the client send?

**Decision:** **B — free-form upload, no fixed checklist.** Client uploads whatever they have; admin sees what came in. No mandatory document list.

**Build implication:** Add a "current structure documents" request action that reuses the existing client-document-upload UX. New document category `current_structure` (or reuse generic `legal`). Admin requests → client sees an actionable card on their dashboard until upload → no validation on file count or types.

**Status:** ✅ ANSWERED — Abner, 2026-04-29

### 2.2 What if the client doesn't have a current structure (forming from scratch)?

**Decision:** **A — short questionnaire form.**

**Form fields (locked):**
- Owner(s) and ownership %
- State of operation
- Type of business preference (LLC / C-Corp / S-Corp / undecided)
- Industry
- Anticipated revenue / employees in year 1

**Build implication:** New `business_profile` table (or JSON column on `client_services`) capturing this for clients who selected "form from scratch" at activation. Form is shown in client portal as part of Step 1 instead of (or alongside) document upload.

**Status:** ✅ ANSWERED — Abner, 2026-04-29

---

## 3. Step 2 — Evaluation & design (internal)

### 3.1 Does Abner record the evaluation?

**Decision:** **C — no record.** Abner evaluates mentally; nothing captured in the dashboard.

**Build implication:** The "Evaluate and design new structure" task is just a checkbox the admin marks done. No notes field, no captured artifact for this step.

**🚨 Pain point logged** to `Processos_internos/pain_points.md` — the rationale for a structure recommendation is not preserved anywhere. If Abner is unavailable, the reasoning behind a client's structure is gone. Suggested mitigation in pain-points doc.

**Status:** ✅ ANSWERED — Abner, 2026-04-29

---

## 4. Step 3 — Law firm coordination (third-party)

### 4.1 How does Abner communicate with the law firm?

**Decision:** **A — email.**

**Build implication:** Internal-only task with fields:
- Firm name (preset to the standing firm)
- Brief sent on (date)
- Last contact (date)
- Next-touch deadline (date)
- Outcome / received-on (date + uploaded artifact)

No portal/integration with the firm. Just admin-side tracking.

**Status:** ✅ ANSWERED — Abner, 2026-04-29

### 4.2 Is the law firm always the same one?

**Decision:** **A — single standing relationship.**

**Build implication:** Firm name hardcoded in admin views (or stored in a settings table); client never sees it. No `legal_partners` lookup table needed for v1.

**Status:** ✅ ANSWERED — Abner, 2026-04-29

### 4.3 Typical law firm turnaround?

**Decision:** **B — 5–10 business days.**

**Build implication:** `service_task_templates.default_due_offset_days = 10` for the "Coordinate with law firm" task (gives a buffer at the long end). Tasks past due flag yellow/red.

**Status:** ✅ ANSWERED — Abner, 2026-04-29

---

## 5. Step 4 — Corporate kit delivery

### 5.1 What's inside a corporate kit?

**Decision:** **A — full standard package.** Articles + bylaws/operating agreement + stock ledger + initial resolutions + EIN letter.

**Build implication:** Five expected document subtypes inside the `corporate_kit` category. Admin uploads each; client portal lists them under "Corporate Kit" section, grouped by type.

**Status:** ✅ ANSWERED — Abner, 2026-04-29

### 5.2 Bundled or multiple files?

**Decision:** **A — multiple separate files.**

**Build implication:** No special bundling. Each kit document is a separate `documents` row with category `corporate_kit`; client portal shows them as a list/grid.

**Status:** ✅ ANSWERED — Abner, 2026-04-29

### 5.3 Storage location going forward?

**Decision:** **A — Supabase Storage (dashboard is source of truth).** Google Drive is optional secondary.

**Build implication:** Use existing `client-documents` Supabase Storage bucket. New document category `corporate_kit` added to `document_category` enum (migration needed). No `external_url` field needed.

**Status:** ✅ ANSWERED — Abner, 2026-04-29

### 5.4 Does the dashboard send the personalized email?

**Decision:** **B — yes, dashboard has an email template Abner edits and sends.**

**Build implication (significant — new infrastructure):**
- New table `email_templates` with rows for each templated email type (start with `sop01_kit_delivery`).
- Edge Function `send-templated-email` that takes a template + variables + recipient and sends via an email provider (Resend recommended — free tier, simplest setup).
- Admin UI: "Send kit delivery email" button on the SOP-01 service card → opens a dialog with the template body pre-filled (variables substituted), Abner edits, clicks Send.
- Track sends in a new `email_log` table or as `documents` rows with category `email_log`.

**Scope flag:** This is non-trivial. Recommendation: build it as a reusable component since other SOPs will want it too. ~1.5 sessions estimated.

**Status:** ✅ ANSWERED — Abner, 2026-04-29

---

## 6. Step 5 — Closure

### 6.1 How does the client confirm receipt?

**Decision:** **A — "Acknowledge" button in the client portal.**

**Build implication:**
- New field `client_services.acknowledged_at TIMESTAMPTZ` (migration needed).
- Client portal: SOP-01 service card shows an "Acknowledge & close" button when status is "delivered, awaiting acknowledgment."
- Click → confirmation dialog → timestamp saved, service status flips to closed.
- Admin sees the status change in real time.

**Status:** ✅ ANSWERED — Abner, 2026-04-29

### 6.2 Closure artifact?

**Decision:** **B — formal completion certificate (signed/branded).**

**Build implication (significant — new infrastructure):**
- A branded certificate document is produced and shared with the client at closure.
- **v1 simple path:** Pre-made certificate template (Word/PDF) that Abner fills out manually and uploads as a `documents` row with new category `completion_certificate`. The "Acknowledge" button in §6.1 only appears once Abner has uploaded the certificate.
- **v1.5 path:** Auto-generate the certificate PDF from a template + client metadata + Abner's signature image. Defer to v1.5 unless Abner wants it now.

**Recommendation:** Start with v1 simple path (manual upload). Move to auto-gen if it becomes a bottleneck.

**Status:** ✅ ANSWERED — Abner, 2026-04-29 (v1 manual / v1.5 auto-gen split is a Claude proposal — confirm with user)

---

## 7. GHL pipeline mapping — STILL OPEN (Karen)

### 7.1 GHL pipeline stages?

**Status:** ⏳ OPEN — pending Karen.

**Working assumption (placeholder):**
1. New request received
2. Awaiting client structure docs (or questionnaire)
3. Evaluating structure
4. With law firm
5. Kit uploaded
6. Email sent / awaiting acknowledgment
7. Closed

**Build implication:** Phase 1b implementation leaves a `ghl_pipeline_stage TEXT` field on `client_services` and emits stage-change events ready for Phase 2 webhook wiring. Once Karen confirms stages, we map them.

### 7.2 GHL custom fields?

**Status:** ⏳ OPEN — pending Karen. **Build implication:** No fields needed unless Karen specifies. Pipeline stage alone is enough for Phase 1b.

---

## 8. Pricing & billing

### 8.1 Standard or per-case price?

**Decision:** **B — standard fixed $500 USD.**

**Build implication:** Update `services` row for "Business Formation & Structure" with `base_price = 500.00`. Activation auto-creates an invoice with this amount as default; admin can override per case.

**Status:** ✅ ANSWERED — Abner, 2026-04-29

### 8.2 When is SOP-01 billed?

**Decision:** **A — upfront. Invoice at activation, payment before law firm work starts.**

**Build implication:**
- On service activation, dashboard auto-generates an invoice (status: `sent`) with the $500 line item.
- The "Coordinate with law firm" task is **gated** — admin cannot mark it active until `invoices.status = 'paid'` for the related invoice.
- Visual: gating shown as a lock icon + tooltip "Awaiting payment" on the task.

**Status:** ✅ ANSWERED — Abner, 2026-04-29

---

## 9. Implementation summary (locked)

### v1 (this slice — ~2–4 sessions)

**Database changes (one migration):**
- Add `corporate_kit`, `current_structure`, `completion_certificate` values to `document_category` enum.
- Add `acknowledged_at TIMESTAMPTZ` to `client_services`.
- Add `ghl_pipeline_stage TEXT` to `client_services` (placeholder for Phase 2).
- New `business_profile` table (or JSONB column on `client_services`) for §2.2 questionnaire.
- New `email_templates` table.
- New `email_log` table (for §5.4 tracking).
- Update `services` row: "Business Formation & Structure" price = $500.
- Seed `service_task_templates` for SOP-01 (6 tasks below).

**SOP-01 task templates (seeded into `service_task_templates`):**
1. *Request current structure docs (or questionnaire)* — high priority, due +1d
2. *Confirm payment received* — high, gates step 3 — due +3d
3. *Evaluate structure & coordinate with law firm* — high, due +5d
4. *Track law firm response* — medium, due +14d
5. *Upload corporate kit + send delivery email* — high, due +16d
6. *Upload completion certificate + await client acknowledgment* — medium, due +18d

**UI work:**
- Admin: SOP-01 service card on `AdminClientDetail` with status, third-party-tracking fields (firm name, sent/received dates), kit upload section, certificate upload, "Send kit email" button (opens template dialog).
- Client: portal section showing requested documents → questionnaire form (if applicable) → kit downloads → "Acknowledge" button.
- Reusable: `RequestDocuments` admin action, `DeliverableSection` client component, `SendTemplatedEmail` dialog.

**Email infrastructure (new):**
- Resend integration via Supabase Edge Function.
- One template seeded: `sop01_kit_delivery`.
- API to send templated emails reused by future SOPs.

### v1.5 (deferred — proposed but not locked)

- Auto-generate completion certificate PDF from template + client data.
- Variable substitution in email templates (richer than v1).
- GHL webhook integration (this is Phase 2 anyway).

---

## Decision log

| Date | Section | Decider | Answer (verbatim from Abner verbal sync) |
|------|---------|---------|------------------------------------------|
| 2026-04-29 | §1.1 | Abner | Both paths — onboarding and standalone request |
| 2026-04-29 | §2.1 | Abner | Free-form upload, no checklist |
| 2026-04-29 | §2.2 | Abner | Short questionnaire for new companies |
| 2026-04-29 | §3.1 | Abner | No record — evaluation done mentally |
| 2026-04-29 | §4.1 | Abner | Email |
| 2026-04-29 | §4.2 | Abner | Always same firm |
| 2026-04-29 | §4.3 | Abner | 5–10 business days |
| 2026-04-29 | §5.1 | Abner | Full standard package (5 docs) |
| 2026-04-29 | §5.2 | Abner | Multiple separate files |
| 2026-04-29 | §5.3 | Abner | Supabase Storage; Drive optional |
| 2026-04-29 | §5.4 | Abner | Yes, dashboard sends with editable template |
| 2026-04-29 | §6.1 | Abner | Acknowledge button in client portal |
| 2026-04-29 | §6.2 | Abner | Formal completion certificate (signed/branded) |
| 2026-04-29 | §8.1 | Abner | $500 standard fixed price |
| 2026-04-29 | §8.2 | Abner | Upfront, before law firm work |
| TBD | §7.1 | Karen | _pending_ |
| TBD | §7.2 | Karen | _pending_ |
