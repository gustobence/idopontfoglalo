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
- Hátra van: e-mail-értesítés, adminfelület, adatkezelési tájékoztató, élesítés.

## Parancsok

- `npm run dev` – fejlesztői szerver, `npm test` – automatikus tesztek (`lib/*.test.ts`),
  `npm run lint`, `npm run build` – ellenőrzések.
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
