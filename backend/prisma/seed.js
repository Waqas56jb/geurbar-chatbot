// Seeds the Supabase database with Geurbar's full catalog (47 fragrances),
// default bot settings, and the admin user. Safe to re-run (upserts).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---- Parfums: [code, gender, inspiredBy, type, intensity, season, notes, occasions]
const PARFUMS = [
  // Vrouwelijk (Dames) — 15
  ["No.078", "Vrouwelijk", "Guidance", "Zacht, bloemig en romig", "Medium", "Lente/herfst", "Peer, Hazelnoot, Wierook, Roos, Jasmijn, Vanille", "Dagelijks, Elegant, Brunch/date"],
  ["No.126", "Vrouwelijk", "Erba Pura", "Fruitig, fris en musky", "Medium", "Lente/zomer", "Sinaasappel, Citroen, Bergamot, Tropisch fruit, Musk, Vanille", "Dagelijks, Fris en vrolijk"],
  ["No.175", "Vrouwelijk", "Santal 33", "Houtachtig, clean en kruidig", "Medium", "Dagelijks", "Sandelhout, Cederhout, Leer, Papyrus, Kardemom, Iris", "Dagelijks, Werk, Minimalistische luxe"],
  ["No.275", "Vrouwelijk", "Baccarat Rouge 540", "Amber, bloemig en licht zoet", "Medium tot sterk", "Dagelijks", "Saffraan, Jasmijn, Amber, Cederhout, Suiker", "Dagelijks, Avond, Elegant en luxe"],
  ["No.292", "Vrouwelijk", "Tobacco Vanille", "Warm, zoet en kruidig", "Sterk", "Herfst/winter", "Tabak, Vanille, Cacao, Tonka, Kaneel", "Avond, Date, Luxe momenten"],
  ["No.337", "Vrouwelijk", "Tuscan Leather", "Leerachtig, kruidig en donker", "Sterk", "Herfst/winter", "Leer, Suède, Saffraan, Framboos, Tijm, Wierook", "Avond, Date, Stoere luxe momenten"],
  ["No.362", "Vrouwelijk", "Lost Cherry", "Fruitig, zoet en bloemig", "Medium tot sterk", "Herfst/winter", "Kers, Amandel, Roos, Jasmijn, Vanille", "Avond, Date, Luxe momenten"],
  ["No.427", "Vrouwelijk", "Black Orchid Mix", "Donker, bloemig en zoet", "Sterk", "Herfst/winter", "Zwarte orchidee, Truffel, Chocolade, Patchouli, Vanille, Amber", "Avond, Date, Luxe statement"],
  ["No.511", "Vrouwelijk", "Black Afgano", "Donker, rokerig en houtachtig", "Zeer sterk", "Herfst/winter", "Oud, Wierook, Koffie, Tabak, Hars, Saffraan", "Avond, Niche statement"],
  ["No.566", "Vrouwelijk", "Valaya", "Clean, bloemig en zacht fruitig", "Medium", "Lente/zomer", "Witte perzik, Bergamot, Mandarijn, Oranjebloesem, Musk", "Dagelijks, Werk, Elegant"],
  ["No.673", "Vrouwelijk", "Delina", "Roze, bloemig en fruitig", "Medium", "Lente/zomer", "Lychee, Rabarber, Bergamot, Roos, Pioenroos, Vanille", "Dagelijks, Date"],
  ["No.723", "Vrouwelijk", "Black Opium Over Red", "Zoet, donker en gourmand", "Medium tot sterk", "Herfst/winter", "Kers, Koffie, Vanille, Witte bloemen, Amber", "Avond, Date"],
  ["No.791", "Vrouwelijk", "Angels Share", "Warm, gourmand en amber", "Sterk", "Herfst/winter", "Cognac, Kaneel, Eikenhout, Tonka, Vanille, Praline", "Avond, Feest, Luxe wintermomenten"],
  ["No.862", "Vrouwelijk", "God of Fire", "Tropisch, fruitig en amber", "Medium tot sterk", "Lente/zomer", "Mango, Citroen, Gember, Rode bessen, Jasmijn, Amber", "Dagelijks, Zomer, Vakantie, Avond"],
  ["No.947", "Vrouwelijk", "Magic Mango", "Tropisch, zoet en houtachtig", "Medium", "Lente/zomer", "Mango, Saffraan, Vetiver, Donker hout", "Dagelijks, Zomer, Casual luxe"],
  // Mannelijk (Heren) — 20
  ["No.092", "Mannelijk", "Ombre Nomade", "Donker, houtachtig en amber", "Sterk", "Herfst/winter", "Oud, Wierook, Framboos, Roos, Amberhars", "Avond, Date, Luxe gelegenheden"],
  ["No.105", "Mannelijk", "Tobacco Vanille", "Warm, zoet en kruidig", "Sterk", "Herfst/winter", "Tabak, Vanille, Cacao, Tonka, Kaneel", "Avond, Date, Luxe momenten"],
  ["No.184", "Mannelijk", "Interlude", "Rokerig, kruidig en houtachtig", "Zeer sterk", "Herfst/winter", "Wierook, Kruiden, Bergamot, Amber, Oud, Leer", "Avond, Statement geur"],
  ["No.248", "Mannelijk", "Baccarat Rouge 540", "Amber, bloemig en licht zoet", "Medium tot sterk", "Dagelijks", "Saffraan, Jasmijn, Amber, Cederhout, Suiker", "Dagelijks, Avond, Elegant en luxe"],
  ["No.278", "Mannelijk", "Imagination", "Fris, citrus en aromatisch", "Medium", "Lente/zomer", "Bergamot, Citrus, Zwarte thee, Neroli, Gember, Kaneel", "Dagelijks, Werk, Clean luxe"],
  ["No.319", "Mannelijk", "Tuscan Leather", "Leerachtig, kruidig en donker", "Sterk", "Herfst/winter", "Leer, Suède, Saffraan, Framboos, Tijm, Wierook", "Avond, Date, Stoere luxe momenten"],
  ["No.356", "Mannelijk", "Journey", "Kruidig, rokerig en leerachtig", "Sterk", "Herfst/winter", "Peper, Kardemom, Bergamot, Jeneverbes, Wierook, Leer", "Avond, Uitgaan"],
  ["No.421", "Mannelijk", "Black Afgano", "Donker, rokerig en houtachtig", "Zeer sterk", "Herfst/winter", "Oud, Wierook, Koffie, Tabak, Hars, Saffraan", "Avond, Niche statement"],
  ["No.527", "Mannelijk", "Althair", "Zoet, romig en kruidig", "Medium tot sterk", "Herfst/winter", "Vanille, Praline, Kaneel, Kardemom, Tonka, Amandel", "Avond, Date, Cozy luxe"],
  ["No.567", "Mannelijk", "Santal 33", "Houtachtig, clean en kruidig", "Medium", "Dagelijks", "Sandelhout, Cederhout, Leer, Papyrus, Kardemom, Iris", "Dagelijks, Werk, Minimalistische luxe"],
  ["No.611", "Mannelijk", "Aventus", "Fruitig, fris en houtachtig", "Medium tot sterk", "Lente/zomer", "Ananas, Bergamot, Zwarte bes, Appel, Berkenhout, Musk", "Dagelijks, Werk, Uitgaan"],
  ["No.648", "Mannelijk", "Angels Share", "Warm, gourmand en amber", "Sterk", "Herfst/winter", "Cognac, Kaneel, Eikenhout, Tonka, Vanille, Praline", "Avond, Feest, Luxe wintermomenten"],
  ["No.713", "Mannelijk", "Layton", "Fris, aromatisch en warm", "Medium tot sterk", "Dagelijks", "Appel, Lavendel, Bergamot, Mandarijn, Vanille, Kardemom", "Dagelijks, Avond, Veelzijdig"],
  ["No.718", "Mannelijk", "God of Fire", "Tropisch, fruitig en amber", "Medium tot sterk", "Lente/zomer", "Mango, Citroen, Gember, Rode bessen, Jasmijn, Amber", "Dagelijks, Zomer, Vakantie, Avond"],
  ["No.777", "Mannelijk", "Magic Mango", "Tropisch, zoet en houtachtig", "Medium", "Lente/zomer", "Mango, Saffraan, Vetiver, Donker hout", "Dagelijks, Zomer, Casual luxe"],
  ["No.788", "Mannelijk", "Elixir", "Bloemig, warm en amber", "Medium tot sterk", "Herfst/winter", "Oranjebloesem, Vanille, Amber, Patchouli, Nootmuskaat", "Avond, Elegant, Speciale momenten"],
  ["No.851", "Mannelijk", "Spicy Aoud", "Kruidig, citrus en oud", "Sterk", "Herfst/winter", "Saffraan, Sinaasappel, Patchouli, Oud, Musk, Warme kruiden", "Avond, Luxe gelegenheden"],
  ["No.894", "Mannelijk", "Arabian Tonka", "Zoet, amber en houtachtig", "Sterk", "Herfst/winter", "Saffraan, Bergamot, Roos, Oud, Tonka, Bruine suiker", "Avond, Date, Statement geur"],
  ["No.936", "Mannelijk", "Blue", "Fris, aromatisch en houtachtig", "Medium", "Dagelijks", "Grapefruit, Citroen, Munt, Gember, Wierook, Cederhout", "Dagelijks, Werk, Clean en fris"],
  ["No.994", "Mannelijk", "Dior Homme", "Poederig, classy en houtachtig", "Medium", "Dagelijks", "Iris, Lavendel, Cacao, Leer, Amber, Hout", "Dagelijks, Kantoor, Avond"],
];

// ---- Roomsprays & Carsprays: [code, inspiredBy, type, intensity, season, notes]
const ROOMSPRAYS = [
  ["No.066", "Tobacco Vanille", "Warm, zoet en kruidig", "Sterk", "Herfst/winter", "Tabak, Vanille, Cacao, Tonka, Kaneel"],
  ["No.192", "Lost Cherry", "Fruitig, zoet en bloemig", "Medium tot sterk", "Lente/zomer", "Kers, Amandel, Roos, Jasmijn, Vanille"],
  ["No.288", "Sauvage", "Fris, kruidig en houtachtig", "Medium", "Dagelijks", "Bergamot, Citrus, Peper, Lavendel, Cederhout"],
  ["No.473", "1 Million", "Fris, kruidig en warm", "Sterk", "Herfst/winter", "Grapefruit, Mandarijn, Munt, Kaneel, Amber, Leer"],
  ["No.575", "Lemon Sweet", "Fris, citrus en zoet", "Licht tot medium", "Lente/zomer", "Citroen, Citroenschil, Suiker, Vanille, Honing"],
  ["No.762", "Sandelwood Pachouli", "Houtachtig, warm en aards", "Medium", "Herfst/winter", "Sandelhout, Patchouli, Amber, Musk, Droog hout"],
];
const CARSPRAYS = [
  ["No.082", "Tobacco Vanille", "Warm, zoet en kruidig", "Sterk", "Herfst/winter", "Tabak, Vanille, Cacao, Tonka, Kaneel"],
  ["No.166", "Lost Cherry", "Fruitig, zoet en bloemig", "Medium tot sterk", "Lente/zomer", "Kers, Amandel, Roos, Jasmijn, Vanille"],
  ["No.242", "Sauvage", "Fris, kruidig en houtachtig", "Medium", "Dagelijks", "Bergamot, Citrus, Peper, Lavendel, Cederhout"],
  ["No.387", "1 Million", "Fris, kruidig en warm", "Sterk", "Herfst/winter", "Grapefruit, Mandarijn, Munt, Kaneel, Amber, Leer"],
  ["No.455", "Lemon Sweet", "Fris, citrus en zoet", "Licht tot medium", "Lente/zomer", "Citroen, Citroenschil, Suiker, Vanille, Honing"],
  ["No.799", "Sandelwood Pachouli", "Houtachtig, warm en aards", "Medium", "Herfst/winter", "Sandelhout, Patchouli, Amber, Musk, Droog hout"],
];

const num = (code) => code.replace("No.", "").toLowerCase();

const products = [
  ...PARFUMS.map(([code, gender, inspiredBy, type, intensity, season, notes, occasions]) => ({
    code,
    name: `Geurbar ${code}`,
    category: gender === "Mannelijk" ? "heren" : "dames",
    gender,
    inspiredBy,
    type,
    intensity,
    season,
    notes,
    occasions,
    priceRegular: 44.95,
    priceSale: 34.95,
    content: "50ml / 100ml",
    description: `Geurbar ${code} — geïnspireerd door ${inspiredBy}. ${type}. Intensiteit: ${intensity}.`,
    url: `https://geurbar.com/products/geurbar-parfum-${num(code)}`,
  })),
  ...ROOMSPRAYS.map(([code, inspiredBy, type, intensity, season, notes]) => ({
    code,
    name: `Geurbar Roomspray ${code}`,
    category: "roomspray",
    inspiredBy,
    type: `Roomspray · ${type}`,
    intensity,
    season,
    notes,
    occasions: "Ruimte, Sfeer",
    priceRegular: 24.95,
    priceSale: null,
    content: "200ml",
    description: `Geurbar Roomspray ${code} — geïnspireerd door ${inspiredBy}.`,
    url: `https://geurbar.com/products/geurbar-roomspray-${num(code)}`,
  })),
  ...CARSPRAYS.map(([code, inspiredBy, type, intensity, season, notes]) => ({
    code,
    name: `Geurbar Carspray ${code}`,
    category: "autoparfum",
    inspiredBy,
    type: `Carspray · ${type}`,
    intensity,
    season,
    notes,
    occasions: "Auto",
    priceRegular: 19.95,
    priceSale: null,
    content: "Autoparfum",
    description: `Geurbar Carspray ${code} — geïnspireerd door ${inspiredBy}.`,
    url: `https://geurbar.com/products/geurbar-carspray-${num(code)}`,
  })),
];

const SETTINGS = {
  brandName: "Geurbar",
  botName: "Geurmaatje",
  tagline: "Persoonlijke geuradviseur",
  teaser: "Klaar om een geurtje te kiezen? 😊",
  welcome:
    "Hoi! Ik ben Geurmaatje 🌸 Vertel me wat je lekker vindt of welk parfum je normaal draagt, dan zoek ik de perfecte Geurbar-geur voor je uit!",
  personality:
    "Je bent charmant, warm en enthousiast. Je geeft oprechte, creatieve complimenten en maakt klanten zelfverzekerd over hun keuze, zonder opdringerig of schreeuwerig te zijn.",
  // Knowledge base — the ONLY source the bot uses for policy/shipping answers.
  shopInfo: [
    "Gratis verzending vanaf €50 (binnen Nederland).",
    "Bestellingen worden binnen 24 uur op werkdagen verzonden; levertijd NL 1-3 werkdagen.",
    "14 dagen retourrecht op ongeopende, verzegelde producten.",
    "Mix & match korting: 2 geuren = 5% korting, 3 geuren = 10% korting.",
    "Parfums €34,95 (van €44,95), roomsprays €24,95 (200ml), autoparfum/carspray €19,95.",
    "Eau de Parfum blijft gemiddeld 6 tot 10 uur hangen.",
    "Contact: info@geurbar.nl · telefoon/WhatsApp 085 505 5440.",
    "Welkomstkortingscode: WELKOM10 voor 10% korting.",
  ].join("\n"),
  suggestions: [
    "Ik hou van zoete, langhoudende geuren",
    "Welke geur lijkt op mijn favoriete parfum?",
    "Wat is een goede geur voor dagelijks gebruik?",
    "Een frisse geur voor de zomer",
  ].join("|"),
  primaryColor: "#141414",
  accentColor: "#141414",
};

async function main() {
  console.log("🌱 Seeding Geurbar catalog...");

  for (const p of products) {
    await prisma.product.upsert({
      where: { code: p.code },
      create: p,
      update: p,
    });
  }
  console.log(`   ✓ ${products.length} products upserted`);

  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    });
  }
  console.log(`   ✓ ${Object.keys(SETTINGS).length} settings upserted`);

  const email = process.env.ADMIN_EMAIL || "admin@geurbar.nl";
  const password = process.env.ADMIN_PASSWORD || "geurbar123";
  const hash = await bcrypt.hash(password, 10);
  await prisma.adminUser.upsert({
    where: { email },
    create: { email, password: hash, name: "Geurbar Admin" },
    update: { password: hash },
  });
  console.log(`   ✓ admin user: ${email}`);

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
