import { getBookingData } from "./actions";
import { BookingClient } from "./BookingClient";

export const metadata = { title: "Book an appointment" };

// Siempre datos frescos (servicios, equipo y horarios)
export const dynamic = "force-dynamic";

export default async function BookPage() {
  const data = await getBookingData();
  return <BookingClient data={data} />;
}
