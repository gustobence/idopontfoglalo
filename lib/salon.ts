// A szalon adatai. Az árak egy valódi szalon árlistáján alapulnak.
// ⚠️ Az IDŐTARTAMOK (idotartamPerc, pluszPerc, percPerDb) még BECSÜLT tesztértékek – a szalonnal pontosítani kell!
// A cím, a telefonszám és a nyitvatartás is tesztadat.

// --- Típusok ---
// A "type" leírja, milyen mezői vannak egy adatnak.
// A TypeScript ez alapján szól, ha például elírsz egy mezőnevet vagy kihagysz egy adatot.

export type Kategoria = {
  id: string;
  nev: string;
  leiras: string;
  valtozatMagyarazat?: string; // pl. mit jelent az S / M / L (a "?" = nem kötelező)
};

// Egy konkrét, foglalható szolgáltatás (pl. "Épített műköröm – M méret")
export type Szolgaltatas = {
  id: string; // egyedi azonosító, ez megy a címsorba és az adatbázisba
  kategoriaId: string;
  nev: string; // teljes név
  valtozat: string; // rövid név a kategórián belül, pl. "M méret"
  idotartamPerc: number; // ebből számoljuk a szabad időpontokat
  arFt: number;
};

export type Diszites = {
  id: string;
  nev: string;
  leiras: string;
  pluszPerc: number; // a díszítéshez szükséges MAXIMÁLIS idő
  arMin: number; // ársáv: ha fix ár, akkor arMin = arMax
  arMax: number;
};

export type NyitvatartasNap = {
  nap: string;
  nyitas: string | null; // null = zárva
  zaras: string | null;
};

// --- Szalon ---

export const szalon = {
  nev: "Demo Nail Studio",
  szlogen: "Időpontfoglalás pár kattintással.",
  bemutatkozas:
    "Szia! Itt a szalon körmöse mutatkozik be. Nálam nincs rohanás, minden vendégre van időm, és mindig a te stílusodhoz igazodom, legyen szó visszafogott, elegáns színekről vagy merészebb díszítésről.",
  cim: "1234 Tesztváros, Minta utca 1.", // TESZT
  telefon: "+36 30 000 0000", // TESZT
};

// Foglalási szabályok – a böngésző és a szerver is ezeket használja
export const foglalasiSzabalyok = {
  foglalhatoNapok: 60, // ennyi napra előre lehet foglalni
  minElorePerc: 120, // legalább ennyi perccel előre
};

// --- Árlista ---

const MERET_MAGYARAZAT = "A méret a köröm hosszát jelöli: S – rövid, M – közepes, L – hosszú.";

export const kategoriak: Kategoria[] = [
  {
    id: "gellakk",
    nev: "Géllakk",
    leiras: "Tartós, fényes szín a saját körmödre.",
  },
  {
    id: "epites",
    nev: "Épített műköröm",
    leiras: "Zselés építés, formára és hosszra szabva.",
    valtozatMagyarazat: MERET_MAGYARAZAT,
  },
  {
    id: "toltes",
    nev: "Töltés",
    leiras: "A meglévő műköröm felújítása, a kinövés pótlása.",
    valtozatMagyarazat: MERET_MAGYARAZAT,
  },
];

export const szolgaltatasok: Szolgaltatas[] = [
  // Géllakk
  { id: "gellakk-alap", kategoriaId: "gellakk", nev: "Alap géllakk", valtozat: "Alap géllakk", idotartamPerc: 60, arFt: 6000 },
  { id: "gellakk-erositett", kategoriaId: "gellakk", nev: "Erősített géllakk", valtozat: "Erősített géllakk", idotartamPerc: 75, arFt: 6500 },
  // Épített műköröm
  { id: "epites-s", kategoriaId: "epites", nev: "Épített műköröm – S méret", valtozat: "S méret", idotartamPerc: 120, arFt: 8000 },
  { id: "epites-m", kategoriaId: "epites", nev: "Épített műköröm – M méret", valtozat: "M méret", idotartamPerc: 135, arFt: 9000 },
  { id: "epites-l", kategoriaId: "epites", nev: "Épített műköröm – L méret", valtozat: "L méret", idotartamPerc: 150, arFt: 10000 },
  // Töltés
  { id: "toltes-s", kategoriaId: "toltes", nev: "Töltés – S méret", valtozat: "S méret", idotartamPerc: 90, arFt: 7500 },
  { id: "toltes-m", kategoriaId: "toltes", nev: "Töltés – M méret", valtozat: "M méret", idotartamPerc: 105, arFt: 8000 },
  { id: "toltes-l", kategoriaId: "toltes", nev: "Töltés – L méret", valtozat: "L méret", idotartamPerc: 120, arFt: 9000 },
];

// Díszítések – egyszerre egy választható közülük (vagy egyik sem)
export const diszitesek: Diszites[] = [
  {
    id: "egyszeru",
    nev: "Egyszerű díszítés",
    leiras: "Pl. csillám vagy egyszerű minta néhány körmön.",
    pluszPerc: 10,
    arMin: 500,
    arMax: 500,
  },
  {
    id: "komoly",
    nev: "Komolyabb díszítés",
    leiras: "Pl. francia, kézzel festett minták, 3D díszek. A pontos ár a minta bonyolultságától függ.",
    pluszPerc: 30,
    arMin: 1000,
    arMax: 2500,
  },
];

// Kövek – csak az árlistán szerepelnek, foglaláskor nem kell megjelölni (a helyszínen számolódnak)
export const kovek = {
  arPerDb: 50,
};

export const nyitvatartas: NyitvatartasNap[] = [
  // TESZT
  { nap: "Hétfő", nyitas: "09:00", zaras: "17:00" },
  { nap: "Kedd", nyitas: "09:00", zaras: "17:00" },
  { nap: "Szerda", nyitas: "12:00", zaras: "20:00" },
  { nap: "Csütörtök", nyitas: "09:00", zaras: "17:00" },
  { nap: "Péntek", nyitas: "09:00", zaras: "15:00" },
  { nap: "Szombat", nyitas: null, zaras: null },
  { nap: "Vasárnap", nyitas: null, zaras: null },
];

// --- Összesítés: szolgáltatás + díszítés ---
// A böngésző és a szerver IS ezt használja, így biztosan ugyanazt számolják.
// Nem létező díszítésnél null-t ad vissza.

export type Osszesites = {
  nev: string; // pl. "Épített műköröm – M méret + Komolyabb díszítés"
  idotartamPerc: number;
  arMin: number;
  arMax: number;
  diszites: Diszites | null;
};

export function osszesites(szolgaltatas: Szolgaltatas, diszitesId: string | null): Osszesites | null {
  let nev = szolgaltatas.nev;
  let idotartamPerc = szolgaltatas.idotartamPerc;
  let arMin = szolgaltatas.arFt;
  let arMax = szolgaltatas.arFt;

  let diszites: Diszites | null = null;
  if (diszitesId !== null) {
    diszites = diszitesek.find((d) => d.id === diszitesId) ?? null;
    if (!diszites) return null;
    nev += ` + ${diszites.nev}`;
    idotartamPerc += diszites.pluszPerc;
    arMin += diszites.arMin;
    arMax += diszites.arMax;
  }

  return { nev, idotartamPerc, arMin, arMax, diszites };
}

// --- Segédfüggvények a megjelenítéshez ---

// 14000 → "14 000 Ft"
export function formazAr(arFt: number): string {
  return new Intl.NumberFormat("hu-HU").format(arFt) + " Ft";
}

// (9500, 10500) → "9 500 – 10 500 Ft",  (9000, 9000) → "9 000 Ft"
export function formazArSav(arMin: number, arMax: number): string {
  if (arMin === arMax) return formazAr(arMin);
  return `${new Intl.NumberFormat("hu-HU").format(arMin)} – ${formazAr(arMax)}`;
}

// 90 → "1 óra 30 perc", 45 → "45 perc"
export function formazIdotartam(perc: number): string {
  const ora = Math.floor(perc / 60);
  const maradek = perc % 60;
  if (ora === 0) return `${maradek} perc`;
  if (maradek === 0) return `${ora} óra`;
  return `${ora} óra ${maradek} perc`;
}
