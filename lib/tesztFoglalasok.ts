// TESZTADAT – kitalált foglalások, hogy a naptárban legyenek már foglalt időpontok.
// A dátumokat a mai naphoz képest számoljuk, így sosem "avulnak el".
// Később ezek helyére az adatbázisban tárolt valódi foglalások kerülnek.

import { napHozzaad, type Foglalas } from "./idopontok";

export function tesztFoglalasok(ma: string): Foglalas[] {
  const foglalasok: Foglalas[] = [];
  for (let i = 0; i < 70; i++) {
    const datum = napHozzaad(ma, i);
    if (i % 2 === 0) foglalasok.push({ datum, kezdes: "10:00", idotartamPerc: 90 });
    if (i % 3 === 0) foglalasok.push({ datum, kezdes: "14:00", idotartamPerc: 60 });
    if (i % 4 === 1) foglalasok.push({ datum, kezdes: "12:30", idotartamPerc: 120 });
  }
  return foglalasok;
}
