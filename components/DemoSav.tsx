// Figyelmeztető sáv a nyilvános demó minden oldalának tetején.
// Csak akkor jelenik meg, ha nincs beállítva valódi szalonnév (lásd: demoUzem a lib/salon.ts-ben).
import { demoUzem } from "@/lib/salon";

export default function DemoSav() {
  if (!demoUzem) return null;

  return (
    <p
      role="note"
      className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950"
    >
      Ez egy bemutató oldal, nem valódi szalon. Ne adj meg valódi adatot, csak kitalált nevet,
      telefonszámot és e-mail-címet.
    </p>
  );
}
