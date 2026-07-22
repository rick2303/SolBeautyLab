import { getLang } from "@/lib/lang-server";
import {
  getSalonInfo,
  LegalShell,
  type LegalSection,
} from "../legal-shared";

export const metadata = { title: "Terms & Conditions" };

const CONTENT: Record<
  "en" | "es",
  { title: string; updated: string; sections: LegalSection[] }
> = {
  es: {
    title: "Términos y Condiciones",
    updated: "Última actualización: 21 de julio de 2026",
    sections: [
      {
        h: "1. Sobre estos términos",
        p: [
          "Al agendar una cita en línea o recibir un servicio en Sol Beauty Lab aceptas estos términos y condiciones. Si no estás de acuerdo con alguno, por favor contáctanos antes de reservar.",
        ],
      },
      {
        h: "2. Citas y reservas",
        p: [
          "Las citas se agendan a través de nuestra página de reservas o directamente con el estudio. Al reservar te pedimos tu nombre y un número de teléfono válido para poder confirmar y recordarte tu cita.",
          "Te pedimos llegar puntual. Si llegas con más de 15 minutos de retraso, es posible que tengamos que reagendar tu cita o ajustar el servicio para no afectar a las siguientes clientas.",
        ],
      },
      {
        h: "3. Depósito opcional",
        p: [
          "Al reservar puedes enviar un depósito opcional como muestra de compromiso para apartar tu cita. El depósito no es el pago completo del servicio y se descuenta del total el día de tu visita.",
          "El depósito se envía por Zelle a la cuenta indicada en la página de reservas y puedes adjuntar el comprobante al agendar. Si necesitas cambiar tu cita avisándonos con anticipación razonable, el depósito se aplica a la nueva fecha.",
        ],
      },
      {
        h: "4. Cancelaciones y cambios",
        p: [
          "Si necesitas cancelar o mover tu cita, avísanos con al menos 24 horas de anticipación por teléfono o WhatsApp.",
          "Las inasistencias sin aviso o las cancelaciones repetidas de último momento pueden requerir un depósito para futuras reservas, o la pérdida del depósito enviado.",
        ],
      },
      {
        h: "5. Precios y pagos",
        p: [
          "Los precios se muestran en dólares (USD) y pueden cambiar sin previo aviso; el precio aplicable es el vigente al momento de tu cita. Aceptamos efectivo, tarjeta, Zelle y otros métodos indicados en el estudio.",
        ],
      },
      {
        h: "6. Salud y responsabilidad",
        p: [
          "Antes de tu servicio infórmanos de cualquier alergia, condición de la piel, embarazo, tratamiento médico o cirugía reciente que pueda afectar el procedimiento. Los resultados pueden variar de persona a persona.",
          "Sol Beauty Lab no se hace responsable de reacciones derivadas de información de salud no comunicada por la clienta.",
        ],
      },
      {
        h: "7. Recordatorios y comunicación",
        p: [
          "Al reservar aceptas recibir mensajes (SMS o WhatsApp) relacionados con tu cita: confirmaciones, recordatorios y seguimiento. Puedes pedirnos dejar de enviarlos en cualquier momento.",
        ],
      },
      {
        h: "8. Cambios a estos términos",
        p: [
          "Podemos actualizar estos términos ocasionalmente. La versión vigente estará siempre publicada en esta página con su fecha de actualización.",
        ],
      },
    ],
  },
  en: {
    title: "Terms & Conditions",
    updated: "Last updated: July 21, 2026",
    sections: [
      {
        h: "1. About these terms",
        p: [
          "By booking an appointment online or receiving a service at Sol Beauty Lab you accept these terms and conditions. If you disagree with any of them, please contact us before booking.",
        ],
      },
      {
        h: "2. Appointments & booking",
        p: [
          "Appointments are booked through our booking page or directly with the studio. When booking we ask for your name and a valid phone number so we can confirm your visit and send reminders.",
          "Please arrive on time. If you are more than 15 minutes late we may need to reschedule your appointment or adjust the service so the next clients are not affected.",
        ],
      },
      {
        h: "3. Optional deposit",
        p: [
          "When booking you may send an optional deposit as a sign of commitment to hold your appointment. The deposit is not the full service payment and is deducted from your total on the day of your visit.",
          "The deposit is sent via Zelle to the account shown on the booking page, and you can attach the receipt when you book. If you reschedule with reasonable notice, the deposit is applied to the new date.",
        ],
      },
      {
        h: "4. Cancellations & changes",
        p: [
          "If you need to cancel or move your appointment, please let us know at least 24 hours in advance by phone or WhatsApp.",
          "No-shows or repeated last-minute cancellations may require a deposit for future bookings, or forfeit a deposit already sent.",
        ],
      },
      {
        h: "5. Prices & payment",
        p: [
          "Prices are shown in US dollars (USD) and may change without notice; the applicable price is the one in effect on the day of your appointment. We accept cash, card, Zelle and other methods indicated at the studio.",
        ],
      },
      {
        h: "6. Health & liability",
        p: [
          "Before your service, please tell us about any allergies, skin conditions, pregnancy, medical treatment or recent surgery that could affect the procedure. Results may vary from person to person.",
          "Sol Beauty Lab is not responsible for reactions arising from health information not disclosed by the client.",
        ],
      },
      {
        h: "7. Reminders & communication",
        p: [
          "By booking you agree to receive messages (SMS or WhatsApp) related to your appointment: confirmations, reminders and follow-ups. You can ask us to stop sending them at any time.",
        ],
      },
      {
        h: "8. Changes to these terms",
        p: [
          "We may update these terms from time to time. The current version will always be published on this page with its update date.",
        ],
      },
    ],
  },
};

export default async function TermsPage() {
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
