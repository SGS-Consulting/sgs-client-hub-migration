# SOP-03 Managed Accounting & Financial Operations — Dashboard Design

**Status:** Drafting questions for **Germain**. **No code yet** — implementation starts after answers are captured below. Karen still needs to answer §10 (GHL).
**Reference:** `Processos_internos/03_contabilidad_operaciones/sop.md`
**Pipeline (GHL):** `Managed Accounting & Financial Operations`
**Last updated:** 2026-04-29

---

## How to use this doc

1. Javi reviews questions and the recommended defaults.
2. Javi takes them to **Germain** (sole runner of SOP-03; Abner is involved only in October P&L recommendations).
3. Each answer captured inline below + in the Decision log at the bottom.
4. Once every "OPEN" item is "ANSWERED" (excluding Karen's §10), implementation starts.

Same format as `sop01_design.md`: each item has a **default proposal** + **what we'd build if confirmed** + **what changes if not.**

**Major architectural note:** SOP-03 is the **first recurring service** we're building. It introduces dashboard mechanics we don't yet have: monthly task spawning, cadence-aware status, periodic deliverables (monthly notes, quarterly reports, October P&L). These mechanics will be reused by SOP-04 (tax) and SOP-07 (advisory) later — building them well here pays dividends across SOPs.

---

## 1. Service activation

### 1.1 How does Germain know a client wants SOP-03?

**Default proposal:** Three paths supported, all admin-initiated:
- **(a) From onboarding (SOP-00):** during the discovery session, if the client signs the bookkeeping package, Abner (or Germain) activates "Managed Accounting" in `AdminClientDetail → Services`.
- **(b) Existing-client upsell:** an active client signs up for accounting later → Germain (or Abner) activates the service.
- **(c) Migration:** a client already in QuickBooks under SGS gets imported and the service activated retroactively.

**Build implication:** Reuses existing service-activation flow; no new UI for activation itself.

**Status:** OPEN

### 1.2 Does activation always trigger a real billing event?

**Default proposal:** Yes — recurring services are $5,000/month per `Processos_internos/CLAUDE.md` pricing model. Activation auto-generates the first month's invoice (status: `sent`) and sets the next invoice date.

**Status:** OPEN — confirm $5,000 is the standard or if there are tiers / per-revenue pricing.

---

## 2. Step 1 — Financial document collection

### 2.1 What documents are required to start?

**Default proposal:** Required-vs-optional checklist surfaced in the client portal:
- **Required:** bank statements (last 3 months), prior-year tax return, list of bank accounts the client wants connected to QuickBooks
- **Recommended:** payroll records, supplier contracts, prior bookkeeping (if any), recent invoices issued
- **Optional / case-by-case:** loan agreements, lease contracts, other industry-specific docs

Client uploads via portal. Each item in the checklist tracks "received / not received" so Germain's team can see at a glance who's missing what.

**Build implication:** New `service_document_requirements` table (or JSON column on `client_services`) listing required document types per service. UI shows a checklist on the client portal.

**If different (e.g., Germain prefers free-form upload like SOP-01):** drop the checklist; just give them a "Upload financial documents" prompt.

**Status:** OPEN

### 2.2 Does Germain ever need to upload documents for the client (e.g., he gets them from Abner directly, or from migration)?

**Default proposal:** Yes — admin can upload on behalf of the client. The document still belongs to the client, just uploaded_by tracks who put it there.

**Status:** OPEN

---

## 3. Step 2 — QuickBooks setup

### 3.1 Does the dashboard integrate with QuickBooks (API), or just track status manually?

**Default proposal (v1):** Status only — Germain manually flips a "QuickBooks configured" checkbox on the SOP-03 service card after he's done the actual QB setup outside the dashboard. We DO NOT integrate the QB API in v1.

**Why:** QB integration is a real product (OAuth + ongoing sync + maintenance). Worth doing eventually — adds value like surfacing live cash balance to clients — but it's a 1–2 week investment. Better to ship the rest of SOP-03 first and add QB integration as a Phase 2 enhancement.

**If different (Germain wants live QB data in dashboard right now):** scope expands significantly; likely splits into its own slice.

**Status:** OPEN — confirm v1 status-only is fine.

### 3.2 What client-visible info should the dashboard surface during/after QB setup?

**Default proposal:**
- During setup (Germain's working on it): "QuickBooks setup in progress — your team will reach out for credentials."
- After setup: "QuickBooks active. View your books at quickbooks.intuit.com" (link to QB; no embedded view in v1).

**Status:** OPEN

---

## 4. Step 3 — Ongoing bookkeeping (internal)

### 4.1 Does the bookkeeping work itself need to surface in the dashboard?

**Default proposal:** No — bookkeeping is internal team work. The dashboard just shows the SOP-03 service as "active," and the client mostly cares about Step 3.1 (queries to them) and Step 4 (meetings/reports).

**If different (Germain wants bookkeeping volume / status visible to admin):** add a simple admin-side metric card: "X transactions categorized this week, Y pending categorization."

**Status:** OPEN

---

## 5. Step 3.1 — Day-to-day client query workflow

This is the most operationally critical and friction-prone step of SOP-03. Currently lives in GHL; needs to live in the dashboard so clients can respond quickly.

### 5.1 How is a query created?

**Default proposal:** Germain's team sees an uncategorized transaction in QuickBooks → opens the client's profile in the dashboard → clicks **"New query"** → fills in:
- Question / context (e.g., "Transaction on 2026-04-15 for $432 — what was this for?")
- Optional: link to specific document or transaction reference
- Due date for client response (default: +3 business days)

This creates a `client_queries` row visible to the client in their portal.

**Build implication:** New `client_queries` table with: `id, client_id, client_service_id, question, context, due_date, status (open/answered/overdue), created_by, response, responded_at, created_at`. RLS: admins manage; clients view + answer their own.

**Status:** OPEN

### 5.2 How does the client respond?

**Default proposal:** Client portal has a "Pending Questions" surface (dashboard widget + dedicated page). For each query, client sees the question, can type a response, optionally attach a document, hit Submit. Response saves; status flips to `answered`.

**Build implication:** Client-side `ClientQueries.tsx` page + dashboard widget. RPC `answer_client_query(p_id, p_response, p_attachment_id?)` similar to the SOP-01 acknowledge pattern.

**Status:** OPEN

### 5.3 What happens when a query is overdue?

**Default proposal:** Past due_date and still `open` → status becomes `overdue` (computed, or via a daily job). Client sees a red badge on the query. Germain's team gets a daily summary.

**Build implication:** A scheduled function (Supabase pg_cron or Edge Function on a schedule) that flips overdue queries every morning and optionally posts a summary somewhere.

**If simpler v1:** no automated overdue flip; admin manually flags queries that have been ignored for too long.

**Status:** OPEN

### 5.4 Does the team manage queries individually, or does Germain see them all?

**Default proposal:** Germain has an admin-side "All Queries" page filtered by client / status / overdue. Each query has a created_by (the team member who asked) but Germain manages the queue.

**Status:** OPEN

---

## 6. Step 4 — Monthly meeting + quarterly report

### 6.1 How is the monthly meeting scheduled?

**Default proposal (v1):** Manual scheduling via Calendly link (same pattern as SOP-00 discovery sessions). Germain sends client his Calendly link from the dashboard; once booked, the meeting is logged manually as a `discovery_sessions` row (we may rename to `client_meetings` to be more general).

**v1.5 path:** Auto-create the next monthly meeting in the dashboard when the prior one is logged, so there's always a "next meeting" placeholder.

**Status:** OPEN

### 6.2 Are meeting notes captured in the dashboard or just in GHL?

**Default proposal:** Both — meeting notes captured in the dashboard (rich text or markdown field), then synced to GHL when Phase 2 GHL bridge ships. Until then, dashboard is source of truth and Germain manually mirrors to GHL if needed.

**Status:** OPEN

### 6.3 The quarterly report — does the dashboard generate it, or does Germain upload a manual report?

**Default proposal (v1):** Germain produces the quarterly P&L report outside the dashboard (in QuickBooks or Excel) and uploads it as a `documents` row with new category `quarterly_report`. Client downloads from portal.

**v1.5 path:** Auto-pull live P&L data from QuickBooks API and render the report in the dashboard.

**Status:** OPEN

### 6.4 How does the client see "next quarterly report due in X"?

**Default proposal:** A simple status indicator on the SOP-03 service card: "Next quarterly review: [date]" updated quarterly.

**Status:** OPEN

---

## 7. Step 4.1 — October P&L analysis (annual)

### 7.1 Should the dashboard auto-create this task each year?

**Default proposal:** Yes — the SOP-03 service has a recurring annual task that auto-spawns each October 1st: "October P&L analysis + IUL contribution recommendation." Assigned to Germain by default. Has a target completion date of October 31st.

**Build implication:** Recurring task scheduling — `service_recurring_tasks` table or similar that defines tasks that auto-spawn on a cadence (monthly, quarterly, annually). This is a **reusable mechanic** for SOP-04 (tax cadences), SOP-07 (advisory check-ins).

**Status:** OPEN

### 7.2 Does the IUL recommendation produce a specific artifact?

**Default proposal:** Yes — Germain uploads a "P&L analysis + IUL recommendation" document to the client's portal, category `annual_iul_review`. Optional: a simple yes/no field on the task ("Recommended IUL contribution? Y/N + amount") so admin views can aggregate across clients.

**Status:** OPEN

---

## 8. Step 5 — Third-party accounting firm handoff

### 8.1 Frequency? (existing OPEN QUESTION from `_meetings/open_questions.md`)

**Default proposal candidates:**
- **(a) Quarterly** — sync with quarterly P&L cycle
- **(b) Annually** — at year-end for tax filing
- **(c) Tax-season-driven** — January–April peak with periodic check-ins
- **(d) Event-driven** — when a specific client situation requires it

**Status:** OPEN — Germain confirms.

### 8.2 What documents go to the firm? Same per client, or varies?

**Default proposal:** Standard package (bank statements, P&L, balance sheet, payroll reports, prior-year comparison). Optionally adds: contracts, big-ticket invoices.

**Build implication:** Same `documents` table; admin filters to "tax-prep package" via a category or tag.

**Status:** OPEN

### 8.3 Does the dashboard track that the firm received it?

**Default proposal:** Yes — internal-only task: "Send tax-prep docs to firm" with fields:
- Sent on (date)
- Firm contact / email used
- Delivery method (email / Drive folder / firm's portal)
- Confirmation received (date)

Same pattern as SOP-01's "law firm coordination" step.

**Status:** OPEN

---

## 9. Recurring task mechanics (cross-cutting)

This isn't a step in SOP-03 per se, but the slice surfaces it for the first time.

### 9.1 How do we want monthly/quarterly/annual tasks to work?

**Default proposal:** New table `service_recurring_tasks` describing tasks that auto-spawn on a cadence. Schema (proposed):
- `service_id` — which service this attaches to
- `title` / `description` / `default_priority` — same as `service_task_templates`
- `cadence` — `monthly | quarterly | annually | semi_annually`
- `cadence_config` — JSONB (e.g., `{"month": 10, "day": 1}` for October 1st annually, `{"day_of_month": 1}` for monthly)
- `default_due_offset_days` — relative to spawn date

A daily scheduled function checks each active `client_services` row, looks up its recurring tasks, and spawns any that are due. Spawned tasks land in the existing `tasks` table with `service_id` set.

**Reuse:** Same mechanic supports SOP-04's contractor monthly check, SOP-07's advisory check-ins, SOP-09's post-delivery follow-ups.

**Status:** OPEN — Germain (and Karen) confirm this is the right shape.

### 9.2 What happens if a recurring task wasn't completed before the next one spawns?

**Default proposal:** The new task spawns regardless, but the dashboard surfaces "previous month's task still open" prominently (red badge, dashboard alert). No silent skipping.

**Status:** OPEN

---

## 10. GHL pipeline mapping — for Karen

### 10.1 GHL pipeline stages?

**Status:** ⏳ OPEN — Karen.

**Working assumption (placeholder):**
1. Activated — awaiting docs
2. Docs received — QB setup in progress
3. QB active — bookkeeping ongoing
4. (No further linear stages — recurring service)

**Status field stops being linear once active. Karen confirms.**

### 10.2 GHL custom fields to mirror?

**Status:** ⏳ OPEN — Karen. Likely: monthly meeting status, quarterly report status, query backlog count, third-party firm last-sent date.

### 10.3 Email dispatch via GHL

Per the 2026-04-29 architectural decision, all client-facing emails for SOP-03 (welcome, monthly meeting reminder, quarterly report ready, query reminders) **queue to `email_log` and dispatch via GHL.** Same pattern as SOP-01.

---

## 11. Pricing & billing

### 11.1 Standard $5,000/month?

**Default proposal:** Standard $5,000/month per the pricing model in `Processos_internos/CLAUDE.md`. Auto-generates an invoice each month (or on activation + recurring billing setup).

**Status:** OPEN — confirm OR specify tiers (simple book vs. complex multi-entity client, for example).

### 11.2 When does billing start?

**Default proposal:** Bills the first day of the month after activation; first month is prorated if activated mid-month. Or — straightforward — bills $5,000 on activation and renews monthly.

**Status:** OPEN

### 11.3 Can a client pause/cancel?

**Default proposal:** Yes — admin can deactivate the service from `AdminClientDetail`, which stops auto-billing the next cycle. Past invoices remain.

**Status:** OPEN — confirm cancellation policy with Germain (notice period? immediate? prorated refund?).

---

## 12. Implementation summary (filled in after answers)

Once questions resolve, this section captures what we're building. Tentative scope:

**Database changes (single migration):**
- New tables: `client_queries` (Step 3.1 workflow), `service_recurring_tasks` (cadence-driven task spawning).
- Document categories: `quarterly_report`, `annual_iul_review`, `tax_prep_package` (or `bank_statement`, etc. per Germain's preference).
- Possibly `service_document_requirements` if §2.1 confirms checklist approach.
- Recurring task scheduler (Edge Function on daily cron) — first cron-style scheduled function in the project.

**SOP-03 task templates seeded:**
1. *Request financial documents from client* — high, due +1d
2. *Configure QuickBooks + connect bank feeds* — high, due +5d
3. *Schedule first monthly meeting* — medium, due +14d (recurring monthly thereafter)
4. *Send tax-prep docs to firm* — medium, recurring per §8.1 frequency

**Recurring tasks seeded:**
- Monthly client meeting — every month, +5 days
- Quarterly report preparation — every Q1/Q2/Q3/Q4, +10 days
- October P&L + IUL review — annually, October 1, +30 days
- Tax-prep firm send — per §8.1 cadence

**Admin UI:**
- SOP-03 service card on `AdminClientDetail` showing query backlog + meeting status + quarterly report status + tax-prep firm last-sent.
- "Queries" admin page (filter by client/status/overdue).
- "New query" dialog reusable from anywhere.

**Client UI:**
- Pending questions widget on `/portal` dashboard.
- New `/portal/queries` page listing all queries with respond/answer flow.
- Quarterly reports listed on services page.

---

## Decision log

| Date | Section | Decider | Answer |
|------|---------|---------|--------|
|      |         |         |        |
