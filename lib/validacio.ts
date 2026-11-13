// A vendég által megadott adatok ellenőrzése.
// Ugyanaz a gondolat, mint a Secure Lead Intake Code node-jában: minden mezőt külön ellenőrzünk,
// és a hibákat összegyűjtjük. Most a böngészőben használjuk (azonnali visszajelzés),
// később a szerveren is lefuttatjuk – mert a böngészős ellenőrzést meg lehet kerülni.

export type FoglalasiAdatok = {
  nev: string;
  telefon: string;
  email: string;
  megjegyzes: string;
  hozzajarulas: boolean;
};

// Mezőnként egy hibaüzenet. A "Partial" azt jelenti: nem minden mezőhöz kell, hogy legyen.
export type Hibak = Partial<Record<keyof FoglalasiAdatok, string>>;

export function ellenorizAdatok(adatok: FoglalasiAdatok): Hibak {
  const hibak: Hibak = {};

  const nev = adatok.nev.trim();
  if (nev.length < 2 || nev.length > 100) {
    hibak.nev = "Kérlek, add meg a neved (2–100 karakter).";
  }

  // A telefonszámból kivesszük a szóközöket, kötőjeleket, zárójeleket, perjeleket,
  // így a "+36 30 123 4567" és a "06-30/123-4567" is elfogadható.
  const telefon = adatok.telefon.replace(/[\s\-()/]/g, "");
  if (!/^\+?\d{9,15}$/.test(telefon)) {
    hibak.telefon = "Kérlek, adj meg egy érvényes telefonszámot.";
  }

  const email = adatok.email.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    hibak.email = "Kérlek, adj meg egy érvényes e-mail-címet.";
  }

  if (adatok.megjegyzes.trim().length > 500) {
    hibak.megjegyzes = "A megjegyzés legfeljebb 500 karakter lehet.";
  }

  if (!adatok.hozzajarulas) {
    hibak.hozzajarulas = "A foglaláshoz el kell fogadnod az adatkezelési tájékoztatót.";
  }

  return hibak;
}
