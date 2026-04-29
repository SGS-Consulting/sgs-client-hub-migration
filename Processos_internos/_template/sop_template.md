# SOP-NN: {Service / Process Name}

> Template for new SOPs. Write the SOP itself in **Spanish** (team-facing). This template is in English so guidance for me (Claude) is unambiguous. When using the template, replace placeholders and remove guidance comments.

---

## Información General

| Campo | Detalle |
|-------|---------|
| **Responsable Principal** | {Person — e.g., Abner (CEO), Germain (Head of Accounting)} |
| **Miembros Involucrados** | {Internal team + named third parties — e.g., "Abner, Firma Legal (tercero)"} |
| **Disparador** | {What event starts this process — e.g., "Cliente activo contrata el servicio de X"} |
| **Tipo de Servicio** | {Recurrente / Única vez / Bajo demanda / Recurrente + única vez} |
| **Duración Estimada** | {Days, weeks, "recurrente mensual", or "Por definir"} |
| **Pipeline GHL** | `{Exact pipeline name in GoHighLevel}` |

---

## Contexto _(opcional — solo si el SOP necesita explicación de fondo)_

{Use only when there's a non-obvious reason this process exists, eligibility criteria, or a distinction from a related SOP. SOP-02 (Delaware vs. any state) is a good example. Skip this section if the trigger and steps speak for themselves.}

---

## Variantes del Servicio _(opcional — solo si aplica)_

| Variante | Descripción |
|----------|-------------|
| **Variante A** | {Short description} |
| **Variante B** | {Short description} |

{Use this section when the same SOP covers meaningfully different flows. SOP-04 (recurrente vs. única vez) is the canonical example. If there's only one flow, delete this section.}

---

## Pasos del Proceso

### Paso 1 — {Title in Spanish}
- **Responsable:** {Who executes this step}
- **Descripción:** {What happens, in 2–4 sentences. Mention current tools if relevant.}
- **Entregable:** {Concrete output of this step — what exists at the end of it}

### Paso 1.1 — {Sub-step title} _(opcional)_
- **Responsable:** {…}
- **Descripción:** {…}
- **Entregable:** {…}

> Use sub-numbering (1.1, 1.2, 4.1) when a step has a side-flow or a satellite action that doesn't deserve its own top-level step. SOP-00 (1.1 — distribución del intake) and SOP-03 (4.1 — análisis P&G de octubre) are examples.

### Paso 2 — {…}
{...repeat for each step...}

> **PREGUNTA ABIERTA (discutir en próxima reunión):** {Use this blockquote inline whenever a step has a detail you don't know yet. Mirror the question in `_meetings/open_questions.md`.}

---

## KPIs

| KPI | Cómo se mide | Meta |
|-----|-------------|------|
| {KPI name} | {Measurement method} | {Target — "Por definir" if not yet set} |
| {…} | {…} | {…} |

> Always include at least 2 KPIs. Common ones: tiempo de ejecución, satisfacción del cliente (escala 1–10), tasa de cumplimiento.

---

## Herramientas

- {Tool name} ({rol — e.g., "seguimiento del caso"})
- {Tool name} ({rol})
- {Tercero — e.g., "Firma Legal (tercero)"}

> Cross-reference [`_reference/tools.md`](../_reference/tools.md) — every tool listed here should also exist there.

---

## Notas

- {Important caveat, edge case, or hand-off rule that didn't fit in a step}
- {If this SOP triggers another SOP at completion, note it: "Al cerrar este servicio, se inicia SOP-XX si aplica."}
- {If this SOP is part of a recurring flow, note the cadence}

---

## Checklist for the author (delete before saving)

- [ ] All placeholders `{...}` replaced
- [ ] Pipeline name in `Información General` matches the GHL pipeline exactly
- [ ] Every named tool exists in `_reference/tools.md` (or has been added there)
- [ ] Every named person exists in `_reference/team.md`
- [ ] Open questions mirrored in `_meetings/open_questions.md`
- [ ] Glossary entries added in `_reference/glossary.md` for any new terms
- [ ] Folder is named `NN_short_spanish_slug/` and the file is `sop.md`
