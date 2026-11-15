@AGENTS.md

# Időpontfoglaló – körmösszalon

Online időpontfoglaló egy körmösszalon számára (a nyilvános demóban: **Demo Nail Studio**).
Egyben a fejlesztő portfólióprojektje is.

## Munkakörnyezet

- Windows, PowerShell.
- A fejlesztő a VS Code-ban látja a fájlokat és ott futtatja a parancsokat (`npm run dev` → http://localhost:3000).
- Git: a munka feature-ágakon folyik, a `main` ág a stabil állapot.

## Termék – első verzió (MVP)

Vendégoldal: szolgáltatások listája (név, időtartam, ár) → dátum → csak a ténylegesen szabad időpontok →
adatok (név, telefon, e-mail, megjegyzés, adatkezelési hozzájárulás) → visszaigazolás.
E-mail-értesítés a szalonnak az új foglalásról, visszaigazoló e-mail a vendégnek.

Admin (jelszóval védve): foglalások napi listája, lemondás, időszakok letiltása, nyitvatartás és szolgáltatások módosítása.

Szándékosan kimarad az első verzióból: online fizetés, vendég általi online lemondás, SMS, több munkatárs.

A szalon adatai még **tesztadatok** (`lib/salon.ts`), a valódiak később kerülnek be.

## Jelenlegi állapot

- Kész: kezdőoldal, havi naptáras foglalási folyamat, szerveroldali ellenőrzés és mentés (`app/foglalas/actions.ts`).
- Adatbázis: séma a `db/schema.sql`-ben (átfedés-tiltás `EXCLUDE USING gist`). Kapcsolat: `DATABASE_URL` a `.env.local`-ban.
  Ha nincs megadva, **tesztüzem**: tesztfoglalások, mentés nélkül.
- Időzóna: minden "most" budapesti idő szerint (`budapestiMost()`), az adatbázisban `timestamptz`.
- Admin: `/admin` (belépés: `/admin/belepes`). Egy közös jelszó; a .env.local-ban csak a lenyomata
  (`ADMIN_JELSZO_HASH`) és a sütialáíró kulcs (`MUNKAMENET_TITOK`) van – beállítás: `npm run admin:jelszo`.
  Minden admin Server Action elején újra ellenőrizni kell a bejelentkezést. A sütit mindig elsőként olvasd
  (különben a build statikusra "süti" az oldalt).
- Hátra van: időszakok letiltása, e-mail-értesítés, adatkezelési tájékoztató, élesítés.

## Parancsok

- `npm run dev` – fejlesztői szerver, `npm test` – automatikus tesztek (`lib/*.test.ts`),
  `npm run lint`, `npm run build` – ellenőrzések.
- `npm run db:setup` (első adatbázis-beállítás), `npm run db:check` (kapcsolat + foglalások),
  `npm run db:utkozes-proba` (egyidejű dupla foglalás próbája), `npm run admin:jelszo` (admin jelszó).
- A PowerShell 5.1 fájlolvasásnál elronthatja az ékezeteket: fájlt ne `Get-Content | Set-Content` párossal módosíts.

## Technológia

Next.js (App Router) + TypeScript + Tailwind CSS. Később: Neon PostgreSQL (EU-régió), tranzakciós e-mail-szolgáltatás.
A dupla foglalást az adatbázisnak kell megakadályoznia (átfedő időszakok tiltása, nem csak `UNIQUE`).

## Biztonsági szabályok

- Titok (API-kulcs, adatbázis-jelszó) soha nem kerül kliensoldali kódba és GitHubra – csak `.env.local`-ba.
- Valódi vendégadat nem kerül a Gitbe; tesztadat legyen egyértelműen kitalált.
- Minden beérkező adatot a szerveren validálunk.
- Az adatbázis-felhasználók csak a szükséges jogosultságot kapják.
- Élesítés előtt: adatkezelési tájékoztató, tesztelés, és a tárhely feltételeinek ellenőrzése (pl. kereskedelmi használat).

## Nyilvános demó vs. valódi szalon

- A repóban csak semleges demóadat van ("Demo Nail Studio"). A valódi szalon neve, szlogenje és bemutatkozása
  a `.env.local`-ban van (`NEXT_PUBLIC_SZALON_NEV`, `NEXT_PUBLIC_SZALON_SZLOGEN`, `NEXT_PUBLIC_SZALON_BEMUTATKOZAS`).
- Személyes munkautasítások: `CLAUDE.local.md` (a `.gitignore` kizárja).
- Személyes adat (valódi név, a szalon valódi neve, e-mail-cím) soha nem kerülhet a Gitbe.
