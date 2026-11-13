// Honnan jönnek a foglalt időpontok? Ha van adatbázis, onnan; ha nincs, a tesztadatokból.
// Így az alkalmazás adatbázis nélkül is kipróbálható (tesztüzem).
import "server-only";
import { foglalasiSzabalyok } from "./salon";
import { budapestiMost, type Foglalas } from "./idopontok";
import { tesztFoglalasok } from "./tesztFoglalasok";
import { vanAdatbazis, foglaltIdopontok } from "./adatbazis";

export async function aktualisFoglalasok(): Promise<Foglalas[]> {
  if (vanAdatbazis) return foglaltIdopontok(foglalasiSzabalyok.foglalhatoNapok);
  return tesztFoglalasok(budapestiMost().datum);
}

export { vanAdatbazis };
