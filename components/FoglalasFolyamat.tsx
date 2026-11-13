"use client";
// A foglalás három lépése egy komponensben: 1. időpont → 2. adatok → 3. visszaigazolás.
// Az aktuális lépést és a választásokat állapotként (useState) tartjuk nyilván.

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  nyitvatartas,
  foglalasiSzabalyok,
  formazAr,
  formazIdotartam,
  type Szolgaltatas,
} from "@/lib/salon";
import {
  szabadIdopontok,
  napHozzaad,
  budapestiMost,
  formazDatum,
  type Foglalas,
} from "@/lib/idopontok";
import { ellenorizAdatok, type FoglalasiAdatok, type Hibak } from "@/lib/validacio";
import { foglalasLetrehozasa } from "@/app/foglalas/actions";
import Naptar from "@/components/Naptar";

type Lepes = "idopont" | "adatok" | "kesz";

type Props = {
  szolgaltatas: Szolgaltatas;
  foglalasok: Foglalas[]; // a szervertől: csak a foglalt időpontok, személyes adat nélkül
  tesztuzem: boolean; // true = nincs még adatbázis beállítva
};

const uresAdatok: FoglalasiAdatok = {
  nev: "",
  telefon: "",
  email: "",
  megjegyzes: "",
  hozzajarulas: false,
};

export default function FoglalasFolyamat({ szolgaltatas, foglalasok, tesztuzem }: Props) {
  const router = useRouter();
  const [lepes, setLepes] = useState<Lepes>("idopont");
  const [valasztottNap, setValasztottNap] = useState<string | null>(null);
  const [valasztottIdo, setValasztottIdo] = useState<string | null>(null);
  const [adatok, setAdatok] = useState<FoglalasiAdatok>(uresAdatok);
  const [hibak, setHibak] = useState<Hibak>({});
  const [uzenet, setUzenet] = useState<string | null>(null); // általános hiba- vagy figyelmeztető üzenet
  const [mentveTesztben, setMentveTesztben] = useState(false);
  // A useTransition jelzi, amíg a szerver dolgozik (pending = "folyamatban")
  const [kuldesFolyamatban, inditas] = useTransition();

  // A mostani időt csak a böngészőben kérdezzük le (a Nyitvatartásnál leírt ok miatt)
  const [most, setMost] = useState<{ datum: string; perc: number } | null>(null);
  useEffect(() => {
    const idozito = setTimeout(() => setMost(budapestiMost()), 0);
    return () => clearTimeout(idozito);
  }, []);

  if (!most) {
    return <p className="py-16 text-center text-stone-500">Naptár betöltése…</p>;
  }

  // --- Számítások ---
  const ma = most.datum;
  const utolsoNap = napHozzaad(ma, foglalasiSzabalyok.foglalhatoNapok - 1);

  // Minden foglalható napra kiszámoljuk a szabad időpontokat
  const idopontokNaponta: Record<string, string[]> = {};
  for (let i = 0; i < foglalasiSzabalyok.foglalhatoNapok; i++) {
    const datum = napHozzaad(ma, i);
    idopontokNaponta[datum] = szabadIdopontok({
      datum,
      idotartamPerc: szolgaltatas.idotartamPerc,
      nyitvatartas,
      foglalasok,
      most,
      minElooPerc: foglalasiSzabalyok.minElorePerc,
    });
  }
  const szabadDb = Object.fromEntries(
    Object.entries(idopontokNaponta).map(([datum, lista]) => [datum, lista.length])
  );

  // Ha még nem választott napot, az első olyan nap legyen kijelölve, ahol van szabad hely
  const elsoSzabadNap = Object.keys(idopontokNaponta).find((d) => idopontokNaponta[d].length > 0);
  const aktivNap = valasztottNap ?? elsoSzabadNap ?? null;
  const aktivIdopontok = aktivNap ? (idopontokNaponta[aktivNap] ?? []) : [];
  // Ha a kiválasztott időpont közben elkelt (pl. frissítés után), ne maradjon kijelölve
  const ervenyesIdo = valasztottIdo && aktivIdopontok.includes(valasztottIdo) ? valasztottIdo : null;

  const delelott = aktivIdopontok.filter((ido) => ido < "12:00");
  const delutan = aktivIdopontok.filter((ido) => ido >= "12:00");

  const idopontSzoveg =
    aktivNap && ervenyesIdo
      ? `${formazDatum(aktivNap, { month: "long", day: "numeric", weekday: "long" })}, ${ervenyesIdo}`
      : null;

  // --- Eseménykezelők ---
  function napValasztas(datum: string) {
    setValasztottNap(datum);
    setValasztottIdo(null); // másik napon a korábban választott óra már nem érvényes
    setUzenet(null);
  }

  function mezoValtozas<K extends keyof FoglalasiAdatok>(mezo: K, ertek: FoglalasiAdatok[K]) {
    setAdatok({ ...adatok, [mezo]: ertek });
    if (hibak[mezo]) setHibak({ ...hibak, [mezo]: undefined });
  }

  function bekuldes(e: React.FormEvent) {
    e.preventDefault(); // ne töltse újra az oldalt (ez a böngésző alapviselkedése)
    setUzenet(null);

    // 1. Gyors ellenőrzés a böngészőben – azonnali visszajelzés, felesleges szerverhívás nélkül
    const ujHibak = ellenorizAdatok(adatok);
    setHibak(ujHibak);
    if (Object.keys(ujHibak).length > 0 || !aktivNap || !ervenyesIdo) return;

    // 2. Küldés a szervernek, amely mindent újra ellenőriz, majd elment
    inditas(async () => {
      const eredmeny = await foglalasLetrehozasa({
        szolgaltatasId: szolgaltatas.id,
        datum: aktivNap,
        ido: ervenyesIdo,
        adatok,
      });

      if (eredmeny.ok) {
        setMentveTesztben(eredmeny.tesztuzem);
        setLepes("kesz");
      } else if (eredmeny.kod === "hibas_adat") {
        setHibak(eredmeny.hibak);
      } else if (eredmeny.kod === "foglalt") {
        // Az időpont közben elkelt: vissza a naptárhoz, friss adatokkal
        setValasztottIdo(null);
        setLepes("idopont");
        setUzenet(eredmeny.uzenet);
        router.refresh(); // a szerver újra lekéri a foglalásokat
      } else {
        setUzenet(eredmeny.uzenet);
      }
    });
  }

  return (
    <div>
      {tesztuzem && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Tesztüzem: nincs adatbázis beállítva, a foglalások nem mentődnek el.
        </p>
      )}

      {/* Összegző kártya a választott szolgáltatásról */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-stone-500">Szolgáltatás</p>
          <p className="text-lg font-medium text-stone-900">{szolgaltatas.nev}</p>
          <p className="text-sm text-stone-500">
            {formazIdotartam(szolgaltatas.idotartamPerc)} · {formazAr(szolgaltatas.arFt)}
          </p>
          {idopontSzoveg && <p className="mt-1 text-sm font-medium text-rose-600">{idopontSzoveg}</p>}
        </div>
        {lepes !== "kesz" && (
          <Link
            href="/#szolgaltatasok"
            className="shrink-0 text-sm text-stone-600 underline-offset-4 hover:underline"
          >
            Módosítás
          </Link>
        )}
      </div>

      {/* Lépésjelző */}
      <ol className="mt-6 flex gap-2 text-sm">
        {[
          { kulcs: "idopont", cim: "1. Időpont" },
          { kulcs: "adatok", cim: "2. Adatok" },
          { kulcs: "kesz", cim: "3. Kész" },
        ].map((l) => (
          <li
            key={l.kulcs}
            className={`flex-1 rounded-full px-3 py-1.5 text-center ${
              l.kulcs === lepes ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500"
            }`}
          >
            {l.cim}
          </li>
        ))}
      </ol>

      {uzenet && (
        <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {uzenet}
        </p>
      )}

      {/* ===== 1. LÉPÉS: naptár és időpont ===== */}
      {lepes === "idopont" && (
        <section className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-3 text-lg font-semibold text-stone-900">Válassz napot</h2>
              <Naptar
                ma={ma}
                utolsoNap={utolsoNap}
                szabadDb={szabadDb}
                kivalasztott={aktivNap}
                onValaszt={napValasztas}
              />
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-stone-900">
                {aktivNap
                  ? formazDatum(aktivNap, { month: "long", day: "numeric", weekday: "long" })
                  : "Szabad időpontok"}
              </h2>
              {aktivNap ? (
                <div className="space-y-4">
                  <IdopontCsoport
                    cim="Délelőtt"
                    idopontok={delelott}
                    valasztott={ervenyesIdo}
                    onValaszt={setValasztottIdo}
                  />
                  <IdopontCsoport
                    cim="Délután"
                    idopontok={delutan}
                    valasztott={ervenyesIdo}
                    onValaszt={setValasztottIdo}
                  />
                </div>
              ) : (
                <p className="text-stone-600">
                  A következő {foglalasiSzabalyok.foglalhatoNapok} napban nincs szabad időpont erre a
                  szolgáltatásra.
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={!ervenyesIdo}
            onClick={() => {
              setUzenet(null);
              setLepes("adatok");
            }}
            className="mt-8 w-full rounded-full bg-rose-600 py-3 font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
          >
            {ervenyesIdo ? `Tovább – ${idopontSzoveg}` : "Válassz időpontot"}
          </button>
        </section>
      )}

      {/* ===== 2. LÉPÉS: adatok ===== */}
      {lepes === "adatok" && (
        // noValidate: a böngésző saját ellenőrzése helyett a miénket használjuk (egységes, magyar üzenetek)
        <form onSubmit={bekuldes} noValidate className="mt-8 space-y-5">
          <h2 className="text-xl font-semibold text-stone-900">Add meg az adataidat</h2>

          <Mezo cimke="Név" hiba={hibak.nev}>
            <input
              type="text"
              autoComplete="name"
              value={adatok.nev}
              onChange={(e) => mezoValtozas("nev", e.target.value)}
              className={mezoStilus(hibak.nev)}
            />
          </Mezo>

          <Mezo cimke="Telefonszám" hiba={hibak.telefon}>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="+36 30 123 4567"
              value={adatok.telefon}
              onChange={(e) => mezoValtozas("telefon", e.target.value)}
              className={mezoStilus(hibak.telefon)}
            />
          </Mezo>

          <Mezo cimke="E-mail-cím" hiba={hibak.email}>
            <input
              type="email"
              autoComplete="email"
              value={adatok.email}
              onChange={(e) => mezoValtozas("email", e.target.value)}
              className={mezoStilus(hibak.email)}
            />
          </Mezo>

          <Mezo cimke="Megjegyzés (nem kötelező)" hiba={hibak.megjegyzes}>
            <textarea
              rows={3}
              value={adatok.megjegyzes}
              onChange={(e) => mezoValtozas("megjegyzes", e.target.value)}
              className={mezoStilus(hibak.megjegyzes)}
            />
          </Mezo>

          <div>
            <label className="flex items-start gap-3 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={adatok.hozzajarulas}
                onChange={(e) => mezoValtozas("hozzajarulas", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-rose-600"
              />
              <span>
                Elolvastam és elfogadom az adatkezelési tájékoztatót.{" "}
                <span className="text-stone-400">(A tájékoztató élesítés előtt készül el.)</span>
              </span>
            </label>
            {hibak.hozzajarulas && <p className="mt-1 text-sm text-rose-600">{hibak.hozzajarulas}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setLepes("idopont")}
              disabled={kuldesFolyamatban}
              className="rounded-full border border-stone-300 px-6 py-3 font-medium text-stone-700 hover:border-stone-400 disabled:opacity-50"
            >
              Vissza
            </button>
            <button
              type="submit"
              disabled={kuldesFolyamatban}
              className="flex-1 rounded-full bg-rose-600 py-3 font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {kuldesFolyamatban ? "Küldés…" : "Foglalás elküldése"}
            </button>
          </div>
        </form>
      )}

      {/* ===== 3. LÉPÉS: visszaigazolás ===== */}
      {lepes === "kesz" && (
        <section className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white">
            ✓
          </div>
          <h2 className="mt-4 text-xl font-semibold text-stone-900">
            Köszönjük, {adatok.nev.trim()}!
            {mentveTesztben ? " (tesztfoglalás)" : " A foglalásodat rögzítettük."}
          </h2>
          <p className="mt-2 text-stone-700">
            {szolgaltatas.nev} · {idopontSzoveg}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Ha mégsem tudsz jönni, kérlek, jelezd telefonon.
          </p>
          {mentveTesztben && (
            <p className="mt-6 rounded-xl bg-white/70 p-3 text-sm text-stone-500">
              Tesztüzem: a foglalás <strong>nem mentődött el</strong>, mert nincs adatbázis beállítva.
            </p>
          )}
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-rose-600 hover:underline">
            Vissza a főoldalra
          </Link>
        </section>
      )}
    </div>
  );
}

// --- Kis segéd-komponensek ---

function IdopontCsoport({
  cim,
  idopontok,
  valasztott,
  onValaszt,
}: {
  cim: string;
  idopontok: string[];
  valasztott: string | null;
  onValaszt: (ido: string) => void;
}) {
  if (idopontok.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">{cim}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3">
        {idopontok.map((ido) => (
          <button
            key={ido}
            type="button"
            onClick={() => onValaszt(ido)}
            aria-pressed={ido === valasztott}
            className={`rounded-xl border py-2.5 font-medium transition ${
              ido === valasztott
                ? "border-rose-500 bg-rose-500 text-white"
                : "border-stone-200 bg-white text-stone-800 hover:border-rose-300"
            }`}
          >
            {ido}
          </button>
        ))}
      </div>
    </div>
  );
}

function Mezo({ cimke, hiba, children }: { cimke: string; hiba?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{cimke}</span>
      <div className="mt-1">{children}</div>
      {hiba && <span className="mt-1 block text-sm text-rose-600">{hiba}</span>}
    </label>
  );
}

function mezoStilus(hiba?: string): string {
  return `w-full rounded-xl border bg-white px-4 py-2.5 text-stone-900 outline-none transition focus:ring-2 ${
    hiba ? "border-rose-400 focus:ring-rose-200" : "border-stone-300 focus:border-rose-400 focus:ring-rose-100"
  }`;
}
