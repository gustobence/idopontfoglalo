// Admin-jelszó beállítása: npm run admin:jelszo
//
// Bekéri a jelszót (kétszer), és a .env.local-ba csak a LENYOMATÁT írja (ADMIN_JELSZO_HASH),
// valamint egy véletlen titkos kulcsot a bejelentkezési sütik aláírásához (MUNKAMENET_TITOK).
// Maga a jelszó sehol nem tárolódik. Újrafuttatva lecseréli a jelszót, és minden korábbi
// bejelentkezést érvénytelenít (mert új titkos kulcs készül).
// Vercelhez: npm run admin:jelszo:vercel (csak kiírja az értékeket, fájlt nem módosít).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { jelszoHash } from "../lib/jelszo.ts";

const ENV_FAJL = ".env.local";
const MIN_HOSSZ = 12;

const rl = createInterface({ input: stdin, output: stdout });
console.log(`\n🔑 Admin-jelszó beállítása (legalább ${MIN_HOSSZ} karakter).`);
console.log("   Figyelem: a beírt jelszó látszani fog a terminálban – utána érdemes törölni a képernyőt (cls).\n");

const jelszo = await rl.question("Új jelszó: ");
const ujra = await rl.question("Jelszó még egyszer: ");
rl.close();

if (jelszo !== ujra) {
  console.error("\n❌ A két jelszó nem egyezik. Semmit nem módosítottam.\n");
  process.exit(1);
}
if (jelszo.length < MIN_HOSSZ) {
  console.error(`\n❌ A jelszó túl rövid (legalább ${MIN_HOSSZ} karakter kell). Semmit nem módosítottam.\n`);
  process.exit(1);
}

// Vercelhez (npm run admin:jelszo:vercel): csak kiírja az új értékeket, a .env.local-hoz nem nyúl,
// így a helyi jelszavad megmarad.
if (process.argv.includes("--csak-kiir")) {
  console.log(`
✅ Ezt a két értéket másold be a Vercelre. A .env.local NEM változott.
   Ne mentsd el fájlba, és ne küldd el senkinek. Utána töröld a képernyőt: cls

ADMIN_JELSZO_HASH
${jelszoHash(jelszo)}

MUNKAMENET_TITOK
${randomBytes(32).toString("hex")}
`);
  process.exit(0);
}

const sorok = existsSync(ENV_FAJL)
  ? readFileSync(ENV_FAJL, "utf8")
      .split(/\r?\n/)
      .filter((sor) => !/^\s*(ADMIN_JELSZO_HASH|MUNKAMENET_TITOK)\s*=/.test(sor))
  : [];
while (sorok.length > 0 && sorok[sorok.length - 1].trim() === "") sorok.pop();
sorok.push(`ADMIN_JELSZO_HASH=${jelszoHash(jelszo)}`);
sorok.push(`MUNKAMENET_TITOK=${randomBytes(32).toString("hex")}`);
writeFileSync(ENV_FAJL, sorok.join("\n") + "\n", "utf8");

console.log(`
✅ Kész! A ${ENV_FAJL} fájlba a jelszó lenyomata és egy új titkos kulcs került.
   Indítsd újra a fejlesztői szervert (Ctrl+C, majd: npm run dev),
   és jelentkezz be: http://localhost:3000/admin
`);
