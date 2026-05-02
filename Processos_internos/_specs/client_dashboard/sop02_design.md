# SOP-02 Delaware Infrastructure — Dashboard Design

**Status:** **LOCKED 2026-05-02** by Claude (orchestrator mode while Javi is on a trip). Decisions made from defaults + the SOP-02 source. Open question on insurance brokerage left as v2 pending Abner sync.
**Reference:** `Processos_internos/02_delaware_infrastructure/sop.md`
**Pipeline (GHL):** `Delaware Infrastructure Platform`
**Last updated:** 2026-05-02

---

## Quick reference — locked decisions

| Area | Decision |
|------|----------|
| Service type | One-time, standalone-only. No cascade with other SOPs (SOP-01 does not auto-trigger SOP-02). |
| Pricing | Case-by-case per Abner. Service row seeded with `base_price = 0`; admin enters `price_override` at activation via the existing standalone-activation price prompt (extended to fire for any `base_price = 0` service, not just SOP-04). |
| Eligibility (Step 1) | Captured as a task template "Evaluate Delaware eligibility" — admin marks it done with rationale in the task notes. No separate schema. If ineligible, admin manually deactivates the service and surfaces SOP-01 as alternative. |
| Documents | 4 new categories: `delaware_formation_docs`, `corporate_address_confirmation`, `registered_agent_confirmation`, `gl_insurance_certificate`. Reuses existing `corporate_kit` for Step 6. |
| Insurance brokerage | **Open question** (per `_meetings/open_questions.md`) — same as SOP-06 or different? For v1, treated as opaque document attachment (`gl_insurance_certificate`); no structured `insurance_policies` table yet. Refactor when SOP-06 lands. |
| Corporate kit delivery (Step 6) | Reuses SOP-01 pattern. Admin uploads kit doc(s) under `corporate_kit` category, then sends `sop02_kit_delivery` email (new template — SOP-02 copy differs from SOP-01). |
| Service closure | Reuses existing `acknowledge_client_service` RPC. Client clicks "Acknowledge & close" in portal once kit is delivered. |
| Client portal card | New `renderSop02Card` in `ClientServices.tsx` — mirrors `renderSop01Card` structure (status badge, doc downloads, ack button). Lists all 5 doc categories grouped logically. |
| GHL pipeline stages | Placeholder stored in `client_services.ghl_pipeline_stage` (existing column). Karen defines actual stages later. |
| Recurring tasks | None. SOP-02 is purely one-time. |

---

## Process steps & build mapping

| Step | SOP action | Owner | Dashboard task template | Doc category |
|------|------------|-------|-------------------------|--------------|
| 1 | Evaluate Delaware eligibility | Abner | "Evaluate Delaware eligibility for client" (high, +1d) | — |
| 2 | Form Delaware entity (with law firm) | Abner | "Coordinate Delaware entity formation with law firm" (high, +5d) | `delaware_formation_docs` |
| 3 | Set up Delaware corporate HQ address | Abner | "Assign Delaware corporate HQ address" (high, +10d) | `corporate_address_confirmation` |
| 4 | Assign registered agent | Abner | "Assign registered agent" (high, +12d) | `registered_agent_confirmation` |
| 5 | Activate GL insurance | Abner | "Activate GL insurance policy" (high, +14d) | `gl_insurance_certificate` |
| 6 | Deliver corporate kit + personalized email | Abner | "Upload corporate kit + send delivery email" (high, +20d) | `corporate_kit` |
| 7 | Confirm receipt + close | Client → admin marks closed | (handled by acknowledge_client_service RPC) | — |

7 task templates total (Step 7 is the client-side ack, not a task).

---

## Implementation summary

### Migration `<timestamp>_sop02_slice_schema.sql`

- `documents.category` enum: add `delaware_formation_docs`, `corporate_address_confirmation`, `registered_agent_confirmation`, `gl_insurance_certificate`.
- No new tables. No new columns. SOP-02 is a pure-data + UI slice.

### Seed `supabase/seeds/sop02_delaware_infrastructure.sql`

- 1 service row: "Delaware Infrastructure Platform", category `Business Formation`, `base_price = 0` (case-by-case via override).
- 7 task templates (per the table above).
- 1 email template `sop02_kit_delivery` — variables `{client_name}`, `{company_name}`, `{registered_agent}`, `{delaware_address}`.

### App-code changes

- `AdminClientDetail.tsx`:
  - `activateService` price prompt currently triggers only on `isSop04(service.name)`. Generalize to fire on any service where `base_price === 0` AND it's not a cascade-spawned activation. (SOP-04 bundled cascade already bypasses by going through `performActivation` directly — same path serves SOP-02.)
  - Reuse the existing `Sop01ServiceConfigDialog` "Send kit email" pattern for SOP-02 — extend the SendTemplatedEmailDialog wiring to recognize SOP-02 service name and load the `sop02_kit_delivery` template.
- `ClientServices.tsx`:
  - New `renderSop02Card(cs)` function mirroring `renderSop01Card`. Shows: status badge ("In progress" / "Ready for your review" / "Closed on …"), grouped doc download lists per the 5 categories, "Acknowledge & close" button when corporate_kit is uploaded.
  - Update the `documents` fetch in `load()` to include the new SOP-02 categories.
  - Wire `renderSop02Card` into the service-card switch by service name "Delaware Infrastructure Platform".

### E2E tests

- `tests/e2e/sop02.spec.ts`:
  - Admin activates SOP-02 standalone → price prompt fires → service row appears with override price.
  - Client portal `/portal/services` renders the SOP-02 card with empty-state placeholders for each doc category.
  - (Negative) admin tries to activate without entering a price → blocked.

### Estimated scope

~1 session (smaller than SOP-04 because no new tables, no new mechanics, mostly reuse).

---

## Reusable mechanics inherited

| Mechanic | First built | Reused for SOP-02 |
|----------|-------------|-------------------|
| Service activation flow | Phase 1 (SOP-00) | Same |
| Standalone price prompt | SOP-04 | Generalized to fire for any `base_price = 0` service |
| Service task templates | SOP-00 | New SOP-02 templates seeded |
| Document upload + storage | SOP-00 | Same |
| `acknowledge_client_service` RPC | SOP-01 | Same RPC, reused |
| Client-side service card pattern | SOP-01 | New `renderSop02Card` mirrors `renderSop01Card` |
| `SendTemplatedEmailDialog` | SOP-01 | Loads new `sop02_kit_delivery` template |
| email_log + `worker_w9_request` pattern | SOP-04 | Same dispatch path; GHL handles in Phase 2 |

---

## Out of scope for v1

- Structured `insurance_policies` table — deferred until SOP-06 design clarifies whether SOP-02's GL insurance reuses the same brokerage. v1 just stores the certificate as a document.
- Annual registered-agent renewal tracking — the SOP doesn't define renewal cadence; potential gap to flag in pain_points.md.
- Eligibility wizard — eligibility is one task with free-text rationale for v1; structured questionnaire deferred until volume justifies.

---

## Open questions

1. **Insurance brokerage** (carried over from `_meetings/open_questions.md` SOP-02 line) — same as SOP-06 or different? Affects whether v2 introduces an `insurance_policies` table. Non-blocking for v1.
2. **Annual registered-agent renewal** — not addressed in the SOP. Should SGS proactively track renewal dates and ping clients? Logged in pain_points.md as a follow-up.
3. **GHL pipeline stages** — Karen to define. Same as SOP-01/03/04 — non-blocking, wires during Phase 2.

---

## Decision log

| Date | Section | Decider | Answer |
|------|---------|---------|--------|
| 2026-05-02 | Pricing model | Claude (orchestrator) | Case-by-case via standalone price prompt. Reused SOP-04's mechanic by generalizing the prompt to fire on any `base_price = 0` service. Per-client price stored in `price_override`. |
| 2026-05-02 | Eligibility capture | Claude (orchestrator) | One task template with free-text rationale in notes. No new schema. If ineligible, admin manually deactivates service. |
| 2026-05-02 | Insurance brokerage | Deferred | Open question with SOP-06 — for v1, store as opaque document under `gl_insurance_certificate`. Refactor when SOP-06 lands. |
| 2026-05-02 | Service closure | Claude (orchestrator) | Reuse `acknowledge_client_service` RPC + SOP-01 client-side ack pattern. |
