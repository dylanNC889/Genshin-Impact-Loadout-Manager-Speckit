/**
 * Real-world basis for Genshin dishes whose in-game name is a fantasy/invented one (#9 refine).
 * A plain "<name> recipe" web search on these returns Genshin fan pages, not cooking recipes —
 * so we map the notable fantasy-named dishes to the actual dish they're modelled on, and search
 * for THAT instead. Many other dishes are already real names (Steak, Baklava, Biryani, Consommé,
 * Katsu Sandwich…) and need no mapping. Curated by hand; only confident entries are listed.
 *
 * Keys are the dish name with any surrounding quotes stripped (see lookupRealDish).
 */
export interface RealDish {
  /** The real-world dish to actually search for. */
  dish: string;
  /** Cuisine / origin, shown for context. */
  cuisine: string;
}

export const REAL_DISHES: Record<string, RealDish> = {
  // Liyue (Chinese cuisine)
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
  // Mondstadt (German / European)
  "Barbatos Ratatouille": { dish: "Ratatouille", cuisine: "French" },
  "Mondstadt Grilled Fish": { dish: "Grilled trout", cuisine: "German" },
  // Fontaine (French)
  "Fontainian Onion Soup": { dish: "French onion soup", cuisine: "French" },
  "Vessie Chicken": { dish: "Poulet en vessie", cuisine: "French" },
  "Fontainian Foie Gras": { dish: "Foie gras", cuisine: "French" },
  // Sumeru (Middle-Eastern / Indian)
  "Masala Cheese Balls": { dish: "Paneer pakora", cuisine: "Indian" },
  "Selva Salad": { dish: "Fattoush salad", cuisine: "Middle-Eastern" },
};

/** Strip surrounding straight/smart quotes a few dish names carry in-game. */
function cleanName(name: string): string {
  return name.replace(/^["'“”]+|["'“”]+$/g, "").trim();
}

/** Resolve the real-world dish for a food name (direct match, else via its base dish). */
export function lookupRealDish(name: string, baseDishName?: string): RealDish | undefined {
  return REAL_DISHES[cleanName(name)] ?? (baseDishName ? REAL_DISHES[cleanName(baseDishName)] : undefined);
}

/** Build a web-search URL that targets real cooking recipes, not Genshin fan pages. */
export function realRecipeSearchUrl(term: string): string {
  const q = `${term.replace(/\(.*?\)/g, "").trim()} recipe -genshin -"genshin impact"`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}
