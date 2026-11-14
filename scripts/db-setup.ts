// =====================================================================
// Adatbázis-telepítő: npm run db:setup
//
// Mit csinál?
//  1. Csatlakozik a Neon-adatbázishoz a TULAJDONOS felhasználóval (DATABASE_URL_ADMIN)
//  2. Lefuttatja a db/schema.sql-t (létrehozza a táblát – ha már létezik, nem bántja)
//  3. Létrehozza a korlátozott "foglalo_app" felhasználót egy véletlen jelszóval
//     (ha már létezik, új jelszót kap)
//  4. Ellenőrzi, hogy az alkalmazás felhasználója tud olvasni/írni, de törölni NEM
//  5. Beírja a .env.local-ba a DATABASE_URL-t, és TÖRLI belőle a tulajdonosi címet
//
// Biztonság: jelszót és teljes kapcsolódási címet soha nem ír ki a képernyőre.
// Többször is lefuttatható.
// =====================================================================

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomInt } from "node:crypto";
import postgres, { PostgresError } from "postgres";

const ENV_FAJL = ".env.local";
const APP_FELHASZNALO = "foglalo_app";

function kiir(uzenet: string) {
  console.log(uzenet);
}

function leall(uzenet: string): never {
  console.error(`\n❌ ${uzenet}\n`);
  process.exit(1);
}

// 32 karakteres véletlen jelszó, csak betűkből és számokból
// (így nem kell foglalkozni azzal, hogy a speciális karakterek elrontják a címet)
function jelszoGeneralas(): string {
  const karakterek = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let jelszo = "";
  for (let i = 0; i < 32; i++) jelszo += karakterek[randomInt(karakterek.length)];
  return jelszo;
}

// --- 0. A tulajdonosi cím beolvasása a .env.local-ból ---
if (!existsSync(ENV_FAJL)) {
  leall(`Nem találom a ${ENV_FAJL} fájlt. Hozd létre a projekt gyökerében, benne ezzel a sorral:
   DATABASE_URL_ADMIN=postgresql://neondb_owner:...`);
}
process.loadEnvFile(ENV_FAJL);
const adminCim = process.env.DATABASE_URL_ADMIN;
if (!adminCim) {
  leall(`A ${ENV_FAJL} fájlban nincs DATABASE_URL_ADMIN sor.
   Másold ki a Neon "Connect" ablakából a címet, és írd be így:
   DATABASE_URL_ADMIN=postgresql://neondb_owner:...`);
}

let cim: URL;
try {
  cim = new URL(adminCim);
} catch {
  leall("A DATABASE_URL_ADMIN nem érvényes cím. Ellenőrizd, hogy teljesen kimásoltad-e.");
}
if (!cim.protocol.startsWith("postgres")) {
  leall("A DATABASE_URL_ADMIN-nak postgresql:// kezdetűnek kell lennie.");
}
// A "-pooler" a Neon kapcsolatmegosztós címe. Telepítéshez a közvetlen kapcsolat kell.
cim.hostname = cim.hostname.replace("-pooler", "");

kiir(`\n🔌 Csatlakozás: ${cim.hostname} (felhasználó: ${decodeURIComponent(cim.username)})`);
const admin = postgres(cim.toString(), { max: 1, onnotice: () => {} });

try {
  // --- 1. Séma ---
  const sema = readFileSync("db/schema.sql", "utf8");
  // Megbízható, saját fájl → futtathatjuk egyben (több SQL-utasítás egymás után)
  await admin.unsafe(sema);
  kiir("✅ A foglalasok tábla kész.");

  // --- 2. Korlátozott felhasználó ---
  const jelszo = jelszoGeneralas();
  const [letezik] = await admin`SELECT 1 FROM pg_roles WHERE rolname = ${APP_FELHASZNALO}`;
  // A CREATE ROLE jelszava nem lehet paraméter, ezért szövegként kerül bele.
  // Ez itt biztonságos, mert a jelszót mi generáltuk, és csak betűt/számot tartalmaz.
  if (letezik) {
    await admin.unsafe(`ALTER ROLE ${APP_FELHASZNALO} WITH LOGIN PASSWORD '${jelszo}'`);
    kiir(`✅ A ${APP_FELHASZNALO} felhasználó már létezett – új jelszót kapott.`);
  } else {
    await admin.unsafe(`CREATE ROLE ${APP_FELHASZNALO} WITH LOGIN PASSWORD '${jelszo}'`);
    kiir(`✅ A ${APP_FELHASZNALO} felhasználó létrehozva.`);
  }
  await admin.unsafe(`
    GRANT USAGE ON SCHEMA public TO ${APP_FELHASZNALO};
    GRANT SELECT, INSERT, UPDATE ON foglalasok TO ${APP_FELHASZNALO};
    REVOKE DELETE, TRUNCATE ON foglalasok FROM ${APP_FELHASZNALO};
  `);

  // --- 3. Jogosultságok ellenőrzése ---
  const [jog] = await admin`
    SELECT
      has_table_privilege(${APP_FELHASZNALO}, 'foglalasok', 'SELECT') AS can_select,
      has_table_privilege(${APP_FELHASZNALO}, 'foglalasok', 'INSERT') AS can_insert,
      has_table_privilege(${APP_FELHASZNALO}, 'foglalasok', 'UPDATE') AS can_update,
      has_table_privilege(${APP_FELHASZNALO}, 'foglalasok', 'DELETE') AS can_delete
  `;
  kiir(
    `🔐 Jogosultságok: select=${jog.can_select}, insert=${jog.can_insert}, ` +
      `update=${jog.can_update}, delete=${jog.can_delete}`
  );
  if (!jog.can_select || !jog.can_insert || !jog.can_update || jog.can_delete) {
    leall("A jogosultságok nem a vártak (elvárt: true, true, true, false).");
  }

  // --- 4. Próba-kapcsolódás az alkalmazás felhasználójával ---
  const appCim = new URL(cim.toString());
  appCim.username = APP_FELHASZNALO;
  appCim.password = jelszo;
  const app = postgres(appCim.toString(), { max: 1, onnotice: () => {} });
  try {
    const [{ felhasznalo }] = await app`SELECT current_user AS felhasznalo`;
    await app`SELECT count(*) FROM foglalasok`;
    kiir(`✅ Az alkalmazás be tud lépni (${felhasznalo}), és olvassa a táblát.`);

    // Valódi próba: a törlésnek el KELL buknia
    try {
      await app`DELETE FROM foglalasok WHERE false`;
      leall("Az alkalmazás felhasználója tud törölni – ennek nem szabadna így lennie!");
    } catch (hiba) {
      if (hiba instanceof PostgresError && hiba.code === "42501") {
        kiir("✅ Törlési próba: megtagadva, ahogy kell.");
      } else {
        throw hiba;
      }
    }
  } finally {
    await app.end();
  }

  // --- 5. .env.local frissítése ---
  // Megtartjuk a többi sort, a régi DATABASE_URL és a DATABASE_URL_ADMIN sort kicseréljük.
  const sorok = readFileSync(ENV_FAJL, "utf8")
    .split(/\r?\n/)
    .filter((sor) => !/^\s*DATABASE_URL(_ADMIN)?\s*=/.test(sor));
  while (sorok.length > 0 && sorok[sorok.length - 1].trim() === "") sorok.pop(); // üres sorok a végéről
  sorok.push(`DATABASE_URL=${appCim.toString()}`);
  writeFileSync(ENV_FAJL, sorok.join("\n") + "\n", "utf8");
  kiir(`✅ A ${ENV_FAJL} frissítve: az alkalmazás címe beírva, a tulajdonosi cím törölve.`);

  kiir(`
🎉 Kész! Indítsd újra a fejlesztői szervert (Ctrl+C, majd: npm run dev),
   és a foglalási oldalon el kell tűnnie a sárga "Tesztüzem" sávnak.
`);
} catch (hiba) {
  const kod = hiba instanceof PostgresError ?` (PostgreSQL hibakód: ${hiba.code})` : "";
  console.error(`\n❌ Hiba történt${kod}:`, hiba instanceof Error ? hiba.message : hiba);
  console.error("   A .env.local fájlt nem módosítottam.\n");
  process.exitCode = 1;
} finally {
  await admin.end();
}
