// Einkaufs-Katalog mit Symbolen (wie bei Bring) und automatischer Symbolsuche für eigene Artikel
export const CATALOG = [
  ['Obst & Gemüse', [
    ['Äpfel', '🍎'], ['Bananen', '🍌'], ['Birnen', '🍐'], ['Orangen', '🍊'], ['Mandarinen', '🍊'], ['Zitronen', '🍋'], ['Limetten', '🍋‍🟩'],
    ['Trauben', '🍇'], ['Erdbeeren', '🍓'], ['Heidelbeeren', '🫐'], ['Himbeeren', '🍓'], ['Kirschen', '🍒'], ['Pfirsiche', '🍑'], ['Aprikosen', '🍑'],
    ['Melone', '🍈'], ['Wassermelone', '🍉'], ['Ananas', '🍍'], ['Mango', '🥭'], ['Kiwi', '🥝'], ['Kokosnuss', '🥥'], ['Granatapfel', '🍎'],
    ['Avocado', '🥑'], ['Tomaten', '🍅'], ['Cherrytomaten', '🍅'], ['Gurke', '🥒'], ['Zucchini', '🥒'], ['Paprika', '🫑'], ['Chili', '🌶️'],
    ['Karotten', '🥕'], ['Rüebli', '🥕'], ['Kartoffeln', '🥔'], ['Süsskartoffeln', '🍠'], ['Zwiebeln', '🧅'], ['Frühlingszwiebeln', '🧅'], ['Knoblauch', '🧄'],
    ['Ingwer', '🫚'], ['Salat', '🥬'], ['Rucola', '🥬'], ['Spinat', '🥬'], ['Kohl', '🥬'], ['Brokkoli', '🥦'], ['Blumenkohl', '🥦'],
    ['Pilze', '🍄'], ['Champignons', '🍄'], ['Mais', '🌽'], ['Erbsen', '🫛'], ['Bohnen', '🫘'], ['Aubergine', '🍆'], ['Lauch', '🥬'],
    ['Sellerie', '🥬'], ['Kürbis', '🎃'], ['Radieschen', '🌱'], ['Spargel', '🌱'], ['Fenchel', '🌱'], ['Oliven', '🫒'], ['Kräuter', '🌿'],
    ['Basilikum', '🌿'], ['Petersilie', '🌿'], ['Schnittlauch', '🌿'], ['Minze', '🌿'], ['Nüsse', '🥜'], ['Erdnüsse', '🥜'], ['Mandeln', '🌰'], ['Datteln', '🌴'],
  ]],
  ['Milch & Eier', [
    ['Milch', '🥛'], ['Hafermilch', '🥛'], ['Eier', '🥚'], ['Butter', '🧈'], ['Käse', '🧀'], ['Reibkäse', '🧀'], ['Mozzarella', '🧀'], ['Feta', '🧀'],
    ['Parmesan', '🧀'], ['Frischkäse', '🧀'], ['Raclettekäse', '🧀'], ['Fondue', '🫕'], ['Joghurt', '🥣'], ['Quark', '🥣'], ['Rahm', '🥛'],
    ['Sahne', '🥛'], ['Saure Sahne', '🥛'], ['Mascarpone', '🧀'], ['Tofu', '🧊'], ['Pudding', '🍮'],
  ]],
  ['Brot & Gebäck', [
    ['Brot', '🍞'], ['Toast', '🍞'], ['Zopf', '🥖'], ['Baguette', '🥖'], ['Brötchen', '🥯'], ['Gipfeli', '🥐'], ['Croissants', '🥐'],
    ['Brezel', '🥨'], ['Wraps', '🫓'], ['Pita', '🫓'], ['Knäckebrot', '🍘'], ['Kuchen', '🍰'], ['Muffins', '🧁'], ['Kekse', '🍪'],
  ]],
  ['Fleisch & Fisch', [
    ['Hähnchen', '🍗'], ['Poulet', '🍗'], ['Hackfleisch', '🥩'], ['Rindfleisch', '🥩'], ['Steak', '🥩'], ['Schweinefleisch', '🥓'], ['Speck', '🥓'],
    ['Schinken', '🥓'], ['Salami', '🍖'], ['Würstchen', '🌭'], ['Cervelat', '🌭'], ['Bratwurst', '🌭'], ['Aufschnitt', '🥪'], ['Lachs', '🐟'],
    ['Thunfisch', '🐟'], ['Fisch', '🐟'], ['Crevetten', '🦐'], ['Garnelen', '🦐'],
  ]],
  ['Vorrat', [
    ['Nudeln', '🍝'], ['Spaghetti', '🍝'], ['Reis', '🍚'], ['Couscous', '🍚'], ['Quinoa', '🍚'], ['Mehl', '🌾'], ['Zucker', '🍬'], ['Salz', '🧂'],
    ['Pfeffer', '🧂'], ['Gewürze', '🧂'], ['Olivenöl', '🫒'], ['Öl', '🫗'], ['Essig', '🫗'], ['Bouillon', '🍲'], ['Tomatensauce', '🥫'],
    ['Passata', '🥫'], ['Konserven', '🥫'], ['Kichererbsen', '🫘'], ['Linsen', '🫘'], ['Müsli', '🥣'], ['Haferflocken', '🥣'], ['Cornflakes', '🥣'],
    ['Honig', '🍯'], ['Konfitüre', '🍓'], ['Marmelade', '🍓'], ['Nutella', '🍫'], ['Erdnussbutter', '🥜'], ['Ketchup', '🍅'], ['Senf', '🌭'],
    ['Mayonnaise', '🥚'], ['Sojasauce', '🥢'], ['Backpulver', '🧁'], ['Hefe', '🍞'], ['Vanillezucker', '🍦'],
  ]],
  ['Snacks & Süsses', [
    ['Schokolade', '🍫'], ['Chips', '🥔'], ['Popcorn', '🍿'], ['Gummibärchen', '🍬'], ['Bonbons', '🍬'], ['Glace', '🍦'], ['Eis', '🍦'],
    ['Cracker', '🍘'], ['Riegel', '🍫'], ['Kaugummi', '🍬'],
  ]],
  ['Tiefkühl & Fertig', [
    ['Pizza', '🍕'], ['Pommes', '🍟'], ['Tiefkühlgemüse', '🥦'], ['Fischstäbchen', '🐟'], ['Lasagne', '🍝'], ['Suppe', '🍲'], ['Sushi', '🍣'], ['Burger', '🍔'],
  ]],
  ['Getränke', [
    ['Wasser', '💧'], ['Mineralwasser', '💧'], ['Saft', '🧃'], ['Orangensaft', '🧃'], ['Apfelsaft', '🧃'], ['Cola', '🥤'], ['Limonade', '🥤'],
    ['Eistee', '🧋'], ['Kaffee', '☕'], ['Kaffeekapseln', '☕'], ['Tee', '🫖'], ['Kakao', '☕'], ['Bier', '🍺'], ['Wein', '🍷'], ['Rotwein', '🍷'],
    ['Weisswein', '🥂'], ['Prosecco', '🍾'], ['Champagner', '🍾'], ['Gin', '🍸'], ['Tonic', '🥤'],
  ]],
  ['Haushalt', [
    ['Klopapier', '🧻'], ['Küchenpapier', '🧻'], ['Taschentücher', '🤧'], ['Spülmittel', '🧽'], ['Schwämme', '🧽'], ['Tabs Spülmaschine', '🍽️'],
    ['Müllbeutel', '🗑️'], ['Waschmittel', '🧺'], ['Weichspüler', '🧺'], ['Putzmittel', '🧴'], ['Alufolie', '🧻'], ['Frischhaltefolie', '🧻'],
    ['Backpapier', '📜'], ['Batterien', '🔋'], ['Glühbirne', '💡'], ['Kerzen', '🕯️'], ['Streichhölzer', '🔥'], ['Blumen', '💐'],
  ]],
  ['Drogerie', [
    ['Zahnpasta', '🪥'], ['Zahnbürste', '🪥'], ['Zahnseide', '🪥'], ['Duschgel', '🧴'], ['Shampoo', '🧴'], ['Spülung', '🧴'], ['Seife', '🧼'],
    ['Deo', '🧴'], ['Bodylotion', '🧴'], ['Sonnencreme', '🧴'], ['Rasierer', '🪒'], ['Wattepads', '⚪'], ['Wattestäbchen', '⚪'], ['Tampons', '🩸'],
    ['Binden', '🩸'], ['Pflaster', '🩹'], ['Medikamente', '💊'], ['Vitamine', '💊'], ['Kontaktlinsen', '👁️'], ['Haargummis', '🎀'],
  ]],
  ['Tier', [['Katzenfutter', '🐱'], ['Hundefutter', '🐶'], ['Katzenstreu', '🐈'], ['Leckerli', '🦴']]],
  ['Baby', [['Windeln', '👶'], ['Feuchttücher', '🧻'], ['Babybrei', '🍼']]],
];

// Stichwörter für selbst eingetippte Artikel (Teilwort genügt, z. B. „Bergkäse“ → Käse)
const KEYWORDS = [
  ['milch', '🥛'], ['käse', '🧀'], ['kaese', '🧀'], ['joghurt', '🥣'], ['jogurt', '🥣'], ['rahm', '🥛'], ['sahne', '🥛'], ['butter', '🧈'], ['ei', '🥚'],
  ['apfel', '🍎'], ['äpfel', '🍎'], ['birne', '🍐'], ['banane', '🍌'], ['beere', '🍓'], ['orange', '🍊'], ['zitrone', '🍋'], ['traube', '🍇'], ['melone', '🍈'],
  ['tomate', '🍅'], ['gurke', '🥒'], ['salat', '🥬'], ['kohl', '🥬'], ['kartoffel', '🥔'], ['zwiebel', '🧅'], ['karotte', '🥕'], ['rüebli', '🥕'],
  ['pilz', '🍄'], ['paprika', '🫑'], ['bohne', '🫘'], ['linse', '🫘'], ['nuss', '🥜'], ['kraut', '🌿'], ['kräuter', '🌿'],
  ['brot', '🍞'], ['brötchen', '🥯'], ['gipfeli', '🥐'], ['kuchen', '🍰'], ['torte', '🎂'], ['keks', '🍪'], ['guetzli', '🍪'],
  ['fleisch', '🥩'], ['steak', '🥩'], ['huhn', '🍗'], ['hähnchen', '🍗'], ['poulet', '🍗'], ['wurst', '🌭'], ['schinken', '🥓'], ['speck', '🥓'],
  ['fisch', '🐟'], ['lachs', '🐟'], ['thunfisch', '🐟'], ['crevette', '🦐'],
  ['nudel', '🍝'], ['pasta', '🍝'], ['spaghetti', '🍝'], ['reis', '🍚'], ['mehl', '🌾'], ['zucker', '🍬'], ['salz', '🧂'], ['gewürz', '🧂'], ['öl', '🫗'],
  ['sauce', '🥫'], ['soße', '🥫'], ['dose', '🥫'], ['suppe', '🍲'], ['müsli', '🥣'], ['flocken', '🥣'], ['honig', '🍯'], ['konfi', '🍓'],
  ['schoko', '🍫'], ['chips', '🥔'], ['glace', '🍦'], ['eis', '🍦'], ['bonbon', '🍬'], ['gummi', '🍬'], ['pizza', '🍕'], ['pommes', '🍟'],
  ['wasser', '💧'], ['saft', '🧃'], ['cola', '🥤'], ['limo', '🥤'], ['tee', '🫖'], ['kaffee', '☕'], ['bier', '🍺'], ['wein', '🍷'], ['sekt', '🍾'],
  ['papier', '🧻'], ['tücher', '🧻'], ['spül', '🧽'], ['schwamm', '🧽'], ['müll', '🗑️'], ['wasch', '🧺'], ['putz', '🧴'], ['reiniger', '🧴'],
  ['batterie', '🔋'], ['lampe', '💡'], ['birne', '💡'], ['kerze', '🕯️'], ['blume', '💐'],
  ['zahn', '🪥'], ['dusch', '🧴'], ['shampoo', '🧴'], ['seife', '🧼'], ['creme', '🧴'], ['deo', '🧴'], ['pflaster', '🩹'], ['tablette', '💊'], ['medi', '💊'],
  ['katze', '🐱'], ['hund', '🐶'], ['windel', '👶'], ['baby', '🍼'], ['geschenk', '🎁'],
];

export const ICON = {}, CATOF = {};
CATALOG.forEach(([c, items]) => items.forEach(([n, i]) => { ICON[n] = i; CATOF[n] = c; }));
const LOWER = Object.fromEntries(Object.entries(ICON).map(([n, i]) => [n.toLowerCase(), i]));

// Passendes Symbol für einen Artikelnamen (Katalog zuerst, dann Stichwort, sonst leer)
export function iconFor(name) {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return '';
  if (LOWER[n]) return LOWER[n];
  // längstes passendes Stichwort gewinnt, Wortende bevorzugt („Bergkäse“ → käse)
  let best = '', len = 0;
  for (const [k, i] of KEYWORDS) {
    if (k.length <= 2 ? new RegExp(`(^|\\s)${k}(\\s|$|er\\b)`).test(n) : n.includes(k)) {
      if (k.length > len) { best = i; len = k.length; }
    }
  }
  if (best) return best;
  for (const [k, i] of Object.entries(LOWER)) if (k.length > 3 && n.includes(k)) return i;
  return '';
}
