// Automatikus tesztek a szabad időpontok számításához.
// Futtatás: npm test
// Minden "test" egy-egy helyzetet ír le, és ellenőrzi, hogy a függvény a várt eredményt adja-e.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  szabadIdopontok,
  budapestiMost,
  honapNapjai,
  honapHozzaad,
  type SzabadIdopontBemenet,
} from "./idopontok.ts";

// 2026-11-16 hétfő, 2026-11-14 szombat
const HETFO = "2026-11-16";
const SZOMBAT = "2026-11-14";

const nyitvatartas = [
  { nap: "Hétfő", nyitas: "09:00", zaras: "17:00" },
  { nap: "Kedd", nyitas: "09:00", zaras: "17:00" },
  { nap: "Szerda", nyitas: "12:00", zaras: "20:00" },
  { nap: "Csütörtök", nyitas: "09:00", zaras: "17:00" },
  { nap: "Péntek", nyitas: "09:00", zaras: "15:00" },
  { nap: "Szombat", nyitas: null, zaras: null },
  { nap: "Vasárnap", nyitas: null, zaras: null },
];

// Alapbeállítás: egy korábbi napon "vagyunk", nincs foglalás. Minden teszt ebből indul,
// és csak azt írja felül, ami az adott helyzetben számít.
function bemenet(valtozas: Partial<SzabadIdopontBemenet>): SzabadIdopontBemenet {
  return {
    datum: HETFO,
    idotartamPerc: 60,
    nyitvatartas,
    foglalasok: [],
    most: { datum: "2026-11-13", perc: 8 * 60 },
    minElooPerc: 120,
    ...valtozas,
  };
}

test("zárva tartó napon nincs szabad időpont", () => {
  assert.deepEqual(szabadIdopontok(bemenet({ datum: SZOMBAT })), []);
});

test("múltbeli napra nincs szabad időpont", () => {
  assert.deepEqual(szabadIdopontok(bemenet({ most: { datum: "2026-11-20", perc: 0 } })), []);
});

test("üres napon nyitástól az utolsó befejezhető időpontig kínál", () => {
  const idopontok = szabadIdopontok(bemenet({}));
  assert.equal(idopontok[0], "09:00");
  assert.equal(idopontok.at(-1), "16:00"); // 16:00 + 60 perc = 17:00, pont zárás
  assert.equal(idopontok.length, 15);
});

test("hosszabb szolgáltatásnál korábban van az utolsó időpont", () => {
  const idopontok = szabadIdopontok(bemenet({ idotartamPerc: 120 }));
  assert.equal(idopontok.at(-1), "15:00"); // 15:00 + 120 perc = 17:00
});

test("meglévő foglalással ütköző időpontokat kihagyja", () => {
  // 10:00–11:30 foglalt, mi 60 perces szolgáltatást keresünk
  const idopontok = szabadIdopontok(
    bemenet({ foglalasok: [{ datum: HETFO, kezdes: "10:00", idotartamPerc: 90 }] })
  );
  assert.ok(idopontok.includes("09:00"), "09:00–10:00 éppen véget ér, mire a foglalás kezdődik");
  assert.ok(!idopontok.includes("09:30"), "09:30–10:30 belelóg a foglalásba");
  assert.ok(!idopontok.includes("10:00"));
  assert.ok(!idopontok.includes("11:00"), "11:00–12:00 még átfed 11:30-ig");
  assert.ok(idopontok.includes("11:30"), "11:30-kor a foglalás már véget ért");
});

test("másik napon lévő foglalás nem számít", () => {
  const idopontok = szabadIdopontok(
    bemenet({ foglalasok: [{ datum: "2026-11-17", kezdes: "10:00", idotartamPerc: 90 }] })
  );
  assert.equal(idopontok.length, 15);
});

test("ma csak a minimális előrefoglalási idő utáni időpontok jönnek", () => {
  // Most hétfő 11:10 van, legalább 2 órával előre kell foglalni → 13:10 után
  const idopontok = szabadIdopontok(bemenet({ most: { datum: HETFO, perc: 11 * 60 + 10 } }));
  assert.equal(idopontok[0], "13:30");
});

// --- Időzóna és naptár ---

test("budapesti idő télen: UTC + 1 óra", () => {
  assert.deepEqual(budapestiMost(new Date("2026-11-16T10:00:00Z")), {
    datum: "2026-11-16",
    perc: 11 * 60,
  });
});

test("budapesti idő nyáron: UTC + 2 óra, és átfordul a nap", () => {
  assert.deepEqual(budapestiMost(new Date("2026-07-01T23:30:00Z")), {
    datum: "2026-07-02",
    perc: 1 * 60 + 30,
  });
});

test("a naptár hónapja hétfővel kezdődik", () => {
  // 2026. november 1. vasárnap → előtte 6 üres hely (hétfő–szombat)
  const napok = honapNapjai("2026-11");
  assert.equal(napok.filter((n) => n === null).length, 6);
  assert.equal(napok[6], "2026-11-01");
  assert.equal(napok.at(-1), "2026-11-30");
});

test("hónap léptetése évhatáron át", () => {
  assert.equal(honapHozzaad("2026-12", 1), "2027-01");
  assert.equal(honapHozzaad("2026-01", -1), "2025-12");
});
