import { getLang } from "@/lib/lang-server";
import {
  getSalonInfo,
  LegalShell,
  type LegalSection,
} from "../legal-shared";

export const metadata = { title: "Privacy Policy" };

const CONTENT: Record<
  "en" | "es",
  { title: string; updated: string; sections: LegalSection[] }
> = {
  es: {
    title: "Política de Privacidad",
    updated: "Última actualización: 21 de julio de 2026",
    sections: [
      {
        h: "1. Qué datos recopilamos",
        p: [
          "Cuando agendas una cita recopilamos: tu nombre, número de teléfono, correo electrónico (opcional), el servicio y horario que elegiste y, si decides enviarlo, la imagen del comprobante de tu depósito.",
          "Como parte del servicio también guardamos tu historial de citas y notas internas que nos ayudan a atenderte mejor (por ejemplo, preferencias o alergias que nos comuniques).",
        ],
      },
      {
        h: "2. Para qué los usamos",
        p: [
          "Usamos tus datos únicamente para operar el estudio: gestionar tus citas, enviarte confirmaciones, recordatorios y mensajes de seguimiento por SMS o WhatsApp, llevar tu historial de servicios y elaborar estadísticas internas del negocio.",
          "No vendemos ni rentamos tu información personal a terceros, ni la usamos para publicidad de terceros.",
        ],
      },
      {
        h: "3. Con quién se comparte",
        p: [
          "Solo compartimos datos con los proveedores tecnológicos necesarios para operar: nuestra base de datos y almacenamiento seguros (Supabase), el alojamiento de la aplicación (Vercel) y el servicio de mensajería (Twilio) que entrega los SMS/WhatsApp de tu cita.",
          "Estos proveedores procesan los datos por instrucción nuestra y bajo sus propias medidas de seguridad.",
        ],
      },
      {
        h: "4. Cuánto tiempo los conservamos",
        p: [
          "Conservamos tu información mientras seas clienta del estudio, para mantener tu historial de servicios. Puedes pedirnos eliminarla en cualquier momento (ver sección 6).",
        ],
      },
      {
        h: "5. Cookies",
        p: [
          "La página de reservas solo usa cookies funcionales: recordar tu idioma preferido y, para el equipo del estudio, mantener la sesión iniciada. No usamos cookies de publicidad ni de rastreo de terceros.",
        ],
      },
      {
        h: "6. Tus derechos",
        p: [
          "Puedes pedirnos en cualquier momento acceder a los datos que tenemos sobre ti, corregirlos o eliminarlos, así como dejar de recibir mensajes de recordatorio. Escríbenos por teléfono o WhatsApp (datos de contacto abajo) y lo gestionamos.",
        ],
      },
      {
        h: "7. Menores de edad",
        p: [
          "Los servicios y reservas para menores de edad deben ser gestionados por su madre, padre o tutor.",
        ],
      },
      {
        h: "8. Cambios a esta política",
        p: [
          "Podemos actualizar esta política ocasionalmente. La versión vigente estará siempre publicada en esta página con su fecha de actualización.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: July 21, 2026",
    sections: [
      {
        h: "1. What data we collect",
        p: [
          "When you book an appointment we collect: your name, phone number, email address (optional), the service and time you chose and, if you decide to send it, the image of your deposit receipt.",
          "As part of the service we also keep your appointment history and internal notes that help us serve you better (for example, preferences or allergies you tell us about).",
        ],
      },
      {
        h: "2. How we use it",
        p: [
          "We use your data only to run the studio: manage your appointments, send you confirmations, reminders and follow-up messages via SMS or WhatsApp, keep your service history and produce internal business statistics.",
          "We do not sell or rent your personal information to third parties, nor use it for third-party advertising.",
        ],
      },
      {
        h: "3. Who we share it with",
        p: [
          "We only share data with the technology providers needed to operate: our secure database and storage (Supabase), the application hosting (Vercel) and the messaging service (Twilio) that delivers your appointment SMS/WhatsApp messages.",
          "These providers process data on our instructions and under their own security measures.",
        ],
      },
      {
        h: "4. How long we keep it",
        p: [
          "We keep your information while you are a client of the studio, to maintain your service history. You can ask us to delete it at any time (see section 6).",
        ],
      },
      {
        h: "5. Cookies",
        p: [
          "The booking page only uses functional cookies: remembering your preferred language and, for studio staff, keeping their session signed in. We do not use advertising or third-party tracking cookies.",
        ],
      },
      {
        h: "6. Your rights",
        p: [
          "You can ask us at any time to access the data we hold about you, correct it or delete it, as well as stop receiving reminder messages. Reach us by phone or WhatsApp (contact details below) and we will take care of it.",
        ],
      },
      {
        h: "7. Minors",
        p: [
          "Services and bookings for minors must be arranged by their parent or legal guardian.",
        ],
      },
      {
        h: "8. Changes to this policy",
        p: [
          "We may update this policy from time to time. The current version will always be published on this page with its update date.",
        ],
      },
    ],
  },
};

export default async function PrivacyPage() {
  const lang = await getLang();
  const salon = await getSalonInfo();
  const c = CONTENT[lang];
  return (
    <LegalShell
      lang={lang}
      title={c.title}
      updated={c.updated}
      sections={c.sections}
      salon={salon}
    />
  );
}
