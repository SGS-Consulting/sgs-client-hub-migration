## SGS Consulting Group — Plataforma Interna + Portal de Clientes

Construiremos un MVP completo en una sola fase, con dos experiencias diferenciadas (Admin y Cliente) sobre la misma plataforma, usando Lovable Cloud para auth, base de datos y storage.

---

### 🎨 Identidad visual

- **Logo y favicon**: usaremos los archivos que ya subiste (`cropped-Logo-SGS-Consulting-horizontal-black-238x68-1.webp` y `cropped-favicon-sgs.webp`).
- **Paleta basada en sgsconsulting.net**:
  - Fondo principal oscuro / corporativo (negro suave + grises).
  - Acento dorado/mostaza (botones primarios, badges, highlights) — el mismo amarillo de tu sitio actual.
  - Superficies claras para áreas de trabajo (tablas, formularios) para máxima legibilidad.
- Tipografía sans-serif limpia, espaciado generoso, estética "boutique consulting" coherente con el sitio público.

---

### 🔐 Autenticación y roles

- Email + contraseña (con opción de añadir Google más adelante).
- Tabla separada `user_roles` con enum `app_role`: `admin`, `client` (preparada para añadir `staff`/`manager`).
- Función `has_role()` SECURITY DEFINER + RLS estricta en todas las tablas.
- Pantalla de login única que redirige según rol:
  - `admin` → `/admin`
  - `client` → `/portal`
- Recuperación de contraseña con página `/reset-password`.
- Auto-creación de perfil al registrarse (trigger en `auth.users`).

---

### 🧑‍💼 PORTAL ADMIN (`/admin`)

Layout con sidebar colapsable y header con búsqueda global + avatar.

**1. Dashboard**
- KPIs: clientes activos, tareas abiertas, tareas vencidas, facturas pendientes, monto por cobrar.
- Actividad reciente (últimas tareas, últimos documentos subidos por clientes, últimas facturas).
- Tareas asignadas a mí y vencimientos esta semana.

**2. Project Management (tipo Jira/Monday)**
- **Vista Kanban** con drag & drop entre columnas: `Abierta`, `En proceso`, `Pendiente`, `Bloqueada`, `Cerrada`.
- **Vista Lista** con filtros (por cliente, responsable, prioridad, estado, fecha).
- **Vista Calendario** por fecha de vencimiento.
- Cada tarea incluye:
  - Título, descripción rica, prioridad (Baja/Media/Alta/Urgente).
  - Responsable (admin asignado), cliente vinculado, servicio relacionado.
  - Fecha límite, etiquetas, estado.
  - **Comentarios** internos en hilo.
  - **Adjuntos** (archivos en storage).
  - **Subtareas** con checklist.
  - **Time tracking**: registro de horas trabajadas por usuario, con totales por tarea/cliente/periodo.
- Notificaciones in-app cuando te asignan tarea o comentan.

**3. Gestión de Clientes (CRM ligero)**
- Listado con búsqueda, filtros y estado (activo, prospecto, inactivo).
- Ficha de cliente con pestañas:
  - **Datos personales / empresa**: nombre, email, teléfono, dirección, tipo de entidad (LLC, S-Corp, C-Corp), EIN, fecha de formación, notas internas.
  - **Documentos**: todos los archivos asociados (subidos por cliente o por admin), con preview, descarga, categoría (contrato, ID, fiscal, otro) y estado de revisión.
  - **Tareas**: tareas vinculadas a este cliente.
  - **Facturas**: historial de facturas y estado de pago.
  - **Servicios contratados**: qué servicios del catálogo tiene activos.
  - **Timeline**: registro automático de eventos (factura emitida, documento subido, tarea cerrada…).
- Crear/editar/desactivar clientes; invitar al portal (envía email de alta).

**4. Documentos**
- Vista global de todos los documentos del sistema con filtros (cliente, categoría, estado).
- Bandeja "Pendientes de revisión" para los que suben los clientes.
- Acciones: aprobar, rechazar (con motivo), solicitar nueva versión, descargar.

**5. Facturas y Pagos (registro manual)**
- Crear factura: cliente, items (descripción, cantidad, precio), impuestos, total, fecha de emisión, vencimiento, notas.
- Estados: `Borrador`, `Enviada`, `Pagada`, `Vencida`, `Cancelada`.
- Generación de **PDF descargable** con branding SGS.
- Marcar como pagada (registro de método: transferencia, cheque, efectivo, otro + fecha).
- Listado con filtros y totales (cobrado, pendiente, vencido).
- Recordatorios manuales por email al cliente desde la ficha.

**6. Catálogo de Servicios**
- CRUD del catálogo (Business Formation, Tax, Compliance, Advisory, etc., reflejando tu sitio web).
- Cada servicio: nombre, descripción, categoría, precio base (opcional), activo/inactivo.
- Asignar servicios a clientes (con fecha de inicio y estado).

**7. Equipo (Administradores)**
- Gestión de usuarios admin: invitar, listar, desactivar.
- Vista de carga de trabajo por administrador (tareas activas, horas registradas).

**8. Configuración**
- Datos de empresa (para facturas).
- Plantillas de email (bienvenida, recordatorio de factura, etc.).
- Sección "Integraciones" con placeholder visible **"GoHighLevel — Próximamente (Fase 2)"**.

---

### 👤 PORTAL DE CLIENTE (`/portal`)

Layout limpio, simple, mobile-first. Sidebar mínima o nav superior.

**1. Dashboard del cliente**
- Saludo personalizado.
- Resumen: facturas pendientes (con monto), documentos pendientes de subir/aprobación, servicios activos.
- Accesos rápidos a las secciones.

**2. Mi Información**
- Ver y editar datos personales y de empresa.
- Cambio de contraseña.
- Foto/avatar.
- Cambios sensibles (email, EIN) quedan registrados para auditoría.

**3. Mis Documentos**
- **Subir** documentos (drag & drop, múltiples archivos), con selección de categoría.
- Listado de documentos subidos con su estado: `En revisión`, `Aprobado`, `Rechazado` (con motivo del admin).
- Documentos que el admin le comparte (contratos firmados, reportes).
- Preview y descarga.

**4. Mis Facturas**
- Listado con estado, monto, fecha de emisión y vencimiento.
- Resaltado de facturas vencidas.
- Descarga de PDF.
- Botón "Marcar como pagada / Notificar pago" (envía aviso al admin con referencia, ya que no hay pasarela online en v1).

**5. Mis Servicios**
- Vista de los servicios contratados con descripción y estado.
- Catálogo completo de servicios disponibles (los del sitio web) con CTA "Solicitar este servicio" → notifica al admin.

**6. Soporte / Contacto**
- Formulario simple para abrir una solicitud (crea internamente una tarea para el equipo admin).

---

### 🗄️ Modelo de datos (resumen)

- `profiles` (datos del usuario)
- `user_roles` (admin/client)
- `clients` (datos extendidos del cliente / empresa)
- `services` (catálogo)
- `client_services` (servicios contratados)
- `tasks`, `task_comments`, `subtasks`, `task_attachments`, `time_entries`
- `documents` (con bucket privado de storage + categoría + estado)
- `invoices`, `invoice_items`, `payments`
- `activity_log` (timeline por cliente)
- `notifications` (in-app)

Todas las tablas con **RLS estricta**: clientes solo ven lo suyo; admins ven todo.

---

### 🚧 Preparado para Fase 2 (no se construye ahora)

- **Integración GoHighLevel**: sincronización de contactos, etiquetas, envío de SMS/email y recordatorios automáticos. Dejaremos los hooks y la sección "Integraciones" listos.
- **Stripe** para cobro online de facturas desde el portal cliente.
- **Notificaciones por email automáticas** (recordatorios de vencimiento, asignaciones).
- Roles adicionales (`staff`, `manager`) con permisos granulares.
- Reportes avanzados / exportaciones.

---

### 💡 Recomendaciones adicionales

1. **Empezar con datos demo**: sembraremos 2-3 clientes ejemplo, tareas en cada estado y una factura, para que puedas probar el sistema desde el primer momento.
2. **Buckets de storage privados** con URLs firmadas — los documentos de clientes son sensibles (IDs, fiscales, contratos).
3. **Audit log** de cambios en datos sensibles del cliente desde el inicio, aunque la UI completa de auditoría llegue después.
4. **Multi-idioma (EN/ES)**: tu sitio actual es bilingüe. Sugiero dejar la arquitectura preparada (i18n) pero lanzar v1 solo en español para acelerar; añadimos inglés en una iteración corta.
5. **Branding del PDF de factura** desde el día uno — es lo que ven tus clientes y refuerza marca.

Cuando apruebes el plan, comenzaré por: branding + auth + estructura de BD + layouts admin/cliente, y desde ahí construyo módulo a módulo.