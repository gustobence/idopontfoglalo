// Adatbázis-ellenőrzés: npm run db:check
// Kapcsolódik az alkalmazás felhasználójával (DATABASE_URL), és kiírja, hány foglalás van.
// Személyes adatot és jelszót nem ír ki.

import postgres from "postgres";

process.loadEnvFile(".env.local");
const cim = process.env.DATABASE_URL;
if (!cim) {
  console.error("❌ Nincs DATABASE_URL a .env.local fájlban. Futtasd: npm run db:setup");
  process.exit(1);
}

const kezdes = Date.now();
const sql = postgres(cim, { max: 1, connect_timeout: 15, onnotice: () => {} });
try {
  const [r] = await sql`
    SELECT current_user AS felhasznalo,
           count(*)::int AS osszes,
           count(*) FILTER (WHERE statusz = 'aktiv')::int AS aktiv
    FROM foglalasok
  `;
  console.log(`✅ Kapcsolat rendben (${Date.now() - kezdes} ms), felhasználó: ${r.felhasznalo}`);
  console.log(`   Foglalások: ${r.osszes} összesen, ebből ${r.aktiv} aktív.`);

  const kovetkezok = await sql`
    SELECT to_char(lower(idoszak) AT TIME ZONE 'Europe/Budapest', 'YYYY-MM-DD HH24:MI') AS kezdes,
           to_char(upper(idoszak) AT TIME ZONE 'Europe/Budapest', 'HH24:MI') AS vege,
           szolgaltatas_nev, statusz
    FROM foglalasok
    WHERE upper(idoszak) > now()
    ORDER BY lower(idoszak)
    LIMIT 10
  `;
  for (const f of kovetkezok) {
    console.log(`   • ${f.kezdes}–${f.vege}  ${f.szolgaltatas_nev}  (${f.statusz})`);
  }
} catch (hiba) {
  const h = hiba as { code?: string; message?: string };
  console.error(`❌ Hiba (${Date.now() - kezdes} ms): ${h.code ?? ""} ${h.message ?? hiba}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
