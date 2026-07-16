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
  "Role-based access · staff see only their own book":
    "Acceso por roles · el staff solo ve su propia agenda",
  "Forgot password?": "¿Olvidaste tu contraseña?",
  "Enter your email above and we'll send you a reset link":
    "Escribe tu correo arriba y te enviamos un enlace",
  "Reset link sent — check your email":
    "Enlace enviado — revisa tu correo",

  // ---- Reset password ----
  "Set a new password": "Crea una nueva contraseña",
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
  "Accepts WhatsApp reminders": "Acepta recordatorios por WhatsApp",

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
  "Service completed ✨": "Servicio completado ✨",
  "Record the payment for this visit": "Registra el pago de esta visita",
  Amount: "Monto",
  Method: "Método",
  Skip: "Omitir",
  "Record payment": "Registrar pago",
  Charge: "Cobrar",

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

  // ---- Expenses ----
  "Track spending and estimated profit": "Controla gastos y ganancia estimada",
  entries: "registros",
  "By category": "Por categoría",
  "Recent expenses": "Gastos recientes",
  "+ Add expense": "+ Agregar gasto",
  "Add expense": "Agregar gasto",
  "Save expense": "Guardar gasto",
  "Expense added": "Gasto agregado",
  "No expenses yet": "Aún no hay gastos",
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
  "Specialty (optional)": "Especialidad (opcional)",
  Specialty: "Especialidad",
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

  // ---- Reports ----
  "Revenue, services and client insights":
    "Ingresos, servicios y análisis de clientas",
  "Revenue vs expenses": "Ingresos vs gastos",
  "Last 6 months": "Últimos 6 meses",
  "Most requested services": "Servicios más pedidos",
  "Returning vs new": "Recurrentes vs nuevas",
  "Employee performance": "Desempeño del equipo",
  "⭳ Export PDF": "⭳ Exportar PDF",
  "Generating…": "Generando…",
  "PDF exported": "PDF exportado",

  // ---- Reminders ----
  "Automated reminders": "Recordatorios automáticos",
  "SMS & WhatsApp · keep clients coming back":
    "SMS y WhatsApp · haz que tus clientas regresen",
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
  "Preview · WhatsApp reminder": "Vista previa · recordatorio de WhatsApp",

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
  "Phone (WhatsApp)": "Teléfono (WhatsApp)",
  "Confirm appointment": "Confirmar cita",
  "You're booked,": "¡Lista tu cita,",
  "We'll send you a reminder before your appointment ✨":
    "Te enviaremos un recordatorio antes de tu cita ✨",
  "Book another appointment": "Agendar otra cita",
};
