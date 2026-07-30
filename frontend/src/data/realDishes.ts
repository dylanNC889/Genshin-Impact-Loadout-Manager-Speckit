/**
 * Real-world basis for Genshin dishes (#9 refine). A plain "<name> recipe" web search on the
 * in-game name returns Genshin fan pages, not cooking recipes — so we resolve every dish to a
 * best-effort real-world dish + cuisine and search for THAT instead. Priority:
 *   1. curated REAL_DISHES entry (by name, then by the dish's base dish)
 *   2. a descriptive base dish (special dishes upgrade a normal one; often already real)
 *   3. the name with fantasy flair stripped ("Teyvat Fried Egg" -> "Fried Egg")
 * Cuisine is taken from the curated entry, else inferred by keyword. Mappings for invented
 * dishes are approximate by design — curated by hand.
 */
export interface RealDish {
  /** The real-world dish to search for. */
  dish: string;
  /** Cuisine / origin. */
  cuisine: string;
}

/** Keyed by the dish name with surrounding quotes stripped (see cleanName). */
export const REAL_DISHES: Record<string, RealDish> = {
  // --- Liyue (Chinese) ---
  "Adeptus' Temptation": { dish: "Buddha Jumps Over the Wall (fó tiào qiáng)", cuisine: "Chinese" },
  "Jueyun Guoba": { dish: "Guoba (crispy rice)", cuisine: "Chinese" },
  "Jueyun Chili Chicken": { dish: "Chongqing chili chicken (là zǐ jī)", cuisine: "Chinese" },
  "Mora Meat": { dish: "Red-braised pork belly (hóngshāo ròu)", cuisine: "Chinese" },
  "Qiankun Mora Meat": { dish: "Red-braised pork belly (hóngshāo ròu)", cuisine: "Chinese" },
  "Tianshu Meat": { dish: "Dongpo pork (dōngpō ròu)", cuisine: "Chinese" },
  "Qingce Stir Fry": { dish: "Stir-fried seasonal greens (qīng chǎo shí shū)", cuisine: "Chinese" },
  "Qingce Household Dish": { dish: "Home-style stir-fried vegetables", cuisine: "Chinese" },
  "Golden Shrimp Balls": { dish: "Fried shrimp balls", cuisine: "Chinese" },
  "Lotus Flower Crisp": { dish: "Lotus flower pastry (lián huā sū)", cuisine: "Chinese" },
  "Qingxin Flower Cake": { dish: "Rose flower cake (xiān huā bǐng)", cuisine: "Chinese (Yunnan)" },
  "Zhongyuan Chop Suey": { dish: "Chop suey", cuisine: "Chinese" },
  "Dragon Beard Noodles": { dish: "Dragon beard noodles (lóng xū miàn)", cuisine: "Chinese" },
  "Eight-Treasure Duck": { dish: "Eight-treasure duck (bā bǎo yā)", cuisine: "Chinese" },
  "Cloud-Shrouded Jade": { dish: "Winter melon and ham soup", cuisine: "Chinese" },
  "Sticky Honey Roast": { dish: "Honey-glazed roast ham", cuisine: "Chinese" },
  "Almond Tofu": { dish: "Almond tofu (xìng rén dòu fu)", cuisine: "Chinese" },
  "Jade Parcels": { dish: "Ham and vegetable steamed parcels", cuisine: "Chinese" },
  "Stone Harbor Delicacies": { dish: "Assorted braised platter (lǔ wèi)", cuisine: "Chinese" },
  "Jade Fruit Soup": { dish: "Winter melon soup", cuisine: "Chinese" },
  "Jadevein Tea Eggs": { dish: "Tea eggs (chá yè dàn)", cuisine: "Chinese" },
  "Jewelry Soup": { dish: "Assorted seafood soup", cuisine: "Chinese" },
  "Guhua Fish & Lamb Soup": { dish: "Fish and lamb soup (yú yáng xiān)", cuisine: "Chinese" },
  "Vegetarian Abalone": { dish: "Vegetarian mock abalone (mushroom)", cuisine: "Chinese" },
  "Bountiful Year": { dish: "Steamed whole fish (Chinese New Year)", cuisine: "Chinese" },
  "Come and Get It": { dish: "Mixed meat and vegetable stew", cuisine: "Chinese" },
  "Oncidium Tofu": { dish: "Braised tofu with ham", cuisine: "Chinese" },
  "Five Pickled Treasures": { dish: "Assorted pickled vegetables (pàocài)", cuisine: "Chinese" },
  "Fullmoon Egg": { dish: "Fried egg over rice", cuisine: "Chinese" },
  "Drunken Plums in Snow": { dish: "Sour plum drink (suān méi tāng)", cuisine: "Chinese" },
  "Crab Roe Tofu": { dish: "Crab roe tofu", cuisine: "Chinese" },
  "Braised Meat": { dish: "Red-braised pork", cuisine: "Chinese" },
  "Braised Meatball": { dish: "Braised lion's-head meatballs", cuisine: "Chinese" },
  // --- Mondstadt (German / European) ---
  "Barbatos Ratatouille": { dish: "Ratatouille", cuisine: "French" },
  "Mondstadt Grilled Fish": { dish: "Grilled trout", cuisine: "German" },
  "Pile 'Em Up": { dish: "Mixed grill skewers", cuisine: "German" },
  "Sunshine Sprat": { dish: "Fried sprats", cuisine: "German" },
  "Moon Pie": { dish: "Meat pie", cuisine: "German" },
  "Fireside Merriment": { dish: "Cheese fondue", cuisine: "Swiss" },
  "Northern Smoked Chicken": { dish: "Smoked chicken", cuisine: "German" },
  "Fisherman's Toast": { dish: "Open-faced fish toast", cuisine: "German" },
  "Drink 455": { dish: "Fruit mocktail", cuisine: "European" },
  // --- Fontaine (French) ---
  "Fontainian Onion Soup": { dish: "French onion soup", cuisine: "French" },
  "Vessie Chicken": { dish: "Poulet en vessie", cuisine: "French" },
  "Fontainian Foie Gras": { dish: "Foie gras", cuisine: "French" },
  "Fontaine Aspic": { dish: "Aspic", cuisine: "French" },
  "Fontinalia Mousse": { dish: "Chocolate mousse", cuisine: "French" },
  "La Lettre a Focalors": { dish: "Mille-feuille", cuisine: "French" },
  "Poissonchant Pie": { dish: "Fish pie", cuisine: "French" },
  "Roulette Special": { dish: "Assorted appetiser platter", cuisine: "French" },
  "The Palace Jewels": { dish: "Petit fours", cuisine: "French" },
  "Trembling Strings and Rushing Reeds": { dish: "Assorted hors d'oeuvres", cuisine: "French" },
  "Bulle Sauce Duck Breast": { dish: "Seared duck breast", cuisine: "French" },
  "Conch Madeleine": { dish: "Madeleines", cuisine: "French" },
  "Petit Gateau Debord: Revised Version": { dish: "Molten chocolate cake", cuisine: "French" },
  "Volcano Cake": { dish: "Chocolate lava cake", cuisine: "French" },
  "Blubber Profiterole": { dish: "Profiteroles", cuisine: "French" },
  // --- Sumeru (Middle-Eastern / South Asian) ---
  "Masala Cheese Balls": { dish: "Paneer pakora", cuisine: "Indian" },
  "Selva Salad": { dish: "Fattoush salad", cuisine: "Middle-Eastern" },
  "Aaru Mixed Rice": { dish: "Spiced mixed rice (kabsa)", cuisine: "Middle-Eastern" },
  "Padisarah Pudding": { dish: "Rose milk pudding", cuisine: "Middle-Eastern" },
  "Gilded Tajine": { dish: "Tagine", cuisine: "North African" },
  "Goldflame Tajine": { dish: "Tagine", cuisine: "North African" },
  "Mushroom Hodgepodge": { dish: "Mushroom stew", cuisine: "Middle-Eastern" },
  // --- Inazuma (Japanese) ---
  "Bathhouse Manjuu": { dish: "Manjū (steamed bun)", cuisine: "Japanese" },
  "Konda Cuisine": { dish: "Grilled fish and rice set", cuisine: "Japanese" },
  "Sakura Shrimp Crackers": { dish: "Sakura shrimp rice crackers", cuisine: "Japanese" },
  "Tri-Flavored Skewer": { dish: "Yakitori skewers", cuisine: "Japanese" },
  // --- Natlan (Latin American) ---
  "Grainfruit Wrap": { dish: "Corn wrap (arepa)", cuisine: "Latin American" },
  "Magmic Ode": { dish: "Spicy grilled meat", cuisine: "Latin American" },
  "Forest of Color": { dish: "Rainbow vegetable salad", cuisine: "Latin American" },
  "Blazed Meat Stew": { dish: "Spiced meat stew", cuisine: "Latin American" },
  "Sour Sauce Ceviche": { dish: "Ceviche", cuisine: "Latin American" },
  // --- Nod-Krai (Nordic) ---
  "Lakkaberry Pie": { dish: "Cloudberry pie", cuisine: "Nordic" },
  "Lakkaberry Krumkakes": { dish: "Krumkake", cuisine: "Nordic" },
  "Midsommar Torte": { dish: "Midsummer layer cake", cuisine: "Nordic" },
  "Nod-Krai Hot Dog": { dish: "Hot dog", cuisine: "American" },
  // --- Misc / generic ---
  "Meatnado": { dish: "Mixed meat skewers", cuisine: "various" },
  "Millhaven's Morning Plate": { dish: "Full breakfast plate", cuisine: "British" },
  "Imported Poultry": { dish: "Roast chicken", cuisine: "various" },
  "Harbor Fish Burger": { dish: "Fish burger", cuisine: "American" },
  "Thick-Cut Duelist's Burger": { dish: "Beef burger", cuisine: "American" },
  "Super Magnificent Pizza": { dish: "Pizza", cuisine: "Italian" },
  "Meat Lovers' Mushroom Pizza": { dish: "Mushroom pizza", cuisine: "Italian" },
  "Nine-Fruit Nectar": { dish: "Fruit punch", cuisine: "various" },
  "Rainbow Aster": { dish: "Herbal fruit tea", cuisine: "various" },
  "Mushroom Phantasm": { dish: "Wild mushroom medley", cuisine: "various" },
  "Potato Boat": { dish: "Loaded baked potato", cuisine: "American" },
  "Right at Home": { dish: "Home-style set meal", cuisine: "various" },
  "More-and-More": { dish: "Assorted snack platter", cuisine: "various" },
  "Feast-O's": { dish: "Breakfast cereal", cuisine: "American" },
  "Fruits of the Festival": { dish: "Fruit platter", cuisine: "various" },
};

/** Keyword -> cuisine, for dishes not in REAL_DISHES (used to still show an origin). */
const CUISINE_KEYWORDS: [RegExp, string][] = [
  [/sakura|udon|yakisoba|chazuke|tempura|mochi|onigiri|katsu|sushi|sashimi|manjuu|kourayaki|sangayaki|wakatakeni|omurice/i, "Japanese"],
  [/guoba|tofu|chop suey|spring roll|jueyun|qingce|lotus|jade|zhongyuan|dragon beard|eight-treasure|guhua|tianshu|mora meat|braised|stir-fried|dim sum|wonton/i, "Chinese"],
  [/consomm|crepe|madeleine|fricassee|foie gras|aspic|mousse|baguette|croissant|boudin|tripes|tomates|gateau|macaron|profiterole|bisque|poisson|narbonnaises/i, "French"],
  [/tandoori|masala|biryani|panipuri|fatteh|shawarma|baklava|tulumba|halva|kabsa|samosa|paneer|naan|tajine|padisarah|selva/i, "Middle-Eastern"],
  [/xocoatl|tatacos|ceviche|arepa|tamale/i, "Latin American"],
  [/krumkake|lakkaberry|cloudberry|smoked/i, "Nordic"],
  [/pizza/i, "Italian"],
  [/goulash|haggis|cassoulet|schnitzel/i, "European"],
  [/steak|burger|fish and chips|sandwich|hot dog|cornbread|bbq|hash brown/i, "Western"],
];

function inferCuisine(name: string): string {
  for (const [rx, cuisine] of CUISINE_KEYWORDS) if (rx.test(name)) return cuisine;
  return "";
}

/** Strip surrounding quotes some dish names carry in-game. */
function cleanName(name: string): string {
  return name.replace(/^["'“”]+|["'“”]+$/g, "").trim();
}

/** Remove fantasy/region flair so a descriptive core remains ("Teyvat Fried Egg" -> "Fried Egg"). */
function stripFlair(name: string): string {
  return cleanName(name)
    .replace(/\s*\([^)]*\)\s*/g, " ") // drop "(For One)", "(V.593)", "(Trial Version)"…
    .replace(/^(Teyvat|Mondstadt|Liyue|Inazuman?|Fontainian?|Sumeru|Natlan|Snezhnayan?|Nod-Krai)\s+/i, "")
    .replace(/[!?.]+$/g, "")
    .trim();
}

export interface ResolvedDish extends RealDish {
  /** True when we mapped/stripped to something other than the dish's own name. */
  mapped: boolean;
}

/** Best-effort real-world dish + cuisine for a food (always returns something). */
export function resolveRealDish(name: string, baseDishName?: string): ResolvedDish {
  const own = cleanName(name);
  // 1. curated by name
  const direct = REAL_DISHES[own];
  if (direct) return { ...direct, mapped: true };
  // 2. via the base dish (special dishes upgrade a normal one)
  if (baseDishName) {
    const base = cleanName(baseDishName);
    const curatedBase = REAL_DISHES[base];
    if (curatedBase) return { ...curatedBase, mapped: true };
    const strippedBase = stripFlair(base);
    return { dish: strippedBase, cuisine: inferCuisine(base), mapped: strippedBase.toLowerCase() !== own.toLowerCase() };
  }
  // 3. the name itself, flair stripped
  const stripped = stripFlair(name);
  return { dish: stripped, cuisine: inferCuisine(own), mapped: stripped.toLowerCase() !== own.toLowerCase() };
}

/** A web-search URL that targets real cooking recipes, not Genshin fan pages. */
export function realRecipeSearchUrl(term: string): string {
  const q = `${term.replace(/\(.*?\)/g, "").trim()} recipe -genshin -"genshin impact"`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}
