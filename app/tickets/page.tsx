import { redirect } from "next/navigation";

// Tickets is split into Passengers + Vehicles sub-pages; /tickets lands on
// the passenger list by default.
export default function TicketsPage() {
  redirect("/tickets/passengers");
}
