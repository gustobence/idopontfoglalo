// Admin-bejelentkezés: süti kezelése a szerveren.
// A jelszó lenyomata és a titkos kulcs a .env.local-ban van (npm run admin:jelszo állítja be).
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jelszoEllenoriz, munkamenetToken, munkamenetErvenyes } from "./jelszo";

const SUTI_NEV = "admin_munkamenet";
const ERVENYESSEG_MS = 12 * 60 * 60 * 1000; // 12 óra után újra be kell lépni

function beallitasok() {
  const hash = process.env.ADMIN_JELSZO_HASH;
  const titok = process.env.MUNKAMENET_TITOK;
  return hash && titok && titok.length >= 32 ? { hash, titok } : null;
}

export function adminBeallitva(): boolean {
  return beallitasok() !== null;
}

export function jelszoHelyes(jelszo: string): boolean {
  const b = beallitasok();
  return b !== null && jelszoEllenoriz(jelszo, b.hash);
}

// Be van-e jelentkezve a mostani látogató?
export async function bejelentkezve(): Promise<boolean> {
  // FONTOS: a sütit MINDIG elsőként olvassuk. Ebből tudja a Next.js, hogy ez az oldal kérésenként
  // változik, és nem készítheti el előre. (Ha előbb kilépnénk, a build egy végleges
  // "nincs bejelentkezve" állapotot sütne bele az oldalba.)
  const token = (await cookies()).get(SUTI_NEV)?.value;
  const b = beallitasok();
  if (!b || !token) return false;
  return munkamenetErvenyes(token, b.titok, Date.now()); // …utána az idő
}

// Védett oldalak és műveletek elején: ha nincs bejelentkezve, átirányít a belépéshez
export async function adminKell(): Promise<void> {
  if (!(await bejelentkezve())) redirect("/admin/belepes");
}

export async function munkamenetIndit(): Promise<void> {
  const b = beallitasok();
  if (!b) throw new Error("Az admin nincs beállítva");
  const lejarat = Date.now() + ERVENYESSEG_MS;
  (await cookies()).set(SUTI_NEV, munkamenetToken(b.titok, lejarat), {
    httpOnly: true, // a böngészőben futó JavaScript nem olvashatja (véd a sütilopás ellen)
    secure: process.env.NODE_ENV === "production", // élesben csak titkosított (https) kapcsolaton
    sameSite: "lax", // más oldalról indított kérésekhez nem küldi el
    path: "/",
    expires: new Date(lejarat),
  });
}

export async function munkamenetZar(): Promise<void> {
  (await cookies()).delete(SUTI_NEV);
}
