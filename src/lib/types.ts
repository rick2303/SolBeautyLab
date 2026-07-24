export type Role = "owner" | "receptionist" | "staff";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentMethod =
  | "cash"
  | "card"
  | "zelle"
  | "venmo"
  | "transfer"
  | "other";

export type ExpenseCategory =
  | "supplies"
  | "rent"
  | "marketing"
  | "utilities"
  | "equipment"
  | "other";

export type ReminderType =
  | "appointment_reminder"
  | "confirmation_request"
  | "thank_you";

export type MessageChannel = "sms" | "whatsapp";

/** Horario semanal: llave = dow ("sun".."sat"), valor = [inicio, fin] o null (cerrado) */
export type WorkHours = Record<string, [string, string] | null>;

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: Role;
  specialty: string | null; // heredado: la app usa `specialties`
  specialties: string[]; // categorías de servicio que atiende
  is_active: boolean;
  modules: string[] | null; // null = módulos por defecto del rol
  work_hours: WorkHours | null; // null = aplican las horas del salón
  lang: "en" | "es" | null; // preferencia de idioma guardada
  must_change_password: boolean; // true tras crearse con contraseña temporal
  created_at: string;
}

export interface SalonSettings {
  salon_name: string;
  timezone: string;
  currency: string;
  default_country: string;
  opening_hours: WorkHours;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  address: string | null;
  zelle_number: string | null; // a dónde enviar el depósito opcional del booking
  zelle_name: string | null; //   nombre de la cuenta Zelle
}

export interface ServiceCategory {
  id: string;
  name: string;
  sort_order: number;
  icon: string | null; // glifo unicode; null = ícono por defecto
  is_active: boolean; // false = oculta del booking en línea
  hide_prices: boolean; // true = el booking no muestra precios de esta categoría
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  price: number;
  duration_min: number;
  is_active: boolean;
}

export interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  tags: string[];
  sms_opt_in: boolean;
  whatsapp_opt_in: boolean;
  preferred_channel: MessageChannel | null;
  created_at: string;
}

export interface ClientStats {
  client_id: string;
  visits: number;
  total_spent: number;
  last_visit: string | null;
  favorite_service: string | null;
  is_new: boolean;
}

export interface Appointment {
  id: string;
  client_id: string;
  service_id: string;
  staff_id: string;
  starts_at: string;
  duration_min: number;
  price: number;
  status: AppointmentStatus;
  notes: string | null;
  deposit_url: string | null; // comprobante de depósito (imagen), opcional
  is_walk_in?: boolean; // true si se registró desde el botón de walk-in (mig 025)
}

/** Ficha de cliente + consentimiento informado firmado (mig 025) */
export interface ClientConsent {
  id: string;
  client_id: string;
  appointment_id: string | null;
  staff_id: string | null;
  service_label: string;
  birth_date: string | null;
  address: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  medical_conditions: string[]; // llaves neutras ("diabetes", "none", …)
  medications: string | null;
  allergies: string | null;
  chemical_acks: string[]; // declaraciones aceptadas de servicios químicos
  photos_record: boolean;
  photos_social: boolean;
  signature: string; // PNG data-url
  signer_name?: string | null; // nombre tal como se firmó (mig 026)
  signed_at: string;
}

/** Cita con joins (clients/services/profiles embebidos por PostgREST) */
export interface AppointmentFull extends Appointment {
  clients: { full_name: string } | null;
  services: { name: string } | null;
  profiles: { full_name: string } | null;
}

export interface Payment {
  id: string;
  appointment_id: string | null;
  client_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at: string;
  staff_id: string | null; // a nombre de quién cuenta el ingreso (null = de quien lo registró)
  notes: string | null;
}

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
}

export interface ReminderSetting {
  type: ReminderType;
  enabled: boolean;
  hours_offset: number;
  channels: MessageChannel[];
}

export interface MessageTemplate {
  id: string;
  type: ReminderType;
  channel: MessageChannel;
  language: string;
  body: string;
}
