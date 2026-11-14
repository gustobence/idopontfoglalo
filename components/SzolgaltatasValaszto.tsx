"use client";
// Böngészőben futó komponens, mert kattintásra reagál és megjegyzi a kiválasztást.
// Az árlista kategóriánként jelenik meg; a kategórián belül a változatok (pl. S / M / L méret)
// közül lehet választani.

import { useState } from "react";
import Link from "next/link";
import { kategoriak, szolgaltatasok, formazAr, formazIdotartam } from "@/lib/salon";

// Minden kategória saját, halvány színt kap az alappalettából (rózsa, babakék, mályva),
// így az árlista színesebb, de harmonikus marad. (A Tailwind miatt a teljes osztályneveket kell leírni.)
const KATEGORIA_SZINEK = [
  {
    fejlec: "bg-gradient-to-br from-rose-100 to-rose-50",
    ikon: "bg-rose-500",
    kivalasztott: "border-rose-400 bg-rose-50 ring-1 ring-rose-200",
    hover: "hover:border-rose-300 hover:bg-rose-50/60",
    pipa: "border-rose-500 bg-rose-500",
    keret: "border-rose-200",
  },
  {
    fejlec: "bg-gradient-to-br from-sky-100 to-sky-50",
    ikon: "bg-sky-400",
    kivalasztott: "border-sky-400 bg-sky-50 ring-1 ring-sky-200",
    hover: "hover:border-sky-300 hover:bg-sky-50/60",
    pipa: "border-sky-500 bg-sky-500",
    keret: "border-sky-200",
  },
  {
    fejlec: "bg-gradient-to-br from-pink-100 to-fuchsia-50",
    ikon: "bg-pink-500",
    kivalasztott: "border-pink-400 bg-pink-50 ring-1 ring-pink-200",
    hover: "hover:border-pink-300 hover:bg-pink-50/60",
    pipa: "border-pink-500 bg-pink-500",
    keret: "border-pink-200",
  },
];

export default function SzolgaltatasValaszto() {
  // Állapot (state): melyik szolgáltatás van kiválasztva. null = egyik sem.
  // Ha a setKivalasztottId-t meghívjuk, a React újrarajzolja a komponenst.
  const [kivalasztottId, setKivalasztottId] = useState<string | null>(null);

  const kivalasztott = szolgaltatasok.find((s) => s.id === kivalasztottId);

  return (
    <>
      {/* Asztali nézetben a három kártya közös sorokra oszlik (subgrid): fejléc / változatok / megjegyzés.
          Így a fejlécek mindig egy magasságban vannak, akkor is, ha valamelyik leírás hosszabb. */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {kategoriak.map((kategoria, index) => {
          const valtozatok = szolgaltatasok.filter((s) => s.kategoriaId === kategoria.id);
          const aktivKategoria = kivalasztott?.kategoriaId === kategoria.id;
          const szin = KATEGORIA_SZINEK[index % KATEGORIA_SZINEK.length];
          return (
            <section
              key={kategoria.id}
              className={`flex flex-col overflow-hidden rounded-3xl border bg-white transition md:row-span-3 md:grid md:grid-rows-subgrid md:gap-0 ${
                aktivKategoria ? `${szin.keret} shadow-xl` : "border-stone-200 shadow-sm"
              }`}
            >
              {/* Színes fejléc */}
              <div className={`px-5 pb-4 pt-5 ${szin.fejlec}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${szin.ikon}`} />
                  <h3 className="text-lg font-semibold text-stone-900">{kategoria.nev}</h3>
                </div>
                <p className="mt-1 text-sm text-stone-600">{kategoria.leiras}</p>
              </div>

              {/* Változatok: mindegyik egy kiválasztható sor */}
              <ul className="flex-1 space-y-2 p-5 pt-4">
                {valtozatok.map((s) => {
                  const aktiv = s.id === kivalasztottId;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        // Újrakattintásra a kiválasztás megszűnik
                        onClick={() => setKivalasztottId(aktiv ? null : s.id)}
                        aria-pressed={aktiv}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                          aktiv ? szin.kivalasztott : `border-stone-200 ${szin.hover}`
                        }`}
                      >
                        {/* Kis kör, ami kiválasztáskor pipává alakul */}
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                            aktiv ? `${szin.pipa} text-white` : "border-stone-300 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="flex-1">
                          <span className="block font-medium text-stone-900">{s.valtozat}</span>
                          <span className="block text-xs text-stone-500">{formazIdotartam(s.idotartamPerc)}</span>
                        </span>
                        <span className="font-semibold text-stone-900">{formazAr(s.arFt)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {kategoria.valtozatMagyarazat && (
                <p className="px-5 pb-5 text-xs text-stone-500">{kategoria.valtozatMagyarazat}</p>
              )}
            </section>
          );
        })}
      </div>

      {/* Alsó sáv: csak akkor jelenik meg, ha van kiválasztott szolgáltatás */}
      <div
        className={`fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/90 backdrop-blur transition duration-300 motion-reduce:transition-none ${
          kivalasztott ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-stone-500">Kiválasztva</p>
            <p className="truncate font-medium text-stone-900">
              {kivalasztott?.nev}
              <span className="font-normal text-stone-500">
                {kivalasztott && ` · ${formazAr(kivalasztott.arFt)}`}
              </span>
            </p>
          </div>
          {/* A választott szolgáltatás azonosítóját a címsorban adjuk át a foglalási oldalnak */}
          <Link
            href={kivalasztott ? `/foglalas?szolgaltatas=${kivalasztott.id}` : "/foglalas"}
            tabIndex={kivalasztott ? 0 : -1}
            className="shrink-0 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700"
          >
            Tovább
          </Link>
        </div>
      </div>

      {/* Hely az alsó sávnak, hogy ne takarja el az oldal alját */}
      {kivalasztott && <div className="h-20" aria-hidden />}
    </>
  );
}
