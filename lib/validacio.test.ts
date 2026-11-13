// Automatikus tesztek a vendégadatok ellenőrzéséhez. Futtatás: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { ellenorizAdatok, type FoglalasiAdatok } from "./validacio.ts";

// Egy hibátlan kitöltés – a tesztek ebből rontanak el egy-egy mezőt
const jo: FoglalasiAdatok = {
  nev: "Teszt Vendég",
  telefon: "+36 30 123 4567",
  email: "teszt.vendeg@example.com",
  megjegyzes: "",
  hozzajarulas: true,
};

test("hibátlan adatoknál nincs hiba", () => {
  assert.deepEqual(ellenorizAdatok(jo), {});
});

test("túl rövid név hibás", () => {
  assert.ok(ellenorizAdatok({ ...jo, nev: " A " }).nev);
});

test("többféle telefonszám-írásmódot elfogad", () => {
  assert.equal(ellenorizAdatok({ ...jo, telefon: "06-30/123-4567" }).telefon, undefined);
  assert.equal(ellenorizAdatok({ ...jo, telefon: "+36 (30) 123 4567" }).telefon, undefined);
});

test("betűs vagy túl rövid telefonszám hibás", () => {
  assert.ok(ellenorizAdatok({ ...jo, telefon: "telefonom" }).telefon);
  assert.ok(ellenorizAdatok({ ...jo, telefon: "12345" }).telefon);
});

test("hibás e-mail-cím hibás", () => {
  assert.ok(ellenorizAdatok({ ...jo, email: "nincs-kukac.hu" }).email);
  assert.ok(ellenorizAdatok({ ...jo, email: "valaki@domain" }).email);
});

test("túl hosszú megjegyzés hibás", () => {
  assert.ok(ellenorizAdatok({ ...jo, megjegyzes: "a".repeat(501) }).megjegyzes);
});

test("hozzájárulás nélkül nem lehet foglalni", () => {
  assert.ok(ellenorizAdatok({ ...jo, hozzajarulas: false }).hozzajarulas);
});
