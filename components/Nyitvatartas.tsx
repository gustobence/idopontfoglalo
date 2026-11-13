"use client";
// Böngészőben futó komponens, mert a látogató aktuális idejét használja.

import { useEffect, useState } from "react";
import { nyitvatartas } from "@/lib/salon";

// A JavaScript getDay() vasárnappal kezd (0), a mi listánk hétfővel.
// Ez a képlet átváltja: hétfő → 0, ..., vasárnap → 6.
function maiIndex(datum: Date): number {
  return (datum.getDay() + 6) % 7;
}

// Date → "14:05" formátum, hogy össze tudjuk hasonlítani a "09:00"-hoz hasonló szövegekkel
function oraPerc(datum: Date): string {
  const ora = String(datum.getHours()).padStart(2, "0");
  const perc = String(datum.getMinutes()).padStart(2, "0");
  return `${ora}:${perc}`;
}

export default function Nyitvatartas() {
  // Kezdetben null: a szerveren még nem tudjuk, mennyi az idő a látogatónál.
  // A pontos időt csak a böngészőben állítjuk be (useEffect), különben eltérés lenne
  // a szerveren és a böngészőben elkészült oldal között.
  const [most, setMost] = useState<Date | null>(null);

  useEffect(() => {
    const frissit = () => setMost(new Date());
    const elso = setTimeout(frissit, 0); // azonnal, amint az oldal betöltött
    const idozito = setInterval(frissit, 60_000); // utána percenként
    return () => {
      clearTimeout(elso);
      clearInterval(idozito);
    };
  }, []);

  // Megjegyzés: a látogató gépének óráját használjuk. Magyarországi vendégeknél ez megfelelő.
  const ma = most ? nyitvatartas[maiIndex(most)] : null;
  const nyitva =
    most && ma?.nyitas && ma.zaras
      ? oraPerc(most) >= ma.nyitas && oraPerc(most) < ma.zaras
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
          const maVan = most !== null && index === maiIndex(most);
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
