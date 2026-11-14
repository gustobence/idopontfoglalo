"use server";
// Az admin szerveroldali műveletei. FONTOS: minden művelet ELEJÉN újra ellenőrizzük a
// bejelentkezést – a Server Action egy nyilvános végpont, bárki meghívhatja, akkor is,
// ha az oldalon nem látja a gombot.

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import {
  adminBeallitva,
  jelszoHelyes,
  munkamenetIndit,
  munkamenetZar,
  bejelentkezve,
} from "@/lib/auth";
import { foglalasLemondasa } from "@/lib/adatbazis";

export type BelepesAllapot = { hiba: string | null };

export async function belepes(_elozo: BelepesAllapot, urlap: FormData): Promise<BelepesAllapot> {
  if (!adminBeallitva()) {
    return {
      hiba: "Az admin még nincs beállítva. A projekt mappájában futtasd: npm run admin:jelszo, majd indítsd újra a szervert.",
    };
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
