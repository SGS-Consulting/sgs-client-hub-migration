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
- [x] **2026-04-29** — **SOP-03 design locked** with Germain (verbal sync). Tier dollar amounts still pending; tax-season-only variant blocked on the SOP-03/SOP-04 boundary pain point.
- [x] **2026-04-29** — **SOP-03 schema + seed shipped** (migration `20260429200021`). 4 services (3 tiers + tax-season), 4 onboarding task templates per service, 4 recurring task definitions per recurring tier, 3 new email templates. Placeholder prices.
- [x] **2026-04-29** — **SOP-03 client query workflow** (admin "All Queries" page + client "Preguntas" portal page + `answer_client_query` RPC + `NewQueryDialog` reusable component). End-to-end Q&A flow live.
- [x] **2026-04-29** — **SOP-03 service cards** (admin: QB checkbox + cadence picker + status pills; client: cadence-aware quarterly/semi-annual reports section + IUL review section + pending-questions banner).
- [x] **2026-04-29** — **SOP-03 cron schedulers** (migration `20260429205220`): `spawn_recurring_tasks()` daily 05:00 UTC + `flag_overdue_queries()` daily 06:00 UTC. Smoke-tested manually — 3 tasks correctly spawned. pg_cron extension enabled.
- [x] **2026-04-29** — **Legacy services deactivated** (Bookkeeping Monthly, Tax Filing Federal/State) since they overlap with SOP-03/SOP-04 services. `dev_seed.sql` updated to seed them as inactive going forward.
- [x] **2026-04-30** — **SOP-03 Calendly webhook shipped & deployed.** Edge Function `calendly-webhook` (`supabase/functions/calendly-webhook/index.ts`) receives `invitee.created`, validates `Authorization: Bearer <secret>`, matches invitee email to client (case-insensitive via escaped ilike), picks `kind` from event-type-name keywords (`mensual` → `monthly_accounting`, `discovery` → `discovery`, `asesoría`/`checkin` → `advisory_checkin`, fallback `discovery` with warning). Idempotent via partial unique index on `discovery_sessions.calendly_event_id` (migration `20260430164930`). `verify_jwt = false` in `supabase/config.toml` (no JWT, no `apikey` header needed). Smoke-tested 10 scenarios on dev Supabase — all green. Awaits Karen's Calendly setup (event types + webhook subscription + production secret) per `karen_integrations.md` §5. **SOP-03 v1 dashboard-side feature-complete.**
- [x] **2026-04-30** — **SOP-04 design pre-draft.** `sop04_design.md` written. Two hard blockers flagged at top: worker classification policy (Abner — already in `_meetings/open_questions.md`) and SOP-03/SOP-04 tax-season boundary (Germain + Abner — already in `pain_points.md`). 8 design questions for Germain in §2–§11 with concrete default proposals; 2 for Karen on GHL. Heavy reuse from SOP-03 (recurring tasks, queries, email_log, internal-only meetings); net new entities proposed: `client_workers`, `tax_strategies` (+ smaller `worker_classification_responses`, `tax_filings`). One-time variant §8 explicitly blocked until cross-SOP boundary resolves.
- [x] **2026-04-30** — **6 Claude Code subagents added** under `.claude/agents/`: `sop-reader`, `migration-author`, `schema-explorer`, `ui-ux`, `integration-tracker`, `bug-triager`. Project-scoped specialists for context-saving on recurring workflows (Spanish SOP summarization, migration drafting, schema investigation, UI build/review, external-integration tracking, bug triage without edits).
- [x] **2026-05-01** — **SOP-01 + SOP-03 DB-side smoke test green.** Acme client driven through both slices end-to-end on dev Supabase: SOP-01 activation spawned 6 tasks; `acknowledge_client_service` closed the service (and rejected non-owner). SOP-03 activation spawned 4 onboarding tasks; `spawn_recurring_tasks()` correctly spawned 3 recurring (monthly + quarterly + tax-firm — annually correctly skipped, Oct > May) and is idempotent on re-run; `flag_overdue_queries()` flipped status + queued one reminder email and is idempotent; `answer_client_query` closed the query and rejected non-owner + empty response. RLS isolation held (Acme user cannot see Sunrise's tasks/docs/queries). Calendly webhook reachability + auth-rejection re-verified. Side effect: dev DB now has a `maria@acmecoffee.example` portal user (password `smoketest123!`), Acme's SOP-01 service is `acknowledged` and SOP-03 tier-1 is active with `tax_firm_cadence='quarterly'`, plus 13 tasks + 2 SMOKE TEST queries — useful as a click-through stage for browser-side validation.
- [x] **2026-05-01** — **SOP-04 schema migration applied** (`20260501121841_sop04_slice_schema.sql`) + seed (`supabase/seeds/sop04_tax_compliance.sql`). 8 new tables: `client_workers`, `client_workers_history` (audit log via `audit_client_workers_change()` trigger — captures INSERT/UPDATE/DELETE with `auth.uid()`), `worker_classification_questions`, `worker_classification_responses`, `worker_w9_invites`, `client_workers_w9_data` (typed W-9 fields, admin-only RLS), `tax_strategies`, `tax_filings`. Column adds: `client_services.price_override`, `discovery_sessions.kind` enum extended (`tax_strategy_initial/quarterly`), `documents.category` enum extended (`w9_form/1099_form`). Seed: 1 service row at $0, 4 onboarding templates, 3 recurring task definitions, 5 IRS Common Law Test classification questions, 3 email templates (`worker_w9_request`, `1099_ready`, `quarterly_strategy_review_summary`). Audit trigger smoke-tested on Acme — all 3 actions captured, `changed_by` correctly resolved. **Two scope deviations from spec, both accepted:** (a) `tax_id_last4` removed from `client_workers` (lives only on `client_workers_w9_data` — single source of truth, admin joins for display); (b) `tin_full` stored as PLAINTEXT in dev with admin-only RLS — pre-prod gate added to `karen_integrations.md` ⚠️ G1 to encrypt before going live.
- [x] **2026-05-01** — **SOP-04 design LOCKED with Germain + Abner** (verbal sync via Javi, captured in `sop04_design.md` Decision log; 21 entries). Major scope shifts vs. pre-draft: (1) **SOP-04 is NOT separately charged when bundled with SOP-03 recurring tiers** (1/2/3+ Companies); standalone sales are case-by-case priced by Abner. Tax-Season SOP-03 variant does NOT include SOP-04. Auto-activation cascade: SOP-04 client_services row auto-spawns at $0 when SOP-03 recurring tier activates. (2) **Worker W-9 collection is a tokenized form workflow** (new §2.5): client clicks "Request W-9" → system emails worker a magic link to a public `/w9/<token>` form → worker fills structured fields → system stores structured data + can auto-generate W-9 PDF. Workers do NOT have portal accounts. (3) **Symmetric CRUD on `client_workers`**: both client and Germain can add/edit/terminate; full audit trail on every mutation. (4) **Worker classification = IRS Common Law Test**, 5–7 question intake checklist per worker. (5) **1099 auto-gen DEFERRED to v1.5** (requires QuickBooks API integration — a separate slice). v1 stays manual upload. (6) **Tax strategies tracked in new `tax_strategies` internal-only table**; client visibility = high-level count badge only. (7) **§9 internal-only task flag confirmed NOT NEEDED** — clients have no SELECT policy on `tasks` (architecture-level decision; permanent). (8) **§8 one-time tax-filing variant remains BLOCKED** — Germain + Abner did not converge on the SOP-03/SOP-04 boundary; needs a dedicated 15-min sync. New estimated scope: **7–9 sessions** (was 5–7). Implementation now unblocked — next step is the migration.

---

## Next concrete step

**All SOP slices (00–07, 09) are shipped as of 2026-05-02.** The dashboard now covers every active SGS service. Phase 1 client-facing feature set is feature-complete.

**Remaining work (not SOP slices):**

1. **G1 pre-prod gate** — Encrypt `tin_full` in `client_workers_w9_data` before going live. Tracked in `karen_integrations.md`.
2. **§8 SOP-03/SOP-04 tax-season one-time filing variant** — Blocked on Germain + Abner sync; not yet resolved.
3. **SOP-08 (Specialized Services)** — Empty SOP folder; Abner has not defined the process yet.
4. **Phase 2 GHL bridge** — When Karen signals readiness, wire `email_log` → GHL + pipeline stage sync.
5. **QuickBooks API integration** — Unlocks 1099 auto-gen for SOP-04 v1.5.
6. **SOP-06 Step 3 client-approval flow** — Deferred: Abner has not yet defined how insurance packages are presented/approved by clients. Add a client-facing approval step once that's resolved.

**All SOP items done:**

-2. ~~**Task dept scoping + assignment flow**~~ ✅ DONE 2026-05-02. Migration `20260502190000_task_dept_scoping.sql` adds `services.department` (`accounting/branding/it/admin`) backfilled from `category` (Accounting+Tax → accounting; Branding → branding; everything else → admin). Tasks RLS rewritten: admin sees everything; **head_X** sees all tasks where the task's service is in their dept (regardless of assignee) **OR** assigned to them; **analyst_X** sees ONLY tasks where `assignee_id = themselves` (per Q1=A: heads keep dept-wide visibility, analysts only see their own). subtasks/task_attachments/task_comments inherit visibility from the parent task. `services.department='admin'` rows (Onboarding, Formation, Delaware, Legal, Insurance, Advisory) intentionally don't grant any dept access — Abner-only by exclusion. UI: `AdminWorkspaceDetail` now loads ALL internal users (was admin-only) for the assignee picker; `KanbanView` cards are clickable to open new `TaskAssignDialog` (assignee dropdown). 4 e2e tests in `task_dept_scoping.spec.ts` validate Germain sees accounting, Jesus sees nothing for Acme (no branding services), Ana sees only assigned, admin can reassign via kanban click. Verified via API: Germain sees 16 accounting tasks, admin sees 47, branding=0 (no branding services exist yet — when added they'll automatically belong to Jesus).

-1. ~~**Role hierarchy: admin → heads → analysts**~~ ✅ DONE 2026-05-02. Migration `20260502180000_role_hierarchy.sql` adds 6 new `app_role` values (`head_accounting/branding/it`, `analyst_accounting/branding/it`) plus helpers `has_dept(uid,dept)` / `is_head(uid,dept)`. RLS rewritten across ~20 tables: financial (`invoices/payments/invoice_items`), Abner-only SOPs (`legal_cases/advisory_*/client_insurance/intake_submissions`) stay admin-only; operational tables (`clients/tasks/documents/discovery_sessions/queries/services/workspaces/...`) opened to SELECT for any internal user; `branding_projects` writeable by branding dept; `client_workers/workers_w9_data/tax_strategies/tax_filings` writeable by accounting dept. `permissions.ts` rewritten with new caps (`view:advisory/legal_cases/insurance/branding/workers/tax_strategy/intake/services_pricing`); `AdminSidebar` and `AdminClientDetail` tabs gate by capability; route protection updated in `App.tsx`. New seed `dev_seed_team.sql` creates 6 test users (germain/jesus/karen/ana_acct/ana_brand/ana_it @ `team123!`). 7 e2e tests in `role_hierarchy.spec.ts` validate sidebar gating, page-level access, and tab gating per role.

   **Pricing/revenue restriction (per Q3=A):** `invoices`/`payments`/`invoice_items` admin-only at the RLS level (heads can't read). `services.base_price` and `client_services.price_override` columns are visible at SELECT but `/admin/services` page route is admin-only and the "Servicios"/"Facturas" tabs in `AdminClientDetail` are hidden for non-admin — UI is the only gate on those columns. Documented gap; tighten via column-level masking later if needed.

0. ~~**Workspaces ↔ clients (1:1)**~~ ✅ DONE 2026-05-02. Migration `20260502160000_workspaces_per_client.sql`: partial UNIQUE on `workspaces.client_id`, AFTER trigger on `clients` auto-creates a workspace + 5 default kanban columns when a client becomes `active` (handles both INSERT and prospect→active flips), BEFORE INSERT trigger on `tasks` auto-fills `workspace_id` and `column_id` from `client_id` (so service-template + recurring-task spawns now land in the kanban). Backfilled 3 active clients (Acme/Solid/Sunrise) → 35 existing tasks linked. New `Workspace` tab on `/admin/clients/:id` showing task-count summary + "Abrir kanban" link to `/admin/tasks/workspaces/<id>`. Admin-only for v1; client portal not exposed.
1. ~~**SOP-07 Business Advisory**~~ ✅ DONE 2026-05-02. `advisory_cases` + `advisory_checkins` tables, RLS, admin panel (Abner opens cases, logs check-ins, tracks 5 phases), client portal read-only view (status + check-in dates). No subscription gate.
2. ~~**SOP-06 Risk & Insurance**~~ ✅ DONE 2026-05-02. `client_insurance` table (GL/WC booleans + 4-state `coverage_status`), RLS, admin panel (create record per client, edit GL/WC/status/notes), client portal read-only view. Step 3 (client approval of package) deferred — Abner has not yet defined that flow.
3. ~~**SOP-09 Branding & Identity**~~ ✅ DONE 2026-05-02. `branding_projects` table (8-phase status, `web_included` flag), RLS, `documents.branding_project_id` FK, admin panel (create project, advance phases, upload brand-kit docs), client portal read-only timeline view with conditional web phases. Design questions answered: web optional per project, brief intake offline (Abner marks received), files in `client-documents` bucket.
4. ~~**SOP-04 migration + seed**~~ ✅ DONE 2026-05-01.
2. ~~**`client_workers` admin + client CRUD with audit trail**~~ ✅ DONE 2026-05-01.
3. ~~**IRS Common Law Test classification wizard**~~ ✅ DONE 2026-05-01.
4. ~~**Worker W-9 tokenized form workflow**~~ ✅ DONE 2026-05-01.
5. ~~**Tax-strategy meetings + `tax_strategies` table + recurring tasks**~~ ✅ DONE 2026-05-01.
6. ~~**1099 manual upload + client download UX**~~ ✅ DONE 2026-05-01.
7. ~~**Auto-activation cascade with SOP-03 + standalone-sale UX**~~ ✅ DONE 2026-05-01.
8. ~~**SOP-04 smoke test + UI polish**~~ ✅ DONE 2026-05-02.

- [x] **2026-05-02** — **Playwright e2e infrastructure added** (`@playwright/test` + chromium binary). New `npm run e2e` script, `playwright.config.ts` (sequential, `baseURL=http://localhost:8080`, retains screenshots/video/trace on failure), `tests/e2e/helpers.ts` (Spanish-aware `signIn` + `visitAndAssertClean` helpers using the seeded test admin + `maria@acmecoffee.example`), `tests/e2e/sop04.spec.ts` (8 tests covering admin sign-in + Workers/Estrategia tabs, client portal nav + workers page, public W-9 form invalid/expired/already-completed states). All 8 green. **Standard going forward:** every new UI slice gets a `tests/e2e/<slice>.spec.ts` with at least the happy-path navigation + one negative case. Run `npm run e2e` after each slice to catch regressions before reporting "shipped". `.gitignore` updated to skip `test-results/`, `playwright-report/`.

- [x] **2026-05-02** — **SOP-05 Legal & Corporate Support v1 SHIPPED.** Migration + seed + routes already landed in prior session. This session completed the remaining gaps: (a) Admin sidebar "Legal" entry added (`AdminSidebar.tsx` — Scale icon, `view:queries` cap). (b) Document upload wired in both directions: admin uploads `advisory_documents` linked to `legal_case_id` via inline upload section in the case detail dialog (`AdminLegalCases.tsx`); client attaches `legal_query_attachments` in the submit dialog (`ClientLegal.tsx`) — uploaded after `submit_legal_case` RPC returns the new case UUID; partial-success toast if the file upload fails after the case is created. (c) E2E spec `tests/e2e/sop05.spec.ts` (4 tests) — admin nav to `/admin/legal-cases`, filter tabs present, client subscription-gate visible (Maria has no SOP-05), client nav entry visible. **All 16 e2e tests green** (4 SOP-02 + 8 SOP-04 + 4 SOP-05). **State of dev DB**: schema + seed applied; no `legal_cases` rows yet; activate "Legal & Corporate Support" for any client via Servicios tab (price-prompt fires) to test the full flow. Note: discovered and fixed a duplicate `Input` import in `ClientLegal.tsx` that caused a blank-page crash in Playwright — kept the pre-existing import, removed the new one.
- [x] **2026-05-02** — **SOP-02 Delaware Infrastructure v1 SHIPPED** (Claude orchestrator-mode while Javi is on a trip). Design `sop02_design.md` written + locked from defaults (no Abner sync — flagged the open insurance-brokerage question for v2). Migration `20260502121033_sop02_slice_schema.sql` adds 4 doc categories (`delaware_formation_docs`, `corporate_address_confirmation`, `registered_agent_confirmation`, `gl_insurance_certificate`); no new tables. Seed creates the "Delaware Infrastructure Platform" service @ base_price 0, 7 onboarding task templates, 1 email template `sop02_kit_delivery`. Standalone price prompt generalized — fires on any service with `base_price = 0` (covers SOP-02 + SOP-04 + future case-by-case services with one mechanic). New `renderSop02Card` in `ClientServices.tsx` mirrors SOP-01 (status badge, 5 doc-category sections, "Acknowledge & close" button when corporate kit is uploaded). Admin-side adds SOP-02 doc categories to upload dropdown + "Send kit email" button on the Servicios row when SOP-02 is active. Andes Imports seeded with SOP-02 standalone @ $3500 as e2e fixture. **All 11 e2e tests green** (8 SOP-04 + 3 SOP-02). **← NEXT**: SOP-05 legal support (Abner-led).

**SOP-04 v1 SHIPPED 2026-05-02.** All 8 implementation slices done in one ~2-day session burst (2026-05-01 + 2026-05-02 morning). 9 net-new tables, 1 Edge Function (`worker-w9`), 4 SECURITY DEFINER RPCs, ~7 new admin/client UI components. Smoke-tested end-to-end DB-side + Edge Function E2E.

**After SOP-04:** SOP-02 (Delaware), SOP-05/06/07 (Abner-led services), SOP-09 (Branding — needs cross-team prep). Plus Phase 2 (GHL bridge) when Karen signals readiness, and the QuickBooks API integration slice (unlocks 1099 auto-gen for SOP-04 v1.5).

**Parallel-unblocked side quests** (do whenever):
- §8 SOP-03/SOP-04 tax-season boundary needs a dedicated 15-min Germain + Abner sync to unblock the one-time tax-filing variant.
- Karen's GHL pipeline mapping for SOP-04 (§10) — non-blocking, wires during Phase 2.

**Pending external inputs (not blocking next session):**
| Who | What | Captured in |
|-----|------|-------------|
| Germain | SOP-03 tier dollar amounts | `sop03_design.md` §11 |
| Germain + Abner | SOP-03 vs. SOP-04 tax-season boundary | `pain_points.md`; blocks SOP-04 §8 only |
| Abner | Signature image (PNG) for SOP-01 PDF cert | `sop01_design.md` §6.2 |
| Karen | Hosting (Vercel + CNAME); GHL pipeline mappings (incl. SOP-04 §10); Stripe setup; Calendly account+event-types+webhook+secret | **`karen_integrations.md`** ← single Spanish handoff doc |

**Backlog (unblocked but lower-priority than SOP-04):**
- PDF completion certificate auto-gen for SOP-01
- SOP-01 + SOP-03 end-to-end smoke tests on dev Supabase

---

## Phase 1b SOP-01 design (LOCKED 2026-04-29)

See `sop01_design.md` — every Abner-side question answered; only Karen's GHL §7 still pending (doesn't block implementation).

**SOP-01 implementation progress:**
1. ✅ Migration: enum additions, client_services columns, email_templates, email_log
2. ✅ Seed: Business Formation & Structure service + 6 task templates + 2 email templates
3. ✅ Portal invite flow (Edge Function + auth callback + signup)
4. ✅ Admin UI: SendTemplatedEmailDialog wired into Services tab
5. ⛔ ~~Email send infrastructure~~ — DEFERRED to Phase 2 GHL bridge (Karen's call)
6. ✅ Client UI for SOP-01 — kit downloads + Acknowledge & close + RPC
7. ⏭️ **Backlog:** PDF certificate auto-gen (needs Abner's signature image)
8. ⏭️ **Backlog:** End-to-end smoke test on dev Supabase

**Open scope question for Javi:** §6.2 (closure certificate) — recommended starting with **manual upload** (Abner fills a Word/PDF template and uploads); auto-PDF-generation deferred to v1.5 unless Abner pushes back. Confirm or override before implementation.

**Parallel track (whenever Javi is ready):** smoke-test the existing SOP-00 flow end-to-end on dev Supabase to catch any wiring bugs before SOP-01 stacks on top.

After Phase 1b SOP-01 ships, next slice is most likely **SOP-03 (accounting, recurring)** — first recurring service, will surface monthly-cadence mechanics. Or move to **Phase 2 (GHL bridge)** if Karen wants the GHL connection live before adding more services.
