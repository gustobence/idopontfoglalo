// TESZTADATOK – kitalált szalon, kitalált adatokkal.
// Később ezeket a valódi szalonadatokra cseréljük, majd adatbázisba költöztetjük.

// A "type" leírja, milyen mezői vannak egy szolgáltatásnak.
// A TypeScript ez alapján szól, ha például elírsz egy mezőnevet vagy kihagysz egy adatot.
export type Szolgaltatas = {
  id: string; // egyedi azonosító (később ez lesz az adatbázis kulcsa)
  nev: string;
  leiras: string;
  idotartamPerc: number; // ebből számoljuk majd a szabad időpontokat
  arFt: number;
};

export type NyitvatartasNap = {
  nap: string;
  nyitas: string | null; // null = zárva
  zaras: string | null;
};

export const szalon = {
  nev: "Demo Nail Studio",
  szlogen: "Ápolt kezek, nyugodt percek",
  bemutatkozas:
    "Ez egy kitalált bemutatkozó szöveg. Ide kerül majd a szalon rövid leírása: ki dolgozik itt, milyen stílusban, és miért érdemes ide jönni.",
  cim: "1234 Tesztváros, Minta utca 1.",
  telefon: "+36 30 000 0000",
};

export const szolgaltatasok: Szolgaltatas[] = [
  {
    id: "manikur",
    nev: "Klasszikus manikűr",
    leiras: "Körömformázás, bőrápolás, lakkozás nélkül.",
    idotartamPerc: 45,
    arFt: 5500,
  },
  {
    id: "gellakk",
    nev: "Gél lakk",
    leiras: "Tartós, fényes szín akár 3 hétig.",
    idotartamPerc: 60,
    arFt: 8000,
  },
  {
    id: "epites",
    nev: "Műköröm építés",
    leiras: "Zselés építés, formára és hosszra szabva.",
    idotartamPerc: 120,
    arFt: 14000,
  },
  {
    id: "toltes",
    nev: "Műköröm töltés",
    leiras: "A meglévő műköröm felújítása.",
    idotartamPerc: 90,
    arFt: 11000,
  },
  {
    id: "pedikur",
    nev: "Pedikűr",
    leiras: "Lábápolás, körömvágás, bőrkeményedés eltávolítása.",
    idotartamPerc: 60,
    arFt: 7500,
  },
];

export const nyitvatartas: NyitvatartasNap[] = [
  { nap: "Hétfő", nyitas: "09:00", zaras: "17:00" },
  { nap: "Kedd", nyitas: "09:00", zaras: "17:00" },
  { nap: "Szerda", nyitas: "12:00", zaras: "20:00" },
  { nap: "Csütörtök", nyitas: "09:00", zaras: "17:00" },
  { nap: "Péntek", nyitas: "09:00", zaras: "15:00" },
  { nap: "Szombat", nyitas: null, zaras: null },
  { nap: "Vasárnap", nyitas: null, zaras: null },
];

// Segédfüggvények a megjelenítéshez

// 14000 → "14 000 Ft"
export function formazAr(arFt: number): string {
  return new Intl.NumberFormat("hu-HU").format(arFt) + " Ft";
}

// 90 → "1 óra 30 perc", 45 → "45 perc"
export function formazIdotartam(perc: number): string {
  const ora = Math.floor(perc / 60);
  const maradek = perc % 60;
  if (ora === 0) return `${maradek} perc`;
  if (maradek === 0) return `${ora} óra`;
  return `${ora} óra ${maradek} perc`;
}
