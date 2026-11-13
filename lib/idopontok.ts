// A szabad időpontok kiszámítása.
// Ez egy "tiszta függvény": csak a kapott adatokból dolgozik, nem olvas órát, adatbázist vagy internetet.
// Ezért könnyű automatikusan tesztelni (lásd: idopontok.test.ts),
// és később változtatás nélkül átköltöztethető a szerverre.

import type { NyitvatartasNap } from "./salon";

// Egy meglévő foglalás – egyelőre tesztadat, később az adatbázisból jön
export type Foglalas = {
  datum: string; // "2026-11-16" formátum
  kezdes: string; // "10:00"
  idotartamPerc: number;
};

// Milyen sűrűn kínálunk fel kezdési időpontokat (09:00, 09:30, 10:00, ...)
export const IDOPONT_LEPES_PERC = 30;

// "09:30" → 570 (éjfél óta eltelt percek). Percekkel könnyebb számolni, mint órákkal.
export function idoPercben(ido: string): number {
  const [ora, perc] = ido.split(":").map(Number);
  return ora * 60 + perc;
}

// 570 → "09:30"
export function percbolIdo(osszPerc: number): string {
  const ora = String(Math.floor(osszPerc / 60)).padStart(2, "0");
  const perc = String(osszPerc % 60).padStart(2, "0");
  return `${ora}:${perc}`;
}

// "2026-11-16" → 0 (hétfő) ... 6 (vasárnap), a mi nyitvatartás-listánk sorrendjében.
// UTC-t használunk, hogy az időzóna ne csúsztassa el a napot.
export function hetNapIndex(datum: string): number {
  const nap = new Date(`${datum}T00:00:00Z`).getUTCDay(); // 0 = vasárnap
  return (nap + 6) % 7;
}

// "2026-11-16" + 3 nap → "2026-11-19"
export function napHozzaad(datum: string, napok: number): string {
  const d = new Date(`${datum}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + napok);
  return d.toISOString().slice(0, 10);
}

// A szalon Budapesten van, ezért a "most"-ot mindig budapesti idő szerint számoljuk –
// akkor is, ha a szerver (pl. egy külföldi tárhelyen) vagy a vendég gépe más időzónában van.
// Eredmény pl.: { datum: "2026-11-16", perc: 660 }  (660 perc = 11:00)
export function budapestiMost(pillanat: Date = new Date()): { datum: string; perc: number } {
  const reszek = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(pillanat);
  const resz = (tipus: string) => reszek.find((r) => r.type === tipus)?.value ?? "00";
  return {
    datum: `${resz("year")}-${resz("month")}-${resz("day")}`,
    perc: Number(resz("hour")) * 60 + Number(resz("minute")),
  };
}

// A naptár egy hónapjának napjai, hétfővel kezdődő hetekre bontva.
// A hónap előtti üres helyeken null áll, hogy az 1-je a megfelelő oszlopba kerüljön.
// "2026-11" → [null, null, null, null, null, "2026-11-01", "2026-11-02", ...]
export function honapNapjai(honap: string): (string | null)[] {
  const elsoNap = `${honap}-01`;
  const ures: null[] = Array(hetNapIndex(elsoNap)).fill(null);
  const napok: string[] = [];
  for (let datum = elsoNap; datum.startsWith(honap); datum = napHozzaad(datum, 1)) {
    napok.push(datum);
  }
  return [...ures, ...napok];
}

// "2026-11" + 1 → "2026-12", "2026-01" - 1 → "2025-12"
export function honapHozzaad(honap: string, db: number): string {
  const [ev, ho] = honap.split("-").map(Number);
  const d = new Date(Date.UTC(ev, ho - 1 + db, 1));
  return d.toISOString().slice(0, 7);
}

// "2026-11-16" → például "nov. 16., hétfő" (a kért formában)
export function formazDatum(datum: string, opciok: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("hu-HU", { timeZone: "UTC", ...opciok }).format(
    new Date(`${datum}T00:00:00Z`)
  );
}

export type SzabadIdopontBemenet = {
  datum: string; // melyik napra keresünk
  idotartamPerc: number; // a választott szolgáltatás hossza
  nyitvatartas: NyitvatartasNap[];
  foglalasok: Foglalas[]; // a már meglévő foglalások
  most: { datum: string; perc: number }; // a mostani nap és időpont (percben)
  minElooPerc: number; // legalább ennyi idővel előre lehet foglalni
};

export function szabadIdopontok(b: SzabadIdopontBemenet): string[] {
  // 1. Múltbeli napra nem lehet foglalni
  if (b.datum < b.most.datum) return [];

  // 2. Zárva tartó napon nincs időpont
  const nap = b.nyitvatartas[hetNapIndex(b.datum)];
  if (!nap.nyitas || !nap.zaras) return [];

  const nyitas = idoPercben(nap.nyitas);
  const zaras = idoPercben(nap.zaras);

  // 3. Az adott nap foglalásai, percekre átváltva: mettől meddig foglalt
  const foglaltSavok = b.foglalasok
    .filter((f) => f.datum === b.datum)
    .map((f) => ({
      kezd: idoPercben(f.kezdes),
      veg: idoPercben(f.kezdes) + f.idotartamPerc,
    }));

  // 4. Ma csak a "most + minimális előrefoglalási idő" utáni időpontok jöhetnek szóba.
  //    (Ha ez átnyúlik éjfélen, az a másnapi nyitásig úgysem számít.)
  const legkorabbi = b.datum === b.most.datum ? b.most.perc + b.minElooPerc : 0;

  const eredmeny: string[] = [];
  // 5. Végigmegyünk a lehetséges kezdési időpontokon nyitástól.
  //    Feltétel: a szolgáltatásnak záráskor már véget kell érnie.
  for (let kezd = nyitas; kezd + b.idotartamPerc <= zaras; kezd += IDOPONT_LEPES_PERC) {
    if (kezd < legkorabbi) continue;

    const veg = kezd + b.idotartamPerc;
    // Két időszak akkor ütközik, ha az egyik a másik vége előtt kezdődik, ÉS fordítva.
    // (Ha az egyik pont akkor kezdődik, amikor a másik véget ér, az nem ütközés.)
    const utkozik = foglaltSavok.some((f) => kezd < f.veg && f.kezd < veg);

    if (!utkozik) eredmeny.push(percbolIdo(kezd));
  }
  return eredmeny;
}
