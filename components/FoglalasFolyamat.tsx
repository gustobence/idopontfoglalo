"use client";
// A foglalás három lépése egy komponensben: 1. időpont (díszítés + nap + óra) → 2. adatok → 3. visszaigazolás.
// Az aktuális lépést és a választásokat állapotként (useState) tartjuk nyilván.
//
// Színek: a blokkok a szalon alapszíneinek (rózsaszín, bézs, szürke) halvány árnyalatait kapják,
// hogy jól elkülönüljenek egymástól, de az oldal letisztult maradjon.

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  nyitvatartas,
  foglalasiSzabalyok,
  formazAr,
  formazArSav,
  formazIdotartam,
  diszitesek,
  osszesites,
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
  const [diszitesId, setDiszitesId] = useState<string | null>(null); // null = nincs díszítés
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

  // A szolgáltatás + díszítés együttes neve, ideje és ára (ugyanaz a függvény, mint a szerveren)
  const osszes = osszesites(szolgaltatas, diszitesId) ?? osszesites(szolgaltatas, null)!;

  // Egy adott napon mely időpontok férnek bele a megadott időtartamba
  function szabadAznap(datum: string, idotartamPerc: number): string[] {
    return szabadIdopontok({
      datum,
      idotartamPerc,
      nyitvatartas,
      foglalasok,
      most: most!,
      minElooPerc: foglalasiSzabalyok.minElorePerc,
    });
  }

  // Minden foglalható napra kiszámoljuk a szabad időpontokat – a TELJES időtartammal (díszítéssel együtt)
  const idopontokNaponta: Record<string, string[]> = {};
  for (let i = 0; i < foglalasiSzabalyok.foglalhatoNapok; i++) {
    const datum = napHozzaad(ma, i);
    idopontokNaponta[datum] = szabadAznap(datum, osszes.idotartamPerc);
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

  // Díszítés változásakor: belefér-e még a már kiválasztott időpont?
  function diszitesValasztas(ujId: string | null) {
    setDiszitesId(ujId);
    setUzenet(null);
    if (aktivNap && valasztottIdo) {
      const uj = osszesites(szolgaltatas, ujId);
      if (uj && !szabadAznap(aktivNap, uj.idotartamPerc).includes(valasztottIdo)) {
        setValasztottIdo(null);
        setUzenet(
          `A díszítéssel hosszabb lett az időpont (${formazIdotartam(uj.idotartamPerc)}), ezért a korábban ` +
            `választott ${valasztottIdo} már nem fér bele. Kérlek, válassz új időpontot.`
        );
      }
    }
  }

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
        diszitesId, // csak a választást küldjük – az árat és az időt a szerver számolja
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
        <p className="mb-4 rounded-xl bg-sky-50 px-4 py-2 text-sm text-sky-800 ring-1 ring-sky-100">
          Tesztüzem: nincs adatbázis beállítva, a foglalások nem mentődnek el.
        </p>
      )}

      {/* Összegző kártya – rózsaszín–bézs átmenettel, hogy kiemelkedjen */}
      <div className="flex items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-rose-100 via-rose-50 to-sky-50 p-5 ring-1 ring-rose-200">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-rose-700">A foglalásod</p>
          <p className="mt-0.5 text-lg font-semibold text-stone-900">{osszes.nev}</p>
          <p className="text-sm text-stone-600">
            {formazIdotartam(osszes.idotartamPerc)} · {formazArSav(osszes.arMin, osszes.arMax)}
          </p>
          {osszes.diszites && (
            // Részletezés, hogy egyértelmű legyen, miből jön ki a végösszeg
            <p className="mt-0.5 text-xs text-stone-500">
              alap: {formazAr(szolgaltatas.arFt)} + {osszes.diszites.nev.toLowerCase()}:{" "}
              {formazArSav(osszes.diszites.arMin, osszes.diszites.arMax)}
              {osszes.arMin !== osszes.arMax && " – a végleges ár a minta bonyolultságától függ"}
            </p>
          )}
          {idopontSzoveg && (
            <p className="mt-2 inline-block rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-rose-700">
              📅 {idopontSzoveg}
            </p>
          )}
        </div>
        {lepes !== "kesz" && (
          <Link
            href="/#szolgaltatasok"
            className="shrink-0 rounded-full bg-white/70 px-4 py-2 text-sm text-stone-700 ring-1 ring-rose-200 hover:bg-white"
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
              l.kulcs === lepes ? "bg-rose-600 font-medium text-white" : "bg-stone-200/70 text-stone-500"
            }`}
          >
            {l.cim}
          </li>
        ))}
      </ol>

      {uzenet && (
        <p role="alert" className="mt-6 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {uzenet}
        </p>
      )}

      {/* ===== 1. LÉPÉS: díszítés, nap, időpont ===== */}
      {lepes === "idopont" && (
        <div className="mt-6 space-y-5">
          {/* Blokk: díszítés – halvány rózsaszín */}
          <Blokk szin="rozsa" szam={1} cim="Kérsz díszítést?">
            <div className="grid gap-3 sm:grid-cols-3">
              <DiszitesOpcio
                cim="Nem kérek"
                leiras="Egyszínű, díszítés nélkül."
                plusz={null}
                kivalasztva={diszitesId === null}
                onValaszt={() => diszitesValasztas(null)}
              />
              {diszitesek.map((d) => (
                <DiszitesOpcio
                  key={d.id}
                  cim={d.nev}
                  leiras={d.leiras}
                  plusz={`+${formazArSav(d.arMin, d.arMax)}`}
                  kivalasztva={diszitesId === d.id}
                  onValaszt={() => diszitesValasztas(d.id)}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-stone-500">
              Tipp: a következő lépésben a megjegyzésbe leírhatod, milyen mintát szeretnél.
            </p>
          </Blokk>

          {/* Blokk: nap és időpont – halvány bézs */}
          <Blokk szin="kek" szam={2} cim="Válassz napot és időpontot">
            <div className="grid gap-6 md:grid-cols-2">
              <Naptar
                ma={ma}
                utolsoNap={utolsoNap}
                szabadDb={szabadDb}
                kivalasztott={aktivNap}
                onValaszt={napValasztas}
              />

              <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200 sm:p-5">
                <h3 className="mb-3 font-semibold text-stone-900">
                  {aktivNap
                    ? formazDatum(aktivNap, { month: "long", day: "numeric", weekday: "long" })
                    : "Szabad időpontok"}
                </h3>
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
          </Blokk>

          <button
            type="button"
            disabled={!ervenyesIdo}
            onClick={() => {
              setUzenet(null);
              setLepes("adatok");
            }}
            className="w-full rounded-full bg-rose-600 py-3.5 font-medium text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none"
          >
            {ervenyesIdo ? `Tovább – ${idopontSzoveg}` : "Válassz időpontot"}
          </button>
        </div>
      )}

      {/* ===== 2. LÉPÉS: adatok ===== */}
      {lepes === "adatok" && (
        // noValidate: a böngésző saját ellenőrzése helyett a miénket használjuk (egységes, magyar üzenetek)
        <form onSubmit={bekuldes} noValidate className="mt-6 space-y-5">
          <Blokk szin="szurke" szam={3} cim="Add meg az adataidat">
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
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
              </div>

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
                  placeholder={osszes.diszites ? "Pl. milyen mintát, színt szeretnél?" : ""}
                  value={adatok.megjegyzes}
                  onChange={(e) => mezoValtozas("megjegyzes", e.target.value)}
                  className={mezoStilus(hibak.megjegyzes)}
                />
              </Mezo>

              <div className="rounded-xl bg-white p-4 ring-1 ring-stone-200">
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
            </div>
          </Blokk>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setLepes("idopont")}
              disabled={kuldesFolyamatban}
              className="rounded-full bg-white px-6 py-3.5 font-medium text-stone-700 ring-1 ring-stone-300 hover:ring-stone-400 disabled:opacity-50"
            >
              Vissza
            </button>
            <button
              type="submit"
              disabled={kuldesFolyamatban}
              className="flex-1 rounded-full bg-rose-600 py-3.5 font-medium text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 disabled:opacity-60"
            >
              {kuldesFolyamatban ? "Küldés…" : "Foglalás elküldése"}
            </button>
          </div>
        </form>
      )}

      {/* ===== 3. LÉPÉS: visszaigazolás ===== */}
      {lepes === "kesz" && (
        <section className="mt-6 rounded-3xl bg-gradient-to-b from-sky-50 to-white p-8 text-center ring-1 ring-sky-200">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-400 text-2xl text-white shadow-lg shadow-sky-200">
            ✓
          </div>
          <h2 className="mt-4 text-xl font-semibold text-stone-900">
            Köszönjük, {adatok.nev.trim()}!
            {mentveTesztben ? " (tesztfoglalás)" : " A foglalásodat rögzítettük."}
          </h2>
          <p className="mt-2 text-stone-700">{osszes.nev}</p>
          <p className="mt-1 font-medium text-rose-700">{idopontSzoveg}</p>
          <p className="mt-3 text-sm text-stone-500">Ha mégsem tudsz jönni, kérlek, jelezd telefonon.</p>
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

// Egy számozott blokk a foglalási folyamatban. A háttér fehér (letisztult),
// a blokkokat a színes sorszám és egy vékony, színes felső csík különbözteti meg.
const BLOKK_SZINEK = {
  rozsa: { hatter: "bg-white ring-stone-200 border-t-4 border-t-rose-300", szam: "bg-rose-500" },
  kek: { hatter: "bg-white ring-stone-200 border-t-4 border-t-sky-300", szam: "bg-sky-400" },
  szurke: { hatter: "bg-white ring-stone-200 border-t-4 border-t-stone-300", szam: "bg-stone-600" },
} as const;

function Blokk({
  szin,
  szam,
  cim,
  children,
}: {
  szin: keyof typeof BLOKK_SZINEK;
  szam: number;
  cim: string;
  children: React.ReactNode;
}) {
  const s = BLOKK_SZINEK[szin];
  return (
    <section className={`rounded-3xl p-4 ring-1 sm:p-6 ${s.hatter}`}>
      <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold text-stone-900">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${s.szam}`}
        >
          {szam}
        </span>
        {cim}
      </h2>
      {children}
    </section>
  );
}

// Egy választható díszítési lehetőség kártyája (rádiógomb-szerű: egyszerre csak egy lehet kiválasztva)
function DiszitesOpcio({
  cim,
  leiras,
  plusz,
  kivalasztva,
  onValaszt,
}: {
  cim: string;
  leiras: string;
  plusz: string | null;
  kivalasztva: boolean;
  onValaszt: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col rounded-2xl p-4 transition ${
        kivalasztva ? "bg-rose-50/60 ring-2 ring-rose-400" : "bg-white ring-1 ring-stone-200 hover:ring-rose-300"
      }`}
    >
      <span className="flex items-start gap-3">
        <input
          type="radio"
          name="diszites"
          checked={kivalasztva}
          onChange={onValaszt}
          className="mt-1 h-4 w-4 accent-rose-600"
        />
        <span>
          <span className="block font-medium text-stone-900">{cim}</span>
          <span className="mt-0.5 block text-sm text-stone-500">{leiras}</span>
          <span
            className={`mt-2 inline-block text-sm font-medium ${plusz ? "text-rose-600" : "text-stone-400"}`}
          >
            {plusz ?? "Nincs felár"}
          </span>
        </span>
      </span>
    </label>
  );
}

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
            className={`rounded-xl py-2.5 font-medium transition ${
              ido === valasztott
                ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                : "bg-white text-stone-800 ring-1 ring-stone-200 hover:ring-rose-300"
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
