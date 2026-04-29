# Procesos Internos — SGS Consulting

Repositorio que documenta cómo opera SGS Consulting internamente. Cada proceso (SOP) describe paso a paso un servicio o flujo de trabajo, con responsables, herramientas y KPIs.

Este folder es la **fuente de verdad** de los procesos. GoHighLevel (GHL) y otras herramientas operativas se construyen a partir de lo que está documentado aquí.

---

## SOPs

| # | Proceso | Responsable | Tipo |
|---|---------|-------------|------|
| [SOP-00](./00_incorporacion_cliente/sop.md) | Incorporación Inicial del Cliente | Abner | Disparador inicial |
| [SOP-01](./01_formacion_empresarial/sop.md) | Business Formation & Structure | Abner | Única vez |
| [SOP-02](./02_delaware_infrastructure/sop.md) | Delaware Infrastructure Platform | Abner | Única vez |
| [SOP-03](./03_contabilidad_operaciones/sop.md) | Managed Accounting & Financial Operations | Germain | Recurrente |
| [SOP-04](./04_impuestos_compliance/sop.md) | Tax & Compliance Strategy | Germain | Recurrente + única vez |
| [SOP-05](./05_soporte_legal_corporativo/sop.md) | Legal & Corporate Support | Abner | Bajo demanda |
| [SOP-06](./06_gestion_riesgos_seguros/sop.md) | Risk Management & Insurance | Abner | Bajo demanda |
| [SOP-07](./07_asesoria_empresarial/sop.md) | Business Advisory & Executive Counseling | Abner | Recurrente |
| SOP-08 | Specialized & Growth Services | _por definir_ | _por definir_ |
| [SOP-09](./09_marca_identidad/sop.md) | Branding & Business Identity | Jesus | Única vez + soporte |

---

## Referencia

- [Equipo](./_reference/team.md) — quién hace qué en SGS
- [Herramientas y sistemas](./_reference/tools.md) — GHL, QuickBooks, DocuSign, terceros
- [Glosario](./_reference/glossary.md) — términos propios de SGS y de la industria
- [Catálogo de servicios](./_reference/services_catalog.md) — qué vende SGS, mapeado a SOPs y precios
- [Recorrido del cliente](./_reference/client_journey.md) — cómo se conectan los SOPs de principio a fin

---

## Operación interna del repositorio

- [Pain points](./pain_points.md) — registro vivo de fricciones operativas detectadas
- [Reuniones / preguntas abiertas](./_meetings/open_questions.md) — temas pendientes para próxima reunión
- [`_template/sop_template.md`](./_template/sop_template.md) — plantilla canónica para crear nuevos SOPs
- `_specs/` — especificaciones de herramientas en desarrollo (dashboard, automatizaciones de GHL)

---

## Convenciones

- **Idioma:** SOPs y documentos para el equipo en español. Documentos internos para la asistencia de IA en inglés.
- **Estructura de SOP:** ver `_template/sop_template.md`.
- **Preguntas abiertas dentro de un SOP:** marcadas con `> **PREGUNTA ABIERTA (...):**` y centralizadas en `_meetings/open_questions.md`.
- **Pipelines GHL:** cada SOP indica el nombre de su pipeline correspondiente.
