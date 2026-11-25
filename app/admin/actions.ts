"use server";
// Az admin szerveroldali műveletei. FONTOS: minden művelet ELEJÉN újra ellenőrizzük a
// bejelentkezést – a Server Action egy nyilvános végpont, bárki meghívhatja, akkor is,
// ha az oldalon nem látja a gombot.

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import {
  adminBeallitva,
  jelszoHelyes,
  munkamenetIndit,
  munkamenetZar,
  bejelentkezve,
} from "@/lib/auth";
import { foglalasLemondasa, belepesiProbaRogzitese, vanAdatbazis } from "@/lib/adatbazis";

export type BelepesAllapot = { hiba: string | null };

// Rate limiting: egy IP-címről legfeljebb ennyi belépési próbálkozás ennyi percen belül
const MAX_PROBA = 5;
const IDOABLAK_PERC = 15;

// A látogató IP-címe. A Vercel ezt az x-forwarded-for fejléc ELSŐ elemébe írja.
// A saját gépen (npm run dev) ez általában "::1"; ha a fejléc hiányzik, "helyi".
async function latogatoIp(): Promise<string> {
  const fejlecek = await headers();
  return fejlecek.get("x-forwarded-for")?.split(",")[0].trim() || "helyi";
}

export async function belepes(_elozo: BelepesAllapot, urlap: FormData): Promise<BelepesAllapot> {
  if (!adminBeallitva()) {
    return {
      hiba: "Az admin még nincs beállítva. A projekt mappájában futtasd: npm run admin:jelszo, majd indítsd újra a szervert.",
    };
  }

  // Rate limiting – MÉG a jelszó ellenőrzése ELŐTT. (Adatbázis nélkül, tesztüzemben nincs közös
  // füzet, ezért ott kimarad; élesben mindig van adatbázis.)
  if (vanAdatbazis) {
    let probak: number;
    try {
      probak = await belepesiProbaRogzitese(await latogatoIp(), IDOABLAK_PERC);
    } catch (hiba) {
      // Ha a számlálás nem sikerül, inkább NEM engedünk be (biztonságos irányba hibázunk).
      console.error("A belépési próbálkozás rögzítése sikertelen:", hiba);
      return { hiba: "Most nem lehet belépni. Próbáld újra néhány perc múlva." };
    }
    if (probak > MAX_PROBA) {
      return { hiba: `Túl sok próbálkozás. Próbáld újra ${IDOABLAK_PERC} perc múlva.` };
    }
  }

  const jelszo = urlap.get("jelszo");
  if (typeof jelszo !== "string" || !jelszoHelyes(jelszo)) {
    // Szándékos várakozás: lassítja a jelszó-találgatást
    await new Promise((r) => setTimeout(r, 1000));
    return { hiba: "Hibás jelszó." };
  }
  await munkamenetIndit();
  redirect("/admin"); // a redirect "kivételt dob", ezért ez után már nem fut semmi
}

export async function kilepes(): Promise<void> {
  await munkamenetZar();
  redirect("/admin/belepes");
}

export type LemondasEredmeny = { ok: true } | { ok: false; uzenet: string };

export async function lemondas(id: unknown): Promise<LemondasEredmeny> {
  if (!(await bejelentkezve())) {
    return { ok: false, uzenet: "Lejárt a bejelentkezés. Kérlek, lépj be újra." };
  }
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return { ok: false, uzenet: "Hibás azonosító." };
  }
  try {
    const sikerult = await foglalasLemondasa(id);
    refresh(); // az admin oldal friss adatokkal töltődik újra
    return sikerult
      ? { ok: true }
      : { ok: false, uzenet: "Ez a foglalás már le van mondva, vagy nem létezik." };
  } catch (hiba) {
    console.error("Lemondás sikertelen:", hiba);
    return { ok: false, uzenet: "Váratlan hiba történt. Kérlek, próbáld újra." };
  }
}
