// Content for the public, crawlable pages: the landing page, city hubs, cuisine hubs and
// city × cuisine pages. Everything here is hand-written so each page says something only it
// can say; the page templates add structure, links and schema around it. Client-safe.

export const SITE = {
  name: "TabeDog",
  url: process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://tabedog.com",
  tagline: "Tabelog in English, on a map",
  description:
    "TabeDog puts Tabelog's restaurant ratings, the scores Japanese locals trust, on an English map. Find authentic Japanese restaurants near you, with hours, prices and payment methods in English.",
  premiumYen: 500,
} as const;

export type Cuisine = {
  slug: string;
  name: string;
  ja: string;
  code: string; // genre slug the app understands (lib/genres.ts)
  tagline: string;
  intro: string;
  order: string;
  lunch: string;
  dinner: string;
  score: string;
  reservation: string;
  english: string;
  lateNight: boolean;
  longtail: string[];
};

export type CityCuisine = {
  cuisine: string; // Cuisine.slug
  blurb: string;
  areas: string[];
  longtail: string[];
};

export type City = {
  slug: string;
  name: string;
  ja: string;
  region: string;
  tabelogArea: string; // Tabelog's area path for this city's rankings, e.g. "kyoto/A2601" (city, not prefecture)
  center: { lat: number; lng: number }; // where "open on the map" drops you
  intro: string;
  tabelog: string;
  nightlife: string;
  areas: { name: string; note: string }[];
  dishes: { name: string; note: string; cuisine: string }[];
  cuisines: CityCuisine[];
};

export const CUISINES: Cuisine[] = [
  {
    slug: "ramen", name: "Ramen", ja: "ラーメン", code: "ramen",
    tagline: "Tonkotsu, shoyu, miso and tsukemen, ranked by the people who eat it daily",
    intro: "Ramen is the one cuisine where Tabelog's ratings matter most. Japan has over 30,000 ramen shops and the difference between a 3.2 and a 3.7 is the difference between a forgettable bowl and a line around the block. Every region has its own style: pork-bone tonkotsu in Fukuoka, miso in Sapporo, clear shoyu in Tokyo, thick tsukemen dipping noodles everywhere. Most shops are tiny counters that seat ten people, cash only, with a ticket machine by the door.",
    order: "Buy a ticket from the vending machine before you sit down (most have photos, some now have English). Hand the ticket to the staff and say nothing else unless asked about noodle firmness (katame is firm, futsu is normal). Eat fast, slurp, and leave; lingering at a ramen counter is rude when people are waiting outside.",
    lunch: "¥900 to ¥1,300", dinner: "¥1,000 to ¥1,800",
    score: "A ramen shop above 3.5 on Tabelog is genuinely excellent and will have a queue. Above 3.7 is a destination shop; above 3.9 is nationally famous. Anything above 3.3 is a safe, good bowl.",
    reservation: "Ramen shops do not take reservations. Arrive before 11:30 for lunch or after 14:00 to skip the longest lines; many shops close when the soup runs out.",
    english: "Ticket machines increasingly have English, and the choice is usually just soup type, noodle size and toppings, so ordering without Japanese is easy.",
    lateNight: true,
    longtail: ["late night ramen", "tonkotsu vs shoyu vs miso", "ramen ticket machine how to order", "best tsukemen"],
  },
  {
    slug: "sushi", name: "Sushi", ja: "寿司", code: "sushi",
    tagline: "From ¥1,500 kaiten counters to ¥40,000 omakase, with the ratings locals book by",
    intro: "Sushi in Japan runs from conveyor-belt chains to twenty-seat omakase counters that are booked months ahead, and Tabelog is where Japanese diners sort out which is which. The scores separate the tourist-facing places near stations from the counters chefs eat at on their days off. Edomae-style nigiri (aged, cured and brushed with soy by the chef) is the Tokyo standard; coastal cities like Kanazawa and Sapporo win on raw freshness and price.",
    order: "At a counter, order omakase (chef's choice) and let the chef set the pace. Eat each piece in one bite as it is served, fish side down if you dip; most good chefs season the fish already so you should not add soy. Do not ask for extra wasabi or rub chopsticks together. At kaiten (conveyor) shops, grab plates or order from the tablet.",
    lunch: "¥1,500 to ¥5,000 (lunch omakase is the best value in Japan)", dinner: "¥8,000 to ¥40,000 at a counter",
    score: "Sushi is the most competitive category on Tabelog. A 3.5 sushi counter is excellent; 3.8 and above are the places with months-long waiting lists. For kaiten sushi, 3.3 is already very good.",
    reservation: "High-end counters require a reservation, often only by phone in Japanese or through a hotel concierge. Mid-range counters and all kaiten shops take walk-ins. Lunch is far easier to book than dinner.",
    english: "Omakase needs no menu at all, which makes it the easiest high-end meal in Japan to order without Japanese. Kaiten chains have multilingual tablets.",
    lateNight: false,
    longtail: ["omakase price", "lunch omakase", "conveyor belt sushi", "sushi near fish market", "sushi etiquette"],
  },
  {
    slug: "yakiniku", name: "Yakiniku", ja: "焼肉", code: "yakiniku",
    tagline: "Japanese BBQ: grill wagyu at your table and pay a third of what a steakhouse charges",
    intro: "Yakiniku is Japanese barbecue: you grill thin cuts of beef over charcoal or gas at your own table and dip them in tare sauce. It is the best way to eat wagyu without the steakhouse markup, and the cuts are the point: harami (skirt), kalbi (short rib), tan (tongue) and offal (horumon) that never appear on Western menus. Tabelog scores here track meat quality and sourcing more than service.",
    order: "Order a few cuts at a time, grill them yourself (tongue first, fatty cuts last), and dip in the tare or salt and lemon. Rice, kimchi and a salad round it out. Set courses (kōsu) are easiest for first-timers. Shirts will smell of smoke afterward; many places give you a bag for your coat.",
    lunch: "¥1,200 to ¥2,500 for a lunch set", dinner: "¥4,000 to ¥10,000 per person",
    score: "A yakiniku restaurant above 3.5 is sourcing serious wagyu. Chains sit around 3.0 to 3.2 and are fine for a cheap night. Above 3.7 you are at a place that buys whole A5 carcasses.",
    reservation: "Popular yakiniku restaurants fill up on weekends; reserve for dinner groups of four or more. Lunch is walk-in.",
    english: "Cut names are mostly loanwords, so a photo menu plus the words kalbi, harami and tan gets you everything you need.",
    lateNight: true,
    longtail: ["wagyu yakiniku price", "all you can eat yakiniku", "horumon offal", "yakiniku vs korean bbq"],
  },
  {
    slug: "izakaya", name: "Izakaya", ja: "居酒屋", code: "izakaya",
    tagline: "Japan's pubs: small plates, beer, sake and the loudest, friendliest rooms in the country",
    intro: "An izakaya is where Japan actually eats after work: a tavern serving small plates (sashimi, karaage, grilled fish, pickles, tofu) alongside beer, sake, shochu and highballs. The best ones are neighborhood institutions with handwritten menus and a counter where the owner cooks in front of you. Tabelog ratings are the only reliable way to separate these from the chain izakaya that cluster around every station with touts outside.",
    order: "You will be charged a small seating fee (otoshi, ¥300 to ¥600) that comes with a tiny starter; this is normal, not a scam. Order drinks first, then food in rounds. Point at what other tables are having. Pay at the end; tipping does not exist.",
    lunch: "Most are dinner only; lunch sets where offered are ¥900 to ¥1,500", dinner: "¥3,000 to ¥6,000 with drinks",
    score: "Izakaya scores run lower than other categories because the format is casual. 3.4 is already a very good neighborhood izakaya; 3.6 and above means the food is restaurant quality.",
    reservation: "Reserve for groups of four or more on Friday and Saturday. Counter seats for one or two are usually walk-in.",
    english: "Izakaya are the hardest category to navigate without Japanese because menus are handwritten and seasonal. TabeDog shows the hours, price band and payment methods so you at least know what you are walking into, and most owners will happily point at the fridge.",
    lateNight: true,
    longtail: ["izakaya otoshi cover charge", "standing bar tachinomi", "izakaya etiquette", "non-smoking izakaya"],
  },
  {
    slug: "yakitori", name: "Yakitori", ja: "焼き鳥", code: "yakitori",
    tagline: "Grilled chicken skewers over binchotan charcoal, from ¥150 a stick to tasting-menu counters",
    intro: "Yakitori is chicken grilled on skewers over white binchotan charcoal, and good shops use every part of the bird: thigh, skin, cartilage, heart, liver, tail. Street-level yakitori under the train tracks costs ¥150 a skewer; the top Tabelog-ranked counters serve omakase courses of fifteen skewers with wine pairings for ¥10,000. Both are worth doing.",
    order: "Choose shio (salt) or tare (sweet soy glaze) per skewer. Momo (thigh), negima (thigh and leek), tsukune (meatball) and kawa (skin) are the classics; reba (liver) and hatsu (heart) are the reason regulars come back. Order a few skewers at a time with a beer or highball.",
    lunch: "Rarely open at lunch", dinner: "¥2,500 to ¥5,000 casual, ¥8,000 to ¥15,000 for omakase counters",
    score: "A yakitori shop at 3.5 is sourcing named-breed chicken and grilling over charcoal. 3.7 and up are the famous counters with waiting lists.",
    reservation: "Omakase yakitori counters require reservations. Casual places are walk-in, though the good ones fill by 19:00.",
    english: "Skewer names are short and consistent across Japan, so a quick glance at a list of ten words covers almost any menu.",
    lateNight: true,
    longtail: ["yakitori under the tracks", "omakase yakitori", "yakitori shio or tare", "binchotan charcoal"],
  },
  {
    slug: "tempura", name: "Tempura", ja: "天ぷら", code: "tempura",
    tagline: "Light, crisp and fried one piece at a time at the counter, not the greasy version you know",
    intro: "Real tempura is nothing like the heavy fried food served under that name abroad. At a proper counter the chef fries each piece of seafood or vegetable to order in a thin, almost transparent batter and places it in front of you within seconds. Tokyo's old districts of Asakusa and Nihonbashi are the traditional home of tempura, and Tabelog's top-rated counters there are some of the hardest reservations in the city.",
    order: "Lunch tendon (tempura over rice) is the entry point and costs a fraction of dinner. At a counter, order the course and eat each piece immediately with salt or tentsuyu dipping sauce and grated daikon. Shrimp comes first, then fish, then vegetables, ending with kakiage (a fritter) over rice or in tea.",
    lunch: "¥1,200 to ¥3,000 for tendon or a lunch course", dinner: "¥8,000 to ¥25,000 at a counter",
    score: "Tempura counters above 3.6 are serious; above 3.8 are the handful of nationally known masters. For tendon shops, 3.4 is excellent.",
    reservation: "Counter dinners require reservations. Tendon shops are walk-in and will have lunchtime queues.",
    english: "The course format means no menu decisions; just say you would like the course and whether you prefer salt or sauce.",
    lateNight: false,
    longtail: ["tendon tempura rice bowl", "tempura course price", "tempura counter asakusa"],
  },
  {
    slug: "tonkatsu", name: "Tonkatsu", ja: "とんかつ", code: "tonkatsu",
    tagline: "Breaded pork cutlet, the most satisfying ¥1,500 lunch in Japan",
    intro: "Tonkatsu is a thick pork cutlet breaded in panko and fried, served with shredded cabbage, miso soup and rice, usually with free refills of both cabbage and rice. The top Tabelog shops use named-breed pork and fry at low temperature so the cutlet is pink inside and the crust shatters. It is filling, cheap by Japanese standards, and one of the easiest meals to order without any Japanese.",
    order: "Choose rosu (loin, fattier) or hire (fillet, lean) and a size. Grind the sesame seeds in your mortar, add the thick tonkatsu sauce, and dip. Ask for refills of cabbage (kyabetsu okawari) and rice. Miso katsu is the Nagoya version with a sweet red-miso sauce.",
    lunch: "¥1,200 to ¥2,200", dinner: "¥1,800 to ¥4,000",
    score: "Tonkatsu shops above 3.5 are destination level, with brand pork and an hour-long lunch queue. 3.3 and above is a reliably excellent lunch.",
    reservation: "Almost all tonkatsu shops are walk-in only. Queue before opening for the famous ones.",
    english: "Menus are short and the choice is loin or fillet; many shops have plastic food models in the window you can point at.",
    lateNight: false,
    longtail: ["rosu vs hire tonkatsu", "miso katsu nagoya", "tonkatsu with free refills"],
  },
  {
    slug: "soba", name: "Soba", ja: "蕎麦", code: "soba",
    tagline: "Hand-cut buckwheat noodles, cold with dipping sauce, in the oldest shops in Japan",
    intro: "Soba are thin buckwheat noodles, served cold on a bamboo tray with a soy dipping sauce (zaru soba) or hot in broth. Serious soba shops mill their own buckwheat and cut the noodles by hand each morning, and the best are often centuries-old family businesses. Tabelog is especially useful here because the gap between hand-made and factory soba is enormous but invisible from outside.",
    order: "Zaru or mori soba (cold) shows the noodle best. Dip only the bottom third in the sauce, slurp, and at the end pour the hot cooking water (sobayu) the staff bring you into the leftover sauce and drink it. Tempura soba and duck soba (kamo seiro) are the classic upgrades.",
    lunch: "¥900 to ¥1,800", dinner: "¥1,500 to ¥4,000 at shops that also serve sake and small plates",
    score: "Soba shops above 3.5 are hand-cutting with care. The old Tokyo soba houses sit around 3.5 to 3.7 and are worth a visit for the buildings alone.",
    reservation: "Walk-in. Lunch queues at famous shops move quickly because soba is eaten fast.",
    english: "The menu is short: cold or hot, with or without tempura. Pointing at zaru soba is enough.",
    lateNight: false,
    longtail: ["zaru soba vs kake soba", "soba with sobayu", "oldest soba shop tokyo", "soba and sake"],
  },
  {
    slug: "udon", name: "Udon", ja: "うどん", code: "udon",
    tagline: "Thick, chewy wheat noodles in light broth, and the cheapest great meal in Japan",
    intro: "Udon are thick wheat noodles with a chewy bite, served in a light dashi broth or cold with dipping sauce. It is the most regional noodle in Japan: Sanuki udon from Kagawa is springy and firm, Hakata udon in Fukuoka is deliberately soft, Osaka's kitsune udon comes topped with sweet fried tofu, and Nagoya's miso nikomi udon is simmered in a clay pot of red miso. Good udon costs under ¥1,000 almost everywhere.",
    order: "Pick hot (kake) or cold (zaru or bukkake), then toppings: kitsune (fried tofu), tempura, egg, or niku (beef). Many self-service shops have you pick tempura pieces from a counter and pay at the end. Slurping is expected.",
    lunch: "¥500 to ¥1,000", dinner: "¥800 to ¥1,500",
    score: "Udon scores cluster around 3.2 to 3.5 and even a 3.3 is very good. Above 3.6 is rare and marks a shop worth a detour.",
    reservation: "Never. Walk in.",
    english: "Self-service udon shops are among the easiest places to eat in Japan: you see everything before you pay.",
    lateNight: false,
    longtail: ["sanuki udon", "kitsune udon osaka", "self service udon", "udon vs soba"],
  },
  {
    slug: "unagi", name: "Unagi", ja: "鰻", code: "unagi",
    tagline: "Charcoal-grilled eel glazed in sweet soy, the meal Japanese people save up for",
    intro: "Unagi is freshwater eel, split, steamed (in the Tokyo style) or grilled directly (in the Kansai style), glazed with a sweet soy tare and served over rice. It is expensive because wild eel is scarce, and it is treated as a special-occasion meal. The famous Tabelog unagi houses have been grilling for a century or more, and the scores reflect how well a shop handles the fire more than anything else.",
    order: "Una-ju is eel over rice in a lacquered box, sized by how much eel you get. Hitsumabushi, the Nagoya style, is eaten three ways: plain, with condiments, then with dashi poured over. Shiroyaki (unglazed) with wasabi shows the quality of the eel itself. Sprinkle sansho pepper on top.",
    lunch: "¥3,000 to ¥5,000", dinner: "¥4,000 to ¥8,000",
    score: "Unagi houses above 3.6 are the historic names. 3.4 and above is reliably excellent; below 3.2 may be using imported frozen eel.",
    reservation: "The famous houses take reservations and you should use them. Expect 30 to 40 minutes between ordering and eating at good shops because eel is grilled to order.",
    english: "Menus are usually just two or three sizes of una-ju, so ordering is easy; the word una-ju alone works.",
    lateNight: false,
    longtail: ["hitsumabushi nagoya", "una-ju vs una-don", "unagi price", "shiroyaki"],
  },
  {
    slug: "kaiseki", name: "Kaiseki", ja: "懐石・会席", code: "washoku",
    tagline: "Japan's multi-course haute cuisine, and the most important Tabelog category outside Tokyo",
    intro: "Kaiseki is the seasonal multi-course meal at the top of Japanese cuisine: a dozen small courses of sashimi, simmered dishes, grilled fish and rice that follow strict seasonal rules and are served in rooms that are works of art themselves. Kyoto is its home, and the Tabelog 'Japanese cuisine' (washoku) ranking is effectively the kaiseki ranking. These are the restaurants where a 4.0 score means one of the best meals in the world.",
    order: "There is no ordering: you book a course at a price point, and the restaurant decides the menu by season. Lunch courses at the same restaurants cost a third to half of dinner and are the smart way to try the famous houses. Dress neatly; tatami rooms mean removing shoes.",
    lunch: "¥5,000 to ¥15,000", dinner: "¥15,000 to ¥50,000",
    score: "Kaiseki scores are the highest on Tabelog. 3.7 and above are the top tier, and 4.0+ restaurants are the ones listed in the Tabelog Award each year. 3.5 is still an exceptional meal.",
    reservation: "Always, often weeks or months ahead. Many accept bookings through hotel concierges or Tabelog's English reservation page; some do not take first-time guests without an introduction.",
    english: "Because the course is fixed, you need no Japanese to eat; tell them about allergies when booking. Staff at the famous houses are used to international guests.",
    lateNight: false,
    longtail: ["kaiseki lunch price", "kaiseki vs omakase", "kyoto kaiseki reservation", "tabelog award restaurants"],
  },
  {
    slug: "okonomiyaki", name: "Okonomiyaki", ja: "お好み焼き", code: "okonomiyaki",
    tagline: "The savory cabbage pancake that Osaka and Hiroshima both claim, cooked on the griddle in front of you",
    intro: "Okonomiyaki is a griddled pancake of batter, cabbage and your choice of pork, seafood or cheese, topped with a sweet brown sauce, mayonnaise, bonito flakes and seaweed. Osaka mixes everything into the batter; Hiroshima layers it with a mound of noodles and a fried egg. Both cities take it seriously enough that Tabelog scores separate the beloved family shops from the tourist-strip griddles.",
    order: "Pick your main filling (buta for pork, ika for squid, mix for both). In Osaka many shops let you cook it yourself; in Hiroshima the chef cooks it at the counter and you eat it off the griddle with a small spatula. Add sauce and mayo to taste. Modan-yaki is the Osaka version with noodles inside.",
    lunch: "¥800 to ¥1,300", dinner: "¥1,200 to ¥2,500 with drinks",
    score: "Okonomiyaki scores run modest; a 3.4 is a very good shop and 3.6 is as high as the category goes. Prioritize the ones locals rate over the ones on the main tourist streets.",
    reservation: "Walk-in. Counter shops in Hiroshima fill at dinner so arrive early.",
    english: "Most okonomiyaki shops in Osaka and Hiroshima have photo menus because the dish is so popular with visitors.",
    lateNight: true,
    longtail: ["osaka vs hiroshima okonomiyaki", "okonomimura hiroshima", "modan-yaki", "cook your own okonomiyaki"],
  },
  {
    slug: "kushikatsu", name: "Kushikatsu", ja: "串カツ", code: "kushiage",
    tagline: "Deep-fried skewers of everything, ¥150 each, with one rule: no double dipping",
    intro: "Kushikatsu are bite-sized skewers of meat, seafood and vegetables, breaded and deep-fried, dipped in a communal pot of thin Worcestershire-style sauce. It is Osaka's working-class dish, born in the Shinsekai district, and the only rule is never dip a skewer twice. High-end kushiage counters in Tokyo and Osaka turn the same idea into a ¥10,000 omakase of thirty refined skewers.",
    order: "Order skewers by the handful (beef, shrimp, lotus root, quail egg, cheese are the classics) and a beer. Dip once. Use the free cabbage to scoop more sauce if you want it. Stop when you are full and pay by the number of sticks.",
    lunch: "¥1,000 to ¥1,800", dinner: "¥2,000 to ¥3,500 casual, ¥8,000+ for omakase kushiage",
    score: "Casual kushikatsu shops rarely exceed 3.5; a 3.3 to 3.4 in Shinsekai is a great evening. Omakase kushiage counters above 3.6 are a genuine fine-dining experience.",
    reservation: "Casual: walk-in. Omakase counters: reserve.",
    english: "Skewers are displayed or photographed on menus, and the sauce rule is posted in English in every tourist-facing shop.",
    lateNight: true,
    longtail: ["kushikatsu shinsekai", "no double dipping rule", "kushiage omakase"],
  },
  {
    slug: "seafood", name: "Seafood", ja: "海鮮", code: "seafood",
    tagline: "Kaisendon rice bowls, crab, oysters and sea urchin from the morning markets",
    intro: "Japan's coastal cities each have a market district where you eat seafood that was swimming that morning: kaisendon (sashimi over rice) in Kanazawa and Sapporo, oysters in Hiroshima, crab in Hokkaido, nodoguro (blackthroat seaperch) on the Sea of Japan coast. Tabelog is essential here because the stalls nearest the market entrance are often the worst value and the best places are a few streets away.",
    order: "Kaisendon is the simplest order: a bowl with whatever is best that day. At market stalls you pay per item. For crab, check whether the price is per 100 g before ordering. Oyster bars in Hiroshima sell by the piece, grilled or raw.",
    lunch: "¥1,500 to ¥4,000 for a kaisendon", dinner: "¥5,000 to ¥15,000 for crab or a seafood course",
    score: "Market-area seafood shops are rated harshly by locals who know the real prices; a 3.4 near a market is a strong recommendation and 3.6 is exceptional.",
    reservation: "Market shops: walk-in, early. Crab and course restaurants: reserve.",
    english: "Fish names are the hardest vocabulary in Japanese food, but kaisendon makes the decision for you.",
    lateNight: false,
    longtail: ["kaisendon price", "best seafood market", "hokkaido crab", "uni sea urchin bowl"],
  },
  {
    slug: "curry", name: "Japanese curry", ja: "カレー", code: "curry",
    tagline: "Thick, mild and comforting: the curry Japan eats more than sushi, plus Sapporo's soup curry",
    intro: "Japanese curry is thick, mildly sweet and served over rice with a pork cutlet or fried shrimp on top; it is eaten more often than almost any other dish in the country. The cult scene is spice curry in Osaka and Tokyo's Shimokitazawa, where small shops build complex, aromatic plates with multiple curries on one dish. Sapporo has its own invention, soup curry: a thin, spiced broth with large roasted vegetables and chicken on the bone.",
    order: "Pick a topping (katsu is the classic) and a spice level; many shops go from 1 to 10 and 3 is already hot for most visitors. Soup curry shops have you choose a protein, a spice level and the amount of rice. Pay at the counter at casual places.",
    lunch: "¥800 to ¥1,500", dinner: "¥1,000 to ¥2,000",
    score: "Curry shops at 3.5 and above are in the national top tier, often with lines. 3.3 is a reliably excellent plate; chains sit near 3.0.",
    reservation: "Walk-in only.",
    english: "Curry shops are one of the easiest categories: menus are short and most have photos; spice levels are numbered.",
    lateNight: false,
    longtail: ["soup curry sapporo", "spice curry osaka", "katsu curry", "curry spice level"],
  },
  {
    slug: "kissaten", name: "Kissaten & cafes", ja: "喫茶店・カフェ", code: "kissaten",
    tagline: "Retro coffee houses with velvet seats, thick toast, pudding and the best breakfasts in Japan",
    intro: "A kissaten is a Showa-era coffee house: wood panelling, velvet banquettes, siphon or hand-drip coffee, and a food menu of thick-cut toast, egg sandwiches, Napolitan spaghetti and hard-set pudding. They are where Japan does breakfast and where older locals spend hours. Tabelog's cafe category also covers the modern specialty coffee scene, and the scores do a good job separating atmosphere-only places from ones with real coffee.",
    order: "Order a blend coffee and the morning set (toast, egg, salad) before 11:00 for the best value. Napolitan, pudding (purin) and cream soda are the classic kissaten orders. Many allow long stays; some older ones still allow smoking, so check the listing.",
    lunch: "¥500 to ¥1,200 for coffee and a set", dinner: "Most close by evening",
    score: "Cafe scores are compressed; 3.4 and above is a notable kissaten and 3.6+ is a nationally known one worth planning around.",
    reservation: "Walk-in. Famous kissaten have morning queues on weekends.",
    english: "Point at the morning set on the photo menu. Coffee vocabulary is nearly all loanwords.",
    lateNight: false,
    longtail: ["kissaten morning set", "nagoya morning service", "retro cafe", "japanese pudding purin", "non smoking kissaten"],
  },
  {
    slug: "chinese", name: "Chinese", ja: "中華", code: "chinese",
    tagline: "Japan's own Chinese food: Yokohama Chinatown, Kobe dumplings and the gyoza and mapo tofu locals crave",
    intro: "Chinese food in Japan is its own cuisine, adapted over a century: lighter, less oily, built around ramen's cousins and dishes like mapo tofu, gyoza, fried rice and tenshinhan. Yokohama's Chinatown is the largest in Japan and Kobe's Nankinmachi the second, and in both the Tabelog rankings are the only way to pick the few great kitchens out of hundreds of near-identical storefronts. Town Chinese (machi-chuka) diners are a beloved budget genre of their own.",
    order: "Lunch sets with a main, rice, soup and a small side are the best value. At Chinatown restaurants, share dishes family style. In machi-chuka diners order a ramen plus a half portion of fried rice or a plate of gyoza.",
    lunch: "¥900 to ¥1,500", dinner: "¥2,500 to ¥6,000 shared, more for Cantonese tasting menus",
    score: "Chinatown restaurants are rated very harshly; 3.5 there is a top-tier kitchen. Machi-chuka at 3.4 and above have lines of locals.",
    reservation: "Reserve for banquet-style dinners; everything else is walk-in.",
    english: "Chinatown menus are usually in Japanese, Chinese and English; machi-chuka diners rely on photo menus.",
    lateNight: true,
    longtail: ["yokohama chinatown best restaurant", "machi chuka", "gyoza and beer", "mapo tofu japan"],
  },
  {
    slug: "steak", name: "Wagyu & teppanyaki", ja: "ステーキ・鉄板焼き", code: "steak",
    tagline: "Kobe beef, Matsusaka and Omi wagyu, seared on an iron plate by a chef in front of you",
    intro: "Teppanyaki is the Japanese steakhouse: a chef cooks wagyu on an iron griddle in front of you, cut by cut, with garlic chips, vegetables and garlic rice to finish. Kobe is the home of the format and of the most famous beef brand on earth, but Matsusaka, Omi, Hida and Miyazaki wagyu are rated just as highly by Japanese diners. Tabelog's steak ranking is where you confirm a restaurant is serving certified beef rather than trading on a name.",
    order: "Courses are sold by cut (sirloin or fillet) and weight, with 100 to 150 g being plenty for A5 wagyu because it is so rich. Rare to medium-rare is standard. Lunch courses are roughly half the dinner price for the same beef.",
    lunch: "¥4,000 to ¥10,000", dinner: "¥12,000 to ¥40,000",
    score: "Steak and teppanyaki restaurants above 3.6 are the real thing. Certified Kobe beef restaurants display a bronze statue and a certificate with the animal's ID number; TabeDog links to the Tabelog listing so you can check.",
    reservation: "Reserve for dinner; lunch counters sometimes take walk-ins on weekdays.",
    english: "Teppanyaki restaurants in Kobe, Tokyo and Osaka are the most English-ready category in Japan because of their international clientele.",
    lateNight: false,
    longtail: ["kobe beef price", "a5 wagyu teppanyaki", "kobe beef lunch", "certified kobe beef"],
  },
  {
    slug: "nabe", name: "Hot pot & motsunabe", ja: "鍋・もつ鍋", code: "nabe",
    tagline: "Shabu-shabu, sukiyaki, Fukuoka motsunabe and winter hot pots shared at the table",
    intro: "Nabe is any dish cooked in a pot at the table: shabu-shabu (thin beef swished in broth), sukiyaki (beef simmered in sweet soy with a raw egg dip), chanko (the sumo wrestlers' pot), and Fukuoka's motsunabe, a garlicky, chive-covered pot of beef or pork offal that is the city's signature winter dinner. These are sharing meals and they are the best way to eat wagyu in a group for less than a steakhouse.",
    order: "Pick a broth and a meat grade, and order per person (most restaurants require a minimum of two). Staff will start the pot and show you the sequence. Finish with shime: noodles or rice cooked in the remaining broth.",
    lunch: "¥1,500 to ¥3,000 for a lunch set", dinner: "¥4,000 to ¥12,000 per person depending on beef grade",
    score: "Motsunabe shops in Fukuoka above 3.5 are the famous names with lines. Shabu-shabu and sukiyaki restaurants at 3.6+ are serving top wagyu.",
    reservation: "Reserve for dinner, especially in winter and for motsunabe in Fukuoka.",
    english: "Course-based ordering keeps decisions minimal; the main choice is broth (soy, miso or salt for motsunabe) and beef grade.",
    lateNight: true,
    longtail: ["motsunabe fukuoka", "shabu shabu vs sukiyaki", "all you can eat shabu shabu", "wagyu sukiyaki"],
  },
  {
    slug: "okinawan", name: "Okinawan", ja: "沖縄料理", code: "okinawafood",
    tagline: "Okinawa soba, goya champuru, rafute pork belly and awamori: a cuisine unlike the mainland's",
    intro: "Okinawan food is a separate tradition shaped by the Ryukyu Kingdom, China and the American bases: Okinawa soba (thick wheat noodles in pork broth, not buckwheat), goya champuru (bitter melon stir-fry), rafute (braised pork belly), taco rice and sea grapes, washed down with awamori, the island's rice spirit. Tabelog's ratings are the way to find the family-run shokudo diners away from the Kokusai Dori tourist strip.",
    order: "Okinawa soba with soki (spare ribs) is the essential order. At an Okinawan izakaya, order champuru, rafute, jimami tofu and a glass of awamori with ice; many have live sanshin music later in the evening. Shokudo diners serve large set meals for under ¥1,000.",
    lunch: "¥700 to ¥1,200", dinner: "¥2,500 to ¥5,000 with drinks",
    score: "Okinawan restaurants rarely exceed 3.5; a 3.3 to 3.4 shokudo or soba shop is a local favorite, and 3.5+ is the best on the islands.",
    reservation: "Walk-in except for popular izakaya with live music on weekends.",
    english: "Naha's restaurants are used to visitors and most have picture menus; shokudo diners have plastic models outside.",
    lateNight: true,
    longtail: ["okinawa soba naha", "goya champuru", "awamori izakaya", "taco rice"],
  },
];

export const CITIES: City[] = [
  {
    slug: "tokyo", name: "Tokyo", ja: "東京", region: "Kanto",
    tabelogArea: "tokyo", center: { lat: 35.6812, lng: 139.7671 },
    intro: "Tokyo has more restaurants than any city on earth, around 150,000, and more Michelin stars than Paris, but the real guide locals use is Tabelog. The scores are what separate the 3.1 sushi counter by your hotel from the 3.7 one two blocks away that you would never find otherwise. Tokyo is also where Tabelog's grading is harshest: the sheer competition means a 3.5 here is a top-3% restaurant, and the city's 4.0-rated places are among the best meals in the world.\n\nEating well in Tokyo is less about picking the right restaurant than picking the right neighborhood and then trusting the numbers. Ginza for sushi and tempura, Shinjuku and Ikebukuro for ramen, Asakusa for old Edo cooking, Ebisu and Nakameguro for izakaya and bistros, Tsukiji for seafood breakfast. TabeDog puts all of it on one English map with hours and prices so you can decide in thirty seconds instead of an hour of translating.",
    tabelog: "Tokyo scores skew low because reviewers here have eaten everywhere. Treat 3.3 as good, 3.5 as excellent, and anything above 3.7 as worth crossing the city for. Tabelog's Hyakumeiten (Top 100) lists for Tokyo ramen, sushi, tonkatsu and yakitori are the most reliable shortlists in the city.",
    nightlife: "Shinjuku",
    areas: [
      { name: "Ginza", note: "the highest density of top-rated sushi and tempura counters in Japan, plus lunch omakase at a fraction of dinner prices" },
      { name: "Shinjuku", note: "Omoide Yokocho yakitori alleys, Golden Gai bars and a wall of 3.5+ ramen shops around the station" },
      { name: "Shibuya", note: "casual izakaya, ramen and the Shibuya Yokocho food alleys; busy late" },
      { name: "Asakusa", note: "century-old tempura, unagi, soba and sukiyaki houses near Senso-ji" },
      { name: "Tsukiji", note: "the outer market: seafood breakfast, tamagoyaki and sushi from 6 a.m." },
      { name: "Ebisu & Nakameguro", note: "the best neighborhood izakaya, bistros and natural-wine bars in the city" },
      { name: "Ueno & Akihabara", note: "Ameyoko market stalls, cheap kaisendon and old-school tonkatsu" },
      { name: "Ikebukuro", note: "a ramen battleground with several Top-100 shops within ten minutes of the station" },
      { name: "Roppongi", note: "high-end yakiniku, teppanyaki and the most English-friendly dining in Tokyo" },
      { name: "Shimokitazawa", note: "the cult curry capital of Tokyo, plus vintage kissaten" },
    ],
    dishes: [
      { name: "Edomae sushi", note: "aged and cured nigiri the way Tokyo invented it", cuisine: "sushi" },
      { name: "Tokyo shoyu ramen", note: "clear soy-based broth, the classic style, perfected in Ogikubo and Ikebukuro", cuisine: "ramen" },
      { name: "Tempura", note: "counter tempura is a Tokyo (Edo) creation", cuisine: "tempura" },
      { name: "Tonkatsu", note: "born in Ueno; the city's best shops still cluster there", cuisine: "tonkatsu" },
      { name: "Monjayaki", note: "Tsukishima's runnier cousin of okonomiyaki", cuisine: "okonomiyaki" },
      { name: "Unagi", note: "steamed-then-grilled eel in lacquered boxes at century-old houses", cuisine: "unagi" },
    ],
    cuisines: [
      { cuisine: "sushi", blurb: "Tokyo is the sushi capital of the world and Ginza alone has more 3.8+ sushi counters than most countries. The move for visitors is lunch omakase in Ginza or Nihonbashi for ¥5,000 to ¥10,000 at counters that charge three times that at night. For a cheaper fix, the Tsukiji outer market and the standing sushi bars around Shinbashi serve excellent nigiri from early morning.", areas: ["Ginza", "Nihonbashi", "Tsukiji", "Shinbashi", "Roppongi"], longtail: ["lunch omakase ginza", "sushi near tsukiji market", "standing sushi bar tokyo"] },
      { cuisine: "ramen", blurb: "Tokyo's ramen scene is the deepest in Japan: the Hyakumeiten Top 100 for Tokyo ramen alone is longer than most cities' entire lists. Shoyu is the native style, but every regional style has a flagship shop here. Ikebukuro, Shinjuku and the Ogikubo to Koenji stretch of the Chuo line are the densest clusters, and the late-night bowls around Shinjuku and Shibuya run past 3 a.m.", areas: ["Shinjuku", "Ikebukuro", "Shibuya", "Ogikubo", "Kanda"], longtail: ["ramen open late shinjuku", "tokyo ramen top 100", "tsukemen tokyo"] },
      { cuisine: "yakiniku", blurb: "Tokyo yakiniku ranges from ¥3,000 Shin-Okubo Korean-town grills to Roppongi and Nishi-Azabu counters serving whole-carcass A5 wagyu for ¥20,000. The best value is in Ebisu and Nakameguro, where the top-rated mid-range places fill with locals; reserve a week out for weekends.", areas: ["Roppongi", "Ebisu", "Shin-Okubo", "Nishi-Azabu", "Ueno"], longtail: ["wagyu yakiniku roppongi", "cheap yakiniku shin okubo"] },
      { cuisine: "izakaya", blurb: "The best izakaya in Tokyo are in residential neighborhoods, not around the big stations where touts work the crowds. Ebisu, Nakameguro, Sangenjaya and the alleys of Omoide Yokocho in Shinjuku have the highest concentrations of 3.5+ izakaya, many with fewer than fifteen seats. Hours matter: most open at 17:00 and the famous ones are full by 18:30.", areas: ["Ebisu", "Shinjuku", "Nakameguro", "Sangenjaya", "Kichijoji"], longtail: ["izakaya omoide yokocho", "non smoking izakaya tokyo", "izakaya ebisu"] },
      { cuisine: "tempura", blurb: "Tempura as a counter meal was invented in Edo, and Asakusa, Nihonbashi and Ginza still hold the historic houses: two-hundred-year-old tendon shops and counters where a single chef has fried for fifty years. Tabelog's tempura ranking for Tokyo is dominated by Ginza; the Asakusa tendon shops are the affordable, walk-in alternative.", areas: ["Ginza", "Asakusa", "Nihonbashi"], longtail: ["tendon asakusa", "tempura counter ginza"] },
      { cuisine: "tonkatsu", blurb: "Ueno is where tonkatsu was born and still where Tokyo's oldest and most-reviewed shops are. Takadanobaba and Meguro have the newer wave using named-breed pork fried at low temperature. Almost every top-ranked shop is walk-in only and sells out of certain cuts by 13:00.", areas: ["Ueno", "Takadanobaba", "Meguro", "Nihonbashi"], longtail: ["tonkatsu ueno", "best tonkatsu tokyo tabelog"] },
      { cuisine: "soba", blurb: "Tokyo's old soba houses in Asakusa, Kanda and Nihonbashi date from the Edo period and are as much architecture as food. The contemporary hand-made soba scene is in the western suburbs along the Chuo line. Tabelog's Tokyo soba Top 100 is the right list to work from.", areas: ["Kanda", "Asakusa", "Nihonbashi", "Kichijoji"], longtail: ["oldest soba restaurant tokyo", "soba kanda"] },
      { cuisine: "unagi", blurb: "Tokyo-style unagi is steamed before grilling, giving a softer texture than the Kansai version, and the historic houses in Asakusa, Nihonbashi and Minami-Senju have been doing it for 150 years or more. Budget for ¥4,000 to ¥6,000 and a 40-minute wait once ordered; it is grilled when you sit down.", areas: ["Asakusa", "Nihonbashi", "Minami-Senju"], longtail: ["unagi asakusa", "best unagi tokyo"] },
      { cuisine: "yakitori", blurb: "Tokyo yakitori spans the smoky stalls of Omoide Yokocho and the alleys under the Yurakucho tracks to omakase counters in Meguro and Nakameguro with months-long waiting lists. The Tabelog Hyakumeiten for yakitori is Tokyo-heavy and a reliable shortlist for the counters.", areas: ["Shinjuku", "Yurakucho", "Nakameguro", "Meguro", "Ebisu"], longtail: ["yakitori under the tracks yurakucho", "omakase yakitori tokyo"] },
      { cuisine: "kaiseki", blurb: "Tokyo's kaiseki and kappo counters are concentrated in Ginza, Akasaka, Nishi-Azabu and Kagurazaka, and the city's 4.0+ Japanese restaurants are arguably the hardest reservations in the world. Lunch courses in Ginza and Kagurazaka are the accessible route. TabeDog shows which take online reservations.", areas: ["Ginza", "Akasaka", "Kagurazaka", "Nishi-Azabu"], longtail: ["kaiseki lunch ginza", "kappo counter tokyo"] },
      { cuisine: "kissaten", blurb: "Tokyo's kissaten survive in Jimbocho, Ginza, Asakusa and Shimokitazawa: siphon coffee, pudding and Napolitan in rooms unchanged since the 1960s. The specialty coffee scene is in Kiyosumi-Shirakawa and Nakameguro. Many of the old ones are cash only.", areas: ["Jimbocho", "Ginza", "Asakusa", "Shimokitazawa", "Kiyosumi-Shirakawa"], longtail: ["retro kissaten tokyo", "kissaten jimbocho"] },
    ],
  },
  {
    slug: "osaka", name: "Osaka", ja: "大阪", region: "Kansai",
    tabelogArea: "osaka", center: { lat: 34.7025, lng: 135.4959 },
    intro: "Osaka calls itself the nation's kitchen and its motto is kuidaore: eat until you drop. The food is louder, cheaper and more fun than Tokyo's: okonomiyaki and takoyaki griddled in front of you, kushikatsu skewers in Shinsekai, yakiniku in Korea town, and a ramen and spice-curry scene that is quietly one of the best in Japan. Dotonbori is the neon postcard, but the best-rated restaurants on Tabelog are a few streets away in Fukushima, Kitashinchi and Tenma, where locals actually eat.\n\nOsaka is also the city where ratings matter most for avoiding tourist traps. The Dotonbori strip is full of mediocre 3.0-rated griddles with huge signs; the 3.6 okonomiyaki shop with a line of office workers is in a side street nearby. TabeDog shows you both on the same map.",
    tabelog: "Osaka reviewers are generous with casual food and harsh with anything pretentious. A 3.5 okonomiyaki or kushikatsu shop is top tier; for sushi and kaiseki use Tokyo-level expectations. Kitashinchi is the fine-dining district and holds most of the city's 4.0+ restaurants.",
    nightlife: "Namba",
    areas: [
      { name: "Dotonbori & Namba", note: "the neon strip: takoyaki, crab, okonomiyaki, and the city's late-night ramen" },
      { name: "Shinsekai", note: "retro district built around kushikatsu and standing bars under Tsutenkaku tower" },
      { name: "Umeda & Kitashinchi", note: "the business and fine-dining center; most of Osaka's top-rated sushi and kaiseki" },
      { name: "Fukushima", note: "one stop from Umeda, the best izakaya, bistro and wine-bar neighborhood in the city" },
      { name: "Tsuruhashi", note: "Korea town and the yakiniku capital of Japan" },
      { name: "Tenma", note: "Tenjinbashisuji, Japan's longest shopping street, and hundreds of cheap, high-rated izakaya" },
      { name: "Shinsaibashi & Horie", note: "cafes, spice curry and the newer restaurant scene" },
    ],
    dishes: [
      { name: "Okonomiyaki", note: "mixed-batter style, cooked on your table's griddle", cuisine: "okonomiyaki" },
      { name: "Kushikatsu", note: "born in Shinsekai; no double dipping", cuisine: "kushikatsu" },
      { name: "Kitsune udon", note: "Osaka invented the sweet fried-tofu topping", cuisine: "udon" },
      { name: "Yakiniku", note: "Tsuruhashi's Korean grills are the best in the country", cuisine: "yakiniku" },
      { name: "Spice curry", note: "the Osaka-born multi-curry plate that spread across Japan", cuisine: "curry" },
    ],
    cuisines: [
      { cuisine: "okonomiyaki", blurb: "Osaka-style okonomiyaki mixes cabbage into the batter and is often cooked by you on a hotplate in the table. The most famous shops are near Dotonbori and Namba but Tabelog's top-rated ones are the tiny counters in Fukushima, Tenma and Kyobashi. Expect a wait of thirty minutes at anything above 3.5.", areas: ["Namba", "Dotonbori", "Fukushima", "Tenma", "Kyobashi"], longtail: ["okonomiyaki dotonbori", "best okonomiyaki osaka tabelog", "cook your own okonomiyaki osaka"] },
      { cuisine: "kushikatsu", blurb: "Shinsekai is where kushikatsu was invented in 1929 and the neighborhood under Tsutenkaku tower is still wall-to-wall skewer shops. The original and its rivals all sit around 3.4 on Tabelog; the difference is atmosphere. For refined kushiage omakase, look to Kitashinchi and Namba.", areas: ["Shinsekai", "Namba", "Kitashinchi"], longtail: ["kushikatsu shinsekai", "kushikatsu near tsutenkaku"] },
      { cuisine: "yakiniku", blurb: "Tsuruhashi, Osaka's Korea town, has the highest concentration of yakiniku restaurants in Japan: hundreds of grills within a few blocks of the station, from ¥3,000 horumon joints to 3.7-rated wagyu counters. The station smells of charcoal. Reserve for the top-rated ones; wander for the rest.", areas: ["Tsuruhashi", "Namba", "Umeda", "Kyobashi"], longtail: ["yakiniku tsuruhashi", "horumon osaka"] },
      { cuisine: "sushi", blurb: "Osaka's sushi heritage is hako-zushi (pressed sushi) and battera (pressed mackerel), but the modern omakase counters in Kitashinchi and Umeda rival Tokyo's at lower prices. Standing sushi bars around Namba and Umeda stations serve excellent nigiri for ¥2,000.", areas: ["Kitashinchi", "Umeda", "Namba"], longtail: ["omakase osaka kitashinchi", "standing sushi osaka"] },
      { cuisine: "ramen", blurb: "Osaka ramen is underrated: a strong tonkotsu-shoyu tradition around Namba, Kyobashi and Fukushima, plus late-night bowls on Dotonbori until dawn. Several Tabelog Hyakumeiten shops are within walking distance of Namba station.", areas: ["Namba", "Fukushima", "Kyobashi", "Umeda"], longtail: ["late night ramen namba", "ramen dotonbori"] },
      { cuisine: "izakaya", blurb: "Fukushima and Tenma are Osaka's izakaya neighborhoods: hundreds of small counters, standing bars and wine bars within a few blocks, cheaper and more welcoming than Tokyo's equivalents. Tenjinbashisuji in Tenma is the single densest street of cheap, well-rated izakaya in Japan.", areas: ["Fukushima", "Tenma", "Namba", "Umeda"], longtail: ["izakaya fukushima osaka", "tachinomi standing bar osaka", "izakaya tenma"] },
      { cuisine: "udon", blurb: "Osaka is the home of kitsune udon, the thick noodle in light dashi with sweet fried tofu, and of soft Kansai-style udon generally. The historic shops are in Namba and Senba; the new-wave hand-made udon shops are around Umeda.", areas: ["Namba", "Senba", "Umeda"], longtail: ["kitsune udon namba", "udon osaka"] },
      { cuisine: "curry", blurb: "Osaka invented spice curry, the aromatic multi-curry plate that has taken over Japan, and the scene is centered on Shinsaibashi, Horie and Tanimachi. Most shops are lunch-only, cash-only, and sell out; the top-rated ones have lines of office workers by 11:45.", areas: ["Shinsaibashi", "Horie", "Tanimachi", "Umeda"], longtail: ["spice curry osaka", "curry shinsaibashi"] },
    ],
  },
  {
    slug: "kyoto", name: "Kyoto", ja: "京都", region: "Kansai",
    tabelogArea: "kyoto/A2601", center: { lat: 35.0037, lng: 135.769 },
    intro: "Kyoto is the home of kaiseki, the multi-course seasonal meal at the top of Japanese cuisine, and the city's Tabelog washoku ranking is effectively the list of the best traditional restaurants in the country. But Kyoto also has one of Japan's best ramen districts (Ichijoji), the oldest kissaten culture, obanzai home cooking, and tofu restaurants in temple gardens. The challenge is that the famous restaurants are booked out and the streets around Gion and Kiyomizu are lined with tourist-priced places that locals never enter.\n\nTabelog's scores are the fix. The 3.3 obanzai counter in Nishiki Market with a line of locals is a better meal than the 3.0 'kaiseki' on the main drag for triple the price. TabeDog lays Kyoto out by neighborhood with prices and hours so you can plan the one big dinner and keep the rest cheap and excellent.",
    tabelog: "Kyoto holds more 4.0+ Japanese restaurants than anywhere outside Tokyo. For kaiseki, 3.7 and above is the top tier and lunch is the way in. For everything else, locals are tough graders and 3.4 is a solid recommendation. Many top places require a phone reservation; TabeDog shows the hours and whether the listing has online booking.",
    nightlife: "Kiyamachi",
    areas: [
      { name: "Gion", note: "machiya townhouses, kaiseki, and tea-house streets; expensive and worth it once" },
      { name: "Pontocho & Kiyamachi", note: "the narrow riverside alley of restaurants and the bar street beside it" },
      { name: "Kawaramachi & Nishiki Market", note: "the shopping center, Nishiki's food stalls, and the densest cluster of cheap, well-rated lunch spots" },
      { name: "Kyoto Station", note: "ramen street, department-store food floors, and the best place for a quick meal between trains" },
      { name: "Ichijoji", note: "university district and the most famous ramen street in western Japan" },
      { name: "Arashiyama", note: "tofu kaiseki and yudofu in temple gardens; eat before 14:00 to avoid closures" },
      { name: "Nanzenji & Higashiyama", note: "the yudofu temple restaurants and quiet tea rooms" },
    ],
    dishes: [
      { name: "Kaiseki", note: "Kyoto cuisine at its most refined, by season", cuisine: "kaiseki" },
      { name: "Yudofu", note: "simmered tofu in temple-side restaurants around Nanzenji and Arashiyama", cuisine: "kaiseki" },
      { name: "Kyoto ramen", note: "a rich, dark chicken-and-pork soy broth, concentrated in Ichijoji", cuisine: "ramen" },
      { name: "Nishin soba", note: "soba topped with sweet-simmered herring, a Kyoto original", cuisine: "soba" },
      { name: "Saba-zushi", note: "pressed mackerel sushi from the days fish came over the mountains", cuisine: "sushi" },
    ],
    cuisines: [
      { cuisine: "kaiseki", blurb: "Kyoto kaiseki is the reference for all Japanese fine dining and Gion, Higashiyama and the streets off Shijo hold the restaurants that define it, many in centuries-old machiya. Dinner at a 4.0 house runs ¥30,000 and up and books out months ahead; the same kitchens serve lunch for ¥6,000 to ¥12,000 and that is the plan for most visitors. Tofu kaiseki in Arashiyama and Nanzenji is the affordable, no-reservation version.", areas: ["Gion", "Higashiyama", "Arashiyama", "Nanzenji", "Kawaramachi"], longtail: ["kaiseki gion lunch", "kyoto kaiseki reservation english", "yudofu arashiyama", "tofu kaiseki nanzenji"] },
      { cuisine: "ramen", blurb: "Ichijoji, a student district in the north of the city, has more highly rated ramen shops per block than anywhere in Japan, and Kyoto's own style, a thick dark chicken-pork soy broth, was born here. Kyoto Station has a ramen street inside the building for quick bowls before the train.", areas: ["Ichijoji", "Kyoto Station", "Kawaramachi"], longtail: ["ichijoji ramen street", "kyoto station ramen street", "kyoto style ramen"] },
      { cuisine: "kissaten", blurb: "Kyoto's kissaten are the oldest in Japan: coffee houses founded in the 1930s and 40s still serving egg sandwiches and hand-drip blends in rooms with lace curtains. The classics are around Sanjo and Kawaramachi; the specialty coffee scene is along the Kamo river and in Higashiyama. Morning sets before 10:00 are the best breakfast in the city.", areas: ["Sanjo", "Kawaramachi", "Higashiyama", "Gion"], longtail: ["kissaten kyoto sanjo", "kyoto cafe morning set", "oldest coffee shop kyoto"] },
      { cuisine: "soba", blurb: "Kyoto soba means nishin soba, buckwheat noodles topped with sweet-simmered herring, invented here in the 1880s. The old houses around Gion and Shijo serve it alongside hand-made zaru soba. Arashiyama and the temple districts have quiet soba shops that are a good alternative to the tourist-strip restaurants.", areas: ["Gion", "Shijo", "Arashiyama"], longtail: ["nishin soba kyoto", "soba gion"] },
      { cuisine: "sushi", blurb: "Kyoto sushi is historically pressed and preserved, saba-zushi (mackerel) and hako-zushi, because fresh fish had to cross the mountains. Those houses still exist around Gion and Kawaramachi. The modern omakase counters are concentrated near Gion and Karasuma and are easier to book than Tokyo's at similar quality.", areas: ["Gion", "Karasuma", "Kawaramachi"], longtail: ["saba zushi kyoto", "omakase kyoto gion"] },
      { cuisine: "izakaya", blurb: "Kyoto izakaya cluster in Pontocho, Kiyamachi and the streets around Karasuma, with obanzai (Kyoto home-cooking small plates) as the local specialty. The riverside Pontocho rooms charge for the view; the 3.5+ counters are on the side streets west of Kawaramachi.", areas: ["Pontocho", "Kiyamachi", "Karasuma", "Kawaramachi"], longtail: ["obanzai kyoto", "izakaya pontocho", "kiyamachi bars"] },
      { cuisine: "tempura", blurb: "Kyoto tempura counters are fewer than Tokyo's but the best, around Gion and Karasuma, use Kyoto vegetables (kyo-yasai) and are easier to reserve. Several kaiseki houses also run tempura lunches.", areas: ["Gion", "Karasuma"], longtail: ["tempura gion", "kyo yasai tempura"] },
    ],
  },
  {
    slug: "fukuoka", name: "Fukuoka", ja: "福岡", region: "Kyushu",
    tabelogArea: "fukuoka/A4001", center: { lat: 33.5903, lng: 130.4017 },
    intro: "Fukuoka is the best food city in Japan per yen. It is the birthplace of tonkotsu ramen, the home of motsunabe and mizutaki hot pots, the yakitori capital by number of shops, and the last city in Japan with a real street-stall (yatai) culture, where you sit at a plastic counter on the Nakasu riverbank eating ramen and gyoza next to strangers. Hakata and Tenjin are the two centers, fifteen minutes apart on foot.\n\nFukuoka's restaurant scene is tight enough that Tabelog ratings work beautifully: the top-rated tonkotsu shops are all within a short walk of Hakata station, and the 3.6+ motsunabe houses are a short taxi ride from Tenjin. TabeDog shows which yatai and ramen shops are open right now, which matters in a city where the best bowls are eaten at midnight.",
    tabelog: "Fukuoka locals grade ramen hard because they eat it weekly: a tonkotsu shop at 3.5 is nationally famous. For motsunabe and mizutaki, 3.6+ is the top tier. Yatai stalls are listed on Tabelog too and the ratings are the only way to pick one.",
    nightlife: "Nakasu",
    areas: [
      { name: "Hakata", note: "the station district, home of the original tonkotsu shops and Hakata udon" },
      { name: "Tenjin", note: "the downtown: department stores, yakitori alleys and the Daimyo restaurant streets" },
      { name: "Nakasu", note: "the riverside entertainment island and the yatai street-stall row" },
      { name: "Daimyo & Imaizumi", note: "young, dense neighborhoods of izakaya, cafes and natural-wine bars west of Tenjin" },
      { name: "Yakuin", note: "quiet residential streets with some of the highest-rated small restaurants in the city" },
      { name: "Nagahama", note: "the fish market and the original Nagahama-style thin-noodle ramen shops" },
    ],
    dishes: [
      { name: "Hakata tonkotsu ramen", note: "creamy pork-bone broth, thin noodles, and kaedama noodle refills", cuisine: "ramen" },
      { name: "Motsunabe", note: "beef offal hot pot with garlic, chives and cabbage", cuisine: "nabe" },
      { name: "Mizutaki", note: "chicken hot pot in a milky collagen broth", cuisine: "nabe" },
      { name: "Yakitori (butabara)", note: "Fukuoka grills pork belly skewers alongside chicken, with a cabbage salad", cuisine: "yakitori" },
      { name: "Hakata udon", note: "deliberately soft noodles with burdock tempura", cuisine: "udon" },
      { name: "Mentaiko", note: "spicy cod roe, Fukuoka's signature souvenir and rice topping", cuisine: "izakaya" },
    ],
    cuisines: [
      { cuisine: "ramen", blurb: "This is where tonkotsu was invented, and Fukuoka's ramen is thinner-noodled, faster and more intense than the tonkotsu exported to the rest of the world. The original shops around Hakata station and Nagahama fish market are open past midnight, kaedama (a second serving of noodles) costs ¥100, and the Nakasu yatai serve bowls at riverside stalls. Tabelog's Fukuoka ramen ranking is the single most useful list in the city.", areas: ["Hakata", "Nagahama", "Nakasu", "Tenjin"], longtail: ["hakata tonkotsu ramen original", "nagahama ramen", "yatai ramen nakasu", "kaedama"] },
      { cuisine: "nabe", blurb: "Motsunabe (offal hot pot with garlic and chives) and mizutaki (chicken in a rich collagen broth) are Fukuoka's two signature dinners, and both are sharing meals for two or more. The top-rated motsunabe houses are in Tenjin, Yakuin and Hakata and should be reserved, especially from October to March.", areas: ["Tenjin", "Yakuin", "Hakata", "Daimyo"], longtail: ["motsunabe fukuoka best", "mizutaki fukuoka", "motsunabe reservation"] },
      { cuisine: "yakitori", blurb: "Fukuoka has more yakitori shops per person than any Japanese city and its own style: pork belly (butabara) skewers alongside chicken, served with a free vinegared cabbage salad. The dense clusters are in Tenjin, Daimyo and around Hakata station, and the best are under ¥3,000 a head.", areas: ["Tenjin", "Daimyo", "Hakata", "Yakuin"], longtail: ["yakitori fukuoka butabara", "yakitori tenjin"] },
      { cuisine: "udon", blurb: "Fukuoka claims to be where udon entered Japan, and Hakata udon is proudly soft rather than chewy, served in a clear dashi with burdock tempura (gobo-ten) or sweet fried tofu. The old shops near Hakata station and Canal City are cheap, quick and highly rated.", areas: ["Hakata", "Tenjin"], longtail: ["hakata udon gobo ten", "udon near hakata station"] },
      { cuisine: "izakaya", blurb: "Fukuoka's izakaya scene is centered on Daimyo, Imaizumi and Yakuin, with fresh Genkai Sea sashimi, mentaiko and goma-saba (sesame mackerel) as the local plates. Prices are well below Tokyo and the yatai stalls on Nakasu are the open-air version.", areas: ["Daimyo", "Imaizumi", "Yakuin", "Nakasu"], longtail: ["izakaya daimyo fukuoka", "goma saba", "yatai nakasu"] },
      { cuisine: "sushi", blurb: "Fukuoka sits on the Genkai Sea and its sushi counters in Tenjin, Yakuin and near Nagahama market serve fish that is a fraction of Tokyo prices at similar Tabelog ratings. Lunch omakase for ¥4,000 is common.", areas: ["Tenjin", "Yakuin", "Nagahama", "Hakata"], longtail: ["sushi fukuoka cheap omakase", "sushi tenjin"] },
    ],
  },
  {
    slug: "sapporo", name: "Sapporo", ja: "札幌", region: "Hokkaido",
    tabelogArea: "hokkaido/A0101", center: { lat: 43.058, lng: 141.353 },
    intro: "Sapporo eats like a northern port city: miso ramen was invented here, soup curry was invented here, and the seafood that comes off Hokkaido boats (crab, sea urchin, salmon roe, scallops) ends up in kaisendon bowls at Nijo Market and the Curb Market before 9 a.m. Jingisukan, lamb grilled on a domed iron plate, is the beer-hall meal. Susukino, the entertainment district, has ramen alleys open until dawn.\n\nSapporo's dining is compact: nearly everything worth eating is between Sapporo Station and Susukino, a twenty-minute walk. Tabelog ratings matter most for the seafood market stalls, where the tourist-facing ones near the entrance are the lowest rated, and for ramen, where the famous Ramen Yokocho alley is outscored by shops a few blocks away.",
    tabelog: "Hokkaido reviewers rate seafood with expert eyes: a 3.4 kaisendon shop is a strong pick. Miso ramen at 3.5+ is a destination bowl. Jingisukan halls are rated for atmosphere as much as lamb, so read the price band too.",
    nightlife: "Susukino",
    areas: [
      { name: "Susukino", note: "the entertainment district: Ramen Yokocho, jingisukan halls, late-night everything" },
      { name: "Sapporo Station & Odori", note: "department-store food floors, soup curry, and the central business lunch scene" },
      { name: "Nijo Market", note: "central seafood market for kaisendon breakfasts" },
      { name: "Curb Market (Jogai)", note: "the larger wholesale market near Nijuyonken with crab and uni stalls" },
      { name: "Maruyama", note: "a leafy residential area with the city's best cafes and bakeries" },
    ],
    dishes: [
      { name: "Miso ramen", note: "invented in Sapporo in the 1950s; thick, buttery, with corn and sweetcorn", cuisine: "ramen" },
      { name: "Soup curry", note: "a thin spiced broth with roasted vegetables and chicken on the bone", cuisine: "curry" },
      { name: "Jingisukan", note: "lamb grilled on a domed plate, named after Genghis Khan", cuisine: "yakiniku" },
      { name: "Kaisendon", note: "uni, ikura and crab over rice from the morning markets", cuisine: "seafood" },
      { name: "Zangi", note: "Hokkaido's heavily seasoned fried chicken", cuisine: "izakaya" },
    ],
    cuisines: [
      { cuisine: "ramen", blurb: "Miso ramen was invented in Sapporo and the city's bowls are heavier and more buttery than anywhere else, often with corn and a knob of butter on top, built for minus-ten winters. Ramen Yokocho in Susukino is the famous alley but Tabelog's top-rated miso shops are scattered around Susukino and Sapporo Station, and several run late into the night.", areas: ["Susukino", "Sapporo Station", "Odori"], longtail: ["sapporo miso ramen best", "ramen yokocho susukino", "miso ramen with butter and corn"] },
      { cuisine: "seafood", blurb: "Sapporo's two markets, Nijo in the center and the larger Curb Market to the west, serve kaisendon bowls of uni, ikura, scallop and crab from early morning. The highest-rated stalls are not the ones with touts at the entrance; Tabelog separates them clearly. Hairy crab and king crab restaurants in Susukino are the splurge dinner.", areas: ["Nijo Market", "Curb Market", "Susukino"], longtail: ["kaisendon nijo market", "uni ikura bowl sapporo", "king crab sapporo"] },
      { cuisine: "curry", blurb: "Soup curry is Sapporo's own invention: a thin, aromatic, spiced broth with a chicken leg and big pieces of roasted Hokkaido vegetables. The cult shops are around Sapporo Station, Odori and Susukino, and most let you choose spice level from 1 to 40.", areas: ["Sapporo Station", "Odori", "Susukino"], longtail: ["soup curry sapporo best", "sapporo soup curry spice level"] },
      { cuisine: "yakiniku", blurb: "In Sapporo, yakiniku means jingisukan: lamb and mutton grilled on a domed iron plate with onions and bean sprouts, eaten in beer halls and tiny Susukino counters that smell of smoke. The top-rated jingisukan shops use fresh (not frozen) lamb and sell out early.", areas: ["Susukino", "Sapporo Station", "Odori"], longtail: ["jingisukan sapporo best", "genghis khan lamb bbq sapporo"] },
      { cuisine: "sushi", blurb: "Hokkaido sushi is about raw freshness over Edomae technique: uni, botan shrimp, scallop and salmon that were landed that morning. Sapporo's best counters are in Susukino and around Odori, and the prices are far below Tokyo for equal Tabelog ratings.", areas: ["Susukino", "Odori", "Sapporo Station"], longtail: ["sushi sapporo susukino", "hokkaido sushi omakase"] },
      { cuisine: "izakaya", blurb: "Sapporo izakaya serve Hokkaido's specialties: zangi fried chicken, grilled hokke mackerel, potato with butter and ikura, with local Sapporo Classic beer. Susukino has hundreds; the Tabelog ratings pick out the ones locals use over the ones with picture menus on the street.", areas: ["Susukino", "Odori", "Maruyama"], longtail: ["izakaya susukino", "zangi fried chicken sapporo"] },
    ],
  },
  {
    slug: "nagoya", name: "Nagoya", ja: "名古屋", region: "Chubu",
    tabelogArea: "aichi/A2301", center: { lat: 35.1709, lng: 136.9083 },
    intro: "Nagoya has the most distinctive regional food in Japan, built on red haccho miso: miso katsu (tonkatsu with sweet miso sauce), miso nikomi udon simmered in a clay pot, hitsumabushi (grilled eel eaten three ways), tebasaki chicken wings, kishimen flat noodles and the kissaten 'morning service' that gives you free toast and egg with your coffee. Locals call it Nagoya-meshi and they are proud of it.\n\nThe food is clustered around Nagoya Station (Meieki), Sakae and the Osu shopping arcades. Tabelog matters because every Nagoya-meshi dish has one or two legendary originators and many imitators with bigger signs; the ratings tell you which is which.",
    tabelog: "Nagoya reviewers are loyal to the originators: the historic hitsumabushi and miso katsu houses sit around 3.6 to 3.8. For kissaten, 3.4 is a notable one. Tebasaki chains rate low on Tabelog but are still worth a plate.",
    nightlife: "Sakae",
    areas: [
      { name: "Nagoya Station (Meieki)", note: "department-store floors, the station's kishimen stands, and the easiest place to try everything" },
      { name: "Sakae", note: "the downtown: tebasaki, izakaya, bars and the city's nightlife" },
      { name: "Osu", note: "shopping arcades with cheap eats, Taiwan ramen and old kissaten" },
      { name: "Atsuta", note: "the shrine district and home of the most famous hitsumabushi house" },
      { name: "Kanayama", note: "a transit hub with a dense, local izakaya scene" },
    ],
    dishes: [
      { name: "Hitsumabushi", note: "chopped grilled eel over rice, eaten plain, then with condiments, then with dashi", cuisine: "unagi" },
      { name: "Miso katsu", note: "tonkatsu with sweet red-miso sauce", cuisine: "tonkatsu" },
      { name: "Miso nikomi udon", note: "firm udon simmered in haccho miso in a clay pot", cuisine: "udon" },
      { name: "Tebasaki", note: "sweet-peppery fried chicken wings, eaten with beer", cuisine: "yakitori" },
      { name: "Morning service", note: "free toast and egg with your coffee at every kissaten before 11:00", cuisine: "kissaten" },
      { name: "Taiwan ramen", note: "a spicy minced-pork ramen invented in Nagoya, not Taiwan", cuisine: "ramen" },
    ],
    cuisines: [
      { cuisine: "unagi", blurb: "Hitsumabushi is Nagoya's gift to unagi: crisply grilled eel chopped over rice in a wooden tub, eaten first plain, then with wasabi and scallions, then with dashi poured over as a rice soup. The originator in Atsuta and its rivals near Nagoya Station are the city's highest-rated restaurants and have two-hour waits; the station branches are faster.", areas: ["Atsuta", "Nagoya Station", "Sakae"], longtail: ["hitsumabushi nagoya original", "hitsumabushi near nagoya station", "how to eat hitsumabushi"] },
      { cuisine: "tonkatsu", blurb: "Miso katsu, a pork cutlet drenched in sweet, dark haccho-miso sauce, is Nagoya's version of tonkatsu and the most famous chain's original shop is near Yaba-cho in Sakae. Tabelog also rates the small independent katsu shops around Osu and Nagoya Station highly.", areas: ["Sakae", "Osu", "Nagoya Station"], longtail: ["miso katsu nagoya original shop", "miso katsu sakae"] },
      { cuisine: "udon", blurb: "Nagoya has two noodles: kishimen, flat ribbon udon served at the stands on Nagoya Station platforms, and miso nikomi udon, firm noodles simmered in a clay pot of red miso with chicken and egg. The historic miso nikomi houses in Sakae and Osu are among the city's top-rated restaurants.", areas: ["Nagoya Station", "Sakae", "Osu"], longtail: ["miso nikomi udon nagoya", "kishimen nagoya station"] },
      { cuisine: "kissaten", blurb: "Nagoya's kissaten culture is the strongest in Japan because of 'morning service': order a coffee before 11:00 and toast, a boiled egg and often a salad come free. The city also invented ogura toast (sweet red bean on buttered toast). Osu and Sakae have the retro originals; the big chains began here too.", areas: ["Osu", "Sakae", "Nagoya Station"], longtail: ["nagoya morning service kissaten", "ogura toast", "best kissaten nagoya"] },
      { cuisine: "yakitori", blurb: "Nagoya's chicken dish is tebasaki, wings fried and glazed in a sweet, peppery sauce, eaten by the plate in Sakae izakaya with beer. The two rival originators are both in Sakae. For proper charcoal yakitori using the local Nagoya Cochin breed, the counters around Nagoya Station and Kanayama are the top-rated.", areas: ["Sakae", "Nagoya Station", "Kanayama"], longtail: ["tebasaki nagoya", "nagoya cochin yakitori"] },
      { cuisine: "ramen", blurb: "Nagoya's ramen is Taiwan ramen: a spicy minced-pork and chive bowl invented at a Taiwanese restaurant in Imaike in the 1970s. The original is still open. The city's broader ramen scene around Nagoya Station and Sakae is solid, with several Tabelog Hyakumeiten shops.", areas: ["Imaike", "Nagoya Station", "Sakae"], longtail: ["taiwan ramen nagoya original", "ramen near nagoya station"] },
    ],
  },
  {
    slug: "yokohama", name: "Yokohama", ja: "横浜", region: "Kanto",
    tabelogArea: "kanagawa/A1401", center: { lat: 35.4437, lng: 139.638 },
    intro: "Yokohama is thirty minutes from Tokyo and has two things the capital does not: Japan's largest Chinatown, with over 200 restaurants, and iekei ramen, the thick pork-and-soy style with spinach and seaweed that was invented at a single shop near Shin-Yokohama and now has thousands of imitators. The Shin-Yokohama Ramen Museum collects regional ramen under one roof, and Noge, a drinking district by Sakuragicho, is one of the best izakaya streets in the Tokyo area.\n\nYokohama Chinatown is where Tabelog earns its keep: 200 restaurants, most mediocre, a dozen genuinely excellent, and the difference invisible from the street.",
    tabelog: "Chinatown restaurants are graded harshly; 3.5 there is a top-tier kitchen and 3.3 is a safe pick. Iekei ramen shops rate 3.3 to 3.6 and the originator family shops are easy to spot by score. Noge izakaya at 3.4+ are excellent.",
    nightlife: "Noge",
    areas: [
      { name: "Chinatown (Chukagai)", note: "the largest in Japan; steamed buns, dim sum, Cantonese banquets" },
      { name: "Minato Mirai", note: "the waterfront with harbor-view restaurants and the Red Brick Warehouse" },
      { name: "Yokohama Station", note: "department-store food floors and the city's commuter dining" },
      { name: "Noge", note: "a dense, old-school drinking and izakaya district near Sakuragicho" },
      { name: "Shin-Yokohama", note: "the Ramen Museum and the birthplace of iekei ramen" },
    ],
    dishes: [
      { name: "Iekei ramen", note: "thick tonkotsu-shoyu with spinach, nori and a choice of richness", cuisine: "ramen" },
      { name: "Sanmamen", note: "Yokohama's stir-fried-vegetable ramen", cuisine: "chinese" },
      { name: "Dim sum and buns", note: "Chinatown's steamed buns and Cantonese cooking", cuisine: "chinese" },
      { name: "Napolitan spaghetti", note: "invented at a Yokohama hotel; a kissaten classic", cuisine: "kissaten" },
    ],
    cuisines: [
      { cuisine: "ramen", blurb: "Iekei ramen was invented in Yokohama in 1974: a rich pork-and-chicken soy broth with thick noodles, spinach and nori, customized by richness, noodle firmness and oil. The original shop and its direct lineage are rated far above the chains, and Tabelog makes the lineage visible. The Shin-Yokohama Ramen Museum houses famous shops from across Japan under one roof.", areas: ["Shin-Yokohama", "Yokohama Station", "Kannai"], longtail: ["iekei ramen original yokohama", "shin yokohama ramen museum", "iekei ramen near yokohama station"] },
      { cuisine: "chinese", blurb: "Yokohama Chinatown has over 200 restaurants across a few blocks and the quality gap is enormous. Tabelog's ratings point to the handful of Cantonese and Shanghainese kitchens locals book for banquets, the best steamed-bun stands, and the all-you-can-eat places that are worth it. Sanmamen, a vegetable-stir-fry ramen, is the local Chinese-Japanese hybrid.", areas: ["Chinatown", "Kannai", "Motomachi"], longtail: ["yokohama chinatown best restaurant tabelog", "dim sum yokohama", "yokohama chinatown all you can eat"] },
      { cuisine: "izakaya", blurb: "Noge, a few streets of narrow bars and izakaya near Sakuragicho, is one of the best drinking districts in the Kanto region: standing bars, yakitori counters and sake bars that have been there for decades. Tabelog's ratings sort the regulars' places from the newer ones that trade on the name.", areas: ["Noge", "Kannai", "Yokohama Station"], longtail: ["noge izakaya yokohama", "noge standing bar"] },
      { cuisine: "sushi", blurb: "Yokohama's sushi counters around Yokohama Station and Kannai offer Tokyo-quality Edomae at lower prices and with easier reservations. The fish market in Yokohama's Kanazawa ward supplies kaisendon shops on the south side of the city.", areas: ["Yokohama Station", "Kannai", "Minato Mirai"], longtail: ["sushi yokohama station", "omakase yokohama"] },
    ],
  },
  {
    slug: "kobe", name: "Kobe", ja: "神戸", region: "Kansai",
    tabelogArea: "hyogo/A2801", center: { lat: 34.6946, lng: 135.1955 },
    intro: "Kobe is a port city with the most famous beef in the world, a Chinatown (Nankinmachi), a historic foreign quarter (Kitano) full of French and Indian restaurants, and the Nada sake district, which brews a quarter of Japan's sake. Kobe beef is the reason most visitors come, and it is where Tabelog is essential: only restaurants registered with the Kobe Beef Marketing Association serve the certified product, and the ratings separate them from the 'Kobe-style' steak shops.\n\nSannomiya is the center and everything is walkable from it: Nankinmachi to the west, Kitano up the hill, the harbor to the south. Lunch courses at the top teppanyaki counters cost about half of dinner for the same beef.",
    tabelog: "Kobe's steak ranking is the list to use: 3.6+ teppanyaki counters are serving certified beef with the ID certificate on display. For everything else Kobe graders are moderate; 3.4 is a good sign.",
    nightlife: "Sannomiya",
    areas: [
      { name: "Sannomiya", note: "the downtown hub: teppanyaki, izakaya, bars and the main station" },
      { name: "Motomachi & Nankinmachi", note: "Kobe's Chinatown and the shopping arcade beside it" },
      { name: "Kitano", note: "the hillside foreign quarter with Western-style houses, bakeries and bistros" },
      { name: "Harborland & Meriken Park", note: "waterfront dining with harbor views" },
      { name: "Nada", note: "the sake brewing district with brewery tasting rooms" },
    ],
    dishes: [
      { name: "Kobe beef", note: "certified Tajima-breed wagyu, seared on a teppan", cuisine: "steak" },
      { name: "Sobameshi", note: "fried noodles chopped into fried rice, a Kobe working-class dish", cuisine: "okonomiyaki" },
      { name: "Butaman", note: "Nankinmachi's pork buns", cuisine: "chinese" },
      { name: "Nada sake", note: "the sake district's dry, crisp brews", cuisine: "izakaya" },
    ],
    cuisines: [
      { cuisine: "steak", blurb: "Kobe beef is sold only by restaurants registered with the Kobe Beef Marketing Association, and the certificate with the animal's ten-digit ID is displayed at every legitimate one. Tabelog's Kobe steak ranking is effectively that list sorted by quality. Lunch courses at the top Sannomiya and Kitano teppanyaki counters run ¥6,000 to ¥12,000 for the same beef that costs double at dinner.", areas: ["Sannomiya", "Kitano", "Motomachi", "Harborland"], longtail: ["kobe beef lunch sannomiya", "certified kobe beef restaurant", "kobe beef teppanyaki price"] },
      { cuisine: "yakiniku", blurb: "Yakiniku is the cheaper way to eat Kobe and Tajima beef: grill it yourself in Sannomiya and Motomachi for ¥5,000 to ¥8,000 instead of a ¥20,000 teppanyaki course. The top-rated shops label the cuts by brand and grade.", areas: ["Sannomiya", "Motomachi"], longtail: ["kobe beef yakiniku cheap", "yakiniku sannomiya"] },
      { cuisine: "chinese", blurb: "Nankinmachi, Kobe's Chinatown, is smaller and older than Yokohama's and famous for butaman pork buns eaten standing in the street. The sit-down restaurants are rated harshly on Tabelog; the ones above 3.4 are a safe bet for a banquet-style dinner.", areas: ["Motomachi", "Nankinmachi", "Sannomiya"], longtail: ["nankinmachi butaman", "kobe chinatown restaurants"] },
      { cuisine: "sushi", blurb: "Kobe's sushi counters in Sannomiya and Motomachi work with Seto Inland Sea fish, and the city's top omakase counters are considerably easier to book than Osaka's or Kyoto's at similar Tabelog scores.", areas: ["Sannomiya", "Motomachi"], longtail: ["sushi kobe sannomiya", "omakase kobe"] },
      { cuisine: "izakaya", blurb: "Sannomiya's side streets and the arcades toward Motomachi are full of izakaya pouring Nada sake, often with the breweries' seasonal releases. Sobameshi and Akashi-yaki (dashi-dipped octopus dumplings) are the local plates.", areas: ["Sannomiya", "Motomachi", "Nada"], longtail: ["izakaya sannomiya", "nada sake bar kobe", "akashiyaki"] },
    ],
  },
  {
    slug: "hiroshima", name: "Hiroshima", ja: "広島", region: "Chugoku",
    tabelogArea: "hiroshima/A3401", center: { lat: 34.3955, lng: 132.4596 },
    intro: "Hiroshima's food is okonomiyaki (layered, with noodles, nothing like Osaka's), oysters from the bay in every form, anago (sea eel) over rice on Miyajima, and a spicy tsukemen style that locals eat at heat level 20. Okonomimura, a building of two dozen okonomiyaki counters, is the famous stop; the shops locals rate highest are elsewhere in the city center and in Hatchobori.\n\nTabelog is useful in Hiroshima because the city gets a lot of day-trippers and the restaurants nearest the Peace Park and the station are priced for them. The 3.5+ okonomiyaki counters are a few streets away.",
    tabelog: "Okonomiyaki in Hiroshima is rated across a narrow band; 3.4 to 3.6 are the beloved counters and the differences are about the noodles and the griddle skill. Oyster restaurants at 3.5+ are excellent. Miyajima's anago-meshi houses sit around 3.5 to 3.7.",
    nightlife: "Nagarekawa",
    areas: [
      { name: "Hatchobori & Hondori", note: "the shopping center with the best okonomiyaki counters and oyster bars" },
      { name: "Okonomimura", note: "the multi-story okonomiyaki building near Shintenchi" },
      { name: "Nagarekawa", note: "the bar and izakaya district" },
      { name: "Hiroshima Station", note: "Ekie food hall with okonomiyaki and anago for the train" },
      { name: "Miyajima", note: "oysters and anago-meshi on the island" },
    ],
    dishes: [
      { name: "Hiroshima okonomiyaki", note: "layered crepe, cabbage, pork, noodles and egg", cuisine: "okonomiyaki" },
      { name: "Oysters", note: "grilled, fried as kaki-furai, or raw, in season from November", cuisine: "seafood" },
      { name: "Anago-meshi", note: "grilled sea eel over rice, a Miyajima specialty", cuisine: "unagi" },
      { name: "Hiroshima tsukemen", note: "cold noodles dipped in a chili-hot sauce", cuisine: "ramen" },
    ],
    cuisines: [
      { cuisine: "okonomiyaki", blurb: "Hiroshima okonomiyaki is built in layers on the griddle: a thin crepe, a mountain of cabbage, pork, a layer of soba or udon noodles, and a fried egg, all pressed together and covered in sauce. Okonomimura has 24 counters under one roof, but the counters locals rate highest on Tabelog are on the streets around Hatchobori and Hondori. Eat it off the griddle with the small metal spatula.", areas: ["Hatchobori", "Hondori", "Okonomimura", "Hiroshima Station"], longtail: ["hiroshima okonomiyaki best tabelog", "okonomimura hiroshima", "okonomiyaki near hiroshima station"] },
      { cuisine: "seafood", blurb: "Hiroshima produces most of Japan's oysters and from November to March the city's oyster bars in Hatchobori and the stalls on Miyajima serve them grilled, raw, and fried as kaki-furai. The top-rated oyster restaurants on Tabelog are year-round and show the sourcing bay on the menu.", areas: ["Hatchobori", "Miyajima", "Hondori"], longtail: ["hiroshima oysters best restaurant", "kaki furai hiroshima", "oysters miyajima"] },
      { cuisine: "ramen", blurb: "Hiroshima has two noodle traditions: a mild soy ramen and the city's own tsukemen, cold noodles dipped into a chili-hot sesame sauce at a spice level you choose. The famous tsukemen shops are around Hatchobori and Nagarekawa and many run late for the bar crowd.", areas: ["Hatchobori", "Nagarekawa", "Hiroshima Station"], longtail: ["hiroshima tsukemen spicy", "ramen hiroshima late night"] },
      { cuisine: "izakaya", blurb: "Nagarekawa is Hiroshima's bar district and the izakaya there serve oysters, conger eel, and Setouchi lemon-flavored everything, with local sake from the Saijo brewing town. Prices are among the lowest of Japan's big cities.", areas: ["Nagarekawa", "Hatchobori"], longtail: ["izakaya nagarekawa hiroshima", "saijo sake hiroshima"] },
      { cuisine: "unagi", blurb: "Anago-meshi, grilled sea eel over rice, is Miyajima's signature and the century-old house by the ferry terminal is one of the highest-rated restaurants in the prefecture. Buy the bento version for the train if the queue is too long.", areas: ["Miyajima", "Hiroshima Station"], longtail: ["anago meshi miyajima", "anago bento hiroshima station"] },
    ],
  },
  {
    slug: "okinawa", name: "Okinawa", ja: "沖縄", region: "Okinawa",
    tabelogArea: "okinawa", center: { lat: 26.215, lng: 127.685 },
    intro: "Okinawa's food is its own cuisine, closer to the Ryukyu Kingdom and China than to the mainland: Okinawa soba (thick wheat noodles in pork broth), goya champuru, rafute pork belly, sea grapes, taco rice from the American bases, and awamori, the island's rice spirit. Naha is the center, with Kokusai Dori as the tourist strip and the Makishi public market as the real one, and the resort coast up through Chatan and Onna has its own scene.\n\nTabelog ratings in Okinawa separate the family-run shokudo diners and soba shops from the Kokusai Dori restaurants priced for tour groups. The best Okinawa soba in Naha is in residential neighborhoods and costs ¥700.",
    tabelog: "Okinawan restaurants rarely score above 3.5; a 3.3 to 3.4 shokudo or soba shop is a local institution. Steakhouses from the American era are rated for nostalgia as much as beef. Many places are cash only, which TabeDog shows.",
    nightlife: "Kokusai Dori",
    areas: [
      { name: "Kokusai Dori", note: "the main tourist street of Naha; busy, loud, and best for live-music izakaya" },
      { name: "Makishi Market", note: "the public market where you buy fish downstairs and have it cooked upstairs" },
      { name: "Sakaemachi", note: "a retro covered market that turns into Naha's best drinking alley at night" },
      { name: "Chatan & American Village", note: "the base-town coast: steak, taco rice and burgers" },
      { name: "Onna & Nago", note: "the resort coast with seaside soba shops and agu pork restaurants" },
    ],
    dishes: [
      { name: "Okinawa soba", note: "thick wheat noodles in pork broth with soki spare ribs", cuisine: "okinawan" },
      { name: "Goya champuru", note: "bitter melon stir-fried with tofu, egg and pork", cuisine: "okinawan" },
      { name: "Rafute", note: "pork belly braised in awamori and brown sugar", cuisine: "okinawan" },
      { name: "Taco rice", note: "taco meat over rice, born in a base town", cuisine: "steak" },
      { name: "Agu pork and Ishigaki beef", note: "the islands' own breeds, grilled or in shabu-shabu", cuisine: "steak" },
    ],
    cuisines: [
      { cuisine: "okinawan", blurb: "Naha's best Okinawa soba shops are in the neighborhoods behind Kokusai Dori and out toward Shuri, serving soki soba and tebichi (pig's trotter) soba for under ¥1,000 in rooms that have not changed in fifty years. For a full Okinawan dinner with awamori and sanshin music, the izakaya on and around Kokusai Dori and in Sakaemachi are the move. Tabelog's ratings point to the ones locals use.", areas: ["Kokusai Dori", "Makishi Market", "Sakaemachi", "Shuri"], longtail: ["okinawa soba naha best", "okinawan izakaya live music naha", "shokudo naha"] },
      { cuisine: "steak", blurb: "Okinawa's steakhouses date from the American occupation and serve big cuts with A1 sauce in diners open until 4 a.m.; eating steak after drinking is a Naha tradition. The top-rated ones on Tabelog in Naha and Chatan use local Ishigaki or Motobu beef. Taco rice, the base-town invention, is on every menu.", areas: ["Kokusai Dori", "Chatan", "Naha"], longtail: ["okinawa steak house late night", "taco rice naha", "ishigaki beef steak"] },
      { cuisine: "izakaya", blurb: "Okinawan izakaya pour awamori, the island rice spirit, alongside champuru, rafute, jimami tofu and umibudo sea grapes. Sakaemachi market in Naha becomes a maze of tiny bars after dark and is the most highly rated drinking district on the island.", areas: ["Sakaemachi", "Kokusai Dori", "Makishi Market"], longtail: ["sakaemachi naha bars", "awamori izakaya naha"] },
      { cuisine: "seafood", blurb: "Makishi Public Market in Naha lets you buy fish downstairs, including bright blue parrotfish and sea grapes, and have it cooked at the restaurants upstairs. The Tomari fish market on the harbor does sashimi and kaisendon at wholesale prices. Ratings matter because some upstairs stalls overcharge.", areas: ["Makishi Market", "Tomari", "Naha"], longtail: ["makishi market naha fish", "tomari fish market sashimi"] },
    ],
  },
  {
    slug: "kanazawa", name: "Kanazawa", ja: "金沢", region: "Hokuriku",
    tabelogArea: "ishikawa/A1701", center: { lat: 36.5613, lng: 136.6562 },
    intro: "Kanazawa is the best seafood city in Japan that most visitors have never eaten in. The Sea of Japan coast delivers nodoguro (blackthroat seaperch), snow crab in winter, sweet shrimp and yellowtail to Omicho Market every morning, and the city's sushi counters serve fish of Tokyo quality at half the price with no waiting list. Kaga cuisine, the local kaiseki tradition built on the Maeda clan's wealth, is served in old samurai and geisha districts.\n\nOmicho Market is the center of everything and the kaisendon stalls inside it are rated with precision on Tabelog, which matters because the ones at the busiest entrances are not the ones locals queue at.",
    tabelog: "Kanazawa sushi counters at 3.6+ would be 3.9 in Tokyo; book them. Omicho kaisendon stalls at 3.4+ are excellent. Kaga kaiseki houses sit around 3.6 to 3.9 and lunch is the way in.",
    nightlife: "Katamachi",
    areas: [
      { name: "Omicho Market", note: "the 300-year-old seafood market with kaisendon stalls and sushi counters" },
      { name: "Higashi Chaya", note: "the geisha district: tea houses, gold-leaf sweets and kaiseki" },
      { name: "Katamachi & Korinbo", note: "the downtown with izakaya, oden bars and sushi counters" },
      { name: "Kanazawa Station", note: "the modern hub with a strong food hall" },
      { name: "Nagamachi", note: "the samurai district with quiet Kaga cuisine restaurants" },
    ],
    dishes: [
      { name: "Kaisendon", note: "sweet shrimp, crab, nodoguro and yellowtail over rice at Omicho", cuisine: "seafood" },
      { name: "Nodoguro", note: "the fatty blackthroat seaperch, grilled or as nigiri", cuisine: "sushi" },
      { name: "Kaga kaiseki", note: "the local haute cuisine with jibuni duck stew and gold leaf", cuisine: "kaiseki" },
      { name: "Kanazawa oden", note: "winter oden with crab shells and local vegetables", cuisine: "izakaya" },
      { name: "Hanton rice", note: "omurice topped with fried fish and tartar sauce, a Kanazawa yoshoku original", cuisine: "kissaten" },
    ],
    cuisines: [
      { cuisine: "sushi", blurb: "Kanazawa sushi is the best value in Japan: Sea of Japan fish landed that morning, nodoguro and sweet shrimp as standard pieces, and omakase for ¥8,000 to ¥15,000 at counters rated as highly as Tokyo's ¥30,000 ones. The top counters are around Omicho Market, Katamachi and the station, and most can be booked a few days ahead.", areas: ["Omicho Market", "Katamachi", "Kanazawa Station", "Korinbo"], longtail: ["kanazawa sushi best value", "nodoguro sushi kanazawa", "omakase kanazawa reservation"] },
      { cuisine: "seafood", blurb: "Omicho Market has been Kanazawa's kitchen for 300 years and its kaisendon stalls pile sweet shrimp, crab, ikura and nodoguro on rice from early morning. Snow crab season (November to March) is the time to visit. Tabelog's ratings sort the stalls locals use from the ones with English touts at the main gate.", areas: ["Omicho Market", "Katamachi"], longtail: ["omicho market kaisendon", "snow crab kanazawa", "omicho market best stall"] },
      { cuisine: "kaiseki", blurb: "Kaga ryori is Kanazawa's own kaiseki tradition: jibuni (duck stew), treasure-ship sashimi platters, and gold leaf on the dessert, served in Higashi Chaya tea houses and Nagamachi samurai residences. The top houses are rated 3.7+ and far easier to book than Kyoto's.", areas: ["Higashi Chaya", "Nagamachi", "Katamachi"], longtail: ["kaga ryori kanazawa", "kaiseki higashi chaya", "jibuni"] },
      { cuisine: "izakaya", blurb: "Katamachi and Korinbo are Kanazawa's nightlife and their izakaya pour Ishikawa sake with Sea of Japan sashimi and the city's unusual oden (crab shells, kanazawa vegetables). Several oden bars have been open for 90 years and are rated accordingly.", areas: ["Katamachi", "Korinbo", "Kanazawa Station"], longtail: ["kanazawa oden", "izakaya katamachi", "ishikawa sake bar"] },
    ],
  },
  {
    slug: "nara", name: "Nara", ja: "奈良", region: "Kansai",
    tabelogArea: "nara/A2901", center: { lat: 34.6843, lng: 135.8279 },
    intro: "Nara is a day trip from Kyoto or Osaka for most visitors, which means its food is overlooked. It should not be: Nara has kakinoha-zushi (mackerel sushi wrapped in persimmon leaves), chagayu (tea rice porridge), Miwa somen noodles, Yamato beef, and a dense cluster of excellent, inexpensive restaurants and kissaten in Naramachi, the old merchant district a ten-minute walk from the deer park.\n\nThe restaurants around Nara Park and Kintetsu-Nara station are priced for day-trippers; the Tabelog ratings point you into Naramachi's side streets where locals eat lunch for ¥1,200.",
    tabelog: "Nara graders are moderate: 3.4 is a strong recommendation for anything casual. The handful of kaiseki and sushi houses at 3.6+ are among the best in Kansai and reservations are easy compared with Kyoto.",
    nightlife: "Sanjo-dori",
    areas: [
      { name: "Naramachi", note: "the old merchant quarter with machiya restaurants, cafes and sake bars" },
      { name: "Sanjo-dori", note: "the main street from JR Nara to the park, lined with restaurants" },
      { name: "Nara Park", note: "the temple and deer area; a few historic restaurants, many tourist ones" },
      { name: "Kintetsu-Nara Station", note: "arcades with quick lunches and the famous mochi-pounding shop" },
    ],
    dishes: [
      { name: "Kakinoha-zushi", note: "mackerel or salmon pressed sushi wrapped in persimmon leaves", cuisine: "sushi" },
      { name: "Chagayu", note: "rice porridge cooked in roasted tea, Nara's breakfast", cuisine: "kaiseki" },
      { name: "Miwa somen", note: "the thinnest hand-pulled noodles in Japan, from nearby Miwa", cuisine: "udon" },
      { name: "Yamato beef", note: "Nara's own wagyu brand", cuisine: "yakiniku" },
    ],
    cuisines: [
      { cuisine: "sushi", blurb: "Nara's sushi tradition is kakinoha-zushi, mackerel and salmon pressed on rice and wrapped in antibacterial persimmon leaves, sold by century-old shops in Naramachi and at the stations. For nigiri, a few counters near Kintetsu-Nara are rated far above their prices on Tabelog.", areas: ["Naramachi", "Kintetsu-Nara Station", "Sanjo-dori"], longtail: ["kakinoha zushi nara", "persimmon leaf sushi", "sushi nara"] },
      { cuisine: "kaiseki", blurb: "Nara's kaiseki houses in Naramachi and near Nara Park serve Yamato cuisine: chagayu tea porridge, local vegetables, and Yamato beef, in machiya and temple-adjacent rooms. The top-rated ones are a third the price of Kyoto equivalents and can usually be booked a week out.", areas: ["Naramachi", "Nara Park"], longtail: ["chagayu nara", "kaiseki nara naramachi", "yamato cuisine"] },
      { cuisine: "izakaya", blurb: "Naramachi has a small, very good izakaya and sake-bar scene: Nara is where sake brewing began, and the local breweries' seasonal bottles are poured in machiya bars along with Yamato beef and local vegetables.", areas: ["Naramachi", "Sanjo-dori"], longtail: ["nara sake bar naramachi", "izakaya nara"] },
      { cuisine: "kissaten", blurb: "Naramachi's machiya have been turned into some of the most atmospheric cafes in Kansai, serving kuzu-mochi, matcha and lunch sets in old merchant houses with courtyard gardens. The retro kissaten on Sanjo-dori date from the 1960s.", areas: ["Naramachi", "Sanjo-dori"], longtail: ["cafe naramachi machiya", "kissaten nara"] },
    ],
  },
];

// ---- lookups ----
export const cityBySlug = (slug: string) => CITIES.find((c) => c.slug === slug);
export const cuisineBySlug = (slug: string) => CUISINES.find((c) => c.slug === slug);
export const cityCuisine = (city: City, slug: string) => city.cuisines.find((c) => c.cuisine === slug);
/** Cities that have a hand-written page for this cuisine. */
export const citiesForCuisine = (slug: string) => CITIES.filter((c) => c.cuisines.some((cc) => cc.cuisine === slug));
export const CITY_SLUGS = CITIES.map((c) => c.slug);
export const CUISINE_SLUGS = CUISINES.map((c) => c.slug);
export const cityUrl = (city: string) => `/${city}`;
export const cityCuisineUrl = (city: string, cuisine: string) => `/${city}/${cuisine}`;
export const cuisineUrl = (cuisine: string) => `/cuisine/${cuisine}`;

/** "Open the map" link that works without an account: enters guest mode, then opens the app on this city/cuisine, best-rated first. */
export function mapHref(opts: { city?: City; q?: string } = {}) {
  const h = new URLSearchParams();
  if (opts.q) h.set("q", opts.q);
  if (opts.city) {
    h.set("sort", "rating");
    h.set("range", "C");
    h.set("clat", String(opts.city.center.lat));
    h.set("clng", String(opts.city.center.lng));
  }
  const next = h.size ? `/#${h}` : "/";
  return `/auth/guest?next=${encodeURIComponent(next)}`;
}

/** Who runs the site, for /about and the 特定商取引法 disclosure. */
export const OPERATOR = {
  name: "Joseph L",
  email: "hi@jajabuilds.com",
  // Under the 特定商取引法 an individual seller may disclose address and phone on request instead of on the page.
  addressNote: "Disclosed without delay on request to the contact email above.",
  phoneNote: "Disclosed without delay on request to the contact email above.",
} as const;

/** Every city × cuisine page that exists, for the sitemap, footer and static params. */
export function allCityCuisinePages() {
  return CITIES.flatMap((city) => city.cuisines.map((cc) => ({ city, cuisine: cuisineBySlug(cc.cuisine)!, cc })));
}

/** The long-tail links the landing page and footer point at: one standout dish per city. */
export const FEATURED: { city: string; cuisine: string; label: string }[] = [
  { city: "tokyo", cuisine: "sushi", label: "Lunch omakase sushi in Ginza, Tokyo" },
  { city: "tokyo", cuisine: "ramen", label: "Late-night ramen in Shinjuku" },
  { city: "osaka", cuisine: "okonomiyaki", label: "Okonomiyaki near Dotonbori, Osaka" },
  { city: "osaka", cuisine: "yakiniku", label: "Yakiniku in Tsuruhashi, Osaka" },
  { city: "kyoto", cuisine: "kaiseki", label: "Kaiseki lunch in Gion, Kyoto" },
  { city: "kyoto", cuisine: "ramen", label: "Ichijoji ramen street, Kyoto" },
  { city: "fukuoka", cuisine: "ramen", label: "Hakata tonkotsu ramen, Fukuoka" },
  { city: "fukuoka", cuisine: "nabe", label: "Motsunabe hot pot in Fukuoka" },
  { city: "sapporo", cuisine: "ramen", label: "Miso ramen in Susukino, Sapporo" },
  { city: "sapporo", cuisine: "seafood", label: "Kaisendon at Nijo Market, Sapporo" },
  { city: "nagoya", cuisine: "unagi", label: "Hitsumabushi eel in Nagoya" },
  { city: "yokohama", cuisine: "chinese", label: "Yokohama Chinatown's best restaurants" },
  { city: "kobe", cuisine: "steak", label: "Certified Kobe beef lunch in Sannomiya" },
  { city: "hiroshima", cuisine: "okonomiyaki", label: "Hiroshima-style okonomiyaki" },
  { city: "okinawa", cuisine: "okinawan", label: "Okinawa soba in Naha" },
  { city: "kanazawa", cuisine: "sushi", label: "Nodoguro sushi at Omicho Market, Kanazawa" },
];

// ---- FAQ builders ----
export type Faq = { q: string; a: string };

export function cityCuisineFaqs(city: City, cuisine: Cuisine, cc: CityCuisine): Faq[] {
  const areas = cc.areas;
  const areaList = areas.length > 2 ? `${areas.slice(0, -1).join(", ")} and ${areas[areas.length - 1]}` : areas.join(" and ");
  const faqs: Faq[] = [
    { q: `Where is the best ${cuisine.name.toLowerCase()} in ${city.name}?`, a: `${areaList} are where ${city.name}'s top-rated ${cuisine.name.toLowerCase()} clusters on Tabelog. ${cc.blurb.split(". ")[0]}. TabeDog shows every listing in those neighborhoods on one map, sorted by Tabelog score, distance or price.` },
    { q: `How much does ${cuisine.name.toLowerCase()} cost in ${city.name}?`, a: `Lunch: ${cuisine.lunch}. Dinner: ${cuisine.dinner}. TabeDog shows each restaurant's lunch and dinner price band before you go.` },
    { q: `What is a good Tabelog score for ${cuisine.name.toLowerCase()} in ${city.name}?`, a: `${cuisine.score} ${city.tabelog}` },
    { q: `Which neighborhood in ${city.name} should I stay in for ${cuisine.name.toLowerCase()}?`, a: `${areas[0]}. ${city.areas.find((x) => x.name.includes(areas[0]))?.note ? city.areas.find((x) => x.name.includes(areas[0]))!.note.charAt(0).toUpperCase() + city.areas.find((x) => x.name.includes(areas[0]))!.note.slice(1) + "." : `It is one of the main areas for ${cuisine.name.toLowerCase()} in ${city.name}.`} ${areas[1] ? `${areas[1]} is the alternative.` : ""}` },
  ];
  if (cuisine.lateNight) {
    faqs.push({ q: `Where can I find ${cuisine.name.toLowerCase()} in ${city.name} late at night?`, a: `${city.nightlife} is ${city.name}'s main late-night district, so start there. TabeDog shows opening hours for every listing and marks what is open right now, so you can filter to what is actually serving.` });
  }
  faqs.push({ q: `Which ${cuisine.name.toLowerCase()} in ${city.name} accepts credit cards?`, a: `Many small ${cuisine.name.toLowerCase()} shops in Japan are cash only. TabeDog shows whether each restaurant accepts credit cards, IC cards or QR payment, pulled from its Tabelog listing, so you know before you sit down.` });
  return faqs;
}

export function cityFaqs(city: City): Faq[] {
  const top = city.cuisines.slice(0, 3).map((cc) => cuisineBySlug(cc.cuisine)!.name.toLowerCase());
  return [
    { q: `What food is ${city.name} famous for?`, a: `${city.dishes.map((d) => d.name).join(", ")}. ${city.dishes[0].note.charAt(0).toUpperCase() + city.dishes[0].note.slice(1)}.` },
    { q: `Where should I eat in ${city.name}?`, a: `${city.areas.slice(0, 3).map((a) => `${a.name} for ${a.note}`).join("; ")}. The pages for ${top.join(", ")} in ${city.name} go neighborhood by neighborhood.` },
    { q: `What is a good Tabelog rating in ${city.name}?`, a: city.tabelog },
    { q: `Is Tabelog available in English for ${city.name}?`, a: `Tabelog has a limited English site, but most listings, reviews and the useful details (hours, prices, payment methods) are only in Japanese. TabeDog shows ${city.name}'s restaurants on an English map with those details translated, using Tabelog's own ratings.` },
    { q: `How do I avoid tourist traps in ${city.name}?`, a: `Use the Tabelog score, not the sign. Restaurants with big English signs and touts near ${city.areas[0].name} typically rate 3.0 or lower; the ones locals queue for rate 3.4 and up and are often a street or two away. TabeDog puts both on the same map so the difference is visible.` },
  ];
}

export function cuisineFaqs(cuisine: Cuisine): Faq[] {
  const cities = citiesForCuisine(cuisine.slug);
  return [
    { q: `How do I order ${cuisine.name.toLowerCase()} in Japan?`, a: cuisine.order },
    { q: `How much does ${cuisine.name.toLowerCase()} cost in Japan?`, a: `Lunch: ${cuisine.lunch}. Dinner: ${cuisine.dinner}.` },
    { q: `What is a good Tabelog score for ${cuisine.name.toLowerCase()}?`, a: cuisine.score },
    { q: `Do I need a reservation?`, a: cuisine.reservation },
    { q: `Which city in Japan is best for ${cuisine.name.toLowerCase()}?`, a: `${cities.map((c) => c.name).join(", ")} each have a dedicated page. ${cities[0] ? `${cities[0].name}: ${cityCuisine(cities[0], cuisine.slug)!.blurb.split(". ")[0]}.` : ""}` },
  ];
}

export const LANDING_FAQS: Faq[] = [
  { q: "What is TabeDog?", a: "TabeDog is an English map of Japan's restaurants built on Tabelog ratings. Search near you or in any city, filter by cuisine, price, opening hours and whether a place is open right now, and see hours, prices and payment methods in English. It is an independent project and is not affiliated with Tabelog or Kakaku.com." },
  { q: "Is Tabelog available in English?", a: "Tabelog has a partial English site, but most of its listings, reviews, hours and payment details are Japanese only and the English map search is limited. TabeDog shows Tabelog's ratings on a full English map with those details translated, so foreigners can use the same scores Japanese diners rely on." },
  { q: "What does a Tabelog rating of 3.5 mean?", a: "Tabelog scores run from 1 to 5 but almost nothing scores above 4. The average restaurant is around 3.0 to 3.2. A 3.5 puts a restaurant in roughly the top 3 to 5 percent in Japan and usually means a queue. Above 3.7 is a destination; above 4.0 is one of the best restaurants in the country. The scale is deliberately harsh, which is why it works." },
  { q: "Why are Tabelog ratings lower than Google ratings?", a: "Google ratings in Japan cluster between 4.0 and 4.5 for almost everything, so they cannot tell a great restaurant from an average one. Tabelog weights reviewers by their track record and compresses scores, so a difference of 0.2 is meaningful. Japanese diners choose where to eat by Tabelog score, not Google stars." },
  { q: "How do I find authentic Japanese restaurants and avoid tourist traps?", a: "Trust the Tabelog score over the sign. Restaurants with English touts and big photo menus near major stations and sights typically rate 3.0 or below; the places locals queue for rate 3.4 and up and are often a street away. TabeDog shows them on the same map with the score, so the difference is obvious." },
  { q: "Is TabeDog free?", a: `Yes. Searching the map, filtering by cuisine, price and hours, and seeing restaurant details is free. TabeDog Premium (¥${SITE.premiumYen} a month, cancel any time) adds saved restaurant lists, AI restaurant recommendations, AI search in plain English and curated local guides.` },
  { q: "What does TabeDog Premium include?", a: `TabeDog Premium is ¥${SITE.premiumYen} a month and includes four things: saved restaurant lists that appear as pins on the map, AI recommendations that pick top-rated Tabelog restaurants near you for what you feel like eating, AI search that understands requests like "late-night ramen near Shinjuku that takes cards", and curated local guides of the restaurants Japanese diners actually go to in each city and neighborhood.` },
  { q: "What is the best app for finding restaurants in Japan?", a: "For eating like a local, an app built on Tabelog ratings beats one built on Google reviews, because Japanese diners choose restaurants by Tabelog score and Google rates almost everything in Japan 4.0 to 4.5. TabeDog is the only English app that shows Tabelog ratings for every restaurant in Japan on a map with hours, prices and payment methods, which is why travelers and residents use it as their everyday Japanese food app." },
  { q: "How do locals find restaurants in Japan?", a: "Japanese diners search Tabelog by area and cuisine, sort by score, check the Hyakumeiten (Top 100) lists, and book popular counters weeks ahead. They rarely use Google Maps ratings. TabeDog gives you the same workflow in English: search near a station, filter by cuisine and score, see what is open, and save the places you want to a list." },
  { q: "Which cities does TabeDog cover?", a: "All of Japan. Tabelog lists every restaurant in the country, so TabeDog works anywhere from Sapporo to Okinawa. The city guides on this site cover Tokyo, Osaka, Kyoto, Fukuoka, Sapporo, Nagoya, Yokohama, Kobe, Hiroshima, Okinawa, Kanazawa and Nara in detail." },
  { q: "Can I see whether a restaurant takes credit cards or is open now?", a: "Yes. TabeDog shows each restaurant's opening hours and marks whether it is open at this moment, and shows whether it accepts credit cards, IC cards, QR payment or cash only, pulled from its Tabelog listing. Both matter in Japan, where many small restaurants are cash only and close when they sell out." },
];
