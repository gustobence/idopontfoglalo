"use client";
// "use client" = ez a komponens a böngészőben is fut, mert figyelnie kell a görgetést.
// A Server Component-ek ezt nem tudják, ők csak egyszer, a szerveren készülnek el.

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode; // amit be szeretnénk úsztatni
  kesleltetesMs?: number; // a "?" = nem kötelező megadni
  className?: string;
};

// Finom beúszás: a tartalom akkor jelenik meg, amikor görgetés közben a képernyőre ér.
export default function Megjelenes({ children, kesleltetesMs = 0, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null); // hivatkozás a HTML-elemre
  const [lathato, setLathato] = useState(false); // állapot: látszik-e már

  useEffect(() => {
    const elem = ref.current;
    if (!elem) return;

    // Az IntersectionObserver a böngésző beépített eszköze:
    // szól, amikor az elem a képernyőre kerül.
    const figyelo = new IntersectionObserver(
      ([bejegyzes]) => {
        if (bejegyzes.isIntersecting) {
          setLathato(true);
          figyelo.disconnect(); // elég egyszer beúszni
        }
      },
      { threshold: 0.15 } // akkor, ha az elem 15%-a már látszik
    );
    figyelo.observe(elem);

    return () => figyelo.disconnect(); // takarítás, ha az elem eltűnik az oldalról
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${kesleltetesMs}ms` }}
      className={`transition duration-700 ease-out motion-reduce:transition-none ${
        lathato ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
