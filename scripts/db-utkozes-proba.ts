// Ütközéspróba: npm run db:utkozes-proba
//
// Bizonyítja, hogy az adatbázis megakadályozza a dupla foglalást – akkor is,
// ha két vendég PONTOSAN EGYSZERRE foglalna.
//
// Hogyan?
//  - Két külön adatbázis-kapcsolat (= két vendég) ugyanarra az időpontra próbál foglalni.
//  - Az "A" vendég tranzakciója elkezdi a mentést, de még nem véglegesíti.
//  - Közben a "B" vendég is menteni próbál → az adatbázis VÁRAKOZTATJA, amíg A el nem dönti a sorsát.
//  - A véglegesít → B hibát kap (23P01 = átfedés-tiltás). Csak egy foglalás jön létre.
//
// A próba 2099-es dátumot használ (a naptárban sosem látszik), és a végén lemondja a próbafoglalást.
// Az alkalmazás korlátozott felhasználójával fut (DATABASE_URL) – ugyanúgy, mint az éles oldal.

import postgres, { PostgresError } from "postgres";

process.loadEnvFile(".env.local");
const cim = process.env.DATABASE_URL;
if (!cim) {
  console.error("❌ Nincs DATABASE_URL a .env.local fájlban.");
  process.exit(1);
}

const A = postgres(cim, { max: 1, onnotice: () => {} });
const B = postgres(cim, { max: 1, onnotice: () => {} });

// Ugyanaz az időpont mindkét "vendégnek", illetve B egy átfedő (de nem azonos kezdésű) időpontot kér
const PROBA_NEV = "TESZT – ütközéspróba";
const beszuras = (sql: postgres.TransactionSql, kezdes: string, veg: string) => sql`
  INSERT INTO foglalasok (szolgaltatas_id, szolgaltatas_nev, ar_ft, idoszak, nev, telefon, email)
  VALUES ('proba', 'Ütközéspróba', 0,
          tstzrange(${kezdes}::timestamptz, ${veg}::timestamptz, '[)'),
          ${PROBA_NEV}, '+36000000000', 'proba@example.com')
  RETURNING id
`;

let aId: number | null = null;
try {
  console.log("\n▶ A vendég: elkezdi a 10:00–11:00 foglalását (még nem véglegesíti)…");

  // Az "A" tranzakció: beszúr, vár 1,5 másodpercet, majd véglegesít
  const aFolyamat = A.begin(async (tx) => {
    const [sor] = await beszuras(tx, "2099-01-05 10:00 Europe/Budapest", "2099-01-05 11:00 Europe/Budapest");
    aId = Number(sor.id);
    await new Promise((r) => setTimeout(r, 1500));
    console.log("✔ A vendég: véglegesíti a foglalását.");
  });

  // Kis késleltetés, hogy A biztosan előbb kezdjen
  await new Promise((r) => setTimeout(r, 300));
  console.log("▶ B vendég: közben 10:30–11:30-ra foglalna (átfedi A-t)… az adatbázis várakoztatja.");
  const bKezdes = Date.now();
  const bFolyamat = B.begin(async (tx) => {
    await beszuras(tx, "2099-01-05 10:30 Europe/Budapest", "2099-01-05 11:30 Europe/Budapest");
  }).then(
    () => ({ sikerult: true as const }),
    (hiba: unknown) => ({ sikerult: false as const, hiba })
  );

  await aFolyamat;
  const b = await bFolyamat;
  const varakozas = Date.now() - bKezdes;

  if (b.sikerult) {
    console.log("\n❌ HIBA: B foglalása is elmentődött – az ütközésvédelem NEM működik!");
    process.exitCode = 1;
  } else if (b.hiba instanceof PostgresError && b.hiba.code === "23P01") {
    console.log(`✔ B vendég: elutasítva ${varakozas} ms várakozás után (hibakód 23P01 – átfedő foglalás).`);
    console.log("\n🎉 Az ütközésvédelem működik: egyszerre érkező foglalásnál is csak egy jön létre.");
  } else {
    throw b.hiba;
  }
} finally {
  // Takarítás: a próbafoglalást lemondjuk (törlési jog nincs – szándékosan)
  if (aId !== null) {
    await A`UPDATE foglalasok SET statusz = 'lemondva' WHERE id = ${aId}`;
    console.log("🧹 A próbafoglalás lemondva (2099-es dátum, a naptárban nem látszik).\n");
  }
  await A.end();
  await B.end();
}
