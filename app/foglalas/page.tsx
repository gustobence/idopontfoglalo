// A foglalási oldal: /foglalas?szolgaltatas=gellakk
// A mappa neve ("foglalas") adja az oldal címét – ez a Next.js App Router szabálya.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { szalon, szolgaltatasok } from "@/lib/salon";
import FoglalasFolyamat from "@/components/FoglalasFolyamat";
import { aktualisFoglalasok, vanAdatbazis } from "@/lib/foglalasok";

export const metadata: Metadata = {
  title: `Időpontfoglalás – ${szalon.nev}`,
};

type Props = {
  // A címsor "?" utáni része. A Next.js ezt később adja át, ezért Promise (meg kell várni).
  searchParams: Promise<{ szolgaltatas?: string | string[] }>;
};

// Az oldal "váza" (fejléc, keret) azonnal, előre elkészíthető.
// A címsortól függő részt egy <Suspense>-be tett külön komponens olvassa be –
// a Next.js 16 ezt kéri, hogy a váz ne várjon a kérés adataira.
export default function FoglalasOldal({ searchParams }: Props) {
  return (
    <>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight text-stone-900">
            {szalon.nev}
          </Link>
          <Link href="/#szolgaltatasok" className="text-sm text-stone-600 hover:text-rose-600">
            ← Vissza
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Suspense fallback={<p className="py-16 text-center text-stone-500">Betöltés…</p>}>
          <FoglalasTartalom searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function FoglalasTartalom({ searchParams }: Props) {
  const { szolgaltatas: szolgaltatasId } = await searchParams;

  // A címsorba bárki bármit beírhat, ezért ellenőrizzük, hogy létező szolgáltatás-e
  const szolgaltatas = szolgaltatasok.find((s) => s.id === szolgaltatasId);

  if (szolgaltatas) {
    // A foglalt időpontok betöltése (adatbázisból, vagy tesztüzemben a tesztadatokból).
    // Csak időpontok mennek a böngészőbe – a vendégek nevei, telefonszámai nem.
    // A connection() jelzi a Next.js-nek: ezt NE készítse el előre, mindig a kérés pillanatában
    // számolja ki, hogy a vendég a legfrissebb foglaltsági állapotot lássa.
    await connection();
    const foglalasok = await aktualisFoglalasok();
    return (
      <FoglalasFolyamat
        szolgaltatas={szolgaltatas}
        foglalasok={foglalasok}
        tesztuzem={!vanAdatbazis}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
      <h1 className="text-xl font-semibold text-stone-900">Válassz szolgáltatást</h1>
      <p className="mt-2 text-stone-600">
        A foglaláshoz először válaszd ki, milyen kezelésre érkeznél.
      </p>
      <Link
        href="/#szolgaltatasok"
        className="mt-6 inline-block rounded-full bg-rose-600 px-6 py-2.5 font-medium text-white hover:bg-rose-700"
      >
        Szolgáltatások
      </Link>
    </div>
  );
}
