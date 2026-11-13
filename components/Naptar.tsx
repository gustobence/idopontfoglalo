"use client";
// Havi naptár nézet. Minden napon látszik, van-e még szabad hely.
// A naptár csak megjelenít és jelez: hogy mely napok foglalhatók, azt kívülről kapja meg.

import { useState } from "react";
import { honapNapjai, honapHozzaad, formazDatum } from "@/lib/idopontok";

type Props = {
  ma: string; // "2026-11-13"
  utolsoNap: string; // az utolsó foglalható nap
  szabadDb: Record<string, number>; // napról napra: hány szabad időpont van
  kivalasztott: string | null;
  onValaszt: (datum: string) => void;
};

const HET_NAPJAI = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

export default function Naptar({ ma, utolsoNap, szabadDb, kivalasztott, onValaszt }: Props) {
  const elsoHonap = ma.slice(0, 7);
  const utolsoHonap = utolsoNap.slice(0, 7);
  // Melyik hónapot nézzük éppen. Ha már van kiválasztott nap, annak a hónapjával indulunk.
  const [honap, setHonap] = useState((kivalasztott ?? ma).slice(0, 7));

  const napok = honapNapjai(honap);
  const lehetVissza = honap > elsoHonap;
  const lehetElore = honap < utolsoHonap;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      {/* Fejléc: hónap neve és lapozás */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setHonap(honapHozzaad(honap, -1))}
          disabled={!lehetVissza}
          aria-label="Előző hónap"
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-stone-700 transition hover:bg-stone-100 disabled:invisible"
        >
          ‹
        </button>
        <p className="font-semibold text-stone-900">
          {formazDatum(`${honap}-01`, { year: "numeric", month: "long" })}
        </p>
        <button
          type="button"
          onClick={() => setHonap(honapHozzaad(honap, 1))}
          disabled={!lehetElore}
          aria-label="Következő hónap"
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-stone-700 transition hover:bg-stone-100 disabled:invisible"
        >
          ›
        </button>
      </div>

      {/* A hét napjainak rövid neve */}
      <div className="mt-3 grid grid-cols-7 text-center text-xs font-medium text-stone-400">
        {HET_NAPJAI.map((n) => (
          <div key={n} className="py-1">
            {n}
          </div>
        ))}
      </div>

      {/* A napok rácsa: 7 oszlop, a sorok maguktól jönnek */}
      <div className="grid grid-cols-7 gap-1">
        {napok.map((datum, index) => {
          if (!datum) return <div key={`ures-${index}`} />;

          const szabad = szabadDb[datum] ?? 0;
          const tartomanyban = datum >= ma && datum <= utolsoNap;
          const foglalhato = tartomanyban && szabad > 0;
          const aktiv = datum === kivalasztott;
          const maVan = datum === ma;

          return (
            <button
              key={datum}
              type="button"
              disabled={!foglalhato}
              onClick={() => onValaszt(datum)}
              aria-pressed={aktiv}
              aria-label={`${formazDatum(datum, { month: "long", day: "numeric", weekday: "long" })}${
                foglalhato ? `, ${szabad} szabad időpont` : ", nem foglalható"
              }`}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition ${
                aktiv
                  ? "bg-stone-900 font-semibold text-white"
                  : foglalhato
                    ? "font-medium text-stone-900 hover:bg-rose-50"
                    : "text-stone-300"
              } ${maVan && !aktiv ? "ring-1 ring-stone-300" : ""}`}
            >
              {Number(datum.slice(8))}
              {/* Kis pötty: van szabad hely ezen a napon */}
              {foglalhato && (
                <span
                  className={`absolute bottom-1.5 h-1 w-1 rounded-full ${aktiv ? "bg-rose-300" : "bg-rose-500"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Jelmagyarázat */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> van szabad időpont
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-stone-300">12</span> zárva vagy betelt
        </span>
      </div>
    </div>
  );
}
