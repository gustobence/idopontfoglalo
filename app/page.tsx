// A kezdőlap. Ez egy Server Component: a szerveren készül el HTML-lé.
// Az interaktív részek (kattintás, idő, görgetés) külön, "use client" komponensekben vannak
// a components/ mappában – így csak azok futnak a böngészőben, amiknek muszáj.
import { szalon } from "@/lib/salon";
import Megjelenes from "@/components/Megjelenes";
import SzolgaltatasValaszto from "@/components/SzolgaltatasValaszto";
import Nyitvatartas from "@/components/Nyitvatartas";

const menupontok = [
  { cim: "Szolgáltatások", hivatkozas: "#szolgaltatasok" },
  { cim: "Nyitvatartás", hivatkozas: "#nyitvatartas" },
  { cim: "Elérhetőség", hivatkozas: "#elerhetoseg" },
];

export default function Home() {
  return (
    <>
      {/* Felső sáv: görgetéskor is látszik (sticky), elmosott háttérrel */}
      <header className="sticky top-0 z-10 border-b border-stone-200/60 bg-stone-50/80 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <a href="#" className="font-semibold tracking-tight text-stone-900">
            {szalon.nev}
          </a>
          <ul className="hidden gap-6 text-sm text-stone-600 sm:flex">
            {menupontok.map((pont) => (
              <li key={pont.hivatkozas}>
                <a href={pont.hivatkozas} className="transition hover:text-rose-600">
                  {pont.cim}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#szolgaltatasok"
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
          >
            Foglalás
          </a>
        </nav>
      </header>

      <main className="flex-1">
        {/* 1. Nyitó rész: lassan mozgó, elmosott színfoltok a háttérben */}
        <section className="relative isolate overflow-hidden px-4 py-24 text-center sm:py-32">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="lebego absolute -left-24 -top-24 h-80 w-80 rounded-full bg-rose-200/60 blur-3xl" />
            <div className="lebego lebego-kesve absolute -right-20 top-10 h-72 w-72 rounded-full bg-amber-100/80 blur-3xl" />
            <div className="lebego absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-pink-100/70 blur-3xl" />
          </div>

          <Megjelenes>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-rose-600">
              Körömszalon
            </p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-stone-900 sm:text-7xl">
              {szalon.nev}
            </h1>
            <p className="mx-auto mt-5 max-w-md text-lg text-stone-600">{szalon.szlogen}</p>
          </Megjelenes>

          <Megjelenes kesleltetesMs={150}>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#szolgaltatasok"
                className="rounded-full bg-rose-600 px-8 py-3 font-medium text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-700 motion-reduce:transform-none"
              >
                Időpontot foglalok
              </a>
              <a
                href="#nyitvatartas"
                className="rounded-full border border-stone-300 bg-white/60 px-8 py-3 font-medium text-stone-700 transition hover:border-stone-400"
              >
                Nyitvatartás
              </a>
            </div>
          </Megjelenes>
        </section>

        {/* 2. Bemutatkozás */}
        <section className="mx-auto max-w-2xl px-4 py-12 text-center">
          <Megjelenes>
            <p className="text-lg leading-8 text-stone-700">{szalon.bemutatkozas}</p>
          </Megjelenes>
        </section>

        {/* 3. Szolgáltatások – kiválasztható kártyák */}
        <section id="szolgaltatasok" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-12">
          <Megjelenes>
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900">
              Szolgáltatások
            </h2>
            <p className="mt-2 text-stone-600">Válaszd ki, mire szeretnél időpontot.</p>
          </Megjelenes>
          {/* Ezt szándékosan NEM tesszük Megjelenes-be: a beúszó animáció "transform"-ja
              miatt az alsó, képernyőhöz rögzített (fixed) sáv rossz helyre kerülne. */}
          <SzolgaltatasValaszto />
        </section>

        {/* 4. Nyitvatartás és elérhetőség */}
        <section className="mx-auto grid max-w-3xl gap-10 px-4 py-12 sm:grid-cols-2">
          <Megjelenes>
            <div id="nyitvatartas" className="scroll-mt-24">
              <Nyitvatartas />
            </div>
          </Megjelenes>
          <Megjelenes kesleltetesMs={100}>
            <div id="elerhetoseg" className="scroll-mt-24">
              <h2 className="text-2xl font-semibold text-stone-900">Elérhetőség</h2>
              <p className="mt-4 text-stone-700">{szalon.cim}</p>
              {/* A tel: link telefonon egy koppintással hívást indít */}
              <a
                href={`tel:${szalon.telefon.replaceAll(" ", "")}`}
                className="mt-1 inline-block text-stone-700 underline decoration-rose-300 underline-offset-4 transition hover:text-rose-600"
              >
                {szalon.telefon}
              </a>
            </div>
          </Megjelenes>
        </section>
      </main>

      <footer className="border-t border-stone-200 px-4 py-6 text-center text-sm text-stone-500">
        © {szalon.nev}
      </footer>
    </>
  );
}
