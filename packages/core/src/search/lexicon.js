// Vocabulary for "smart search": words people type → TMDB discover filters.
//
// Each concept:
//   id, label, kind ("industry" | "genre" | "mood" | "network" | "format")
//   aliases: lowercase phrases (1–3 words) that mean this concept
//   movie / tv: discover params for that format, or null if it doesn't apply
//   regional: true for smaller catalogs → lower vote thresholds so rows aren't empty
//   prefer: "tv" when the concept is mainly about series (e.g. K-drama)
//
// Merging rules for combined searches live in smartSearch.js.

const lang = (code, country) => ({
  with_original_language: code,
  ...(country ? { with_origin_country: country } : {}),
});
const country = (codes) => ({ with_origin_country: codes });
const genres = (movie, tv) => ({ movie: movie ? { with_genres: movie } : null, tv: tv ? { with_genres: tv } : null });

const both = (params) => ({ movie: params, tv: params });

export const CONCEPTS = [
  // ───────── Film industries, countries & languages ─────────
  { id: "bollywood", label: "Bollywood", kind: "industry", regional: true, aliases: ["bollywood", "hindi", "hindi movies", "hindi films", "desi"], ...both(lang("hi", "IN")) },
  { id: "tollywood", label: "Telugu", kind: "industry", regional: true, aliases: ["tollywood", "telugu"], ...both(lang("te")) },
  { id: "kollywood", label: "Tamil", kind: "industry", regional: true, aliases: ["kollywood", "tamil"], ...both(lang("ta")) },
  { id: "mollywood", label: "Malayalam", kind: "industry", regional: true, aliases: ["mollywood", "malayalam"], ...both(lang("ml")) },
  { id: "sandalwood", label: "Kannada", kind: "industry", regional: true, aliases: ["sandalwood", "kannada"], ...both(lang("kn")) },
  { id: "indian", label: "Indian", kind: "industry", regional: true, aliases: ["indian", "india"], ...both(country("IN")) },
  { id: "pakistani", label: "Pakistani", kind: "industry", regional: true, aliases: ["pakistani", "lollywood", "urdu"], ...both(country("PK")) },
  { id: "nollywood", label: "Nollywood", kind: "industry", regional: true, aliases: ["nollywood", "nigerian", "nigeria", "naija"], ...both(country("NG")) },
  { id: "ghanaian", label: "Ghanaian", kind: "industry", regional: true, aliases: ["ghanaian", "ghana", "ghallywood", "kumawood"], ...both(country("GH")) },
  { id: "south-african", label: "South African", kind: "industry", regional: true, aliases: ["south african", "south africa", "mzansi"], ...both(country("ZA")) },
  { id: "kenyan", label: "Kenyan", kind: "industry", regional: true, aliases: ["kenyan", "kenya", "riverwood"], ...both(country("KE")) },
  { id: "african", label: "African", kind: "industry", regional: true, aliases: ["african", "africa"], ...both(country("NG|GH|ZA|KE|EG|SN|CM|TZ|UG|ET|CI|MA")) },
  { id: "hollywood", label: "Hollywood", kind: "industry", aliases: ["hollywood", "american"], ...both(lang("en", "US")) },
  { id: "british", label: "British", kind: "industry", aliases: ["british", "uk", "brit"], ...both(country("GB")) },
  { id: "korean", label: "Korean", kind: "industry", regional: true, aliases: ["korean", "korea", "hallyu"], ...both(lang("ko")) },
  { id: "kdrama", label: "K-Drama", kind: "industry", regional: true, aliases: ["k drama", "kdrama", "k dramas", "kdramas", "korean drama", "korean dramas"], prefer: "tv", movie: { with_original_language: "ko", with_genres: "18" }, tv: { with_original_language: "ko", with_genres: "18" } },
  { id: "japanese", label: "Japanese", kind: "industry", regional: true, aliases: ["japanese", "japan", "j drama", "jdrama"], ...both(lang("ja")) },
  { id: "anime", label: "Anime", kind: "industry", regional: true, aliases: ["anime", "animes", "japanese animation"], prefer: "tv", ...both({ with_original_language: "ja", with_genres: "16" }) },
  { id: "chinese", label: "Chinese", kind: "industry", regional: true, aliases: ["chinese", "china", "c drama", "cdrama", "mandarin"], ...both(lang("zh")) },
  { id: "hong-kong", label: "Hong Kong", kind: "industry", regional: true, aliases: ["hong kong", "cantonese"], ...both(country("HK")) },
  { id: "thai", label: "Thai", kind: "industry", regional: true, aliases: ["thai", "thailand", "thai drama", "lakorn"], ...both(lang("th")) },
  { id: "filipino", label: "Filipino", kind: "industry", regional: true, aliases: ["filipino", "pinoy", "philippines", "tagalog"], ...both(country("PH")) },
  { id: "indonesian", label: "Indonesian", kind: "industry", regional: true, aliases: ["indonesian", "indonesia"], ...both(country("ID")) },
  { id: "turkish", label: "Turkish", kind: "industry", regional: true, aliases: ["turkish", "turkey", "dizi"], ...both(lang("tr")) },
  { id: "arabic", label: "Arabic", kind: "industry", regional: true, aliases: ["arabic", "arab", "egyptian", "egypt"], ...both(lang("ar")) },
  { id: "persian", label: "Iranian", kind: "industry", regional: true, aliases: ["iranian", "persian", "iran"], ...both(lang("fa")) },
  { id: "french", label: "French", kind: "industry", regional: true, aliases: ["french", "france"], ...both(lang("fr")) },
  { id: "spanish", label: "Spanish", kind: "industry", regional: true, aliases: ["spanish", "spain"], ...both(lang("es", "ES")) },
  { id: "latin", label: "Latin American", kind: "industry", regional: true, aliases: ["latin", "latino", "latin american", "mexican", "mexico", "colombian", "argentinian"], ...both(country("MX|CO|AR|CL|PE|VE")) },
  { id: "telenovela", label: "Telenovela", kind: "industry", regional: true, aliases: ["telenovela", "telenovelas", "novela", "novelas"], prefer: "tv", movie: null, tv: { with_original_language: "es", with_genres: "10766|18" } },
  { id: "brazilian", label: "Brazilian", kind: "industry", regional: true, aliases: ["brazilian", "brazil"], ...both(country("BR")) },
  { id: "german", label: "German", kind: "industry", regional: true, aliases: ["german", "germany"], ...both(lang("de")) },
  { id: "italian", label: "Italian", kind: "industry", regional: true, aliases: ["italian", "italy"], ...both(lang("it")) },
  { id: "nordic", label: "Nordic", kind: "industry", regional: true, aliases: ["nordic", "scandinavian", "nordic noir", "swedish", "danish", "norwegian"], ...both(country("SE|DK|NO|FI|IS")) },
  { id: "russian", label: "Russian", kind: "industry", regional: true, aliases: ["russian", "russia"], ...both(lang("ru")) },
  { id: "australian", label: "Australian", kind: "industry", regional: true, aliases: ["australian", "australia", "aussie"], ...both(country("AU")) },

  // ───────── Genres ─────────
  { id: "action", label: "Action", kind: "genre", aliases: ["action", "action packed", "fight", "fighting"], ...genres("28", "10759") },
  { id: "adventure", label: "Adventure", kind: "genre", aliases: ["adventure", "adventures"], ...genres("12", "10759") },
  { id: "animation", label: "Animated", kind: "genre", aliases: ["animation", "animated", "cartoon", "cartoons"], ...genres("16", "16") },
  { id: "comedy", label: "Comedy", kind: "genre", aliases: ["comedy", "comedies", "funny", "hilarious", "humor", "humour", "laugh", "sitcom", "sitcoms"], ...genres("35", "35") },
  { id: "crime", label: "Crime", kind: "genre", aliases: ["crime", "gangster", "gangsters", "mafia", "mob", "detective", "cop"], ...genres("80", "80") },
  { id: "documentary", label: "Documentary", kind: "genre", aliases: ["documentary", "documentaries", "docuseries", "docu", "docs"], ...genres("99", "99") },
  { id: "drama", label: "Drama", kind: "genre", aliases: ["drama", "dramas", "emotional"], ...genres("18", "18") },
  { id: "family", label: "Family", kind: "genre", aliases: ["family", "family friendly", "kids", "children", "childrens"], movie: { with_genres: "10751" }, tv: { with_genres: "10751|10762" } },
  { id: "fantasy", label: "Fantasy", kind: "genre", aliases: ["fantasy", "magic", "magical"], ...genres("14", "10765") },
  { id: "history", label: "Historical", kind: "genre", aliases: ["history", "historical", "period", "period drama", "biopic", "biography"], ...genres("36", null) },
  { id: "horror", label: "Horror", kind: "genre", aliases: ["horror", "scary", "spooky", "creepy", "frightening", "slasher"], ...genres("27", null) },
  { id: "music", label: "Music", kind: "genre", aliases: ["music", "musical", "musicals", "concert"], ...genres("10402", null) },
  { id: "mystery", label: "Mystery", kind: "genre", aliases: ["mystery", "mysteries", "whodunit", "whodunnit"], ...genres("9648", "9648") },
  { id: "romance", label: "Romance", kind: "genre", aliases: ["romance", "romantic", "love story", "love stories", "love"], ...genres("10749", null) },
  { id: "scifi", label: "Sci-Fi", kind: "genre", aliases: ["sci fi", "scifi", "science fiction", "space", "futuristic"], ...genres("878", "10765") },
  { id: "thriller", label: "Thriller", kind: "genre", aliases: ["thriller", "thrillers", "suspense", "suspenseful", "psychological thriller"], ...genres("53", "80|9648") },
  { id: "war", label: "War", kind: "genre", aliases: ["war", "military", "army", "soldier"], ...genres("10752", "10768") },
  { id: "western", label: "Western", kind: "genre", aliases: ["western", "westerns", "cowboy", "cowboys"], ...genres("37", "37") },
  { id: "reality", label: "Reality", kind: "genre", aliases: ["reality", "reality tv", "reality show", "reality shows"], movie: null, tv: { with_genres: "10764" } },
  { id: "talk", label: "Talk Show", kind: "genre", aliases: ["talk show", "talk shows", "late night"], movie: null, tv: { with_genres: "10767" } },
  { id: "soap", label: "Soap Opera", kind: "genre", aliases: ["soap", "soaps", "soap opera", "soap operas"], movie: null, tv: { with_genres: "10766" } },

  // ───────── Moods & blends ─────────
  { id: "romcom", label: "Romantic Comedy", kind: "mood", aliases: ["romcom", "romcoms", "rom com", "rom coms", "romantic comedy", "romantic comedies"], movie: { with_genres: "10749,35" }, tv: { with_genres: "35", with_keywords: "9799" } },
  { id: "feel-good", label: "Feel-Good", kind: "mood", aliases: ["feel good", "feelgood", "wholesome", "uplifting", "heartwarming"], movie: { with_genres: "35|10751", "vote_average.gte": 7 }, tv: { with_genres: "35|10751", "vote_average.gte": 7.5 } },
  { id: "superhero", label: "Superhero", kind: "mood", aliases: ["superhero", "superheroes", "super hero", "comic book"], ...both({ with_keywords: "9715" }) },

  // ───────── Studios (IDs verified against TMDB) ─────────
  { id: "marvel", label: "Marvel", kind: "studio", aliases: ["marvel", "marvel studios", "mcu"], ...both({ with_companies: "420" }) },
  { id: "dc", label: "DC", kind: "studio", aliases: ["dc", "dc comics", "dc studios", "dceu"], ...both({ with_companies: "128064|9993|184898" }) },
  { id: "pixar", label: "Pixar", kind: "studio", aliases: ["pixar"], ...both({ with_companies: "3" }) },
  { id: "disney", label: "Disney", kind: "studio", aliases: ["disney", "walt disney", "disney animation"], movie: { with_companies: "2|6125" }, tv: { with_companies: "2|6125" } },
  { id: "dreamworks", label: "DreamWorks", kind: "studio", aliases: ["dreamworks", "dreamworks animation"], ...both({ with_companies: "521" }) },
  { id: "ghibli", label: "Studio Ghibli", kind: "studio", aliases: ["ghibli", "studio ghibli"], ...both({ with_companies: "10342" }) },
  { id: "illumination", label: "Illumination", kind: "studio", aliases: ["illumination"], ...both({ with_companies: "6704" }) },
  { id: "a24", label: "A24", kind: "studio", aliases: ["a24"], ...both({ with_companies: "41077|293354" }) },
  { id: "blumhouse", label: "Blumhouse", kind: "studio", aliases: ["blumhouse"], ...both({ with_companies: "3172" }) },
  { id: "lucasfilm", label: "Lucasfilm", kind: "studio", aliases: ["lucasfilm"], ...both({ with_companies: "1" }) },
  { id: "warner", label: "Warner Bros.", kind: "studio", aliases: ["warner bros", "warner brothers", "warner"], ...both({ with_companies: "174" }) },
  { id: "universal", label: "Universal", kind: "studio", aliases: ["universal", "universal pictures"], ...both({ with_companies: "33" }) },
  { id: "paramount", label: "Paramount", kind: "studio", aliases: ["paramount pictures"], ...both({ with_companies: "4" }) },
  { id: "sony-animation", label: "Sony Animation", kind: "studio", aliases: ["sony animation", "sony pictures animation"], ...both({ with_companies: "2251" }) },
  { id: "aardman", label: "Aardman", kind: "studio", aliases: ["aardman"], ...both({ with_companies: "297" }) },
  { id: "laika", label: "Laika", kind: "studio", aliases: ["laika"], ...both({ with_companies: "11537" }) },
  { id: "legendary", label: "Legendary", kind: "studio", aliases: ["legendary pictures", "monsterverse"], ...both({ with_companies: "923" }) },
  { id: "yash-raj", label: "Yash Raj", kind: "studio", regional: true, aliases: ["yash raj", "yash raj films", "yrf"], ...both({ with_companies: "1569" }) },
  { id: "dharma", label: "Dharma Productions", kind: "studio", regional: true, aliases: ["dharma", "dharma productions"], ...both({ with_companies: "19146" }) },
  { id: "red-chillies", label: "Red Chillies", kind: "studio", regional: true, aliases: ["red chillies", "red chillies entertainment"], ...both({ with_companies: "2343" }) },
  { id: "t-series", label: "T-Series", kind: "studio", regional: true, aliases: ["t series", "tseries"], ...both({ with_companies: "3522" }) },
  { id: "excel", label: "Excel Entertainment", kind: "studio", regional: true, aliases: ["excel entertainment"], ...both({ with_companies: "2934" }) },
  { id: "hombale", label: "Hombale Films", kind: "studio", regional: true, aliases: ["hombale", "hombale films"], ...both({ with_companies: "111627" }) },
  { id: "anthill", label: "Anthill Studios", kind: "studio", regional: true, aliases: ["anthill", "anthill studios"], ...both({ with_companies: "172248" }) },
  { id: "inkblot", label: "Inkblot", kind: "studio", regional: true, aliases: ["inkblot", "inkblot productions"], ...both({ with_companies: "102730" }) },

  // ───────── Streaming services (series) ─────────
  { id: "netflix", label: "Netflix", kind: "network", aliases: ["netflix"], movie: null, tv: { with_networks: "213" } },
  { id: "hbo", label: "HBO", kind: "network", aliases: ["hbo", "hbo max"], movie: null, tv: { with_networks: "49" } },
  { id: "disney-plus", label: "Disney+", kind: "network", aliases: ["disney plus", "disney+", "disneyplus"], movie: null, tv: { with_networks: "2739" } },
  { id: "apple-tv", label: "Apple TV+", kind: "network", aliases: ["apple tv", "apple tv+", "appletv"], movie: null, tv: { with_networks: "2552" } },
  { id: "prime-video", label: "Prime Video", kind: "network", aliases: ["prime video", "amazon prime", "amazon prime video"], movie: null, tv: { with_networks: "1024" } },
  { id: "hulu", label: "Hulu", kind: "network", aliases: ["hulu"], movie: null, tv: { with_networks: "453" } },
  { id: "bbc", label: "BBC", kind: "network", aliases: ["bbc"], movie: null, tv: { with_networks: "4" } },
  { id: "amc", label: "AMC", kind: "network", aliases: ["amc"], movie: null, tv: { with_networks: "174" } },
  { id: "peacock", label: "Peacock", kind: "network", aliases: ["peacock"], movie: null, tv: { with_networks: "3353" } },
  { id: "paramount-plus", label: "Paramount+", kind: "network", aliases: ["paramount plus", "paramount+"], movie: null, tv: { with_networks: "4330" } },
];

// Words that pick a format.
export const FORMAT_WORDS = {
  movie: ["movie", "movies", "film", "films", "flick", "flicks", "cinema"],
  tv: ["series", "show", "shows", "tv", "tv show", "tv shows", "tv series", "season", "seasons", "episodes"],
};

// Words that pick an ordering.
export const SORT_WORDS = {
  rated: ["best", "top", "top rated", "greatest", "highest rated", "acclaimed", "award winning", "must watch", "must see", "good", "great"],
  newest: ["new", "newest", "latest", "recent", "fresh", "new releases", "just released"],
  popular: ["popular", "trending", "hot", "viral", "most watched"],
  upcoming: ["upcoming", "coming soon", "unreleased"],
  classic: ["classic", "classics", "old", "oldies", "retro", "vintage"],
};

// Filler words ignored when the rest of the query is understood ("show me some bollywood movies").
export const FILLER_WORDS = [
  "a", "an", "the", "of", "in", "on", "and", "or", "with", "from", "about", "for", "to", "me", "my",
  "some", "any", "all", "show me", "give me", "find", "i", "want", "watch", "to watch", "something",
  "please", "list", "recommend", "recommendations", "suggestions", "like", "type", "kind", "genre",
];

const DECADE_WORDS = {
  sixties: 1960, seventies: 1970, eighties: 1980, nineties: 1990, "two thousands": 2000, noughties: 2000,
};

// "90s", "1990s", "'90s", "nineties", "2015", "2020s" → { from, to, label }
export const parseYearToken = (token) => {
  if (DECADE_WORDS[token]) {
    const d = DECADE_WORDS[token];
    return { from: d, to: d + 9, label: `${d}s` };
  }
  let m = token.match(/^(19|20)(\d)0s$/);
  if (m) {
    const d = Number(`${m[1]}${m[2]}0`);
    return { from: d, to: d + 9, label: `${d}s` };
  }
  m = token.match(/^(\d)0s$/);
  if (m) {
    const n = Number(m[1]);
    const d = n >= 3 ? 1900 + n * 10 : 2000 + n * 10; // 80s → 1980s, 00s/10s/20s → 2000s…
    return { from: d, to: d + 9, label: `${d}s` };
  }
  m = token.match(/^(19[2-9]\d|20[0-4]\d)$/);
  if (m) {
    const y = Number(m[1]);
    return { from: y, to: y, label: String(y) };
  }
  return null;
};
