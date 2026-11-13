"use client";
// Böngészőben futó komponens, mert kattintásra reagál és megjegyzi a kiválasztást.

import { useState } from "react";
import Link from "next/link";
import { szolgaltatasok, formazAr, formazIdotartam } from "@/lib/salon";

export default function SzolgaltatasValaszto() {
  // Állapot (state): melyik szolgáltatás van kiválasztva. null = egyik sem.
  // Ha a setKivalasztottId-t meghívjuk, a React újrarajzolja a komponenst.
  const [kivalasztottId, setKivalasztottId] = useState<string | null>(null);

  const kivalasztott = szolgaltatasok.find((s) => s.id === kivalasztottId);

  return (
    <>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {szolgaltatasok.map((szolgaltatas) => {
          const aktiv = szolgaltatas.id === kivalasztottId;
          return (
            <li key={szolgaltatas.id}>
              <button
                type="button"
                // Újrakattintásra a kiválasztás megszűnik
                onClick={() => setKivalasztottId(aktiv ? null : szolgaltatas.id)}
                aria-pressed={aktiv}
                className={`group flex h-full w-full flex-col rounded-2xl border bg-white p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none ${
                  aktiv
                    ? "border-rose-400 shadow-lg ring-2 ring-rose-200"
                    : "border-stone-200 hover:border-rose-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-medium text-stone-900">{szolgaltatas.nev}</h3>
                  {/* Kis kör, ami kiválasztáskor pipává alakul */}
                  <span
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs transition ${
                      aktiv
                        ? "border-rose-500 bg-rose-500 text-white"
                        : "border-stone-300 text-transparent group-hover:border-rose-300"
                    }`}
                  >
                    ✓
                  </span>
                </div>
                <p className="mt-1 flex-1 text-stone-600">{szolgaltatas.leiras}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-600">
                    {formazIdotartam(szolgaltatas.idotartamPerc)}
                  </span>
                  <span className="font-semibold text-stone-900">
                    {formazAr(szolgaltatas.arFt)}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

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
                {kivalasztott &&
                  ` · ${formazIdotartam(kivalasztott.idotartamPerc)} · ${formazAr(kivalasztott.arFt)}`}
              </span>
            </p>
          </div>
          {/* A választott szolgáltatás azonosítóját a címsorban adjuk át a foglalási oldalnak */}
          <Link
            href={kivalasztott ? `/foglalas?szolgaltatas=${kivalasztott.id}` : "/foglalas"}
            tabIndex={kivalasztott ? 0 : -1}
            className="shrink-0 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700"
          >
            Időpont választása
          </Link>
        </div>
      </div>

      {/* Hely az alsó sávnak, hogy ne takarja el az oldal alját */}
      {kivalasztott && <div className="h-20" aria-hidden />}
    </>
  );
}
