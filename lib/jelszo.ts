// Jelszó és bejelentkezési "belépőjegy" (munkamenet) kezelése.
// Tiszta függvények – nem olvasnak sütit vagy környezeti változót, ezért tesztelhetők
// (lásd: jelszo.test.ts), és a jelszóbeállító szkript is használhatja őket.

import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";

// --- Jelszó ---
// A jelszót SOSEM tároljuk, csak egy "lenyomatát" (hash). Ebből a jelszó nem fejthető vissza,
// de ellenőrizni lehet vele, hogy valaki a helyes jelszót írta-e be.
// A "só" (salt) egy véletlen érték, ami miatt két egyforma jelszónak is eltérő a lenyomata.
// Formátum: "scrypt:<só>:<lenyomat>"  (a $ jelet kerüljük, mert a .env fájlban különleges jelentése van)

export function jelszoHash(jelszo: string): string {
  const so = randomBytes(16).toString("hex");
  const lenyomat = scryptSync(jelszo, so, 64).toString("hex");
  return `scrypt:${so}:${lenyomat}`;
}

export function jelszoEllenoriz(jelszo: string, tarolt: string): boolean {
  const [tipus, so, lenyomat] = tarolt.split(":");
  if (tipus !== "scrypt" || !so || !lenyomat) return false;
  const vart = Buffer.from(lenyomat, "hex");
  const kapott = scryptSync(jelszo, so, vart.length);
  // timingSafeEqual: mindig ugyanannyi ideig tart, akárhol is tér el a két érték –
  // így időméréssel sem lehet kitalálni a lenyomatot
  return kapott.length === vart.length && timingSafeEqual(kapott, vart);
}

// --- Munkamenet (belépőjegy) ---
// Sikeres belépés után a böngésző kap egy sütit: "<lejárat>.<aláírás>".
// Az aláírást csak a szerver tudja elkészíteni (a titkos kulccsal), így a sütit nem lehet
// hamisítani vagy a lejáratát meghosszabbítani – ha valaki átírja, az aláírás nem fog egyezni.

function alairas(lejarat: number, titok: string): string {
  return createHmac("sha256", titok).update(`admin:${lejarat}`).digest("hex");
}

export function munkamenetToken(titok: string, lejaratMs: number): string {
  return `${lejaratMs}.${alairas(lejaratMs, titok)}`;
}

export function munkamenetErvenyes(token: string, titok: string, mostMs: number): boolean {
  const [lejaratSzoveg, kapottAlairas] = token.split(".");
  const lejarat = Number(lejaratSzoveg);
  if (!Number.isFinite(lejarat) || !kapottAlairas) return false;
  if (lejarat <= mostMs) return false; // lejárt

  const vart = Buffer.from(alairas(lejarat, titok), "hex");
  const kapott = Buffer.from(kapottAlairas, "hex");
  return kapott.length === vart.length && timingSafeEqual(kapott, vart);
}
