"use server";
// "use server" = az itt lévő függvények CSAK a szerveren futnak.
// A böngésző meghívhatja őket, de a kódjukat nem látja, és nem tudja megváltoztatni.
//
// FONTOS: a böngészőből érkező adatban SEMMIBEN nem bízunk meg – bárki küldhet ide bármit
// (akár a böngésző megkerülésével is). Ezért itt mindent újra ellenőrzünk.

import { szolgaltatasok, nyitvatartas, foglalasiSzabalyok } from "@/lib/salon";
import { szabadIdopontok, budapestiMost, napHozzaad } from "@/lib/idopontok";
import { ellenorizAdatok, type FoglalasiAdatok, type Hibak } from "@/lib/validacio";
import { aktualisFoglalasok, vanAdatbazis } from "@/lib/foglalasok";
import { foglalasMentese } from "@/lib/adatbazis";

export type FoglalasEredmeny =
  | { ok: true; tesztuzem: boolean }
  | { ok: false; kod: "hibas_adat"; hibak: Hibak }
  | { ok: false; kod: "foglalt"; uzenet: string }
  | { ok: false; kod: "hiba"; uzenet: string };

export async function foglalasLetrehozasa(bemenet: unknown): Promise<FoglalasEredmeny> {
  // 1. Formai ellenőrzés: tényleg a várt alakú adat érkezett-e?
  const b = bemenet as Record<string, unknown> | null;
  const a = (b?.adatok ?? null) as Record<string, unknown> | null;
  if (
    typeof b?.szolgaltatasId !== "string" ||
    typeof b.datum !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(b.datum) ||
    typeof b.ido !== "string" ||
    !/^\d{2}:\d{2}$/.test(b.ido) ||
    !a ||
    typeof a.nev !== "string" ||
    typeof a.telefon !== "string" ||
    typeof a.email !== "string" ||
    typeof a.megjegyzes !== "string" ||
    typeof a.hozzajarulas !== "boolean"
  ) {
    return { ok: false, kod: "hiba", uzenet: "Hibás kérés. Kérlek, töltsd újra az oldalt." };
  }
  const adatok: FoglalasiAdatok = {
    nev: a.nev,
    telefon: a.telefon,
    email: a.email,
    megjegyzes: a.megjegyzes,
    hozzajarulas: a.hozzajarulas,
  };

  // 2. Létező szolgáltatás? (Az árat és az időtartamot a SZERVER adja, nem a böngésző!)
  const szolgaltatas = szolgaltatasok.find((s) => s.id === b.szolgaltatasId);
  if (!szolgaltatas) {
    return { ok: false, kod: "hiba", uzenet: "Ismeretlen szolgáltatás." };
  }

  // 3. A vendég adatai – ugyanaz a függvény, mint a böngészőben
  const hibak = ellenorizAdatok(adatok);
  if (Object.keys(hibak).length > 0) {
    return { ok: false, kod: "hibas_adat", hibak };
  }

  // 4. Foglalható időpont? (Nem múltbeli, nincs túl messze, nyitvatartáson belül, szabad.)
  const most = budapestiMost();
  const utolsoNap = napHozzaad(most.datum, foglalasiSzabalyok.foglalhatoNapok - 1);
  const foglalasok = await aktualisFoglalasok();
  const szabad =
    b.datum <= utolsoNap &&
    szabadIdopontok({
      datum: b.datum,
      idotartamPerc: szolgaltatas.idotartamPerc,
      nyitvatartas,
      foglalasok,
      most,
      minElooPerc: foglalasiSzabalyok.minElorePerc,
    }).includes(b.ido);

  if (!szabad) {
    return {
      ok: false,
      kod: "foglalt",
      uzenet: "Ez az időpont már nem foglalható. Kérlek, válassz egy másikat.",
    };
  }

  // 5. Tesztüzem: nincs adatbázis → nem mentünk, de jelezzük
  if (!vanAdatbazis) {
    return { ok: true, tesztuzem: true };
  }

  // 6. Mentés. Ha két vendég egyszerre foglalná ugyanazt, a 4. lépésen mindkettő átjuthat –
  //    ezt végül az adatbázis átfedés-tiltása dönti el: csak az egyik mentés sikerül.
  try {
    const mentes = await foglalasMentese({
      szolgaltatasId: szolgaltatas.id,
      szolgaltatasNev: szolgaltatas.nev,
      arFt: szolgaltatas.arFt,
      datum: b.datum,
      kezdes: b.ido,
      idotartamPerc: szolgaltatas.idotartamPerc,
      nev: adatok.nev.trim(),
      telefon: adatok.telefon.trim(),
      email: adatok.email.trim(),
      megjegyzes: adatok.megjegyzes.trim(),
    });

    if (mentes.eredmeny === "utkozes") {
      return {
        ok: false,
        kod: "foglalt",
        uzenet: "Ezt az időpontot közben valaki más lefoglalta. Kérlek, válassz egy másikat.",
      };
    }
    return { ok: true, tesztuzem: false };
  } catch (hiba) {
    // A részleteket a szerver naplójába írjuk, a vendégnek csak általános üzenetet mutatunk
    // (a technikai részletek – pl. adatbázisnév – nem tartoznak a vendégre).
    console.error("Foglalás mentése sikertelen:", hiba);
    return {
      ok: false,
      kod: "hiba",
      uzenet: "Váratlan hiba történt, a foglalás nem mentődött el. Kérlek, próbáld újra, vagy hívd a szalont.",
    };
  }
}
