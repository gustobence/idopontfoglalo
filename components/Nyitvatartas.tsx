"use client";
// Böngészőben futó komponens, mert a látogató aktuális idejét használja.

import { useEffect, useState } from "react";
import { nyitvatartas } from "@/lib/salon";
import { budapestiMost, hetNapIndex, idoPercben } from "@/lib/idopontok";

export default function Nyitvatartas() {
  // Kezdetben null: a pontos időt csak a böngészőben állítjuk be (useEffect), különben eltérés
  // lenne a szerveren és a böngészőben elkészült oldal között.
  // Budapesti időt használunk, mert a szalon nyitvatartása is budapesti idő szerint értendő.
  const [most, setMost] = useState<{ datum: string; perc: number } | null>(null);

  useEffect(() => {
    const frissit = () => setMost(budapestiMost());
    const elso = setTimeout(frissit, 0); // azonnal, amint az oldal betöltött
    const idozito = setInterval(frissit, 60_000); // utána percenként
    return () => {
      clearTimeout(elso);
      clearInterval(idozito);
    };
  }, []);

  const maiIndex = most ? hetNapIndex(most.datum) : null;
  const ma = maiIndex !== null ? nyitvatartas[maiIndex] : null;
  const nyitva =
    most && ma?.nyitas && ma.zaras
      ? most.perc >= idoPercben(ma.nyitas) && most.perc < idoPercben(ma.zaras)
      : false;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold text-stone-900">Nyitvatartás</h2>
        {most && (
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
              nyitva ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                nyitva ? "animate-pulse bg-emerald-500 motion-reduce:animate-none" : "bg-stone-400"
              }`}
            />
            {nyitva ? `Most nyitva · ${ma?.zaras}-ig` : "Most zárva"}
          </span>
        )}
      </div>
      <ul className="mt-4 divide-y divide-stone-200">
        {nyitvatartas.map((nap, index) => {
          const maVan = index === maiIndex;
          return (
            <li
              key={nap.nap}
              className={`-mx-3 flex justify-between rounded-lg px-3 py-2 ${
                maVan ? "bg-rose-50 font-medium" : ""
              }`}
            >
              <span className="text-stone-700">
                {nap.nap}
                {maVan && <span className="ml-2 text-xs text-rose-600">ma</span>}
              </span>
              <span className={nap.nyitas ? "text-stone-900" : "text-stone-400"}>
                {nap.nyitas ? `${nap.nyitas} – ${nap.zaras}` : "Zárva"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
