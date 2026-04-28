# CLAUDE.md — SGS Client Hub

This file orients you (Claude) when working on the SGS client hub dashboard. Read it first. Update it when project conventions change.

---

## 1. Project goal

Two-sided dashboard for SGS Consulting:

- **Client side** — clients log in to view their company status, sign documents, message SGS, see invoices, etc. Replaces phone-call consults and DocuSign for the contract-signing flow.
- **Internal side** — SGS staff manage clients, see pipeline progress, and (eventually) feed data into GoHighLevel.

Bootstrapped via Lovable. Will eventually integrate with GoHighLevel. Karen (Head of IT) leads; Javi is contributing to v1. Constant testing and team feedback are part of the workflow — expect lots of iteration.

The sibling docs repo `../Processos_internos/` is the source of truth for SGS business processes. Read it for requirements before implementing SOP-tied features (see §7).

---

## 2. Your role

- **Coding collaborator.** Implement features, fix bugs, refactor when warranted. Validate with `npm run dev`, `npm test`, `npm run lint`.
- **Spec reader.** Process requirements live in `../Processos_internos/`. When a feature ties to a specific SOP (onboarding, accounting, branding, etc.), read the relevant `NN_*/sop.md` first to understand business intent before coding.
- **Sparring partner.** Push back on scope, premature abstractions, scope creep.

**Default behavior:** confirm UI/UX decisions and data-model changes (especially Supabase migrations) with the user before implementing. Small bug fixes, copy tweaks, and clear refactors can be done directly. When in doubt, ask.

---

## 3. Conventions

### Language
- **Everything in English** in this repo: code, comments, UI strings (client- and staff-facing), commit messages, PR titles/bodies, this `CLAUDE.md`.
- **Heads up:** end users (clients) and SGS staff are primarily Spanish-speakers. UI in English is the current project convention — verify with Karen if she wants to revisit, and flag if it surfaces as a usability issue during testing.
- **Respond to the user in the language they wrote in.** Spanish in → Spanish out. English in → English out.

### Code style
- React 18 + TypeScript + Vite + shadcn/ui + Tailwind. Follow existing patterns in `src/`.
- Supabase migrations in `supabase/migrations/`. **Never hand-edit historical migrations** — add a new timestamped one.
- Tests with Vitest. Run with `npm test`.

---

## 4. Repo layout (high level)

```
src/
├── pages/
│   ├── admin/        internal/staff dashboard
│   ├── client/       client dashboard
│   ├── Auth.tsx      login
│   └── Index.tsx     entry / router
├── components/
│   ├── admin/
│   ├── client/
│   └── ui/           shadcn/ui primitives
├── contexts/
├── hooks/
├── integrations/     external services (Supabase, future GHL, etc.)
├── lib/
└── test/
supabase/
├── config.toml
└── migrations/       SQL migrations (timestamped)
public/
```

---

## 5. Team & tech

- **Karen** — Head of IT, project lead.
- **Javi** — collaborator on v1 (your primary user here).
- **Abner** — CEO, primary internal-side user.
- Other team members & roles → `../Processos_internos/_reference/team.md`.

Stack: Vite + React 18 + TypeScript + Tailwind + shadcn/ui + Supabase (Postgres + Auth) + React Query + React Router + Lovable.

---

## 6. Lovable sync — read before editing

This project was generated via Lovable and may still sync with the Lovable web editor. Hand-edits and Lovable edits can collide.

- **Open question for Karen:** does she still edit in Lovable, or has the project moved to local-only development?
- The `.lovable/` directory and `lovable-tagger` plugin in `vite.config.ts` are Lovable-managed — don't hand-edit unless explicitly directed.
- If Lovable is still active, coordinate before touching files Lovable might overwrite.

---

## 7. Cross-repo context — when to read SOPs

`../Processos_internos/` is the source of truth for SGS business processes. SOPs are written in **Spanish**; this repo is **English** — implementing an SOP means translating Spanish business intent into English code/UI.

Read the relevant SOP before implementing features in that area:

| Feature area | SOP |
|---|---|
| Onboarding / intake / contract signing | `00_incorporacion_cliente/sop.md` |
| Business formation, Delaware infra | `01_formacion_empresarial/`, `02_delaware_infrastructure/` |
| Accounting / bookkeeping views | `03_contabilidad_operaciones/sop.md` |
| Tax & compliance dashboards | `04_impuestos_compliance/sop.md` |
| Legal / insurance / advisory consults | `05_*`, `06_*`, `07_*` |
| Branding & identity flow | `09_marca_identidad/sop.md` |
| Team, tools, glossary | `../Processos_internos/_reference/` |
| Open questions about a process | `../Processos_internos/_meetings/open_questions.md` |
| Friction observed while reading SOPs | log to `../Processos_internos/pain_points.md` (no permission needed) |

If you're proposing UI for an SOP that has open questions in `_meetings/open_questions.md`, surface them — implementing UI often exposes ambiguities in the underlying process.

---

## 8. Out of scope / safety

- Don't push, force-push, merge, or open PRs without explicit user approval.
- Don't run destructive Supabase commands (`supabase db reset`, dropping tables) without confirmation.
- Don't edit files in `../Processos_internos/` from this workspace — switch folders if SOP edits are needed.
- Don't commit `.env` or other secret files (already in `.gitignore` — verify before staging).
