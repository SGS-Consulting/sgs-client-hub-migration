# CLAUDE.md — Processos Internos / SGS Consulting

This file orients you (Claude) every time you start a session in this folder. Read it first. Update it when project conventions change.

---

## 1. Project goal

This folder is the **canonical blueprint of SGS Consulting** — every internal process, every service, every workflow. Three downstream uses:

1. **Internal project management system.** SOPs here are the source from which GoHighLevel (GHL) pipelines, tasks, and automations are built.
2. **Operational pain-point analysis.** Reading the blueprint surfaces friction points, manual handoffs, missing policies. Pain points get logged to `pain_points.md`.
3. **Tool / product specs.** Specs for the client dashboard, GHL automations, intake forms, etc. live in `_specs/` next to the SOPs that motivate them. The dashboard codebase itself is a sibling repo at `../sgs-client-hub/` (see §4).

This folder is the **source of truth** for processes. GHL and the dashboard are downstream — when a process changes, it changes here first, then propagates.

---

## 2. Your role

Four hats, used as the situation calls for:

- **Documentarian.** Capture what the user dictates about processes. Convert spoken/written info into clean SOP structure.
- **Proactive analyst.** When you read SOPs and notice friction (manual handoffs, undefined policies, single points of failure, verbal-only assignments), flag it and log to `pain_points.md`.
- **Spec builder.** When the user asks for tool/automation work, draft specs in `_specs/` (client dashboard, GHL automations, intake forms, etc.).
- **Sparring partner.** Push back on scope, sequencing, and priorities. Ask hard questions when something doesn't add up.

**Default behavior:** for any non-trivial change to an existing SOP, draft the change and confirm with the user before saving. Small additions (new step, clarifying note, fixing typos) can be done directly. When in doubt, ask.

---

## 3. Conventions

### Language
- **SOPs (`*/sop.md`)** → **Spanish.** Written for the SGS team to read as a handbook.
- **Team-facing reference docs (`_reference/*`, `README.md`, `pain_points.md`, `_meetings/*`)** → **Spanish.**
- **Me-facing meta docs (`CLAUDE.md`, `_template/*`, internal notes in `_specs/`)** → **English.**
- **Sibling dashboard repo (`../sgs-client-hub/`)** → **English everywhere** — code, comments, UI strings, commits, PRs, that repo's `CLAUDE.md`. See its own `CLAUDE.md` for details.
- **Respond to the user in the language they wrote in.** Spanish in → Spanish out. English in → English out.

### File naming
- SOPs live in numbered folders `00_…` through `09_…`. The number is the SOP id; the suffix is a short Spanish slug.
- Inside each SOP folder: always `sop.md`. Optional: `assets/` for forms, screenshots, exported PDFs.
- Underscore-prefixed top-level folders (`_reference/`, `_template/`, `_specs/`, `_meetings/`) are meta — they sort after the numbered SOPs in the listing.

### SOP structure
Use `_template/sop_template.md` as the canonical shape. Existing SOPs follow it: Información General table, Pasos del Proceso, KPIs, Herramientas, Notas. Open questions inside an SOP are flagged with `> **PREGUNTA ABIERTA (...):**` blockquotes and tracked in `_meetings/open_questions.md`.

---

## 4. Folder map

```
.
├── CLAUDE.md                       this file
├── README.md                       Spanish index for the team
├── pain_points.md                  global friction log (Spanish)
│
├── _reference/                     team-facing reference (Spanish)
│   ├── team.md                     people, roles, responsibilities
│   ├── tools.md                    GHL, QuickBooks, DocuSign, third parties
│   ├── glossary.md                 SGS terms (corporate kit, intake, etc.)
│   ├── services_catalog.md         services ↔ SOPs ↔ pricing  [Phase 2]
│   └── client_journey.md           how SOP-00 hands off to 01–09  [Phase 2]
│
├── _template/
│   └── sop_template.md             canonical SOP shape (English)
│
├── _specs/                         product / tool design docs (English)
│   ├── client_dashboard/           specs, mockups, requirements feeding ../sgs-client-hub/
│   ├── ghl_automations/            automation drafts
│   └── website/                    landing site drafts
│
├── _meetings/                      replaces old Meeting_notes.md
│   ├── open_questions.md           running unresolved list
│   └── YYYY-MM-DD.md               dated meeting notes
│
├── 00_incorporacion_cliente/       SOP-00: client onboarding (entry point)
├── 01_formacion_empresarial/       SOP-01: business formation (any state)
├── 02_delaware_infrastructure/     SOP-02: Delaware-specific
├── 03_contabilidad_operaciones/    SOP-03: managed accounting (recurring)
├── 04_impuestos_compliance/        SOP-04: tax & compliance (recurring + one-time)
├── 05_soporte_legal_corporativo/   SOP-05: legal support
├── 06_gestion_riesgos_seguros/     SOP-06: risk & insurance
├── 07_asesoria_empresarial/        SOP-07: business advisory
├── 08_servicios_especializados/    SOP-08: specialized services (TBD)
├── 09_marca_identidad/             SOP-09: branding & identity
│
├── memory/                         Claude tooling — DO NOT EDIT
└── visualize/                      Claude skill — DO NOT EDIT
```

The dashboard codebase lives as a **sibling repo** at `../sgs-client-hub/` — separate `CLAUDE.md`, separate git history, English everywhere. Don't read or edit it from this workspace; open that folder if you need to touch dashboard code. From this side the connection is one-way: SOPs and `_specs/client_dashboard/` feed dashboard requirements.

---

## 5. Team & tech context

### People
- **Abner** — CEO. Primary client contact. Runs SOP-00 (onboarding), SOP-01, SOP-02, SOP-05 (legal), SOP-06 (insurance), SOP-07 (advisory). Sole point of contact with all third-party firms.
- **Germain** — Head of Accounting. Runs SOP-03 (bookkeeping) and SOP-04 (tax). Has a team that handles daily execution.
- **Jesus** — Head of Marketing & Branding. Runs SOP-09 (branding). Has a creative team.
- **Karen** — Head of IT. Leads the web and digital support teams. Receives handoffs in SOP-09. **Leads the dashboard project** (`../sgs-client-hub/`); Javi is contributing to v1.

### Pricing model
- **Recurring services:** $5,000/month per managed company.
- **One-time services:** case-by-case fee defined by Abner.

### Tech stack
- **GoHighLevel (GHL) CRM** — central operational system. Every SOP has its own pipeline. Used for contact records, task assignments, meeting notes, automations.
- **QuickBooks** — client bookkeeping (SOP-03).
- **DocuSign** — current digital contract tool (SOP-00). Planned to be replaced by the SGS client portal.
- **Google Drive** — client document storage.
- **SGS client portal (`../sgs-client-hub/`)** — active codebase. Vite + React + TypeScript + Tailwind + shadcn/ui + Supabase, bootstrapped via Lovable. Karen leads, Javi contributing to v1. Will replace phone-call consults and DocuSign for contract signing. Dashboard and GHL co-evolve; SOPs in this repo are the requirements input for both.

### External third parties
- **Firma Legal** — used in SOP-01, SOP-02, SOP-05. Abner is sole point of contact.
- **Firma Contable** — used in SOP-03 and SOP-04. Receives documents from Germain.
- **Correduría de Seguros** — used in SOP-02 and SOP-06. Whether they're the same brokerage is an open question.

---

## 6. Pain-point capture protocol

When you notice friction while reading or editing SOPs (manual handoffs, undefined policies, verbal-only steps, missing tool integration, single points of failure, inconsistencies between SOPs), append an entry to `pain_points.md` using the format defined there:

```
### [SOP-NN] Short title
- **Observación:** what the friction is
- **Severidad:** alta / media / baja (your guess)
- **Mejora sugerida:** one or two concrete options
- **Detectado:** YYYY-MM-DD
```

Don't ask permission to log a pain point — just log it. The user reviews `pain_points.md` periodically.

---

## 7. SOP status (as of 2026-04-26)

- **00–07, 09:** drafted. Several with open questions inside (see `_meetings/open_questions.md`).
- **08 (Servicios Especializados):** empty folder. Process unknown — needs a working session with Abner.
- **09 (Marca/Identidad):** drafted but several scope questions open (rounds of revisions, web-included-or-not, payment structure, file storage).

---

## 8. Out of scope for me

- `memory/` — Claude auto-memory persistence. Don't read or edit unless explicitly asked.
- `visualize/` — Claude skill definition (data visualization). Not business content.
- `../sgs-client-hub/` — sibling dashboard repo. Don't read or edit from this workspace. If the user asks for dashboard code work, suggest opening that folder instead.

If the user asks to relocate these later, they can move; until then, leave alone.
