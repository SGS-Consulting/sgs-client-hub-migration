# SOP-04 Tax & Compliance Strategy — Dashboard Design

**Status:** **LOCKED 2026-05-01** with Germain + Abner (verbal sync via Javi). All non-Karen sections answered. §8 (one-time variant) remains BLOCKED — Germain/Abner did not converge on the SOP-03/SOP-04 tax-season boundary; logged to keep moving.
**Reference:** `Processos_internos/04_impuestos_compliance/sop.md`
**Pipeline (GHL):** `Tax & Compliance Strategy`
**Last updated:** 2026-05-01

---

## Hard blockers (resolve before implementation starts)

1. **Worker classification policy.** SOP-04 Paso 1 asks Germain to "identify workers eligible for reclassification from employee to contractor," but SGS has no defined policy for that classification. Already logged in `_meetings/open_questions.md` (SOP-04 section). Without an answer from Abner, Step 1 can't be executed in production — the dashboard would be storing a decision the team hasn't agreed how to make. Default proposal in §2.1.

2. **Cross-SOP boundary: SOP-03 "tax-season-only" vs. SOP-04 "one-time tax filing."** Logged in `pain_points.md` 2026-04-29. Both describe the same operational scenario (client engages SGS once during tax season for books + filing). The one-time variant of SOP-04 (§8) is **blocked** until Germain + Abner align on which SOP owns this flow. The recurring SOP-04 service (§2–§7) can proceed independently.

---

## Quick reference — locked answers (2026-05-01)

| Area | Decision |
|------|----------|
| Activation paths (standalone) | Both: SOP-00 onboarding *and* upsell on existing client |
| Activation paths (bundled) | **Auto-spawned when client activates one of the 3 recurring SOP-03 tiers** (Managed Accounting 1/2/3+ Companies); auto-deactivated when SOP-03 is deactivated |
| Pricing model | **Not separately charged** when bundled with SOP-03 recurring; **case-by-case price** when sold standalone (Abner sets per-client at activation, like other one-time SGS services). Tax-season-only SOP-03 variant does NOT include SOP-04. |
| Billing | Standalone: auto-invoice on activation, client must pay before Step 1. Bundled: no separate invoice (rolled into SOP-03 monthly fee). |
| Worker data model | New `client_workers` table — **symmetric CRUD: both client and Germain can add/edit/terminate workers**; full audit trail (who changed what, when) on every mutation. SSN/EIN never visible to client. |
| Worker classification | **IRS Common Law Test** — 5–7 question intake checklist per worker; answers stored on the worker record so the decision is auditable later. Per-worker boolean `is_contractor` derived from the answers. |
| W-9 collection | **Client sends a tokenized form to each worker** (worker fills the structured form via a public anonymous link, similar to `/intake`); system stores structured fields and can auto-generate the W-9 PDF. Workers do NOT have portal accounts — token-based form access only. |
| 1099 generation (v1) | **Manual upload by Germain at year-end** (PDF per contractor); client downloads from portal + email notification. Electronic delivery only (no USPS paper mail in v1). Auto-gen deferred to v1.5 (requires QuickBooks API integration — separate slice). |
| IRS submission tracking | Out of scope for v1 dashboard; Germain handles outside the system. Capture `filed_with_irs_at TIMESTAMPTZ` on a small `tax_filings` log table. |
| Initial tax-strategy meeting | Internal-only `discovery_sessions` row with `kind='tax_strategy_initial'` — one-time on activation. |
| Quarterly tax-strategy meeting | **Quarterly recurring**, internal only (Abner + Germain), no Calendly self-scheduling. Spawned via `service_recurring_tasks`; outcome captured in dashboard, updates `tax_strategies`. |
| Tax-strategy notes | New table `tax_strategies` (per-client, internal-only) capturing strategies identified + outcomes per quarter. |
| Tax-strategy client visibility | **High-level only** — client sees a "N tax strategies in place" count badge on their SOP-04 card. Strategy specifics, rationale, and savings estimates are internal-only. |
| Monthly worker DB maintenance | Recurring task spawned monthly; admin reviews `client_workers`, requests W-9s from new ones (sends tokenized form), marks departed. No automatic stale-worker flag in v1. |
| Client portal | Workers tab — client adds/edits/terminates workers; sees W-9 status per worker; downloads 1099s when available; sees high-level strategy count on the SOP-04 card. No tasks, no SSN, no strategy details. |
| Internal-only task flag | **NOT NEEDED** — clients have no SELECT policy on `tasks` (architecture-level: clients never see tasks; surfaces are service cards / docs / queries / notifications). See §9. |
| GHL pipeline | Stages TBD with Karen (placeholder: Activated → Workers Configured → Active recurring → Cancelled) |
| One-time tax-filing variant (§8) | **STILL BLOCKED** — Germain + Abner did not converge on the SOP-03/SOP-04 tax-season boundary in this round; logged as remaining open question (see §8 + `pain_points.md` 2026-04-29). |

---

## How to use this doc

1. Javi takes these questions to Germain (and a few to Abner where flagged).
2. Answers captured below, with date + decider's name in the Decision log at the bottom.
3. Once §2–§7 are answered, implementation can start on the recurring service.
4. §8 (one-time variant) waits on the cross-SOP pain-point resolution.
5. §10 (GHL) is for Karen, same pattern as `sop03_design.md` §10.

---

## 1. Service activation

### 1.1 How does Germain know a client wants SOP-04?

**Default proposal:** **C — both paths supported**, identical to SOP-03 §1.1.
- From SOP-00 onboarding, when intake indicates need for tax strategy / 1099 management.
- As an upsell on an existing client (e.g., a client with SOP-03 who adds SOP-04 a year later).

**Build implication:** Reuses existing service-activation flow; no new UI.

**Status:** OPEN — confirm with Germain.

### 1.2 Auto-billing on activation?

**Default proposal:** **A — auto-invoice on activation; client must pay before Step 1 starts.** Same as SOP-03 §1.2.
- Invoice amount: $5,000/mo per managed company per global pricing (see §11.1).
- Activation gated: Germain cannot start worker reclassification until invoice is paid.

**Status:** OPEN — confirm with Germain.

---

## 2. Step 1 — Worker reclassification & W-9 collection

### 2.1 Worker classification policy

**Hard blocker — see top of doc.** SOP-04 Paso 1 requires identifying which workers qualify as contractors vs. employees. SGS has no documented policy.

**Default proposal (for Abner — Germain can sanity-check):** Adopt IRS Common Law Test as the baseline (behavioral control, financial control, type of relationship). Build a 5–7 question intake checklist per worker; if the answers tip "contractor," the worker is reclassifiable. Store the answered checklist on the worker record so the decision is auditable later.

**Build implication if approved:**
- New table `worker_classification_responses` linked to `client_workers` (one row per worker, captures the IRS test answers).
- Admin UI: a wizard during worker intake.
- Output: `client_workers.is_contractor` boolean + the saved responses.

**Status:** OPEN — needs Abner. Without a policy this step cannot run in production; the dashboard is just storing a decision SGS doesn't know how to make.

### 2.2 Worker data model

**Default proposal:** New `client_workers` table:
```
client_workers (
  id UUID PK,
  client_id UUID FK,
  full_name TEXT NOT NULL,
  email TEXT,
  worker_type TEXT CHECK (worker_type IN ('employee','contractor')),
  is_contractor BOOLEAN,                       -- result of classification (§2.1)
  tax_id_last4 TEXT,                            -- only last 4 digits stored; full SSN/EIN lives on the W-9 doc
  w9_document_id UUID FK documents NULL,
  start_date DATE,
  end_date DATE NULL,                           -- set when worker leaves
  status TEXT CHECK (status IN ('active','terminated')) DEFAULT 'active',
  notes TEXT,
  created_by UUID FK auth.users,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**RLS:**
- Admin: full access.
- Client: SELECT on own workers (`client_id = current_client_id()`); cannot SELECT `tax_id_last4` (use a view or column-level grant). Workers are not portal users themselves.
- Documents (W-9 PDFs): admin only — never client-visible.

**Status:** OPEN — confirm with Germain that `client_workers` is the right shape and that clients should be able to maintain their own list (default: yes, for the monthly maintenance flow §6).

### 2.3 W-9 collection mechanism

**Default proposal:** **A — client uploads completed W-9 PDF**, same pattern as SOP-01 docs. Client downloads blank W-9 from a portal link (or SGS emails it), fills it out (paper or PDF editor), uploads to the worker's record. Germain verifies and marks "W-9 on file."

**Build implication:**
- New document category `w9_form`.
- Upload UI on the client-portal Workers tab — per-worker upload slot.
- Admin verification: a "W-9 verified" checkbox on `client_workers` after Germain reviews.

**Alternative:** structured online form that generates the W-9 PDF (heavier; deferred to v2 once we have a real volume of W-9s).

**Status:** OPEN — confirm with Germain.

### 2.4 What about the worker's role in the process?

**LOCKED 2026-05-01:** Workers are **not portal users** (no login, no dashboard access). They DO interact with the system through a single tokenized form link to fill out their W-9 (see §2.5). Once the W-9 is submitted, the worker has no further interaction.

---

### 2.5 Worker W-9 collection — tokenized form workflow

**LOCKED 2026-05-01.** Replaces the original §2.3 "client uploads completed W-9 PDF" approach. The flow:

1. **Client adds worker** to their portal (name, email, type).
2. **Client clicks "Request W-9"** on the worker record. System generates a one-time-use signed token, writes a `worker_w9_invites` row, queues an email (template `worker_w9_request`) addressed to the **worker** (not the client) with a magic link to `/w9/<token>`.
3. **Worker opens the link** (no login required, public route similar to `/intake`). Renders a structured W-9 form: legal name, business name, federal tax classification (sole prop / single-member LLC / C-Corp / S-Corp / partnership / trust / other), exemptions, address, requester info, TIN (SSN or EIN), signature (typed acknowledgment + IP/timestamp).
4. **Worker submits.** Edge Function (or RPC with anon JWT) validates the token, writes the structured fields to `client_workers_w9_data` (or JSONB column), marks the invite `completed`, and either auto-generates the W-9 PDF and stores it under the worker's record, or stores just the structured data and renders the PDF on demand.
5. **Germain sees "W-9 received"** on the worker record + verifies; once verified, the W-9 is "on file."
6. **Token expires** after N days (default 30) or single use; client can re-request.

**Build implications:**
- New table `worker_w9_invites` (id, worker_id, token, expires_at, status, sent_at, completed_at).
- New public route `/w9/<token>` (no auth) — analogous to `/intake`.
- New Edge Function (or anon RPC) for token validation + W-9 ingest.
- Structured W-9 fields stored either on `client_workers` (JSONB) or in a separate `client_workers_w9_data` table (cleaner separation; admin-only RLS).
- Email template `worker_w9_request` targets the **worker's email**, not the client.
- PDF generation: lazy on-demand (server-side render) for v1 — no need to pre-generate every PDF.

**Why this matters:** with structured W-9 data we can later auto-generate 1099s (currently deferred to v1.5 per Q2.4 — needs QuickBooks payment integration to know amounts paid per contractor).

---

## 3. Step 2 — 1099 data & year-end filing

### 3.1 1099 generation in v1?

**Default proposal:** **A — manual upload at year-end.** Germain generates 1099-NEC / 1099-MISC in QuickBooks (or external tool like Track1099) and uploads each contractor's 1099 to the worker's record. Client downloads from portal.

**Build implication:**
- New document category `1099_form`.
- Per-worker upload slot for 1099 (admin-only).
- Client portal Workers tab shows "1099 available" indicator + download link once attached.

**Auto-gen deferred** until W-9 data is structured (§2.3 v2 path) AND payment data is connected (QuickBooks API integration — same constraint as SOP-03 §6.3 quarterly report).

**Status:** OPEN — confirm with Germain that manual is acceptable for v1.

### 3.2 1099 sending — physical or electronic?

**Default proposal:** Electronic via portal download + email notification. Per SOP, "formularios son enviados a cada contratista al finalizar el año" — no specified channel.

**Build implication:** New email template `form_1099_ready` queued in `email_log` when Germain attaches the 1099. Client (or worker if §2.4 changes) receives notification.

**Status:** OPEN — confirm with Germain. May need IRS-compliance review (1099s often have specific delivery requirements like USPS for paper).

### 3.3 IRS submission tracking

**Default proposal:** Out of scope for the dashboard in v1. Germain handles IRS e-filing (or paper) outside the system. Track the date Germain marked "filed with IRS" via a `filed_with_irs_at TIMESTAMPTZ` field on a `tax_filings` log table.

**Status:** OPEN — confirm with Germain.

---

## 4. Step 3 — Initial tax-strategy meeting (internal)

### 4.1 Tracked in dashboard?

**Default proposal:** **A — yes, as a `client_meetings` row with `kind='tax_strategy_initial'`** (extending the kind enum). Internal-only — not visible to client. One-time, spawned automatically when SOP-04 is activated (after invoice paid).

**Build implication:**
- Add `tax_strategy_initial` to `discovery_sessions.kind` CHECK constraint.
- Add a recurring-task-template-style entry that spawns this single meeting on activation (or just a regular task template for SOP-04 that creates the meeting row).
- RLS: admin-only when `kind` is in the internal set.

**Status:** OPEN — confirm with Germain.

### 4.2 What's the deliverable from the meeting?

**Default proposal:** A `tax_strategies` row capturing the strategies identified in the meeting. New table:
```
tax_strategies (
  id UUID PK,
  client_id UUID FK,
  client_service_id UUID FK,
  identified_at DATE,
  strategy_summary TEXT NOT NULL,           -- e.g., "Reclassify 8 W-2 employees to 1099 contractors"
  rationale TEXT,                            -- why this is right for this client
  expected_savings_usd NUMERIC,
  status TEXT CHECK (status IN ('proposed','active','implemented','retired')),
  created_by UUID FK auth.users,
  created_at TIMESTAMPTZ
)
```

Internal-only (RLS admin-only). Quarterly meetings (§5) update / append to this table.

**Status:** OPEN — confirm with Germain. Rationale: this directly addresses the parallel SOP-01 pain point ("structure evaluation has no audit trail") at the SOP-04 level.

---

## 5. Step 4 — Quarterly tax-strategy meeting (recurring, internal)

### 5.1 How is it scheduled?

**Default proposal:** **Recurring task** via the `service_recurring_tasks` mechanic from SOP-03 §9. Cadence: quarterly, day 5 of next quarter (matches the SOP-03 quarterly P&L review timing).

**Build implication:**
- Seed a `service_recurring_tasks` row for the SOP-04 service: title "Quarterly tax-strategy review with Abner+Germain," cadence `quarterly`, internal-only flag.
- Spawned task creates a `client_meetings` row with `kind='tax_strategy_quarterly'` when Germain logs the meeting outcome.

**Status:** OPEN — confirm with Germain.

### 5.2 Self-scheduling via Calendly?

**Default proposal:** **No** — these are internal SGS meetings (Abner+Germain), not client-facing. Schedule out of band; just log the outcome in the dashboard.

**Status:** OPEN — confirm with Germain. Could change if Abner wants to use Calendly for internal scheduling too.

### 5.3 Meeting-outcome capture

**Default proposal:** Same shape as `discovery_sessions.outcome_notes`. Plus, the quarterly review can update the `tax_strategies` table (§4.2) — flip a strategy from `proposed` → `active` → `implemented`.

**Status:** OPEN — confirm with Germain.

---

## 6. Step 5 — Monthly worker DB maintenance

### 6.1 How is the maintenance triggered?

**Default proposal:** **Recurring task** spawned monthly on day 1, assigned to Germain. Title: "Review and update worker list for `<client name>`." Admin opens the SOP-04 service card, sees the worker list with last-update dates, and processes additions/terminations.

**Build implication:** Seed a `service_recurring_tasks` row: cadence `monthly`, day 1, default due offset +5 days.

**Status:** OPEN — confirm with Germain.

### 6.2 Client involvement

**Default proposal:** Client portal has a Workers tab where they can:
- Add a new worker (name, email, type) — triggers a notification to Germain to start onboarding (W-9 collection, classification).
- Mark a worker as departed (sets `end_date`, flips `status` to `terminated`).
- See current workers + W-9 status.
- Download 1099s when available (§3.1).

Client does **not** see classification (§2.1) or `tax_id_last4`.

**Status:** OPEN — confirm with Germain. Alternative: admin-only worker management; client just emails changes (lower self-service, simpler).

### 6.3 Stale-worker detection

**Default proposal:** No automatic flag in v1. Germain reviews monthly per the recurring task. Future v2: a `last_seen_paid_at` field synced from QuickBooks could auto-flag inactive contractors.

**Status:** OPEN — confirm with Germain.

---

## 7. Tax-strategy notes & artifacts

### 7.1 Where do strategies live?

Covered in §4.2: new `tax_strategies` table, internal-only. Quarterly meetings (§5) keep it current.

### 7.2 Client visibility?

**Default proposal:** **B — high-level only.** Client sees a "Tax strategies in place: <count>" indicator on the SOP-04 service card. Specific strategies, rationale, and savings estimates are internal-only.

**Status:** OPEN — confirm with Germain. Alternative A (full transparency) might be a feature client values; alternative C (hidden entirely) is simplest.

---

## 8. One-time variant — Tax Filing por Deadline

**⚠️ BLOCKED on cross-SOP boundary resolution** (see Hard blockers §2 + `pain_points.md` 2026-04-29 entry).

Once Germain + Abner align on whether tax-season-only clients are SOP-03's "Tax-Season Bookkeeping" or SOP-04's "Tax Filing por Deadline" (or both — combined service), this section gets filled in. **Do not implement until resolved.**

When unblocked, expected questions:

- 8.1 Bookkeeping organization (Paso 1) — reuses SOP-03 free-form upload flow, or a more rigid checklist for tax filings?
- 8.2 Send-to-firm tracking (Paso 2) — same internal-only third-party-coordination block as SOP-01 / SOP-03 §8.3.
- 8.3 Extension tracking (Paso 3) — new field on a `tax_filings` row capturing extension request date + outcome.
- 8.4 Filing confirmation (Paso 4) — admin marks filed, queues a `tax_filing_completed` email, closes the service via `acknowledge_client_service` pattern.
- 8.5 Pricing — flat single-service charge (amount TBD with Germain).

---

## 9. Recurring task mechanics — reuse from SOP-03

No new mechanics needed. SOP-04 reuses everything built in SOP-03 §9:
- `service_recurring_tasks` table — adds rows for SOP-04 (Step 4 quarterly meeting, Step 5 monthly worker DB review, year-end 1099 task).
- `spawn_recurring_tasks()` cron — already runs daily, picks up SOP-04 task definitions automatically.

**Internal-only flag:** **NOT NEEDED.** Verified 2026-05-01: the architecture punted client task-visibility from the baseline migration (`20260426032128…sql:427` comment: `-- Clients do NOT see internal tasks`) — clients have no SELECT policy on `tasks` and never see them in the portal. SOP-00, SOP-01, SOP-03 all surface client-facing work via service cards, document tabs, queries, notifications — not via a client-side task list. SOP-04 follows the same pattern (§6.2 Workers tab, 1099 download, classification status — no task list). So Step 3 + Step 4 internal-only meetings are hidden from the client by virtue of *all* tasks being hidden; no per-task flag required. Confirmed permanent design choice with Javi 2026-05-01.

**Status:** RESOLVED 2026-05-01 — no schema change.

---

## 10. GHL pipeline mapping — STILL OPEN (Karen)

### 10.1 Pipeline stages

**Status:** OPEN — pending Karen.

**Working assumption (placeholder):** SOP-04 is mostly post-activation operational work, similar to SOP-03. Stages: Activated → Workers Configured → Active (recurring) → Cancelled. Karen confirms.

### 10.2 GHL custom fields

**Status:** OPEN — pending Karen.

### 10.3 Email dispatch via GHL

Same architecture as SOP-03 §10.3 — emails route through `email_log` rows with `status='pending'`; GHL picks them up. New SOP-04 templates expected:
- `worker_w9_request` — sent to client when Germain needs a new contractor's W-9
- `form_1099_ready` — sent at year-end when 1099 is available
- `quarterly_strategy_review_summary` — optional, summarizes the quarterly meeting outcome (if §7.2 alternative A is chosen)

---

## 11. Pricing & billing

### 11.1 Pricing model

**Default proposal:** Flat $5,000/month per managed company, per `Processos_internos/CLAUDE.md` §5 global pricing model. **Not** tiered like SOP-03 (which is tiered by # of companies). Rationale: SOP-04 cost scales with worker count, but recurring revenue model is per company; if a client has multiple companies and multiple SOP-04 services, each is its own $5,000/mo line item.

**Build implication:** Single `services` row "Tax & Compliance Strategy — Recurring" at $5,000/mo. No tier table needed for v1.

**Status:** OPEN — confirm with Germain. If pricing actually scales with worker count, we'd need either a separate tier table or a per-client override.

### 11.2 When billing starts

**Default proposal:** **A — auto-invoice on activation; client must pay before Step 1 starts.** Same as SOP-03 §11.2.

**Status:** OPEN — confirm with Germain.

### 11.3 Pause / cancel

**Default proposal:** Admin can deactivate from `AdminClientDetail` → stops auto-billing next cycle. Past invoices stand. Active workers stay in the DB but no new tasks spawn.

**Status:** OPEN — confirm with Germain.

---

## 12. Implementation summary (proposed, pending answers)

### Database changes (proposed migration `<timestamp>_sop04_slice_schema.sql`)

- **New tables:**
  - `client_workers` (full schema in §2.2)
  - `tax_strategies` (full schema in §4.2)
  - `worker_classification_responses` (only if §2.1 is answered with the IRS-test approach)
  - `tax_filings` (small audit log: filing year, filed_with_irs_at, filing method, extension_requested_at, etc.)
- **Add columns / extend enums:**
  - `discovery_sessions.kind` CHECK constraint extended with `tax_strategy_initial`, `tax_strategy_quarterly`.
  - `documents` `category` enum: add `w9_form`, `1099_form`.
  - `tasks` (or `service_recurring_tasks`) `is_internal BOOLEAN` flag if not already present.
- **New email templates:** `worker_w9_request`, `form_1099_ready`, `quarterly_strategy_review_summary` (optional).
- **RLS:** admin-only for `client_workers.tax_id_last4`, `worker_classification_responses`, `tax_strategies`, `tax_filings`. Client SELECT on workers/1099s minus sensitive columns.

### Seed (proposed `supabase/seeds/sop04_tax_compliance.sql`)

- 1 service row: **`Tax & Compliance Strategy`** with `base_price = 0` (zero-priced because bundled with SOP-03 recurring tiers; admins set a per-client override on `client_services.price_override` for standalone sales — adds new column).
- Auto-activation cascade: when an admin activates a recurring SOP-03 tier (`Managed Accounting — 1/2/3+ Companies`), system auto-activates a SOP-04 `client_services` row for the same client at $0; when SOP-03 is deactivated, SOP-04 is auto-deactivated. Implemented as app-code in `AdminClientDetail.activateService` / `deactivateService` (consistent with current SOP-03 pattern). Tax-Season Bookkeeping does NOT auto-spawn SOP-04.
- Task templates for SOP-04 onboarding (one-time, all internal — clients don't see tasks):
  - Schedule initial tax-strategy meeting (high, +3d)
  - Collect existing worker list from client (high, +5d) — but most workers will be added by client directly via portal
  - Run IRS-Common-Law-Test classification per worker (high, +10d)
  - Confirm all required W-9s requested (high, +15d)
- Recurring tasks (`service_recurring_tasks`):
  - Quarterly tax-strategy meeting (cadence: quarterly, day 5)
  - Monthly worker DB review (cadence: monthly, day 1)
  - Year-end 1099 generation + send (cadence: annually, December 1)

### Database — new tables (proposed migration `<timestamp>_sop04_slice_schema.sql`)

- **`client_workers`** — per-client worker roster. Fields per §2.2 plus `created_by`/`updated_by` and a paired `client_workers_audit` log table (or trigger-based `client_workers_history` table) for the audit trail (Q2.2 hybrid CRUD requires it).
- **`worker_classification_responses`** — IRS Common Law Test answers per worker (5–7 questions; one row per worker). Drives `client_workers.is_contractor`.
- **`worker_w9_invites`** — tokenized form invites (token, expires_at, status, sent_at, completed_at). One row per "Request W-9" click.
- **`client_workers_w9_data`** *(or JSONB column on `client_workers`)* — structured W-9 fields submitted via the worker form. Admin-only RLS.
- **`tax_strategies`** — per §4.2 schema. Internal-only.
- **`tax_filings`** — small audit log (`filing_year`, `filed_with_irs_at`, `extension_requested_at`, `filing_method`, etc.) per §3.3.
- **Add columns/enums:**
  - `discovery_sessions.kind` CHECK extended with `tax_strategy_initial`, `tax_strategy_quarterly`.
  - `documents.category` enum: add `w9_form`, `1099_form`.
  - `client_services.price_override NUMERIC NULL` — for standalone SOP-04 sales (Abner's case-by-case price; null means use `services.base_price`).
- **RLS:** admin-only for `worker_classification_responses`, `client_workers_w9_data`, `tax_strategies`, `tax_filings`, `worker_w9_invites`. Client SELECT/INSERT/UPDATE on `client_workers` (their own); cannot SELECT W-9 data or classification responses. The `/w9/<token>` route bypasses RLS via Edge Function with service role.
- **No `is_internal` flag on tasks** — see §9 (architecture-level: clients never see tasks).

### Seed (proposed `supabase/seeds/sop04_tax_compliance.sql`)

- 1 service row: `Tax & Compliance Strategy` at `base_price = 0`.
- 4 onboarding task templates (above).
- 3 recurring task definitions (above).
- 4 IRS Common Law Test default questions (or seed them when the migration creates `worker_classification_questions`).
- 3 email templates: `worker_w9_request` (to worker), `1099_ready` (to client), `quarterly_strategy_review_summary` (optional, internal).

### Edge Functions

- **NEW: `worker-w9-submit`** — public (no JWT), validates the token from `worker_w9_invites`, ingests structured form payload, writes to `client_workers_w9_data`, marks invite `completed`, returns success. Pattern: same as the planned `intake-submit` but token-scoped.
- Reuses `spawn-recurring-tasks` (SOP-03) and `email_log → GHL` dispatch (Phase 2 — GHL fires the `worker_w9_request` email).
- One-time variant (§8) may need a tax-firm coordination function if it ends up looking like SOP-03 §8.3 — defer until §8 unblocks.

### Admin UI

- SOP-04 service card on `AdminClientDetail` showing: worker count + W-9-collected ratio, classification status, last quarterly meeting, next 1099 deadline countdown.
- New `Workers` panel in admin per-client view: list of `client_workers` with classification, W-9 status, 1099 status; add/edit/terminate actions; "Request W-9" button per worker.
- New `tax_strategies` list per client (internal-only): summary of strategies, status, expected savings.
- Audit-log viewer for `client_workers` changes (per the audit-trail requirement from Q2.2).
- Updates to global recurring-task admin views — no SOP-specific work, just inherit from SOP-03 mechanics.

### Client UI

- New `Workers` tab inside `ClientServices.tsx` (or a separate `/portal/workers` route): list workers, add new, edit, mark departed; per-worker W-9 status + "Request W-9" button (sends the tokenized form to the worker). No SSN, no classification visible. Audit log viewable.
- New PUBLIC route `/w9/<token>` — anonymous structured W-9 form, single-use.
- SOP-04 service card on `/portal/services` showing: workers count, W-9 status indicator, 1099 readiness indicator, "N tax strategies in place" count badge.

### Estimated scope

**~7–9 sessions** for the locked v1 (was 5–7 in pre-draft; bumped because of the worker-tokenized-form workflow + audit trail + auto-activation cascade). Breakdown:
- Migration + seed: ~1 session
- `client_workers` admin + client CRUD with audit: ~1.5 sessions
- IRS Common Law Test classification wizard: ~1 session
- Worker W-9 tokenized form + Edge Function + structured field rendering: ~2 sessions
- Tax-strategy meetings + `tax_strategies` table + recurring tasks: ~1 session
- 1099 manual upload + client download UX: ~0.5 session
- Auto-activation cascade with SOP-03 + standalone sale UX: ~0.5 session
- Smoke test + UI polish: ~0.5 session

**Excluded (separate slices):**
- 1099 auto-generation from system data — needs QuickBooks API integration (Phase 2-ish, ~3–4 sessions of its own).
- One-time tax-filing variant (§8) — still BLOCKED on the SOP-03/SOP-04 boundary.

---

## Open questions — remaining

**For Karen (non-blocking; can be wired during Phase 2 GHL bridge):**
1. §10.1 — GHL pipeline stages for SOP-04?
2. §10.2 — GHL custom fields needed?

**For Germain + Abner (blocks §8 only — recurring SOP-04 v1 is unblocked):**
3. §8 — SOP-03 vs SOP-04 tax-season boundary. Did not converge in 2026-05-01 sync. Logged as remaining open question; revisit in a dedicated 15-min sync between Germain + Abner.

**All other questions: ANSWERED 2026-05-01 (see Decision log below).**

## Reusable mechanics inherited from prior slices (no design needed)

| Mechanic | First built in | Reused for SOP-04 |
|----------|---------------|-------------------|
| Service activation flow | Phase 1 (SOP-00) | Same flow, new task templates |
| Auto-invoice on activation | SOP-03 | Same |
| Client query workflow | SOP-03 | Useful for tax questions ad-hoc |
| Recurring-task spawning | SOP-03 | Quarterly meetings, monthly maintenance, year-end 1099 |
| Internal-only task flag | SOP-01 (verify) | Hides Step 3/4 internal meetings from client |
| Third-party-coordination block | SOP-01 | If §8 unblocks, use for accounting-firm hand-off |
| Calendly webhook | SOP-03 (just shipped 2026-04-30) | Not used for SOP-04 internal meetings; **reuse for one-time variant client-facing meetings if §8 needs them** |
| Email templates + email_log queue | SOP-01 | New SOP-04 templates queued, GHL dispatches |
| Service-closure RPC | SOP-01 | Reused for one-time variant when unblocked |
| Document categories enum | SOP-00 | Add `w9_form`, `1099_form` |

---

## Decision log

| Date | Section | Decider | Answer |
|------|---------|---------|--------|
| 2026-05-01 | §1.1 (activation paths) | Germain (via Javi) | C — both: SOP-00 onboarding *and* upsell on existing clients (applies only to standalone sales; bundled SOP-04 auto-spawns when SOP-03 recurring tier activates). |
| 2026-05-01 | §1.2 / §11.2 (billing trigger) | Germain (via Javi) | A — auto-invoice on activation, client must pay before Step 1. Applies only to standalone sales; bundled SOP-04 has no separate invoice. |
| 2026-05-01 | §11.1 (pricing model) | Germain (via Javi) | **NOT separately charged** when bundled with SOP-03 recurring tiers (1/2/3+ Companies). **Case-by-case price** when sold standalone (Abner sets per-client at activation). Tax-Season SOP-03 variant does NOT include SOP-04. |
| 2026-05-01 | §11.3 (pause/cancel) | Germain (via Javi) | A — admin deactivates from `AdminClientDetail`; stops auto-billing next cycle, past invoices stand, active workers stay in DB but no new tasks spawn. Bundled SOP-04 also auto-deactivates when SOP-03 deactivates. |
| 2026-05-01 | §2.1 (worker classification policy) | Abner (via Javi) | A — adopt IRS Common Law Test, 5–7 question intake checklist per worker; answers stored on the worker record so the decision is auditable later. Per-worker boolean `is_contractor` derived from the answers. |
| 2026-05-01 | §2.2 / §6.2 (worker data model + management) | Germain (via Javi) | C+ — **symmetric CRUD: both client and Germain can add/edit/terminate workers.** Full audit trail (who changed what, when) on every mutation. SSN never visible to client. |
| 2026-05-01 | §2.3 / §2.5 (W-9 collection) | Germain (via Javi) | B — **structured form**, but with the workflow refinement: client clicks "Request W-9" → system emails worker a tokenized magic link → worker fills structured form at `/w9/<token>` → system stores structured fields + can auto-generate W-9 PDF. Workers do NOT have portal accounts; token-based form access only. See §2.5. |
| 2026-05-01 | §2.4 (worker portal access) | Germain (via Javi) | Workers are NOT portal users. Token-based form access only (§2.5). |
| 2026-05-01 | §3.1 (1099 generation v1) | Germain (via Javi) | A — manual upload by Germain at year-end. Auto-gen deferred to v1.5 (requires QuickBooks API integration — separate slice). |
| 2026-05-01 | §3.2 (1099 sending) | Germain (via Javi) | A — electronic via portal download + email notification. No USPS paper mail in v1. |
| 2026-05-01 | §3.3 (IRS submission tracking) | Germain (via Javi) | Out of scope for v1; capture only `filed_with_irs_at TIMESTAMPTZ` on `tax_filings` log table. |
| 2026-05-01 | §4.1 (initial tax-strategy meeting) | Germain (via Javi) | Tracked as internal `discovery_sessions` row with `kind='tax_strategy_initial'`; one-time on activation. |
| 2026-05-01 | §4.2 (tax-strategy notes table) | Germain (via Javi) | A — yes, build the `tax_strategies` table per the proposed schema. Internal-only; quarterly meetings update it. |
| 2026-05-01 | §5.1 (quarterly meeting cadence) | Germain (via Javi) | A — quarterly recurring (cadence: quarterly, day 5), internal-only (Abner + Germain), via `service_recurring_tasks`. |
| 2026-05-01 | §5.2 (Calendly for quarterly meeting) | Germain (via Javi) | No — internal SGS meetings, scheduled out of band; just log outcome in dashboard. |
| 2026-05-01 | §5.3 (meeting outcome capture) | Germain (via Javi) | Same shape as `discovery_sessions.outcome_notes`; updates `tax_strategies` (flip strategy status proposed → active → implemented). |
| 2026-05-01 | §6.1 (monthly worker DB maintenance) | Germain (via Javi) | Recurring task spawned monthly (day 1, +5d due), assigned to Germain. |
| 2026-05-01 | §6.3 (stale-worker auto-flag) | Germain (via Javi) | No automatic flag in v1. Germain reviews monthly via the recurring task. |
| 2026-05-01 | §7.2 (tax-strategy client visibility) | Germain (via Javi) | B — high-level only. Client sees "N tax strategies in place" count badge on the SOP-04 service card. Strategy specifics, rationale, and savings estimates are internal-only. |
| 2026-05-01 | §8 (SOP-03 vs SOP-04 tax-season boundary) | Germain + Abner (via Javi) | E — still TBD. Did not converge. Logged as remaining open question; one-time variant §8 stays BLOCKED. |
| 2026-05-01 | §9 (internal-only task flag) | Architecture review (Javi + Claude) | NOT NEEDED. Verified clients have no SELECT policy on `tasks` (baseline migration 20260426032128…sql:427 — `-- Clients do NOT see internal tasks`). All client surfaces use service cards / docs / queries / notifications instead of task lists. Permanent design choice confirmed by Javi 2026-05-01. |
| 2026-05-01 | §10 (GHL pipeline) | Karen | Still pending; non-blocking — wire during Phase 2 GHL bridge. |
