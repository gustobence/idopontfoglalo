// Tesztek a jelszó- és munkamenet-kezeléshez. Futtatás: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jelszoHash,
  jelszoEllenoriz,
  munkamenetToken,
  munkamenetErvenyes,
} from "./jelszo.ts";

test("a helyes jelszót elfogadja, a hibásat nem", () => {
  const tarolt = jelszoHash("nagyon-titkos-jelszo-123");
  assert.equal(jelszoEllenoriz("nagyon-titkos-jelszo-123", tarolt), true);
  assert.equal(jelszoEllenoriz("nagyon-titkos-jelszo-124", tarolt), false);
  assert.equal(jelszoEllenoriz("", tarolt), false);
});

test("a lenyomatban nincs benne a jelszó, és két egyforma jelszónak is eltér a lenyomata", () => {
  const a = jelszoHash("ugyanaz-a-jelszo");
  const b = jelszoHash("ugyanaz-a-jelszo");
  assert.ok(!a.includes("ugyanaz-a-jelszo"));
  assert.notEqual(a, b); // a véletlen "só" miatt
  assert.ok(!a.includes("$"), "a $ jel elrontaná a .env fájlt");
});

test("hibás formátumú tárolt értéknél nem enged be", () => {
  assert.equal(jelszoEllenoriz("barmi", "nem-jo-formatum"), false);
});

const TITOK = "teszt-titok";
const MOST = 1_800_000_000_000;

test("érvényes munkamenet elfogadva", () => {
  const token = munkamenetToken(TITOK, MOST + 60_000);
  assert.equal(munkamenetErvenyes(token, TITOK, MOST), true);
});

test("lejárt munkamenet elutasítva", () => {
  const token = munkamenetToken(TITOK, MOST - 1);
  assert.equal(munkamenetErvenyes(token, TITOK, MOST), false);
});

test("meghamisított lejárat elutasítva", () => {
  const token = munkamenetToken(TITOK, MOST + 60_000);
  const [, alairas] = token.split(".");
  const hamis = `${MOST + 999_999_999}.${alairas}`; // valaki meghosszabbítaná
  assert.equal(munkamenetErvenyes(hamis, TITOK, MOST), false);
});

test("más titokkal aláírt munkamenet elutasítva", () => {
  const token = munkamenetToken("masik-titok", MOST + 60_000);
  assert.equal(munkamenetErvenyes(token, TITOK, MOST), false);
});

test("szemét bemenet elutasítva", () => {
  assert.equal(munkamenetErvenyes("", TITOK, MOST), false);
  assert.equal(munkamenetErvenyes("abc.def", TITOK, MOST), false);
  assert.equal(munkamenetErvenyes("123", TITOK, MOST), false);
});
