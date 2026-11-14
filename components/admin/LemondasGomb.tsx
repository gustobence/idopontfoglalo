"use client";
// Lemondás gomb megerősítéssel. A tényleges lemondást a szerver végzi (lemondas művelet),
// amely előbb ellenőrzi, hogy be vagy-e jelentkezve.

import { useState, useTransition } from "react";
import { lemondas } from "@/app/admin/actions";

export default function LemondasGomb({ id, leiras }: { id: number; leiras: string }) {
  const [folyamatban, inditas] = useTransition();
  const [hiba, setHiba] = useState<string | null>(null);

  function kattintas() {
    // A böngésző beépített megerősítő ablaka – véletlen kattintás ellen
    if (!window.confirm(`Biztosan lemondod ezt a foglalást?\n\n${leiras}\n\nAz időpont újra foglalható lesz.`)) {
      return;
    }
    setHiba(null);
    inditas(async () => {
      const eredmeny = await lemondas(id);
      if (!eredmeny.ok) setHiba(eredmeny.uzenet);
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={kattintas}
        disabled={folyamatban}
        className="rounded-full border border-rose-200 px-4 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
      >
        {folyamatban ? "Lemondás…" : "Lemondás"}
      </button>
      {hiba && <p className="mt-1 max-w-48 text-xs text-rose-600">{hiba}</p>}
    </div>
  );
}
