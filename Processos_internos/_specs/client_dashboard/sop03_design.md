# SOP-03 Managed Accounting & Financial Operations — Dashboard Design

**Status:** Design **LOCKED** as of 2026-04-29 with Germain. Karen still needed for §10 (GHL). Specific pricing tier numbers TBD with Germain.
**Reference:** `Processos_internos/03_contabilidad_operaciones/sop.md`
**Pipeline (GHL):** `Managed Accounting & Financial Operations`
**Last updated:** 2026-04-29

---

## Quick reference — what we're building

| Area | Decision |
|------|----------|
| Activation | Two paths: from SOP-00 onboarding, or as upsell on existing client |
| Billing | Auto-invoice on activation; client must pay before first month starts |
| Step 1 docs | Free-form upload (no checklist); admin can upload on behalf |
| QuickBooks | Status-only in v1 — checkbox on SOP-03 card; no QB API integration yet |
| Bookkeeping visibility | Internal only — no metrics surfaced in admin |
| Client queries | Quick-create button anywhere in dashboard; client responds via portal widget + page |
| Overdue queries | Auto-reminder email at +3 business days past due (via GHL once Phase 2 ships) |
| Query ownership | Creator owns follow-up; Germain has master "all queries" view |
| Query notification | Email + in-portal notification (email via GHL) |
| Monthly meeting | **Calendly fully integrated** — webhook auto-creates meeting row |
| Meeting notes | Dashboard is source of truth (synced to GHL in Phase 2) |
| Quarterly report | Manual upload (v1); auto-gen waits on QB API integration later |
| Quarterly status | Status indicator on SOP-03 service card |
| October P&L | **Auto-spawned task** on October 1 each year — first recurring-task mechanic |
| Tax firm cadence | **Per-client** — quarterly OR semi-annual based on client's tax filing pattern; **plus a tax-season trigger** for one-time service clients |
| Recurring task collision | New spawns regardless; prior stays open with overdue badge |
| Pricing | Tiered by # of companies managed; **plus single-service charge** for tax-season-only clients (boundary with SOP-04 one-time flagged as pain point) |

---

## How to use this doc

1. ✅ Javi takes questions to Germain (verbal sync 2026-04-29 — done).
2. ✅ Answers captured below + in Decision log at the bottom.
3. ⏳ Karen still needed for §10 (GHL) and pricing tier numbers TBD with Germain.
4. ⚠️ Pain point logged about the SOP-03/SOP-04 one-time-tax-service boundary — needs cross-SOP clarification before we build the second tax-season variant.

---

## 1. Service activation

### 1.1 How does Germain know a client wants SOP-03?

**Decision:** **C — both paths supported.**

**Build implication:** Reuses existing service-activation flow; no new UI for activation itself. Same flow Abner uses for SOP-01.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

### 1.2 Auto-billing on activation?

**Decision:** **A — auto-invoice $5,000 on activation; client must pay before first month starts.**

**Build implication:**
- On service activation, auto-create an invoice (status: `sent`) with first month's line item.
- The "Configure QuickBooks" task (or the activation itself) is **gated** — admin cannot proceed past Step 1 until invoice is paid.
- For tiered pricing (see §11), the invoice amount comes from the tier Germain selects at activation.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

---

## 2. Step 1 — Financial document collection

### 2.1 Required-checklist or free-form upload?

**Decision:** **B — free-form upload.** Same pattern as SOP-01 (no rigid checklist).

**Build implication:** No new tables; reuses existing `documents` upload flow. Admin requests "send your financial documents" through the dashboard; client uploads whatever they have.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

### 2.2 Admin upload on behalf?

**Decision:** **A — admin can upload, attribution stays with client.**

**Build implication:** Existing `documents.uploaded_by` field already tracks this; no schema change. The document still belongs to the client (`client_id`), `uploaded_by` records who put it there.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

---

## 3. Step 2 — QuickBooks setup

### 3.1 QB integration in v1?

**Decision:** **A — status only.** Germain manually flips a "QuickBooks configured" checkbox on the SOP-03 service card. No QB API integration in v1.

**Build implication:** Add a `qb_configured_at TIMESTAMPTZ` field on `client_services` (or generic `metadata` JSONB if we expect more service-specific flags later). Admin UI shows a checkbox + date when it was set.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

### 3.2 Client-visible info about QB?

**Decision:** **C — nothing client-visible about QB.** Client just sees the SOP-03 service is active; QB is internal.

**Build implication:** No QB section on the client portal.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

---

## 4. Step 3 — Ongoing bookkeeping (internal)

### 4.1 Bookkeeping volume metrics in admin?

**Decision:** **A — no, no metrics.**

**Build implication:** None. Bookkeeping is internal team work.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

---

## 5. Step 3.1 — Client query workflow

### 5.1 How is a query created?

**Decision:** **B — quick-create button from anywhere in the dashboard.**

**Build implication:**
- Global "Ask client" button in the admin layout (header or floating action)
- Click opens a dialog: pick client, type question, optional document/transaction reference, due date (default +3 business days)
- Saves to new `client_queries` table

**Schema:**
```
client_queries (
  id UUID PK,
  client_id UUID FK,
  client_service_id UUID FK NULL,  -- which service the query relates to (optional)
  question TEXT NOT NULL,
  context TEXT,                      -- optional reference (transaction, doc, etc.)
  due_date DATE NOT NULL,
  status TEXT ('open', 'answered', 'overdue'),
  response TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID FK auth.users NULL,
  created_by UUID FK auth.users,     -- which team member asked
  owner_id UUID FK auth.users,       -- who's responsible for follow-up; defaults to created_by
  created_at TIMESTAMPTZ
)
```

**Status:** ✅ ANSWERED — Germain, 2026-04-29

### 5.2 How does the client respond?

**Decision:** **A — pending-questions widget on `/portal` dashboard + dedicated `/portal/queries` page.**

**Build implication:**
- New `ClientQueries.tsx` page listing all queries for the logged-in client.
- New widget on `ClientDashboard.tsx` summarizing open queries.
- "Answer" form per query: text response + optional attachment.
- RPC `answer_client_query(p_id, p_response, p_attachment_id?)` (SECURITY DEFINER, similar to acknowledge_client_service).

**Status:** ✅ ANSWERED — Germain, 2026-04-29

### 5.3 Overdue handling?

**Decision:** **C — aggressive auto-reminder email at +3 business days past due.**

**Build implication:**
- A scheduled function (Supabase pg_cron daily) checks `client_queries WHERE status='open' AND due_date < now() - '3 business days'`.
- For each, flips status to `overdue` AND inserts an `email_log` row (status `pending`, template `query_overdue_reminder`) targeting the client.
- GHL picks up `email_log` pending rows and dispatches.
- Admin sees "Overdue queries" filter on the queries admin page.

**New email template** to seed: `query_overdue_reminder`.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

### 5.4 Who manages the queue?

**Decision:** **A — creator owns follow-up; Germain has master view.**

**Build implication:**
- `client_queries.owner_id` defaults to the team member who created the query.
- Admin queries page has filters: All / Mine / Overdue / By client.
- Germain (or any admin) can view all queries.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

### 5.5 Notify client on new query?

**Decision:** **A — email + in-portal notification.** Email routes via GHL (Phase 2).

**Build implication:**
- New email template `client_query_new` seeded.
- On query creation, insert a `notifications` row + an `email_log` row (status `pending`).
- In-portal notification surfaces immediately (uses existing notifications table).

**Status:** ✅ ANSWERED — Germain, 2026-04-29

---

## 6. Step 4 — Monthly meeting + quarterly report

### 6.1 Meeting scheduling?

**Decision:** **C — Calendly fully integrated** via webhook.

**Build implication (significant — new infrastructure, but reusable):**
- Each Germain-side admin (or a shared SOP-03 mailbox) gets a Calendly event type.
- Configure Calendly webhook to POST `invitee.created` to a new Edge Function `calendly-webhook`.
- Edge Function maps the event to a client (via the invitee's email matching `clients.email`) and creates a `client_meetings` row (we may rename `discovery_sessions` → `client_meetings` since it's now reused beyond SOP-00).
- Reusable for all SOPs with client meetings (SOP-00 discovery, SOP-03 monthly, SOP-07 advisory check-ins).

**Status:** ✅ ANSWERED — Germain, 2026-04-29 — adds ~1 session of work but unblocks self-scheduling everywhere.

### 6.2 Meeting notes location?

**Decision:** **A — dashboard is source of truth.** GHL gets a synced copy in Phase 2.

**Build implication:** Existing `discovery_sessions.outcome_notes` field works; just renamed to a generic table.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

### 6.3 Quarterly report?

**Decision:** **A — manual upload (v1).** Germain produces in QuickBooks/Excel, uploads as a `documents` row with new category `quarterly_report`. Auto-generation deferred until QB integration is built.

**Build implication:** New document category `quarterly_report` in the enum.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

### 6.4 "Next quarterly review" indicator?

**Decision:** **A — status indicator on the SOP-03 service card.**

**Build implication:** Compute "next quarter end + reporting buffer" from `client_services.started_at` or a fixed schedule. Display on the SOP-03 card both admin- and client-side.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

---

## 7. Step 4.1 — October P&L analysis

### 7.1 Auto-create the task each year?

**Decision:** **A — yes, auto-spawn on Oct 1.**

**Build implication:** First use of the recurring-task mechanic (see §9). The SOP-03 service has a recurring annual task: "October P&L analysis + IUL recommendation," due Oct 31, assigned to Germain.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

### 7.2 Specific artifact for the IUL recommendation?

**Default proposal (no explicit answer received — defaulting):** Yes — Germain uploads a "P&L analysis + IUL recommendation" document to the client's portal with new category `annual_iul_review`. Optional: a yes/no field on the task ("Recommended IUL contribution? Y/N + amount") for admin-side aggregation.

**Status:** 🟡 DEFAULTED — confirm with Germain before building.

---

## 8. Step 5 — Third-party accounting firm handoff

### 8.1 Frequency? *(resolves an open question from `_meetings/open_questions.md`)*

**Decision:** **Per-client, mixed cadence.** Germain's verbatim answer (paraphrased from verbal sync 2026-04-29):

> The frequency is either quarterly or semi-annually depending on how the client files taxes. Additionally, it is triggered by tax season for one-time clients who just want to get their books done on time (one-time service).

**Implications:**
1. **Each `client_services` row needs its own tax-firm cadence setting** — quarterly OR semi-annual, picked at activation by Germain.
2. **A separate service variant exists for "one-time tax-season clients"** — these clients only engage SGS in tax season for a single books-and-file pass. This is treated as a different mode of SOP-03 OR a different service.

**Build implication:**
- Add `client_services.tax_firm_cadence TEXT` (values: `quarterly` | `semi_annual` | `tax_season_only` | NULL for non-SOP-03).
- The recurring-task scheduler (see §9) reads this field and spawns the "Send tax-prep docs to firm" task at the right intervals per client.
- For `tax_season_only` clients, the task spawns once around Feb–March (configurable).

**⚠️ Pain point flagged:** the boundary between "SOP-03 tax-season-only client" and "SOP-04 one-time tax filing variant" is unclear. Both are described as one-time, both involve sending to the firm, both are tax-season-driven. **Logged in `pain_points.md`** for cross-SOP clarification with Germain + Abner before building the tax-season-only variant.

**Status:** ✅ ANSWERED — Germain, 2026-04-29 (with cross-SOP ambiguity flagged separately)

### 8.2 Documents sent — same per client or varies?

**Default proposal (no explicit answer — defaulting):** Standard package (bank statements, P&L, balance sheet, payroll reports, prior-year comparison). Optional adds: contracts, big-ticket invoices.

**Build implication:** Admin filters `documents` to "tax-prep package" via category or tag. New document category `tax_prep_package` OR multi-select tags.

**Status:** 🟡 DEFAULTED — confirm with Germain before building.

### 8.3 Track that firm received it?

**Default proposal (no explicit answer — defaulting):** Yes — internal-only task: "Send tax-prep docs to firm" with fields for sent date, firm contact email, delivery method, confirmation received. Same pattern as SOP-01 law-firm coordination.

**Status:** 🟡 DEFAULTED — confirm with Germain before building.

---

## 9. Recurring task mechanics (cross-cutting)

### 9.1 Cadence shape?

**Decision (implied by §7.1 answer):** Yes, build the recurring-task mechanic now. SOP-03 needs it for the October P&L task at minimum; the monthly meeting + quarterly review + tax-firm handoff also use it.

**Build implication:**

```sql
CREATE TABLE service_recurring_tasks (
  id UUID PK,
  service_id UUID FK,
  title TEXT,
  description TEXT,
  default_priority task_priority,
  cadence TEXT CHECK (cadence IN ('monthly','quarterly','semi_annually','annually','custom')),
  cadence_config JSONB,                  -- e.g., {"month": 10, "day": 1} for Oct 1 annually
  default_due_offset_days INT,           -- relative to spawn date
  read_per_client_setting TEXT,          -- NULL or e.g., 'tax_firm_cadence' to override cadence per client_service
  sort_order INT
);
```

A new daily Edge Function `spawn-recurring-tasks` (triggered by Supabase pg_cron) checks each active `client_services` row for due recurring tasks and spawns them. The `read_per_client_setting` field lets a recurring task pick its cadence from a per-client field (used by the tax-firm handoff per §8.1).

**Status:** ✅ ANSWERED — Germain, 2026-04-29 (architectural confirmation via §7.1).

### 9.2 What if the previous month's task wasn't completed?

**Decision:** **A — new task spawns regardless; old stays open with overdue badge.** No silent skipping.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

---

## 10. GHL pipeline mapping — STILL OPEN (Karen)

### 10.1 GHL pipeline stages?

**Status:** ⏳ OPEN — pending Karen.

**Working assumption (placeholder):** SOP-03 is mostly post-activation operational work, not a linear pipeline. Stages might be: Activated → QB Setup → Active (recurring) → Cancelled. Karen confirms.

### 10.2 GHL custom fields?

**Status:** ⏳ OPEN — pending Karen.

### 10.3 Email dispatch via GHL

Per the 2026-04-29 architectural decision, all SOP-03 emails route through GHL via `email_log` rows with `status='pending'`. Specifically:
- New query notifications
- Overdue query reminders
- Monthly meeting confirmations / reminders (via Calendly + GHL)
- Quarterly report ready notification
- Annual IUL recommendation notification

---

## 11. Pricing & billing

### 11.1 Pricing model?

**Decision:** **D — tiered + special case.** Germain's verbatim:

> The pricing model is tiered based on how many companies the client has us manage, OR charged as a single service if the client has us do this only for tax season.

**Implications:**
- **Tiered SOP-03 (recurring):** the tier is determined by # of companies managed. Tier dollar amounts TBD — need Germain to specify (e.g., 1 company = $X/mo, 2 = $Y/mo, 3+ = $Z/mo).
- **One-time SOP-03 (tax-season-only):** flat single-service charge (amount TBD).

**Build implication:**
- `services.base_price` doesn't capture tiers. Need either:
  - (a) Separate `services` rows per tier (e.g., "Managed Accounting — 1 Company," "Managed Accounting — 2 Companies"). Simple; Germain picks at activation.
  - (b) A `service_pricing_tiers` table with a `tier_select` field on `client_services`.
- Recommendation: **(a) for v1** — simpler, fewer schema changes. Migrate to (b) if pricing complexity grows.
- Also need a separate `services` row for "Tax-Season Only Bookkeeping" with its own one-time price.

**Status:** ✅ ANSWERED — Germain, 2026-04-29; **specific tier dollar amounts still needed.**

### 11.2 When billing starts?

**Decision (per §1.2 answer A):** **Auto-invoice on activation; client must pay before first month starts.** Recurring billing renews monthly thereafter.

**Status:** ✅ ANSWERED — Germain, 2026-04-29

### 11.3 Pause / cancel?

**Default proposal (not explicitly answered):** Admin can deactivate from `AdminClientDetail`, stops auto-billing next cycle. Past invoices stand.

**Status:** 🟡 DEFAULTED — confirm with Germain.

---

## 12. Implementation summary (locked, with TBDs)

### Database changes (proposed migration `<timestamp>_sop03_slice_schema.sql`)

- New tables:
  - `client_queries` (Step 3.1 workflow — full schema in §5.1)
  - `service_recurring_tasks` (cadence-driven task spawning — full schema in §9.1)
- Add columns to `client_services`:
  - `qb_configured_at TIMESTAMPTZ`
  - `tax_firm_cadence TEXT` (CHECK in: `quarterly`, `semi_annual`, `tax_season_only`, NULL)
  - Optional: a `metadata JSONB` for future per-service flags
- Document category enum additions: `quarterly_report`, `annual_iul_review`, `tax_prep_package`
- Rename `discovery_sessions` → `client_meetings` (or add a `kind` field) so it can be reused for monthly meetings
- New email templates: `query_overdue_reminder`, `client_query_new`, `quarterly_report_ready`
- New SECURITY DEFINER RPC: `answer_client_query(p_id, p_response, p_attachment_id?)`

### Seed (proposed `supabase/seeds/sop03_managed_accounting.sql`)

- Service rows: "Managed Accounting — 1 Company," "Managed Accounting — 2 Companies," "Managed Accounting — 3+ Companies," "Tax-Season Bookkeeping" (one-time). All with `<TBD price>` until Germain provides numbers.
- 4 task templates for SOP-03 (one-time onboarding tasks):
  - Request financial documents from client (high, +1d)
  - Configure QuickBooks + connect bank feeds (high, +5d)
  - Schedule first monthly meeting (medium, +14d)
  - Set tax-firm cadence per this client (high, +2d) — admin picks quarterly/semi-annual at task time
- 4 recurring tasks for SOP-03 (defined in `service_recurring_tasks`):
  - Monthly client meeting (cadence: monthly, day 5)
  - Quarterly P&L report prep (cadence: quarterly, day 10 of next quarter)
  - October P&L + IUL review (cadence: annually, October 1)
  - Send tax-prep docs to firm (cadence: read-from-`client_services.tax_firm_cadence`)

### Edge Functions

- `calendly-webhook` — receives `invitee.created` events, creates `client_meetings` rows
- `spawn-recurring-tasks` — daily pg_cron, scans active services, spawns due recurring tasks
- `flag-overdue-queries` — daily pg_cron, flips overdue status + queues reminder emails

### Admin UI

- "All Queries" page (filters: all / mine / overdue / by client)
- Global "Ask client" button (header)
- New query dialog
- SOP-03 service card on `AdminClientDetail` showing: query backlog count, QB checkbox, monthly meeting status, quarterly report status, tax-firm cadence picker, last-sent date

### Client UI

- `/portal/queries` page (answer flow)
- Pending-questions widget on `/portal` dashboard
- SOP-03 service card on `/portal/services` showing: meeting schedule, quarterly reports, tax-prep status

### Estimated scope: 5–7 sessions

This is the biggest slice yet — heavier than SOP-01 because of:
- New client-query workflow (whole feature)
- Recurring-task infrastructure (used by SOP-03/04/07 long term)
- Calendly webhook integration
- Pricing tier handling

---

## Decision log

| Date | Section | Decider | Answer |
|------|---------|---------|--------|
| 2026-04-29 | §1.1 | Germain | Both onboarding and upsell paths |
| 2026-04-29 | §1.2 | Germain | Auto-invoice on activation, must pay before first month |
| 2026-04-29 | §2.1 | Germain | Free-form upload, no checklist |
| 2026-04-29 | §2.2 | Germain | Admin can upload on behalf of client |
| 2026-04-29 | §3.1 | Germain | QB status only in v1, no API integration |
| 2026-04-29 | §3.2 | Germain | Nothing client-visible about QB |
| 2026-04-29 | §4.1 | Germain | No bookkeeping volume metrics |
| 2026-04-29 | §5.1 | Germain | Quick-create button anywhere in dashboard |
| 2026-04-29 | §5.2 | Germain | Pending-questions widget + dedicated portal page |
| 2026-04-29 | §5.3 | Germain | Auto-reminder email at +3 business days overdue |
| 2026-04-29 | §5.4 | Germain | Creator owns follow-up; Germain has master view |
| 2026-04-29 | §5.5 | Germain | Email + in-portal notification on new query |
| 2026-04-29 | §6.1 | Germain | Calendly fully integrated via webhook |
| 2026-04-29 | §6.2 | Germain | Dashboard is source of truth for meeting notes |
| 2026-04-29 | §6.3 | Germain | Manual upload of quarterly report (v1) |
| 2026-04-29 | §6.4 | Germain | Status indicator on SOP-03 service card |
| 2026-04-29 | §7.1 | Germain | Auto-spawn October P&L task on Oct 1 |
| 2026-04-29 | §8.1 | Germain | Per-client cadence (quarterly OR semi-annual based on filing pattern); plus tax-season-only one-time variant |
| 2026-04-29 | §9.2 | Germain | New task spawns regardless; old stays open as overdue |
| 2026-04-29 | §11.1 | Germain | Tiered by # of companies (numbers TBD); plus single-service charge for tax-season-only |
| 2026-04-29 | §11.2 | Germain | Bills on activation; recurring monthly thereafter |
| TBD | §7.2 | Germain | _defaulted_ |
| TBD | §8.2 | Germain | _defaulted_ |
| TBD | §8.3 | Germain | _defaulted_ |
| TBD | §11.1 dollar amounts | Germain | _pending — get tier amounts_ |
| TBD | §11.3 | Germain | _defaulted_ |
| TBD | §10.1, §10.2 | Karen | _pending GHL pipeline definition_ |
