"use client";
// A belépési űrlap. A useActionState köti össze az űrlapot a szerveroldali "belepes" művelettel:
// visszaadja a művelet eredményét (pl. hibaüzenet), és jelzi, amíg a szerver dolgozik.

import { useActionState } from "react";
import { belepes, type BelepesAllapot } from "@/app/admin/actions";

const kezdo: BelepesAllapot = { hiba: null };

export default function BelepesUrlap() {
  const [allapot, muvelet, folyamatban] = useActionState(belepes, kezdo);

  return (
    <form action={muvelet} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-stone-700">Jelszó</span>
        <input
          type="password"
          name="jelszo"
          autoComplete="current-password"
          required
          autoFocus
          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
        />
      </label>
      {allapot.hiba && (
        <p role="alert" className="text-sm text-rose-600">
          {allapot.hiba}
        </p>
      )}
      <button
        type="submit"
        disabled={folyamatban}
        className="w-full rounded-full bg-stone-900 py-3 font-medium text-white transition hover:bg-rose-600 disabled:opacity-60"
      >
        {folyamatban ? "Ellenőrzés…" : "Belépés"}
      </button>
    </form>
  );
}
