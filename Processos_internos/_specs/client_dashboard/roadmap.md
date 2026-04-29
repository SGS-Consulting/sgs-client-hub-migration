# SGS Client Hub — Roadmap

**Last updated:** 2026-04-29
**Status:** Phase 1 (SOP-00) deployed end-to-end on Javi's working Supabase. Phase 1b targets **SOP-01** next.
**Owner:** Karen (project lead). Javi contributing to v1.

**Working topology (as of 2026-04-29):** Javi develops on his own GitHub fork (`Javiasturiasb/sgs-client-hub`) + his own Supabase project (`rvxonlgfasbkjdmtidky`). Karen reviews from `soporteit-oss/sgs-client-hub` (kept as `upstream` remote) and applies the same migrations to the production Supabase on her side. See `Processos_internos/_meetings/open_questions.md` for the still-open question of whether Lovable stays in the loop.

---

## North star

A two-sided system where:
- **Client side** is the trigger surface — clients ask for things (sign contract, upload doc, request consult, pay invoice, see status).
- **Internal side** is the engine — staff fulfills requests, runs SOPs, manages projects.
- **GHL** is the bridge — pre-existing automations stay alive while the dashboard absorbs operational truth over time.

Built so SGS can run all 9 active SOPs from one place, with room for new services (SOP-08 still TBD).

---

## Vision (end state — what Phase 3 delivers)

The finished prospect-to-client journey, all in the dashboard:

1. Prospect submits the **public intake form** at `/intake` (no account yet — lowest friction).
2. SGS staff reviews and converts the submission to a client record + sends a portal invite.
3. Prospect creates a portal account via the invite link.
4. Prospect lands on the portal: **full layout visible, but most tabs locked behind "available after payment"** (preview pattern — they see everything they'll get). Active surface: discovery scheduling, proposal viewing, payment, support.
5. Prospect self-schedules the discovery session (**Calendly** embed).
6. Staff prepares the proposal **presentation** (manual upload for v1; future AI-agent-generated).
7. Prospect reviews the proposal in the portal.
8. Prospect pays via **Stripe**.
9. On payment, the portal unlocks: full dashboard with tasks, documents, invoices, services, support.

**Phase 1 simulates this flow staff-side** — no prospect portal yet; staff handles steps 2–8 via email + admin tools. Phase 1 entities are shaped to slot under the prospect portal in Phase 3 without reshaping the data.

**Locked-in tooling (decided 2026-04-28):**
- **Intake:** public, anonymous form. Account creation comes after staff invites.
- **Pre-payment portal:** full layout, locked tabs (preview pattern).
- **Self-scheduling:** Calendly.
- **Proposal:** presentation document (PDF/PPTX/Slides), manual upload for v1, AI-agent-generated long-term.
- **Payments:** Stripe.

---

## Design principle: client-demand activation

**Every internal feature must trace back to a specific client trigger — real or, for v1, staff-simulated.**

Examples:
- Internal *invoice creation* is triggered by *client signs proposal* → in v1 staff manually files this; Phase 3 makes it self-service.
- Internal *task list for new client* is triggered by *client requests onboarding* → in v1 the intake form is the trigger; staff converts the submission to a client and activates services.

This keeps the internal dashboard from drifting into generic PM software with a "we'll wire it up later" backlog. If a feature doesn't have a client trigger, it doesn't ship in v1.

---

## Why this sequence

User's call: internal first, then GHL bridge, then improved client side.

1. **Internal first** — client requests need somewhere to land. Building the client surface first creates a request black hole.
2. **GHL bridge in the middle** — keeps existing operations alive while we transition.
3. **Client side last** — benefits from validated internal workflows; we know what to expose because we know what we can fulfill.

---

## Phase 1 — SOP-00 vertical slice

**Goal:** end-to-end run of one new prospect through the full onboarding flow, all in the dashboard, no email/spreadsheet fallback.

**Slice definition (testable steps):**
1. Prospect submits public `/intake`. **(✓ done 2026-04-28)**
2. Staff reviews submission in admin/intake review screen.
3. Staff converts → creates `clients` row, links submission via `converted_client_id`.
4. Staff emails Calendly link; prospect books discovery; staff logs the session.
5. Staff prepares the proposal presentation, emails it to the prospect, and uploads it to `documents` (category=`proposal`).
6. Staff generates a Stripe payment link and emails it to the prospect.
7. Prospect pays via the Stripe link; staff records the payment.
8. Staff activates the first service for the client → auto-creates the standard tasks.
9. Staff sends welcome email and invites the client to the portal (creates the auth user, links `clients.user_id` on signup).

**Gaps to fill (each maps to a slice step):**
- *Step 2:* admin-side intake submissions review screen.
- *Step 3:* "Convert to client" action — creates `clients` row, links submission via `converted_client_id`.
- *Step 4:* `discovery_sessions` table (new) — fields for scheduled time, attendees, outcome notes, optional Calendly event ref.
- *Step 5:* add `proposal` value to `document_category` enum.
- *Steps 6–7:* `payment_link_url` field on invoices so staff can paste the Stripe link; v1 records payment manually, Phase 3 wires the Stripe webhook.
- *Step 8:* service activation triggers task creation; task templates per service (DB-backed).
- *Step 9:* portal-invite action — sends magic-link / signup invite, links `clients.user_id` on signup.

**Open decisions for Phase 1:**
- Task templates in DB or JSON in code? Lean DB.
- Onboarding view: kanban or table? Lean table — staff wants sortable columns + bulk actions, not card drag.
- Discovery session tracking: new `discovery_sessions` table or reuse `tasks`? Lean new table — discovery sessions have unique fields (Calendly event, attendees, outcome) that don't fit the task model.
- Stripe surface in v1: just store the payment-link URL on the invoice, or stand up the Stripe API now? Lean store-the-link — keeps Phase 1 lean; full Stripe Checkout + webhook integration is Phase 3.

**Done when:** A real new prospect has been moved through all 9 slice steps in the dashboard, by SGS staff, without phone tag or external tools (email for the welcome message is fine).

**Review with Karen before starting:** scope of the slice, contract handling for v1, any tools she wants integrated.

---

## Phase 1b — SOP-01 vertical slice (locked in 2026-04-29)

**Target:** SOP-01 Business Formation & Structure. Decided over SOP-03 because SOP-01 is the simplest workflow (4 steps, single internal actor, single deliverable) and it sits naturally adjacent to onboarding. Building it second — and *building it to be reusable* — establishes the per-SOP slice mechanics for everything that follows.

**Goal:** end-to-end run of one client through SOP-01 inside the dashboard, mirroring the Phase 1 pattern: activate service → tasks spawn → docs collected → kit delivered → service closed → GHL pipeline reflects current stage.

**Slice definition (testable steps):**
1. Staff activates "Business Formation & Structure" service for a client (existing service-activation flow from Phase 1, with a new task-template set).
2. Task: *"Request current entity structure from client."* Client uploads via portal documents (category TBD — see design questions); status moves forward when documents land.
3. Task: *"Evaluate and design new structure."* Internal-only task, captures Abner's evaluation as notes/document.
4. Task: *"Coordinate with law firm."* Internal-only task tracking the third-party hand-off — outbound brief sent, awaiting return.
5. Task: *"Deliver corporate kit + send personalized email."* Staff uploads kit document(s) → sends a personalized email (template + manual edits) → marks delivered.
6. Task: *"Confirm client received and close service."* Client acknowledges (via portal action — exact mechanism TBD) → service closes.
7. **Throughout:** GHL pipeline `Business Formation & Structure` advances as task statuses change (Phase 2 will wire this; Phase 1b leaves the right hooks in place).

**Open design questions:** captured in `sop01_design.md` (this folder). Javi takes them to Abner before we start.

**Reusable mechanics this slice should establish (so SOP-03/04/07/etc. inherit them):**
- Task templates per service, with ordering, default priorities, default due offsets — already in place from Phase 1; SOP-01 templates seeded similarly.
- Internal-only vs client-visible task flag — needed so client doesn't see "Coordinate with law firm" tasks.
- Third-party-coordination block on internal tasks — fields for "external party," "sent on," "received on," "next-touch-by."
- Client document-request UX — admin requests a specific doc category; client sees an actionable card on their dashboard until upload.
- "Deliverable handoff" pattern — a special document category (e.g. `corporate_kit`) that, when uploaded by staff, triggers a client-facing notification + portal section.
- Service-closure action — admin marks service complete; client gets a closure confirmation request; close finalizes when client acks.

**Don't pre-design SOP-03/04/07 yet.** SOP-01 will surface the right shape for the reusable mechanics; the others slot into that shape.

---

## Per-SOP slice template (use this for every new SOP)

Each SOP slice should produce, in this order:

1. **Read the SOP** in `Processos_internos/NN_*/sop.md`. Note steps, actors, third parties, GHL pipeline name.
2. **Open `_meetings/open_questions.md`** — surface anything blocking before we start.
3. **Draft `_specs/client_dashboard/sopNN_design.md`** with concrete design questions (UX, data, GHL mapping, billing). Javi takes them to the responsible team member.
4. **Resolve decisions** — each answer captured in the design doc with date + decider's name.
5. **Update task templates** — add the SOP's standard tasks to `service_task_templates` (via a migration if templates are part of seed; via SQL seed if dev-only).
6. **Build the slice** — usually new task-flow UI, document-collection UX, deliverable-handoff. Reuse mechanics; don't reinvent.
7. **Smoke-test end-to-end** on dev Supabase with the test admin.
8. **Update roadmap** — mark slice done in "What's done," capture lessons for the next SOP.
9. **Hand off to Karen** for verification — open PR from Javi's fork or share branch link.

Aim: each SOP slice ~1–3 sessions. If a slice balloons past that, peel out a sub-slice or surface a blocker.

**Recurring vs one-time SOPs.** SOP-01/02/09 are one-time (clear closure). SOP-03/04/07 are recurring (no closure; cadence-driven). Recurring SOPs need extra mechanics: scheduling (monthly meeting, quarterly review), recurring task spawning, per-period artifacts. Don't build these until we have a recurring SOP in front of us — likely SOP-03 next after SOP-01.

---

## Phase 2 — GHL bridge

**Goal:** Karen can wire the dashboard to GoHighLevel so existing GHL automations (email/SMS sequences, contact records, pipeline views) keep firing while the dashboard becomes operational truth. **GHL is not the payment processor — Stripe is. GHL IS the email/SMS dispatch service** (decision 2026-04-29) — the dashboard composes templated emails and queues them in `email_log` with `status='pending'`; GHL picks them up and delivers. This avoids running a separate email service (Resend, custom SMTP, etc.) alongside GHL.

**Deliverables:**
- **Data flow decision doc** — for each entity (intake submission, client, task, invoice, document), decide: dashboard-of-record, GHL-of-record, or two-way sync. Surface trade-offs.
- **Mapping table** — Supabase columns ↔ GHL contact custom fields, pipeline stages, etc.
- **Webhook endpoints** — Supabase Edge Functions that GHL can POST to (and that we trigger on dashboard events). At minimum: new intake submission, new client, status change.
- **Email dispatch from email_log** — GHL polls or is webhook-pinged whenever a row lands in `email_log` with `status='pending'`. GHL's automation sends the email and updates the row to `status='sent'` (with provider_message_id). This replaces the Resend/SMTP path that would otherwise have lived in an Edge Function.
- **Karen's runbook** — step-by-step in the GHL UI: create custom fields, set up webhooks, build the pipeline mirror, test end-to-end.
- **Test scenario** — one full end-to-end: prospect submits `/intake` → contact appears in GHL → email automation fires (via email_log entry) → pipeline stage advances when status changes in dashboard.

**Open decisions:**
- Direction of truth for contact data: dashboard or GHL? Has implications for Phase 3.
- Sync mechanism: webhooks (event-driven), scheduled polls, or both?
- Auth for the webhook endpoints (signed secret, GHL OAuth, etc.).

**Done when:** A new intake submission flows automatically into GHL with the right tags/pipeline stage, AND status updates in the dashboard reflect in GHL within a known SLA.

**Review with Karen before starting:** all decisions above; she owns the GHL relationship.

---

## Phase 3 — Client dashboard improvements

**Goal:** clients self-serve workflows that today require a phone call. Each self-serve action triggers internal work without staff manually filing it.

**Deliverables (high-level — refine before building):**
- **Prospect portal** — locked-tab layout that prospects see post-account-creation, before payment. Active surface: discovery scheduling, proposal viewing, payment, support. All other tabs visible-but-locked with "available after payment" overlays.
- **Calendly embed** — prospects self-schedule discovery inside the portal; webhook captures the booking and creates a `discovery_sessions` row.
- **Proposal viewing** — client renders the uploaded presentation in the portal (PDF inline / Slides embed).
- **Stripe Checkout integration** — Stripe-hosted payment page; webhook auto-creates `payments` row and flips `clients.status` to `active`, unlocking the portal.
- **Contract signing** — replace DocuSign for SGS contracts (proposal-to-signature flow may merge with proposal viewing).
- **Document upload UX** — guided per SOP, progress indicator, clear reject reasons.
- **Service request flow** — client requests a one-time service or change → creates internal task.
- **In-app messaging / support** — `support_requests` exists; UX needs work.
- **Onboarding wizard** — client-side mirror of the internal pipeline.
- **Notifications** — `notifications` table exists; needs in-app surfacing + email delivery.
- **AI-agent-generated proposals** (long-term) — automate slice step 5 from selected services + standard pricing.

**Open decisions:**
- Contract signing: build in-house or integrate signing API (HelloSign / Dropbox Sign)?
- Stripe model: Checkout (hosted, simpler) vs Elements (embedded, more control)?
- Notifications: real-time (Supabase Realtime) or polled?

**Done when:** A new SGS client can complete onboarding, sign a contract, upload required documents, pay an invoice, and request a service all without phone calls — and SGS staff sees all of it land as work items in the internal dashboard.

**Review with Karen before starting:** scope, tool integrations, payment processor.

---

## Cross-cutting

- **Lovable sync** — open question whether Karen still uses the Lovable web editor. If yes, every local change risks a collision. Resolve before deep work.
- **Deployment** — where does the dashboard run in production? Vercel? Lovable hosting? Karen's call.
- **Data model evolution** — never edit historical migrations. New tables/columns get a new timestamped migration.
- **Testing** — `npm test` is wired but coverage is light. Add tests for the SOP-00 vertical slice once it stabilizes.
- **SOP-08 unknown** — `Processos_internos/08_servicios_especializados/` is empty. Don't design for it; just don't paint into a corner that excludes it.

---

## What's done

- [x] **2026-04-26** — Dashboard repo cloned, sibling topology established, English convention set.
- [x] **2026-04-28** — Public intake form `/intake` + `intake_submissions` table + RLS policies (slice step 1).
- [x] **2026-04-28** — Admin Intake Submissions review screen + "Convert to client" action (slice steps 2–3).
- [x] **2026-04-28** — Slice schema migration: `discovery_sessions`, `service_task_templates`, `invoices.payment_link_url`, `proposal` document category, `handle_new_user` trigger auto-links clients on signup.
- [x] **2026-04-28** — AdminClientDetail enhanced: Discovery tab (log session) · Documents upload · Invoice creation w/ Stripe payment link + Copy link · Record payment dialog · Service activation auto-creates tasks from templates · Portal invite (copy signup URL). Covers slice steps 4–9.
- [x] **2026-04-29** — Working topology established: Javi's own GitHub fork (`Javiasturiasb/sgs-client-hub`, private) + own Supabase project (`rvxonlgfasbkjdmtidky`). Karen's repo kept as `upstream` remote.
- [x] **2026-04-29** — All 8 migrations applied to Javi's Supabase. `.env` now gitignored (was leaking before).
- [x] **2026-04-29** — Dev seed deployed (`supabase/seeds/dev_seed.sql`): test admin user (`admin@sgs.test` / `admin123!`), 8 standard services + Onboarding service, 4 sample clients, 5 SOP-00 task templates. SOP-00 vertical slice is now end-to-end testable.
- [x] **2026-04-29** — `Processos_internos/` brought into the dashboard repo (option B in 3-way decision); SOPs and dashboard specs now versioned and reviewable by Karen via the same fork.
- [x] **2026-04-29** — Phase 1b SOP-01 design **locked** with Abner (verbal sync). 15 of 17 design questions answered; Karen's 2 GHL questions pending but non-blocking. New pain point logged: SOP-01 structure-evaluation rationale isn't recorded anywhere (single point of failure on Abner).
- [x] **2026-04-29** — **Session N+1 shipped:** SOP-01 schema migration (`20260429154331`) + idempotent seed (`Business Formation & Structure` service @ $500 + 6 task templates + 2 email templates). Real portal invite flow replacing the `/auth` URL stub: Edge Function `invite-portal-user` deployed, `/auth/callback` route + `AuthCallback` set-password page added, `AdminClientDetail` "Invite to portal" button now sends a real magic-link email via `supabase.auth.admin.inviteUserByEmail()`. Every send audited in `email_log`. Reusable across all future SOPs.
- [x] **2026-04-29** — **Session N+2 shipped:** Reusable `SendTemplatedEmailDialog` (loads any `email_templates` row, substitutes `{{variable}}` placeholders, lets admin edit, writes to `email_log`). Wired into Services tab for SOP-01 kit-delivery emails. Document-category dropdown extended to include the SOP-01 categories (corporate_kit, current_structure, completion_certificate).
- [x] **2026-04-29** — **Session N+3a shipped:** Client portal SOP-01 panel — kit + certificate downloads (signed-URL Storage), "Acknowledge & close" with confirm dialog, `acknowledge_client_service(p_id)` SECURITY DEFINER RPC (migration `20260429182958`). Document-category dropdown bug fix.
- [x] **2026-04-29** — **Architectural decision (Karen):** email dispatch is GoHighLevel's job, not a separate service (Resend/SMTP). Dashboard composes + queues to `email_log`; GHL picks up `pending` rows during Phase 2 GHL bridge work. Captured in `feedback_email_via_ghl` Claude memory + `roadmap.md` Phase 2 deliverables.
- [x] **2026-04-29** — **SOP-01 v1 functionally complete** except PDF certificate auto-gen (waiting on Abner's signature image — can ship brand-only as interim) and end-to-end smoke test. Slice was 4 sessions (N+1 through N+3a) plus design.

---

## Next concrete step

**SOP-03 (Managed Accounting) design phase active.** `sop03_design.md` drafted 2026-04-29 — first **recurring service** in the project, introduces dashboard mechanics (recurring task spawning, client-query workflow, monthly meeting cadence, quarterly reports) that will be reused by SOP-04 and SOP-07.

**Action:** Javi takes `sop03_design.md` to **Germain** for answers. Karen's §10 (GHL) can be answered separately.

Headline open questions worth highlighting to Germain:
- §2.1 — Required document checklist vs. free-form upload?
- §3.1 — QuickBooks integration in v1 (no, just status-tracked) or later?
- §5.x — Client-query workflow shape (the Step 3.1 daily-comms machinery — biggest new infrastructure)
- §7.1 — Auto-spawning October P&L task each year?
- §8.1 — Frequency of tax-prep firm handoff (existing open question from `_meetings/open_questions.md`)
- §11 — Pricing confirmation ($5,000/month standard, billing cadence)

Once Germain's answers are captured into `sop03_design.md`'s Decision log, implementation starts. Estimated 4–6 sessions for SOP-03 because it adds recurring-task infrastructure on top of the SOP-specific UI.

**Backlog from SOP-01 (deferred, not blocking SOP-03):**
- PDF completion certificate auto-gen (need Abner's signature, OR ship brand-only as interim)
- SOP-01 end-to-end smoke test on dev Supabase
- Hosting / deployment (pending Karen's call on subdomain + CNAME setup)

---

## Phase 1b SOP-01 design (LOCKED 2026-04-29)

See `sop01_design.md` — every Abner-side question answered; only Karen's GHL §7 still pending (doesn't block implementation).

**Implementation progress (slice steps):**
1. ✅ Migration: enum additions (`corporate_kit`, `current_structure`, `completion_certificate`), new fields (`acknowledged_at`, `ghl_pipeline_stage`, `business_profile_data`), new tables (`email_templates`, `email_log`).
2. ✅ Seed: Business Formation & Structure service @ $500 + 6 task templates + 2 email templates.
3. ✅ **Portal invite flow** — Edge Function deployed, `/auth/callback` route added, AdminClientDetail button calls real send.
4. ✅ Admin UI for SOP-01 — Services tab "Send kit email" button + reusable SendTemplatedEmailDialog. Document-category dropdown extended for SOP-01 categories.
5. ⛔ ~~Email send infrastructure (Resend / SMTP)~~ — **DEFERRED to Phase 2 GHL bridge** per Karen's decision 2026-04-29. The dashboard composes templated emails and writes them to `email_log` with status `pending`; Karen will pick these up via GHL's email/SMS automation rules during the Phase 2 wiring. Avoids running a parallel email service alongside GHL's existing one.
6. ✅ Client UI for SOP-01 — kit/certificate downloads + Acknowledge & close button + acknowledge_client_service RPC.
7. ⏭️ **Next:** PDF completion certificate auto-gen (`@react-pdf/renderer`). Needs Abner's signature image — interim option: brand-only certificate (logo + text, no signature) shipped now; signature swapped in once we have the asset.
8. End-to-end smoke test on dev Supabase.

**Open scope question for Javi:** §6.2 (closure certificate) — recommended starting with **manual upload** (Abner fills a Word/PDF template and uploads); auto-PDF-generation deferred to v1.5 unless Abner pushes back. Confirm or override before implementation.

**Parallel track (whenever Javi is ready):** smoke-test the existing SOP-00 flow end-to-end on dev Supabase to catch any wiring bugs before SOP-01 stacks on top.

After Phase 1b SOP-01 ships, next slice is most likely **SOP-03 (accounting, recurring)** — first recurring service, will surface monthly-cadence mechanics. Or move to **Phase 2 (GHL bridge)** if Karen wants the GHL connection live before adding more services.
