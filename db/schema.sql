-- =====================================================================
-- Demo Nail Studio – időpontfoglaló adatbázis
-- Futtatás: Neon konzol → SQL Editor, a projekt TULAJDONOS felhasználójával
-- (pl. neondb_owner). Csak egyszer kell lefuttatni.
-- =====================================================================

-- A foglalások táblája
CREATE TABLE IF NOT EXISTS foglalasok (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- A szolgáltatás adatait a foglalás pillanatában eltároljuk,
  -- így egy későbbi árváltozás nem írja át a régi foglalásokat.
  szolgaltatas_id  text    NOT NULL,
  szolgaltatas_nev text    NOT NULL,
  ar_ft            integer NOT NULL CHECK (ar_ft >= 0),

  -- Az időpont egy IDŐSZAK (tstzrange): mettől meddig tart.
  -- A "[)" jelölés: a kezdés benne van, a vég nincs – így a 10:00–11:00 és a 11:00–12:00 nem ütközik.
  idoszak          tstzrange NOT NULL,

  nev              text NOT NULL CHECK (char_length(nev) BETWEEN 2 AND 100),
  telefon          text NOT NULL CHECK (char_length(telefon) BETWEEN 9 AND 20),
  email            text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  megjegyzes       text NOT NULL DEFAULT '' CHECK (char_length(megjegyzes) <= 500),

  statusz          text NOT NULL DEFAULT 'aktiv' CHECK (statusz IN ('aktiv', 'lemondva')),
  letrehozva       timestamptz NOT NULL DEFAULT now(),

  -- ⭐ A DUPLA FOGLALÁS TILTÁSA ⭐
  -- Két AKTÍV foglalás időszaka nem fedheti át egymást (&& = "átfedi").
  -- Ez a UNIQUE "nagytestvére": nem az egyező értéket tiltja, hanem az átfedést.
  -- Akkor is véd, ha két vendég ugyanabban a másodpercben kattint – a második INSERT hibát kap.
  CONSTRAINT nincs_atfedes EXCLUDE USING gist (idoszak WITH &&) WHERE (statusz = 'aktiv')
);

-- Gyors keresés időpont szerint (pl. "a következő 60 nap foglalásai")
CREATE INDEX IF NOT EXISTS foglalasok_idoszak_idx ON foglalasok USING gist (idoszak);


-- =====================================================================
-- Korlátozott felhasználó az alkalmazásnak (a legkisebb szükséges jogosultság elve)
-- Az alkalmazás NEM a tulajdonos felhasználóval csatlakozik, hanem ezzel.
-- A 'IDE_EGY_EROS_JELSZO' helyére írj egy hosszú, véletlenszerű jelszót,
-- és ne mentsd el ezt a fájlt a jelszóval!
-- =====================================================================

-- CREATE ROLE foglalo_app WITH LOGIN PASSWORD 'IDE_EGY_EROS_JELSZO';
-- GRANT USAGE ON SCHEMA public TO foglalo_app;
-- GRANT SELECT, INSERT, UPDATE ON foglalasok TO foglalo_app;
-- (DELETE nincs: lemondáskor a statuszt állítjuk 'lemondva'-ra, a sor megmarad.)


-- =====================================================================
-- Ellenőrzés: ezt futtasd a végén. Elvárt eredmény:
-- can_select = true, can_insert = true, can_update = true, can_delete = false
-- =====================================================================

-- SELECT
--   has_table_privilege('foglalo_app', 'foglalasok', 'SELECT') AS can_select,
--   has_table_privilege('foglalo_app', 'foglalasok', 'INSERT') AS can_insert,
--   has_table_privilege('foglalo_app', 'foglalasok', 'UPDATE') AS can_update,
--   has_table_privilege('foglalo_app', 'foglalasok', 'DELETE') AS can_delete;
