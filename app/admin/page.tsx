// Admin főoldal: /admin  (közelgő foglalások)  és  /admin?nezet=korabbi  (korábbiak)
// Csak bejelentkezve érhető el – a védelem a szerveren történik (adminKell).
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { szalon, formazAr } from "@/lib/salon";
import { budapestiMost, formazDatum, napHozzaad } from "@/lib/idopontok";
import { adminKell } from "@/lib/auth";
import { vanAdatbazis, adminFoglalasok, type AdminFoglalas } from "@/lib/adatbazis";
import { kilepes } from "./actions";
import LemondasGomb from "@/components/admin/LemondasGomb";

export const metadata: Metadata = {
  title: `Admin – ${szalon.nev}`,
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ nezet?: string | string[] }> };

export default function AdminOldal({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="py-24 text-center text-stone-500">Betöltés…</p>}>
      <AdminTartalom searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminTartalom({ searchParams }: Props) {
  // 0. Ez az oldal mindig a kérés pillanatában készül (pontos idő, friss adatok)
  await connection();
  // 1. Védelem: aki nincs bejelentkezve, átirányítjuk a belépéshez
  await adminKell();

  const { nezet: nezetParam } = await searchParams;
  const nezet = nezetParam === "korabbi" ? "korabbi" : "kozelgo";
  const ma = budapestiMost().datum;
  const holnap = napHozzaad(ma, 1);

  // 2. Adatok
  const foglalasok = vanAdatbazis ? await adminFoglalasok(nezet) : [];
  const aktivak = foglalasok.filter((f) => f.statusz === "aktiv");
  const maiAktiv = aktivak.filter((f) => f.datum === ma).length;

  // 3. Napok szerinti csoportosítás (a sorrend megmarad)
  const napok = new Map<string, AdminFoglalas[]>();
  for (const f of foglalasok) {
    napok.set(f.datum, [...(napok.get(f.datum) ?? []), f]);
  }

  return (
    <>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-rose-600">Admin</p>
            <p className="font-semibold text-stone-900">{szalon.nev}</p>
          </div>
          <form action={kilepes}>
            <button className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:border-stone-400">
              Kilépés
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {!vanAdatbazis && (
          <p className="mb-6 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-sky-100">
            Nincs adatbázis beállítva (tesztüzem) – itt nem jelennek meg foglalások.
          </p>
        )}

        {/* Összesítő */}
        {nezet === "kozelgo" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-sm text-stone-500">Mai foglalások</p>
              <p className="mt-1 text-3xl font-semibold text-stone-900">{maiAktiv}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-sm text-stone-500">Összes közelgő</p>
              <p className="mt-1 text-3xl font-semibold text-stone-900">{aktivak.length}</p>
            </div>
          </div>
        )}

        {/* Nézetváltó */}
        <nav className="mt-6 flex gap-2 text-sm">
          <NezetLink aktiv={nezet === "kozelgo"} href="/admin" cim="Közelgő" />
          <NezetLink aktiv={nezet === "korabbi"} href="/admin?nezet=korabbi" cim="Korábbiak (60 nap)" />
        </nav>

        {/* Foglalások napok szerint */}
        {napok.size === 0 ? (
          <p className="mt-10 text-center text-stone-500">
            {nezet === "kozelgo" ? "Nincs közelgő foglalás." : "Az elmúlt 60 napban nem volt foglalás."}
          </p>
        ) : (
          <div className="mt-6 space-y-8">
            {[...napok].map(([datum, napiFoglalasok]) => (
              <section key={datum}>
                <h2 className="flex items-baseline gap-2 text-lg font-semibold text-stone-900">
                  {formazDatum(datum, { month: "long", day: "numeric", weekday: "long" })}
                  {datum === ma && <Cimke>ma</Cimke>}
                  {datum === holnap && <Cimke>holnap</Cimke>}
                </h2>
                <ul className="mt-3 space-y-3">
                  {napiFoglalasok.map((f) => (
                    <FoglalasKartya key={f.id} f={f} lemondhato={nezet === "kozelgo"} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <p className="mt-12 text-center text-xs text-stone-400">
          <Link href="/" className="hover:text-rose-600">
            Nyilvános oldal megnyitása
          </Link>
        </p>
      </main>
    </>
  );
}

function FoglalasKartya({ f, lemondhato }: { f: AdminFoglalas; lemondhato: boolean }) {
  const lemondva = f.statusz === "lemondva";
  return (
    <li
      className={`rounded-2xl border bg-white p-4 sm:p-5 ${
        lemondva ? "border-stone-200 opacity-60" : "border-stone-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-lg font-semibold text-stone-900 ${lemondva ? "line-through" : ""}`}>
            {f.kezdes}–{f.vege} · {f.szolgaltatasNev}
          </p>
          <p className="text-sm text-stone-500">{formazAr(f.arFt)}</p>
        </div>
        {lemondva ? (
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-500">
            Lemondva
          </span>
        ) : (
          lemondhato && <LemondasGomb id={f.id} leiras={`${f.kezdes} – ${f.nev}`} />
        )}
      </div>

      <div className="mt-3 grid gap-1 text-sm text-stone-700 sm:grid-cols-3">
        <p className="font-medium">{f.nev}</p>
        <a href={`tel:${f.telefon.replace(/[\s\-()/]/g, "")}`} className="text-rose-700 hover:underline">
          {f.telefon}
        </a>
        <a href={`mailto:${f.email}`} className="truncate text-rose-700 hover:underline">
          {f.email}
        </a>
      </div>
      {f.megjegyzes && (
        <p className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-600">„{f.megjegyzes}”</p>
      )}
    </li>
  );
}

function NezetLink({ aktiv, href, cim }: { aktiv: boolean; href: string; cim: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 ${
        aktiv ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300"
      }`}
    >
      {cim}
    </Link>
  );
}

function Cimke({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">{children}</span>
  );
}
