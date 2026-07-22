// i18n ligero: las cadenas en inglés son la llave; ES las traduce.
// tr(lang, "Month revenue") → "Ingresos del mes" cuando lang === "es".

export type Lang = "en" | "es";

export const LANG_COOKIE = "lang";

export function tr(lang: Lang, s: string): string {
  if (lang === "es") return ES[s] ?? s;
  return s;
}

export const ES: Record<string, string> = {
  // ---- Nav / módulos ----
  Dashboard: "Inicio",
  Calendar: "Calendario",
  Clients: "Clientas",
  Services: "Servicios",
  Payments: "Pagos",
  Expenses: "Gastos",
  Team: "Equipo",
  Reports: "Reportes",
  Reminders: "Recordatorios",
  "Team calendar": "Calendario del equipo",
  "Sign out": "Cerrar sesión",
  Owner: "Dueña",
  Receptionist: "Recepcionista",
  Staff: "Staff",

  // ---- Login ----
  Email: "Correo",
  Password: "Contraseña",
  "Enter studio": "Entrar al estudio",
  "Signing in…": "Entrando…",
  "Invalid email or password": "Correo o contraseña incorrectos",
  "This account is deactivated — ask the owner to reactivate it":
    "Esta cuenta está desactivada — pídele a la dueña que la reactive",
  "Looking to book a visit?": "¿Quieres agendar una visita?",
  "Book an appointment →": "Agendar una cita →",
  "Forgot password?": "¿Olvidaste tu contraseña?",
  "Enter your email above and we'll send you a reset link":
    "Escribe tu correo arriba y te enviamos un enlace",
  "Reset link sent — check your email":
    "Enlace enviado — revisa tu correo",

  // ---- Reset password ----
  "Set a new password": "Crea una nueva contraseña",
  "Welcome! Set your own password": "¡Bienvenida! Crea tu propia contraseña",
  "You signed in with a temporary password — choose a new one to continue":
    "Entraste con una contraseña temporal — elige una nueva para continuar",
  "New password": "Nueva contraseña",
  "Confirm password": "Confirmar contraseña",
  "Save new password": "Guardar contraseña",
  "Passwords don't match": "Las contraseñas no coinciden",
  "Password updated — welcome back": "Contraseña actualizada — bienvenida",
  "Minimum 6 characters": "Mínimo 6 caracteres",

  // ---- Header / comunes ----
  "Good morning": "Buenos días",
  "Good afternoon": "Buenas tardes",
  "Good evening": "Buenas noches",
  "appointments today": "citas hoy",
  appt: "cita",
  appts: "citas",
  "+ New appointment": "+ Nueva cita",
  Cancel: "Cancelar",
  Save: "Guardar",
  "Saving…": "Guardando…",
  Back: "Atrás",
  Edit: "Editar",
  Close: "Cerrar",
  Today: "Hoy",
  Day: "Día",
  Week: "Semana",
  Month: "Mes",
  "All team": "Todo el equipo",
  "‹ Prev": "‹ Anterior",
  "Next ›": "Siguiente ›",
  of: "de",

  // ---- Dashboard ----
  "Today's revenue": "Ingresos de hoy",
  "Month revenue": "Ingresos del mes",
  "Month expenses": "Gastos del mes",
  "Est. profit": "Ganancia est.",
  "My revenue today": "Mis ingresos hoy",
  "My month revenue": "Mis ingresos del mes",
  "Today's appointments": "Citas de hoy",
  "Completed this month": "Completadas este mes",
  "Month production": "Producción del mes",
  "completed services": "servicios completados",
  services: "servicios",
  payments: "pagos",
  income: "ingresos",
  "% margin": "% de margen",
  "Upcoming · next 7 days": "Próximas · siguientes 7 días",
  "View calendar →": "Ver calendario →",
  "No appointments today": "No hay citas hoy",
  "Nothing scheduled for the next 7 days":
    "Nada agendado para los próximos 7 días",
  "Top services this month": "Servicios top del mes",
  "No completed appointments yet": "Aún no hay citas completadas",
  Returning: "Recurrentes",
  New: "Nuevas",
  clients: "clientas",
  "new this month": "nuevas este mes",

  // ---- Calendar ----
  "Manage your books across day, week and month":
    "Maneja las agendas por día, semana y mes",
  "Your book — day, week and month": "Tu agenda — día, semana y mes",

  // ---- Clients ----
  "Your client book, history and preferences":
    "Tu libreta de clientas, historial y preferencias",
  "Search clients, phone…": "Buscar clientas, teléfono…",
  "+ Add client": "+ Agregar clienta",
  client: "clienta",
  matching: "que coinciden con",
  visits: "visitas",
  lifetime: "histórico",
  "Last ·": "Última ·",
  "No clients yet": "Aún no hay clientas",
  "Preferences & notes": "Preferencias y notas",
  "No notes yet.": "Sin notas todavía.",
  "Visit history": "Historial de visitas",
  "No visits yet": "Sin visitas todavía",
  "Latest 2 of": "Últimas 2 de",
  Gallery: "Galería",
  "+ Add photo": "+ Agregar foto",
  "Uploading…": "Subiendo…",
  "No photos yet — save their best looks here":
    "Sin fotos aún — guarda aquí sus mejores looks",
  "Delete photo": "Borrar foto",
  "Book appointment": "Agendar cita",
  "Add client": "Agregar clienta",
  "Edit client": "Editar clienta",
  "Full name": "Nombre completo",
  Phone: "Teléfono",
  "Email (optional)": "Correo (opcional)",
  "Notes (optional)": "Notas (opcional)",
  "Tags (comma separated)": "Etiquetas (separadas por coma)",
  "Preferences, allergies…": "Preferencias, alergias…",
  "Save client": "Guardar clienta",
  "Save changes": "Guardar cambios",
  "Client added": "Clienta agregada",
  "Client updated": "Clienta actualizada",
  "Accepts SMS reminders": "Acepta recordatorios por SMS",
  "SMS reminders": "Recordatorios por SMS",

  // ---- Citas / modales ----
  "New appointment": "Nueva cita",
  Client: "Clienta",
  Service: "Servicio",
  Technician: "Técnica",
  Date: "Fecha",
  Time: "Hora",
  "Create appointment": "Crear cita",
  "Booking…": "Agendando…",
  "Appointment booked": "Cita agendada",
  "Set status": "Cambiar estado",
  "Reschedule / reassign": "Reprogramar / reasignar",
  Reschedule: "Reprogramar",
  "Appointment rescheduled": "Cita reprogramada",
  Scheduled: "Agendada",
  Confirmed: "Confirmada",
  "In progress": "En curso",
  Completed: "Completada",
  Cancelled: "Cancelada",
  "No-show": "No llegó",
  "Service completed ✓": "Servicio completado ✓",
  "Record the payment for this visit": "Registra el pago de esta visita",
  Amount: "Monto",
  Method: "Método",
  Skip: "Omitir",
  "Record payment": "Registrar pago",
  Charge: "Cobrar",
  "Pick client, service & tech": "Elige clienta, servicio y técnica",
  "Could not book:": "No se pudo agendar:",
  "Time conflict": "Conflicto de horario",
  "Outside this technician's working hours — you can still book it, but online clients can't":
    "Fuera del horario de esta técnica — puedes agendarla igual, pero las clientas en línea no",
  "Update failed:": "No se pudo actualizar:",
  "Enter the amount": "Escribe el monto",
  "Payment failed:": "No se pudo registrar el pago:",
  Marked: "Marcada como",
  PAID: "PAGADO",
  "Could not save:": "No se pudo guardar:",
  "Loading…": "Cargando…",
  "Photo added ✓": "Foto agregada ✓",
  "Photo removed": "Foto eliminada",
  "Upload failed:": "No se pudo subir:",
  "Delete failed:": "No se pudo borrar:",

  // ---- Payments ----
  "Recorded income and payment methods": "Ingresos registrados y métodos de pago",
  "Payments for your services": "Pagos de tus servicios",
  "Today's income": "Ingresos de hoy",
  "Month income": "Ingresos del mes",
  "Top method": "Método principal",
  "Avg ticket": "Ticket promedio",
  "per visit": "por visita",
  "Payment history": "Historial de pagos",
  "All clients": "Todas las clientas",
  "+ Record payment": "+ Registrar pago",
  "Save payment": "Guardar pago",
  "Payment recorded": "Pago registrado",
  "Income for": "Ingreso a nombre de",
  "(you)": "(tú)",
  "Got it": "Entendido",
  "A payment was recorded for": "Se registró un pago a nombre de",
  "Send the optional deposit via Zelle to:":
    "Envía el depósito opcional por Zelle a:",
  "I have read and accept the": "He leído y acepto los",
  "Terms & Conditions": "Términos y Condiciones",
  "and the": "y la",
  "Privacy Policy": "Política de Privacidad",
  "Optional deposit (Zelle)": "Depósito opcional (Zelle)",
  "Shown in online booking next to the deposit receipt. Leave the number empty to hide it.":
    "Se muestra en el booking en línea junto al comprobante de depósito. Deja el número vacío para ocultarlo.",
  "Zelle number": "Número de Zelle",
  "Account name": "Nombre de la cuenta",
  "It counts as income for that person and for the business — it won't appear in your payment history or your income.":
    "Cuenta como ingreso para esa persona y para el negocio — no aparecerá en tu historial de pagos ni en tus ingresos.",
  "Add client & amount": "Elige clienta y monto",
  "No payments recorded yet": "Aún no hay pagos registrados",
  "No payments for this client": "Sin pagos de esta clienta",
  Cash: "Efectivo",
  Card: "Tarjeta",
  Transfer: "Transferencia",

  // ---- Services ----
  service: "servicio",
  "+ Add service": "+ Agregar servicio",
  "Add service": "Agregar servicio",
  "Save service": "Guardar servicio",
  "Service name": "Nombre del servicio",
  "Price ($)": "Precio ($)",
  "Duration (min)": "Duración (min)",
  "…or new category": "…o nueva categoría",
  "Service updated": "Servicio actualizado",
  "Service added": "Servicio agregado",
  "Name & price are required": "Nombre y precio son obligatorios",
  "Category failed:": "No se pudo crear la categoría:",
  "No categories yet — run supabase/seed.sql or add services below.":
    "Aún no hay categorías — corre supabase/seed.sql o agrega servicios aquí.",
  "e.g. Gel full set": "ej. Set completo de gel",
  "e.g. Skincare": "ej. Cuidado de piel",
  "+ Add category": "+ Agregar categoría",
  "Add category": "Agregar categoría",
  "Save category": "Guardar categoría",
  "Category name": "Nombre de la categoría",
  "Category name is required": "El nombre de la categoría es obligatorio",
  "Category added": "Categoría agregada",
  Icon: "Ícono",
  "Edit category": "Editar categoría",
  "Category updated": "Categoría actualizada",
  "Inactive categories are hidden from online booking":
    "Las categorías inactivas se ocultan del booking en línea",
  "No services in this category yet": "Aún no hay servicios en esta categoría",
  "Hide prices in online booking": "Ocultar precios en el booking en línea",
  "Clients see services without prices — pricing is discussed at the salon":
    "Las clientas ven los servicios sin precio — el precio se conversa en el salón",

  // ---- Expenses ----
  "Track spending and estimated profit": "Controla gastos y ganancia estimada",
  entries: "registros",
  "By category": "Por categoría",
  "Recent expenses": "Gastos recientes",
  "+ Add expense": "+ Agregar gasto",
  "Add expense": "Agregar gasto",
  "Save expense": "Guardar gasto",
  "Expense added": "Gasto agregado",
  "Add description & amount": "Agrega descripción y monto",
  "e.g. Gel polish restock": "ej. Reposición de esmalte gel",
  "No expenses yet": "Aún no hay gastos",
  "Entries this month": "Registros este mes",
  expenses: "gastos",
  "No expenses this month": "Sin gastos este mes",
  Description: "Descripción",
  Category: "Categoría",
  Supplies: "Insumos",
  Rent: "Renta",
  Marketing: "Marketing",
  Utilities: "Servicios",
  Equipment: "Equipo",
  Other: "Otro",

  // ---- Team ----
  "Staff, roles, permissions and performance":
    "Personal, roles, permisos y desempeño",
  "+ Add team member": "+ Agregar al equipo",
  "Add team member": "Agregar al equipo",
  Manage: "Administrar",
  today: "hoy",
  "Services this month": "Servicios este mes",
  Revenue: "Ingresos",
  "Email (login)": "Correo (para entrar)",
  "Temp password": "Contraseña temporal",
  "Phone (optional)": "Teléfono (opcional)",
  "Specialties (optional)": "Especialidades (opcional)",
  Specialties: "Especialidades",
  Role: "Rol",
  "Module access": "Acceso a módulos",
  "Owners always have access to every module.":
    "Las dueñas siempre tienen acceso a todos los módulos.",
  Active: "Activa",
  "Inactive members can't be booked and lose access":
    "Las inactivas no se pueden agendar y pierden acceso",
  "Create member": "Crear miembro",
  "Creating…": "Creando…",
  "Member updated": "Miembro actualizado",
  "Name, email & a 6-digit temp password are required":
    "Nombre, correo y una contraseña temporal de 6 dígitos son obligatorios",
  INACTIVE: "INACTIVA",
  "e.g. Camila Reyes": "ej. Camila Reyes",
  "Nails, Lashes…": "Uñas, Pestañas…",
  "Temp password (6 digits)": "Contraseña temporal (6 dígitos)",
  "e.g. 482915": "ej. 482915",
  Generate: "Generar",
  "Team member created": "Miembro creado",
  "They can sign in now — share these credentials with them":
    "Ya puede iniciar sesión — comparte estos datos con ella",
  "Copy email & password": "Copiar correo y contraseña",
  "They'll be asked to set their own password the first time they sign in.":
    "Se le pedirá elegir su propia contraseña la primera vez que inicie sesión.",
  Copied: "Copiado",
  Done: "Listo",
  "Set schedule": "Definir horario",
  "Skip for now": "Omitir por ahora",
  "Continue to schedule →": "Continuar a horario →",
  "When does": "¿Cuándo trabaja",
  "work? This decides when clients can book them online.":
    "? Esto decide cuándo las clientas pueden agendarle en línea.",
  "— None —": "— Ninguna —",
  "No categories yet — add one in Services":
    "Aún no hay categorías — agrega una en Servicios",

  // ---- Reports ----
  "Revenue, services and client insights":
    "Ingresos, servicios y análisis de clientas",
  "Revenue vs expenses": "Ingresos vs gastos",
  "Last 6 months": "Últimos 6 meses",
  "Most requested services": "Servicios más pedidos",
  "Returning vs new": "Recurrentes vs nuevas",
  "Employee performance": "Desempeño del equipo",
  "⭳ Export PDF": "⭳ Exportar PDF",
  "This week": "Esta semana",
  "This month": "Este mes",
  "No completed appointments in this period":
    "Sin citas completadas en este período",
  "No clients served in this period": "Sin clientas atendidas en este período",
  "clients served": "clientas atendidas",
  "My clients this month": "Mis clientas este mes",
  "Clients this month": "Clientas este mes",
  "No clients served yet this month":
    "Aún no hay clientas atendidas este mes",
  returning: "recurrentes",
  new: "nuevas",
  "Generating…": "Generando…",
  "PDF exported": "PDF exportado",

  // ---- Reminders ----
  "Automated reminders": "Recordatorios automáticos",
  "This section isn't available yet": "Este apartado aún no está disponible",
  "Automated reminders are coming soon. We'll turn them on here as soon as they're ready.":
    "Los recordatorios automáticos estarán disponibles pronto. Los activaremos aquí en cuanto estén listos.",

  // ---- Comprobante de depósito ----
  Open: "Abrir",
  Change: "Cambiar",
  Remove: "Quitar",
  "Deposit receipt": "Comprobante de depósito",
  "Deposit receipt (optional)": "Comprobante de depósito (opcional)",
  "Attach deposit receipt": "Adjuntar comprobante de depósito",
  "Optional — a small deposit as a sign of commitment to hold your appointment. It's not the full service payment, and it's deducted from your total on the day of your visit.":
    "Opcional — un pequeño depósito como muestra de compromiso para apartar tu cita. No es el pago total del servicio y se descuenta del total el día de tu cita.",
  "Couldn't attach the receipt, booking anyway":
    "No se pudo adjuntar el comprobante, se agenda igual",
  "Deposit receipt saved ✓": "Comprobante guardado ✓",
  "SMS reminders · keep clients coming back":
    "Recordatorios por SMS · haz que tus clientas regresen",
  "Appointment reminder": "Recordatorio de cita",
  "Sent before each appointment (hours configurable)":
    "Se envía antes de cada cita (horas configurables)",
  "Confirmation request": "Solicitud de confirmación",
  "One-tap confirm link so you know who's coming":
    "Confirmación de un toque para saber quién viene",
  "Thank-you follow-up": "Mensaje de agradecimiento",
  "Sent after each visit with a rebooking link":
    "Se envía después de cada visita con enlace para reagendar",
  "Recent messages": "Mensajes recientes",
  "Preview · SMS reminder": "Vista previa · recordatorio por SMS",
  "Reminder enabled": "Recordatorio activado",
  "Reminder disabled": "Recordatorio desactivado",
  "Timing updated": "Tiempo actualizado",
  "Edit message": "Editar mensaje",
  "Save message": "Guardar mensaje",
  "Message (SMS)": "Mensaje (SMS)",
  "Message saved": "Mensaje guardado",
  "Enter the message": "Escribe el mensaje",
  characters: "caracteres",
  "Available variables — tap to insert":
    "Variables disponibles — toca para insertar",
  "New booking (staff)": "Nueva cita (staff)",
  "Sent to the assigned technician when a client books":
    "Se envía a la técnica asignada cuando una clienta reserva",
  "Sent instantly at booking": "Se envía al momento de reservar",
  "Preview · SMS": "Vista previa · SMS",
  Reminder: "Recordatorio",
  Confirmation: "Confirmación",
  "Thank-you": "Agradecimiento",
  "No SMS template yet — tap “Edit message”":
    "Aún no hay mensaje SMS — toca “Editar mensaje”",
  "No messages queued yet — they appear here once the cron starts queuing reminders.":
    "Aún no hay mensajes en cola — aparecerán aquí cuando el cron empiece a programar recordatorios.",
  "Sent automatically via Twilio SMS":
    "Se envía automáticamente por SMS con Twilio",
  "Setup pending:": "Configuración pendiente:",
  "Toggles and messages already save. Real sending needs Twilio credentials and the cron — ask me when you want to connect it.":
    "Los toggles y mensajes ya se guardan. El envío real necesita las credenciales de Twilio y el cron — pídemelo cuando quieras conectarlo.",
  after: "después",
  before: "antes",
  sent: "enviado",
  delivered: "entregado",
  failed: "falló",
  queued: "en cola",

  // ---- Booking público ----
  "Choose your service": "Elige tu servicio",
  "Pick your artist": "Elige tu artista",
  "Pick date & time": "Elige fecha y hora",
  "Your details": "Tus datos",
  Step: "Paso",
  Categories: "Categorías",
  from: "desde",
  with: "con",
  "Pick a day to see available times":
    "Elige un día para ver los horarios disponibles",
  "Checking availability…": "Revisando disponibilidad…",
  "No free slots this day — try another date":
    "No hay horarios libres este día — prueba otra fecha",
  "Confirm appointment": "Confirmar cita",
  "Enter a valid phone number": "Escribe un número de teléfono válido",
  "Enter a valid email": "Escribe un correo válido",
  Country: "País",
  "Search country…": "Buscar país…",
  "Times are in the salon's local time":
    "Los horarios están en la hora local del salón",
  "You're booked,": "¡Lista tu cita,",
  "If you need to change or cancel your appointment, reach us by phone or WhatsApp":
    "Si necesitas cambiar o cancelar tu cita, escríbenos por teléfono o WhatsApp",
  "Book another appointment": "Agendar otra cita",
  "Get notified the moment a client books":
    "Recibe un aviso apenas una clienta reserve",
  Enable: "Activar",
  "Get in touch": "Contáctanos",
  Hours: "Horario",
  Call: "Llamar",
  Location: "Ubicación",

  // ---- Settings ----
  Settings: "Configuración",
  "Business info, contact and online booking":
    "Datos del negocio, contacto y reservas en línea",
  Business: "Negocio",
  "Salon name": "Nombre del salón",
  "Salon name is required": "El nombre del salón es obligatorio",
  "Used to validate phone numbers in online booking":
    "Se usa para validar los teléfonos en las reservas en línea",
  "Contact shown in online booking":
    "Contacto que se muestra en las reservas en línea",
  Address: "Dirección",
  "Save settings": "Guardar configuración",
  "Settings saved": "Configuración guardada",
  "Hours are set in Schedule → Salon hours":
    "El horario se define en Horario → Horario del salón",

  // ---- Inspo ----
  Inspo: "Inspo",
  "Prep your work — inspiration photos per appointment":
    "Prepara tu trabajo — fotos de inspiración por cita",
  "No appointments in the last 30 days or coming up":
    "Sin citas en los últimos 30 días ni próximas",
  "Inspiration board": "Tablero de inspiración",
  "No inspiration yet — add ideas for this appointment":
    "Aún no hay inspiración — agrega ideas para esta cita",
  "Max 5 photos per appointment": "Máximo 5 fotos por cita",
  photos: "fotos",
  Upcoming: "Próximas",
  "Last 30 days": "Últimos 30 días",
  "Search client or service…": "Buscar clienta o servicio…",
  "All staff": "Todo el equipo",
  "No results with these filters": "Sin resultados con estos filtros",

  // ---- Schedule ----
  Schedule: "Horario",
  "Your working hours — clients can only book inside them":
    "Tu horario de trabajo — solo se puede reservar dentro de él",
  "Team schedules": "Horarios del equipo",
  "My schedule": "Mi horario",
  "Using salon hours": "Usa las horas del salón",
  "Custom schedule": "Horario propio",
  "Use salon hours": "Usar horas del salón",
  "Set custom schedule": "Definir horario propio",
  "Save schedule": "Guardar horario",
  "Schedule saved": "Horario guardado",
  "Salon hours": "Horario del salón",
  "Salon hours saved": "Horario del salón guardado",
  "Online booking only offers times inside these hours":
    "La reserva en línea solo ofrece horarios dentro de estas horas",
  Closed: "Cerrado",
  "Salon:": "Salón:",
  "Edit schedule": "Editar horario",
  "Start must be before end": "El inicio debe ser antes del fin",
  "Outside working hours": "Fuera del horario de trabajo",
  "Tap again to delete": "Toca otra vez para borrar",

  // ---- Instalar app (PWA) ----
  "How to install": "Cómo instalar",
  "Install the app": "Instalar la app",
  "App already installed ✓": "La app ya está instalada ✓",
  "Install now": "Instalar ahora",
  "Add Sol Beauty Lab to your home screen to open it like a regular app.":
    "Agrega Sol Beauty Lab a tu pantalla de inicio para abrirla como una app normal.",
  "On iPhone / iPad (Safari)": "En iPhone / iPad (Safari)",
  "Tap the Share button": "Toca el botón de Compartir",
  "Choose “Add to Home Screen”": "Elige “Añadir a pantalla de inicio”",
  "On Android (Chrome)": "En Android (Chrome)",
  "Open the ⋮ menu": "Abre el menú ⋮",
  "Tap “Install app” or “Add to Home screen”":
    "Toca “Instalar app” o “Añadir a pantalla de inicio”",
  "On computer (Chrome / Edge)": "En computadora (Chrome / Edge)",
  "Click the install icon at the right end of the address bar":
    "Haz clic en el ícono de instalar al final de la barra de direcciones",

  Monday: "Lunes",
  Tuesday: "Martes",
  Wednesday: "Miércoles",
  Thursday: "Jueves",
  Friday: "Viernes",
  Saturday: "Sábado",
  Sunday: "Domingo",
};
