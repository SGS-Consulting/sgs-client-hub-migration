# Session Protocol — SGS Client Hub

**Purpose:** define how each Claude-assisted work session on the dashboard starts, runs, and ends — so multi-session work stays coherent and nothing slips between sessions.

**Last updated:** 2026-04-29

---

## Where things live

| Type | Location |
|------|----------|
| Strategic plan (phases, what's next) | `Processos_internos/_specs/client_dashboard/roadmap.md` |
| Per-SOP design questions + answers | `Processos_internos/_specs/client_dashboard/sopNN_design.md` |
| This protocol | `Processos_internos/_specs/client_dashboard/session_protocol.md` |
| Open team-level questions | `Processos_internos/_meetings/open_questions.md` |
| Process pain points | `Processos_internos/pain_points.md` |
| Source of truth for SOPs | `Processos_internos/NN_*/sop.md` (Spanish) |
| Dashboard code | everywhere outside `Processos_internos/` |
| Migrations | `supabase/migrations/` (never hand-edit historical) |
| Dev seed | `supabase/seeds/dev_seed.sql` |
| Claude memory (persistent context) | `~/.claude/projects/-Users-javi-Documents-SGS-Consulting-sgs-client-hub/memory/` |

---

## Start of session — 3-minute checklist

Run these before doing anything else. Most are read-only.

1. **Pull latest from Javi's fork:**
   ```bash
   git pull origin main
   ```
2. **Check working tree is clean** (or note what's uncommitted from last session):
   ```bash
   git status
   ```
3. **Read `roadmap.md` → "What's done" + "Next concrete step"** to ground in current state.
4. **Read the active `sopNN_design.md`** (whichever SOP we're on). Note any questions that flipped from OPEN → ANSWERED since last session.
5. **Check Supabase is reachable** — the dev DB is at `rvxonlgfasbkjdmtidky.supabase.co`. If migrations have moved upstream, run:
   ```bash
   npx supabase migration list
   ```
   to see if local and remote are in sync.
6. **Skim the last 10 lines of `pain_points.md`** so we don't re-flag something already logged.

If anything in steps 1–6 surfaces an issue (uncommitted work that needs decisions, drifted migrations, a new pain point already affecting our planned work), **resolve before picking up new work.**

---

## During session

### Picking work

In priority order:
1. Continue an in-progress slice (per `roadmap.md` "Next concrete step").
2. If blocked on team answers, draft new design questions or refine the open ones.
3. If unblocked but the next slice has unanswered questions, surface them in the relevant `sopNN_design.md`.
4. Avoid starting parallel slices. One vertical slice at a time keeps the per-SOP loop tight.

### Asking the team

When a question requires Abner / Germain / Jesus / Karen:
1. Add it to the relevant `sopNN_design.md` under the right section, with a clear "default proposal."
2. Tell Javi which question it is and who to ask.
3. **Do not block the session waiting** — keep working on something else, capture the answer when it comes back.

When an answer comes back:
1. Append to the **Decision log** at the bottom of `sopNN_design.md` with date + name + verbatim answer.
2. Flip the question's status from `OPEN` to `ANSWERED`.
3. If the answer changes scope, update `roadmap.md` to match.

### Pain-point capture

Per `Processos_internos/CLAUDE.md`: when reading SOPs we may notice friction (manual handoffs, missing policies, single points of failure). **Don't ask permission — log it** to `Processos_internos/pain_points.md` using the format defined there.

### Migrations

- **Never hand-edit historical migrations.** New schema changes get a new timestamped file in `supabase/migrations/`.
- **Apply with:** `npx supabase db push` (after `supabase link` is established for the session — once per machine, not per session).
- **Verify with:** `npx supabase migration list`.

### Seeds

- Dev seed in `supabase/seeds/dev_seed.sql` is idempotent. Re-run any time:
  ```bash
  npx supabase db query --linked -f supabase/seeds/dev_seed.sql
  ```
- Don't put sensitive data in seeds. The hardcoded `admin@sgs.test / admin123!` is dev-only.

---

## End of session — handoff checklist

Even if it's mid-slice, leave a clean handoff so the next session (or Karen) can pick up.

1. **Commit** — small, focused commits. Every commit message in English.
2. **Push to Javi's fork:**
   ```bash
   git push origin main
   ```
   Or to a feature branch if the slice is in progress.
3. **Update `roadmap.md`:**
   - Move any completed item into "What's done" with today's date.
   - Update "Next concrete step" if the picture has shifted.
4. **Update `sopNN_design.md`:**
   - Move new questions in.
   - Move resolved questions out (into the Decision log).
5. **Capture loose ends in memory** — if anything is half-done or surprising, add a note to Claude memory so the next session knows.
6. **If milestone:** open a PR to `upstream` (Karen's repo) for verification:
   ```bash
   gh pr create --repo soporteit-oss/sgs-client-hub --head Javiasturiasb:main
   ```

---

## When to sync with Karen

Trigger a sync (Slack / call / PR) when:
- A vertical slice is shippable end-to-end (she verifies before it lands in the SGS production system).
- A migration affects production data shape (she may need to apply it to the Lovable Supabase).
- We hit a question only she can answer (GHL pipeline structure, deployment, Lovable status).
- We discover a structural pain point worth her review.

Don't sync for: routine progress updates, design questions we can answer ourselves, small refactors.

---

## When to sync with Abner / Germain / Jesus

- **Abner:** SOP-00, SOP-01, SOP-02, SOP-05, SOP-06, SOP-07 design decisions; pricing on one-time services; closure criteria.
- **Germain:** SOP-03, SOP-04 design decisions; QuickBooks integration shape; tax/contractor policy.
- **Jesus:** SOP-09 design decisions; brand handoff to Karen's web team.

Always batch questions — don't ask one at a time. The `sopNN_design.md` doc is the batched-questions container.

---

## Recurring rhythm (proposed)

- **Per work session:** small commits, design-doc updates, in-progress slice progress.
- **Per slice (~1–3 sessions):** one SOP gets fully designed → built → smoke-tested → handed to Karen.
- **Per ~5 slices:** review `roadmap.md` + `pain_points.md` with Karen; recalibrate sequence and Phase 2/3 targets.

---

## Anti-patterns to avoid

- **Touching production Supabase** (`ezccdcxncsivsqtbgcyv`). Javi's CLI doesn't have access; that's by design. All dev work happens against `rvxonlgfasbkjdmtidky`.
- **Editing SOP files** (`Processos_internos/NN_*/sop.md`) from the dashboard workspace. SOPs change in their own workspace by their own Claude. Dashboard reflects them.
- **Committing `.env`** — gitignored, but always double-check `git status` before staging.
- **Half-built parallel slices.** Finish one SOP before starting the next.
- **Designing for SOP-08.** The folder is empty; the process is unknown. Don't paint into a corner that excludes it, but don't reserve room for it either.
