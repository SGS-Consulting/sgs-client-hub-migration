# Herramientas y Sistemas — SGS Consulting

Inventario de las herramientas y sistemas que usa SGS para operar, con su rol en cada SOP.

---

## Sistema central

### GoHighLevel (GHL) — CRM operativo
**Rol:** sistema central de operación. Cada SOP tiene un pipeline asignado.

**Usos:**
- Registro de contactos y oportunidades.
- Pipelines (uno por SOP) con etapas que reflejan los pasos del proceso.
- Asignación de tareas a miembros del equipo.
- Notas de reuniones y consultas con cliente.
- Automatización de comunicaciones (correo de bienvenida, recordatorios).

**Pipelines configurados (uno por SOP):**

| SOP | Nombre del pipeline GHL |
|-----|--------------------------|
| SOP-00 | Incorporación de Cliente |
| SOP-01 | Business Formation & Structure |
| SOP-02 | Delaware Infrastructure Platform |
| SOP-03 | Managed Accounting & Financial Operations |
| SOP-04 | Tax & Compliance Strategy |
| SOP-05 | Legal & Corporate Support |
| SOP-06 | Risk Management & Insurance |
| SOP-07 | Business Advisory & Executive Counseling |
| SOP-09 | Branding & Business Identity |

**Estado actual:** algunas asignaciones de tareas se hacen verbalmente. Objetivo: que toda asignación quede registrada en GHL como tarea.

---

## Herramientas operativas

### QuickBooks
**Rol:** plataforma de contabilidad del cliente.
**SOP:** SOP-03 (configurada por Germain durante el onboarding del servicio de contabilidad).
**Uso:** conecta cuentas bancarias y fuentes de transacciones del cliente. El equipo de contabilidad mantiene los libros actualizados aquí.

### DocuSign
**Rol:** firma digital de contratos.
**SOP:** SOP-00 (Paso 4 — aceptación formal del cliente).
**Estado:** herramienta puente. Objetivo a futuro: reemplazar con firma digital integrada en el portal SGS.

### Google Drive
**Rol:** almacenamiento de documentación del cliente.
**SOPs:** SOP-01, SOP-02 (documentación de estructura empresarial), y posiblemente SOP-09 (carpeta de proyecto — ubicación por confirmar).

### Google Lighthouse
**Rol:** evaluación de calidad técnica del sitio web entregado.
**SOP:** SOP-09 (KPI de calidad post-entrega).

### Formularios fiscales
- **W-9** — completado por contratistas elegibles (SOP-04, Paso 1).
- **1099-NEC / 1099-MISC** — emitidos a fin de año fiscal a cada contratista (SOP-04, Paso 2).

### Base de datos interna de contratistas
**Estado:** herramienta por definir.
**SOP:** SOP-04 (almacenamiento de datos W-9 y mantenimiento mensual).

---

## Herramientas en desarrollo

### Portal / Dashboard SGS
**Estado:** en desarrollo. Reemplazará progresivamente herramientas puente.

**Funcionalidades planificadas:**
- Firma digital + pago integrados (reemplaza DocuSign en SOP-00).
- Submisión de consultas legales por parte del cliente (reemplaza llamada directa en SOP-05).
- Visibilidad para el cliente de su estado en cada servicio.

Las especificaciones detalladas se desarrollan en [`_specs/client_dashboard/`](../_specs/client_dashboard/) cuando inicie el trabajo.

---

## Terceros

### Firma Legal
**SOPs:** SOP-01 (formación de entidades en cualquier estado), SOP-02 (formación en Delaware), SOP-05 (asesoría legal).
**Punto de contacto interno:** Abner. El cliente nunca tiene contacto directo con la firma.

### Firma Contable
**SOPs:** SOP-03 (envío periódico de documentos), SOP-04 (filing de impuestos, recurrente y única vez).
**Punto de contacto interno:** Germain.

### Correduría de Seguros
**SOPs:** SOP-02 (seguro de responsabilidad general en Delaware), SOP-06 (evaluación de necesidades de seguro del cliente).
**Punto de contacto interno:** Abner.
**Pregunta abierta:** ¿es la misma correduría en SOP-02 y SOP-06? — ver `_meetings/open_questions.md`.

---

## Productos de seguros y financieros mencionados

| Producto | Contexto | SOP |
|----------|----------|-----|
| General Liability Insurance | Requerido para operar en Delaware; también evaluado en onboarding | SOP-02, SOP-06 |
| Workers Compensation Insurance | Evaluado en onboarding según necesidad del cliente | SOP-06 |
| IUL (Indexed Universal Life) | Evaluado en análisis P&G de octubre para optimización fiscal | SOP-03 (Paso 4.1) |
