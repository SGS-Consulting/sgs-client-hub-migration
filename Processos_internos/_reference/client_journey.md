# Recorrido del Cliente — End-to-End

Mapa de cómo un prospecto se convierte en cliente activo de SGS y cómo se conectan los SOPs entre sí. Útil para entender qué SOP dispara a qué, dónde están los puntos de transición, y dónde un cliente "vive" en cada momento de su ciclo de vida.

> Este mapa describe la situación operativa actual. Los objetivos a futuro (portal SGS, automatizaciones de GHL) están marcados como tales y se ejecutarán a medida que el portal y las automatizaciones se desarrollen.

---

## Vista de alto nivel

```
PROSPECTO
   │
   │  expresa interés
   ▼
┌─────────────────────────────────────────────────┐
│  SOP-00: Incorporación Inicial del Cliente      │
│  (Abner)                                        │
│                                                 │
│  Intake → Descubrimiento → Propuesta →          │
│  Contrato + Pago → Asignación → Bienvenida      │
└─────────────────────────────────────────────────┘
   │
   │  Disparador: contrato firmado + pago confirmado
   │  Abner asigna tareas según servicios contratados
   ▼
┌─────────────────────────────────────────────────┐
│  CLIENTE ACTIVO                                 │
│                                                 │
│  Uno o más SOPs corren en paralelo              │
│  según los servicios contratados                │
└─────────────────────────────────────────────────┘
   │
   ├─► SOP-01  Formación (cualquier estado)        [Única vez]
   ├─► SOP-02  Delaware Infrastructure             [Única vez · si elegible]
   ├─► SOP-03  Contabilidad gestionada             [Recurrente mensual]
   ├─► SOP-04  Tax & Compliance                    [Recurrente o única vez]
   ├─► SOP-05  Soporte legal                       [Bajo demanda]
   ├─► SOP-06  Seguros                             [Bajo demanda]
   ├─► SOP-07  Asesoría empresarial                [Recurrente con check-ins]
   ├─► SOP-08  Servicios especializados            [Por definir]
   └─► SOP-09  Branding                            [Única vez + soporte]
```

---

## Etapa 1: Prospecto → Cliente activo (SOP-00)

Todo cliente, sin excepción, pasa por SOP-00 antes de que se active cualquier servicio. El disparador para todos los SOPs subsiguientes es el **Paso 4 de SOP-00** (contrato firmado + pago inicial confirmado).

### Pasos clave del onboarding y a qué dan paso

| Paso de SOP-00 | Resultado | Conexión a otros SOPs |
|----------------|-----------|------------------------|
| Paso 1 — Intake | Información del cliente recopilada | — |
| Paso 1.1 — Distribución del intake al equipo | Equipo informado antes de la sesión de descubrimiento | — |
| Paso 2 — Sesión de descubrimiento | Necesidades documentadas. **En esta reunión Abner pregunta si el cliente tiene General Liability y Workers Compensation** | Si falta seguro → activa SOP-06 |
| Paso 3 — Propuesta enviada | Cliente recibe servicios + costos | — |
| Paso 4 — Contrato + pago | **Disparador maestro** de todos los SOPs de servicio | Habilita todos los SOPs contratados |
| Paso 5 — Asignación de tareas | Tareas creadas en GHL para cada miembro del equipo | Inicia formalmente cada SOP |
| Paso 6 — Correo de bienvenida | Cliente confirma activación | — |

> **Estado actual:** Las asignaciones del Paso 5 se hacen verbalmente en muchos casos. **Objetivo:** todas las asignaciones quedan registradas como tareas en GHL, y el correo del Paso 6 se dispara automáticamente al completarse el Paso 5.

---

## Etapa 2: Cliente activo — SOPs en paralelo

Una vez activo, un cliente puede estar simultáneamente en varios SOPs. Cada SOP tiene su propio pipeline en GHL.

### Combinaciones típicas

| Perfil de cliente | SOPs típicamente activos |
|-------------------|---------------------------|
| **Cliente full-service recurrente** | SOP-03 + SOP-04 + SOP-07 + (SOP-05/SOP-06 bajo demanda) |
| **Cliente que solo necesita formación** | SOP-01 o SOP-02 → cierre. Sin SOPs recurrentes (a menos que contrate luego). |
| **Cliente que necesita branding + base recurrente** | SOP-09 + SOP-03 + SOP-04 |
| **Cliente puntual de filing fiscal** | SOP-04 (variante única vez) → cierre |

---

## Disparadores entre SOPs

Pocos SOPs disparan a otros automáticamente — la mayoría se activan desde la asignación inicial de SOP-00. Pero hay puntos de conexión específicos:

| Origen | Destino | Condición |
|--------|---------|-----------|
| SOP-00 (sesión de descubrimiento, Paso 2) | SOP-06 | Cliente no cuenta con General Liability y/o Workers Compensation |
| SOP-02 (Paso 1 — evaluación de elegibilidad) | SOP-01 | Cliente solicitó Delaware pero no es elegible (se redirige) |
| SOP-03 (servicio recurrente, paso 4.1 octubre) | _Recomendación interna_ | Análisis P&G sugiere aportación a IUL → conversación con cliente |
| SOP-04 (Paso 3 — estrategia inicial, único) | _Plan fiscal interno_ | Estrategias documentadas que se ejecutan a lo largo del año |
| SOP-09 (Paso 10 — handoff interno) | _Equipo web (Karen)_ | Identidad aprobada → desarrollo de sitio (interno al SOP-09) |
| SOP-09 (Paso 14 — soporte continuo) | _Solicitudes ad-hoc_ | Cliente requiere adaptaciones gráficas posteriores |

---

## Punto de contacto del cliente, según SOP

Quién es la cara visible para el cliente en cada servicio:

| SOP | Punto de contacto principal |
|-----|------------------------------|
| SOP-00 | Abner |
| SOP-01 | Abner (entrega vía correo, sin reunión) |
| SOP-02 | Abner |
| SOP-03 | **Germain** |
| SOP-04 | **Germain** (Abner participa en reunión inicial y trimestrales internas) |
| SOP-05 | Abner |
| SOP-06 | Abner |
| SOP-07 | Abner |
| SOP-09 | **Jesus** (con coordinación de Abner; entrega formal final con Abner) |

> **Único punto de contacto con terceros:** Abner controla toda comunicación con la firma legal y la correduría de seguros. Germain controla la comunicación con la firma contable. El cliente no tiene contacto directo con ningún tercero.

---

## Cadencia de comunicación con el cliente activo

| Frecuencia | Tipo de contacto | SOP |
|-----------|------------------|-----|
| Continua (día a día) | Aclaraciones de bookkeeping (ej. transacciones sin categorizar) | SOP-03 (Paso 3.1) |
| Mensual | Reunión de contabilidad con Germain | SOP-03 (Paso 4) |
| Trimestral | Reporte trimestral presentado en la reunión mensual | SOP-03 (Paso 4) |
| Trimestral (interno) | Estrategia fiscal entre Abner y Germain | SOP-04 (Paso 4) |
| Anual (octubre) | Análisis P&G + recomendación IUL | SOP-03 (Paso 4.1) |
| Anual (cierre fiscal) | Envío de 1099 a contratistas | SOP-04 (Paso 2) |
| Bajo demanda | Consultas legales (SOP-05) y solicitudes de seguros (SOP-06) | SOP-05, SOP-06 |
| Variable según complejidad | Check-ins de asesoría empresarial | SOP-07 (Paso 4) |

---

## Cierre del ciclo

Un cliente puede:
- **Cerrar un servicio puntual** (SOP-01, SOP-02, SOP-04 única vez, SOP-09): el SOP se marca cerrado en GHL; el cliente puede mantener otros SOPs activos.
- **Cerrar todos los servicios** (cancelación): no documentado formalmente — _potencial pain point: definir SOP de offboarding._

---

## Pain points cruzados detectados al construir este mapa

Algunos puntos que se hacen evidentes al ver el flujo completo (se trasladarán a `pain_points.md`):

1. **Asignación verbal en SOP-00 Paso 5** — el disparador maestro depende de que Abner se acuerde de asignar todas las tareas en GHL. Si una se olvida, el SOP correspondiente nunca arranca.
2. **Sin SOP de offboarding** — ningún SOP cubre qué pasa cuando un cliente cancela uno o todos los servicios.
3. **SOP-06 dependiente de pregunta puntual en onboarding** — si Abner no recuerda preguntar por seguros en la sesión de descubrimiento, SOP-06 nunca se activa.
4. **Punto único de falla en Abner** — Abner es el contacto único con cliente para 7 de 9 SOPs y único punto de contacto con todos los terceros. Cuello de botella estructural.
5. **Sin proceso definido para "cliente quiere agregar un servicio nuevo"** — un cliente activo que ya pasó SOP-00 quiere contratar un servicio adicional (e.g., agregar SOP-09 a un cliente que solo tenía SOP-03). ¿Vuelve al SOP-00 parcial? ¿Hay un mini-onboarding?
