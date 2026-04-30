# SOP-04 Tax & Compliance Strategy — Dashboard Design

**Status:** Pre-draft — questions for Germain (some cross-cutting with Abner). Not yet reviewed.
**Reference:** `Processos_internos/04_impuestos_compliance/sop.md`
**Pipeline (GHL):** `Tax & Compliance Strategy`
**Last updated:** 2026-04-30

---

## Hard blockers (resolve before implementation starts)

1. **Worker classification policy.** SOP-04 Paso 1 asks Germain to "identify workers eligible for reclassification from employee to contractor," but SGS has no defined policy for that classification. Already logged in `_meetings/open_questions.md` (SOP-04 section). Without an answer from Abner, Step 1 can't be executed in production — the dashboard would be storing a decision the team hasn't agreed how to make. Default proposal in §2.1.

2. **Cross-SOP boundary: SOP-03 "tax-season-only" vs. SOP-04 "one-time tax filing."** Logged in `pain_points.md` 2026-04-29. Both describe the same operational scenario (client engages SGS once during tax season for books + filing). The one-time variant of SOP-04 (§8) is **blocked** until Germain + Abner align on which SOP owns this flow. The recurring SOP-04 service (§2–§7) can proceed independently.

---

## Quick reference — default proposals

| Area | Default (confirm with Germain) |
|------|--------------------------------|
| Activation paths | Both: SOP-00 onboarding *and* upsell on existing client (same as SOP-03) |
| Billing | Auto-invoice on activation; client must pay before first month (same as SOP-03) |
| Pricing model | Flat $5,000/mo per managed company (per global pricing model in `Processos_internos/CLAUDE.md` §5); confirm not tiered like SOP-03 |
| Worker data model | New `client_workers` table — admin-managed, client can view summary (no SSN), W-9 attached as document |
| Worker classification | Per-worker boolean `is_contractor` set by Germain at intake; backed by Abner-defined policy doc (currently missing) |
| W-9 collection | Client uploads completed W-9 PDF (free-form upload, same pattern as SOP-01/03); structured form deferred to v2 |
| 1099 generation | Manual upload by Germain at year-end (PDF per contractor); auto-gen deferred until W-9 fields are structured |
| Initial tax-strategy meeting | Internal-only `client_meetings` row with `kind='tax_strategy_initial'`; one-time on activation |
| Quarterly tax-strategy meeting | Recurring task spawns quarterly (reuses SOP-03 recurring-task mechanic); creates `client_meetings` row with `kind='tax_strategy_quarterly'` |
| Tax-strategy notes | New table `tax_strategies` (per-client, internal-only) capturing strategies identified + outcomes per quarter |
| Monthly worker DB maintenance | Recurring task spawned monthly; admin reviews `client_workers`, requests W-9 from new ones, marks departed |
| Client portal | Workers tab where client manages their team list (excluding SSN); 1099 download once available; quarterly meeting summary read-only |
| GHL pipeline | Stages TBD with Karen (placeholder: Activated → Workers Configured → Active recurring → Cancelled) |
| One-time tax-filing variant | **BLOCKED** — pending cross-SOP boundary resolution (see Hard blockers §2) |

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

**Default proposal:** Workers are **not portal users.** SGS deals with the client; the client deals with their workers. The client either uploads W-9s on each worker's behalf or forwards a magic link to the worker — open question.

**Status:** OPEN — confirm with Germain whether workers need their own minimal portal access (lean: no, for v1 the client manages everything).

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

**Internal-only flag:** SOP-04 introduces internal-only meetings (Step 3 + Step 4). Need a `is_internal BOOLEAN` flag on either `service_recurring_tasks` or the spawned tasks themselves so RLS hides them from the client portal. Same flag should also be added to `tasks` table if not already present from SOP-01 (verify before designing the migration).

**Status:** OPEN — verify the internal-only flag exists on tasks. If not, schema change required (small).

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

- 1 service row: "Tax & Compliance Strategy — Recurring" at $5,000/mo (placeholder until §11.1 confirmed).
- Task templates for SOP-04 onboarding (one-time):
  - Schedule initial tax-strategy meeting (high, +3d, internal)
  - Collect existing worker list from client (high, +5d)
  - Run worker classification on each worker (high, +10d, internal)
  - Request W-9s for newly-classified contractors (high, +15d)
- Recurring tasks (`service_recurring_tasks`):
  - Quarterly tax-strategy meeting (cadence: quarterly, day 5, internal)
  - Monthly worker DB review (cadence: monthly, day 1, internal)
  - Year-end 1099 generation + send (cadence: annually, December 1, internal+external split — TBD)

### Edge Functions

- No new edge functions required for the recurring service — reuses `spawn-recurring-tasks` (SOP-03) and `email_log → GHL` dispatch (Phase 2).
- One-time variant (§8) may need a tax-firm coordination function if it ends up looking like SOP-03 §8.3 — defer until §8 unblocks.

### Admin UI

- SOP-04 service card on `AdminClientDetail` showing: worker count + W-9-collected ratio, classification status, last quarterly meeting, next 1099 deadline countdown.
- New `Workers` panel in admin per-client view: list of `client_workers` with classification, W-9 status, 1099 status; add/edit/terminate actions.
- New `tax_strategies` list per client (internal-only): summary of strategies, status, expected savings.
- Updates to global recurring-task admin views — no SOP-specific work, just inherit from SOP-03 mechanics.

### Client UI

- New `/portal/workers` page (or tab inside `ClientServices.tsx`): list workers, add new, mark departed, upload W-9, download 1099 (when available). No SSN, no classification visible.
- SOP-04 service card on `/portal/services` showing: workers count, W-9 status indicator, 1099 readiness indicator.

### Estimated scope

5–7 sessions for the recurring service (similar to SOP-03), assuming all §2–§7 questions are answered and the internal-only flag work is small. The one-time variant (§8) is a separate ~2-session slice once unblocked.

---

## Open questions for Germain (prioritized)

1. §2.1 — Worker classification policy (cross-cutting with **Abner**; this is the hardest blocker).
2. §2.2 — Worker data model approval — `client_workers` table shape OK?
3. §2.3 — W-9 collection: client-uploads-PDF default OK for v1?
4. §3.1 — 1099 generation: manual upload OK for v1?
5. §4.2 — Tax-strategy notes: `tax_strategies` table OK; client-visibility level (§7.2)?
6. §6.2 — Client-managed vs. admin-managed worker list?
7. §11.1 — Flat $5,000/mo per company, not tiered — confirmed?
8. §8 cross-SOP boundary (cross-cutting with **Abner**) — when can we get this resolved?

## Open questions for Karen

1. §10.1 — GHL pipeline stages for SOP-04?
2. §10.2 — GHL custom fields needed?

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
| _all OPEN — pre-draft_ | | | |
