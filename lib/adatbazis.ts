// Az adatbázis-kapcsolat és a foglalásokkal kapcsolatos SQL-műveletek.
// A "server-only" sor gondoskodik róla, hogy ez a fájl SOHA ne kerülhessen a böngészőbe:
// ha egy Client Component véletlenül importálná, a build hibával leáll.
// Így az adatbázis jelszava (DATABASE_URL) biztosan a szerveren marad.
import "server-only";
import postgres, { PostgresError } from "postgres";
import type { Foglalas } from "./idopontok";

// A kapcsolódási adat a .env.local fájlból jön (ez nincs a Gitben!).
// Ha nincs beállítva, az alkalmazás tesztüzemben fut: tesztfoglalásokkal, mentés nélkül.
const kapcsolat = process.env.DATABASE_URL;

// Fejlesztés közben a Next.js minden mentéskor újratölti a fájlokat. Hogy ne nyisson
// minden alkalommal új kapcsolatot, a meglévőt a globalThis-en tároljuk.
const globalis = globalThis as unknown as { sql?: postgres.Sql };
const sql = kapcsolat ? (globalis.sql ??= postgres(kapcsolat, { max: 5 })) : null;

export const vanAdatbazis = sql !== null;

// A következő időszak aktív foglalásai – CSAK az időpontok, személyes adat nélkül,
// mert ez a lista a böngészőbe is eljut (a szabad időpontok kiszámításához).
export async function foglaltIdopontok(napokElore: number): Promise<Foglalas[]> {
  if (!sql) throw new Error("Nincs adatbázis beállítva");

  const sorok = await sql<{ datum: string; kezdes: string; idotartam_perc: number }[]>`
    SELECT
      to_char(lower(idoszak) AT TIME ZONE 'Europe/Budapest', 'YYYY-MM-DD') AS datum,
      to_char(lower(idoszak) AT TIME ZONE 'Europe/Budapest', 'HH24:MI')    AS kezdes,
      (extract(epoch FROM upper(idoszak) - lower(idoszak)) / 60)::int        AS idotartam_perc
    FROM foglalasok
    WHERE statusz = 'aktiv'
      AND upper(idoszak) > now()
      AND lower(idoszak) < now() + make_interval(days => ${napokElore + 1}::int)
    ORDER BY lower(idoszak)
  `;

  return sorok.map((s) => ({ datum: s.datum, kezdes: s.kezdes, idotartamPerc: s.idotartam_perc }));
}

// --- Admin: a foglalások teljes adataival (csak bejelentkezett adminnak!) ---

export type AdminFoglalas = {
  id: number;
  datum: string; // "2026-11-16"
  kezdes: string; // "14:00"
  vege: string; // "14:45"
  szolgaltatasNev: string;
  arFt: number;
  nev: string;
  telefon: string;
  email: string;
  megjegyzes: string;
  statusz: "aktiv" | "lemondva";
};

// "kozelgo": a mai naptól előre (legkorábbi elöl)
// "korabbi": a mai nap előtti 60 nap (legutóbbi elöl)
export async function adminFoglalasok(nezet: "kozelgo" | "korabbi"): Promise<AdminFoglalas[]> {
  if (!sql) throw new Error("Nincs adatbázis beállítva");

  // A mai nap kezdete budapesti idő szerint
  const maKezdete = sql`(date_trunc('day', now() AT TIME ZONE 'Europe/Budapest') AT TIME ZONE 'Europe/Budapest')`;
  const szures =
    nezet === "kozelgo"
      ? sql`lower(idoszak) >= ${maKezdete}`
      : sql`lower(idoszak) < ${maKezdete} AND lower(idoszak) >= ${maKezdete} - interval '60 days'`;
  const rendezes = nezet === "kozelgo" ? sql`ORDER BY lower(idoszak) ASC` : sql`ORDER BY lower(idoszak) DESC`;

  const sorok = await sql<
    {
      id: string;
      datum: string;
      kezdes: string;
      vege: string;
      szolgaltatas_nev: string;
      ar_ft: number;
      nev: string;
      telefon: string;
      email: string;
      megjegyzes: string;
      statusz: "aktiv" | "lemondva";
    }[]
  >`
    SELECT id,
           to_char(lower(idoszak) AT TIME ZONE 'Europe/Budapest', 'YYYY-MM-DD') AS datum,
           to_char(lower(idoszak) AT TIME ZONE 'Europe/Budapest', 'HH24:MI')    AS kezdes,
           to_char(upper(idoszak) AT TIME ZONE 'Europe/Budapest', 'HH24:MI')    AS vege,
           szolgaltatas_nev, ar_ft, nev, telefon, email, megjegyzes, statusz
    FROM foglalasok
    WHERE szolgaltatas_id <> 'proba' AND ${szures}
    ${rendezes}
    LIMIT 500
  `;

  return sorok.map((s) => ({
    id: Number(s.id),
    datum: s.datum,
    kezdes: s.kezdes,
    vege: s.vege,
    szolgaltatasNev: s.szolgaltatas_nev,
    arFt: s.ar_ft,
    nev: s.nev,
    telefon: s.telefon,
    email: s.email,
    megjegyzes: s.megjegyzes,
    statusz: s.statusz,
  }));
}

// Lemondás: nem töröljük a sort, csak "lemondva" állapotba tesszük.
// Az átfedés-tiltás csak az aktív foglalásokra vonatkozik, így az időpont azonnal újra foglalható.
// Visszatérési érték: true, ha tényleg lemondtunk egy aktív foglalást.
export async function foglalasLemondasa(id: number): Promise<boolean> {
  if (!sql) throw new Error("Nincs adatbázis beállítva");
  const sorok = await sql`
    UPDATE foglalasok SET statusz = 'lemondva'
    WHERE id = ${id} AND statusz = 'aktiv'
    RETURNING id
  `;
  return sorok.length === 1;
}

export type UjFoglalas = {
  szolgaltatasId: string;
  szolgaltatasNev: string;
  arFt: number;
  datum: string; // "2026-11-16"
  kezdes: string; // "15:00"
  idotartamPerc: number;
  nev: string;
  telefon: string;
  email: string;
  megjegyzes: string;
};

// Új foglalás mentése. Visszatérési érték:
//  - { eredmeny: "ok", id }  → elmentve
//  - { eredmeny: "utkozes" } → közben valaki lefoglalta (az adatbázis átfedés-tiltása szólt)
export async function foglalasMentese(
  f: UjFoglalas
): Promise<{ eredmeny: "ok"; id: number } | { eredmeny: "utkozes" }> {
  if (!sql) throw new Error("Nincs adatbázis beállítva");

  try {
    // Minden ${...} érték PARAMÉTERKÉNT megy az adatbázisnak, nem szövegként beillesztve,
    // így SQL-befecskendezés (SQL injection) nem lehetséges. Ugyanaz az elv, mint az n8n-ben.
    // A dátum + idő budapesti helyi időként értendő (AT TIME ZONE 'Europe/Budapest').
    const [sor] = await sql<{ id: number }[]>`
      INSERT INTO foglalasok
        (szolgaltatas_id, szolgaltatas_nev, ar_ft, idoszak, nev, telefon, email, megjegyzes)
      VALUES (
        ${f.szolgaltatasId}, ${f.szolgaltatasNev}, ${f.arFt}::int,
        tstzrange(
          (${f.datum}::date + ${f.kezdes}::time) AT TIME ZONE 'Europe/Budapest',
          (${f.datum}::date + ${f.kezdes}::time + make_interval(mins => ${f.idotartamPerc}::int))
            AT TIME ZONE 'Europe/Budapest',
          '[)'
        ),
        ${f.nev}, ${f.telefon}, ${f.email}, ${f.megjegyzes}
      )
      RETURNING id
    `;
    return { eredmeny: "ok", id: Number(sor.id) };
  } catch (hiba) {
    // 23P01 = "exclusion_violation": az átfedés-tiltás megakadályozta a mentést
    if (hiba instanceof PostgresError && hiba.code === "23P01") {
      return { eredmeny: "utkozes" };
    }
    throw hiba; // minden más hiba valódi probléma – ne nyeljük le
  }
}
