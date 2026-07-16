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

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: Role;
  specialty: string | null;
  is_active: boolean;
  modules: string[] | null; // null = módulos por defecto del rol
  created_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  sort_order: number;
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
