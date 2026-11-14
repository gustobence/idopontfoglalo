// Tesztek a szolgáltatás + díszítés összesítéséhez. Futtatás: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { szolgaltatasok, kategoriak, diszitesek, osszesites, formazArSav } from "./salon.ts";

const szolgaltatas = (id: string) => {
  const s = szolgaltatasok.find((x) => x.id === id);
  if (!s) throw new Error(`Nincs ilyen szolgáltatás: ${id}`);
  return s;
};

test("az árlista árai stimmelnek", () => {
  const arak = Object.fromEntries(szolgaltatasok.map((s) => [s.id, s.arFt]));
  assert.deepEqual(arak, {
    "gellakk-alap": 6000,
    "gellakk-erositett": 6500,
    "epites-s": 8000,
    "epites-m": 9000,
    "epites-l": 10000,
    "toltes-s": 7500,
    "toltes-m": 8000,
    "toltes-l": 9000,
  });
});

test("a díszítések árai stimmelnek (a francia a komolyabbba tartozik)", () => {
  const arak = Object.fromEntries(diszitesek.map((d) => [d.id, [d.arMin, d.arMax]]));
  assert.deepEqual(arak, { egyszeru: [500, 500], komoly: [1000, 2500] });
});

test("minden szolgáltatás létező kategóriába tartozik, és az azonosítók egyediek", () => {
  const kategoriaIdk = new Set(kategoriak.map((k) => k.id));
  for (const s of szolgaltatasok) assert.ok(kategoriaIdk.has(s.kategoriaId), s.id);
  assert.equal(new Set(szolgaltatasok.map((s) => s.id)).size, szolgaltatasok.length);
});

test("díszítés nélkül az alap idő és ár marad", () => {
  const s = szolgaltatas("epites-m");
  const o = osszesites(s, null);
  assert.equal(o?.nev, s.nev);
  assert.equal(o?.idotartamPerc, s.idotartamPerc);
  assert.equal(o?.arMin, 9000);
  assert.equal(o?.arMax, 9000);
});

test("egyszerű díszítés: fix ár és plusz idő adódik hozzá", () => {
  const s = szolgaltatas("gellakk-alap");
  const egyszeru = diszitesek.find((d) => d.id === "egyszeru")!;
  const o = osszesites(s, "egyszeru");
  assert.equal(o?.arMin, 6500);
  assert.equal(o?.arMax, 6500);
  assert.equal(o?.idotartamPerc, s.idotartamPerc + egyszeru.pluszPerc);
  assert.equal(o?.nev, "Alap géllakk + Egyszerű díszítés");
});

test("komolyabb díszítésnél ársáv lesz", () => {
  const o = osszesites(szolgaltatas("toltes-s"), "komoly");
  assert.equal(o?.arMin, 7500 + 1000);
  assert.equal(o?.arMax, 7500 + 2500);
});

test("nem létező díszítés elutasítva", () => {
  assert.equal(osszesites(szolgaltatas("epites-s"), "francia"), null);
  assert.equal(osszesites(szolgaltatas("epites-s"), "nincs-ilyen"), null);
});

test("ársáv formázása", () => {
  // A magyar számformázás "nem törő szóközt" ( ) tesz a számjegycsoportok közé,
  // hogy a "10 500" ne törjön két sorba. Az összehasonlításhoz sima szóközre cseréljük.
  const sima = (s: string) => s.replace(/ /g, " ");
  assert.equal(sima(formazArSav(9000, 9000)), "9000 Ft");
  assert.equal(sima(formazArSav(10500, 11500)), "10 500 – 11 500 Ft");
});
