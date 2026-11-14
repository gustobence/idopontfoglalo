// Admin belépési oldal: /admin/belepes
import type { Metadata } from "next";
import Link from "next/link";
import { szalon } from "@/lib/salon";
import BelepesUrlap from "@/components/admin/BelepesUrlap";

export const metadata: Metadata = {
  title: `Belépés – ${szalon.nev} admin`,
  robots: { index: false, follow: false }, // a keresők ne indexeljék
};

export default function BelepesOldal() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8">
        <p className="text-xs font-medium uppercase tracking-widest text-rose-600">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">{szalon.nev}</h1>

        {/* Hogy be van-e állítva a jelszó, azt a belépéskor a szerver ellenőrzi (actions.ts) –
            így az előre elkészített oldal nem "fagy be" egy régi állapotban. */}
        <BelepesUrlap />

        <Link href="/" className="mt-6 inline-block text-sm text-stone-500 hover:text-rose-600">
          ← Vissza a főoldalra
        </Link>
      </div>
    </main>
  );
}
