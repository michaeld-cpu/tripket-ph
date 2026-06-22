// ─────────── Philippine provinces & port cities ───────────
// A curated list of provinces and their port-relevant cities/municipalities,
// used by the "Add port" dialog so operators pick from a structured list
// instead of free-typing. This is a stand-in for the backend's province field
// — when the API exposes provinces/cities, swap PH_PROVINCES for a fetch and
// the dialog keeps working unchanged.
//
// `suggestCode` derives a sensible 3-letter port code from a city name; the
// dialog pre-fills it and the operator can override.

export type PHProvince = {
  name: string;
  /** Port-relevant cities / municipalities in this province. */
  cities: string[];
};

export const PH_PROVINCES: PHProvince[] = [
  { name: "Cebu",                 cities: ["Cebu City", "Toledo City", "Danao City", "Santa Fe", "Hagnaya"] },
  { name: "Negros Oriental",      cities: ["Dumaguete City", "Bais City", "Sibulan", "Tampi"] },
  { name: "Negros Occidental",    cities: ["Bacolod City", "Bredco Port", "San Carlos City", "Escalante City"] },
  { name: "Bohol",                cities: ["Tagbilaran City", "Tubigon", "Jagna", "Ubay", "Talibon"] },
  { name: "Leyte",                cities: ["Ormoc City", "Baybay City", "Hilongos", "Palompon"] },
  { name: "Southern Leyte",       cities: ["Maasin City", "Liloan", "San Ricardo"] },
  { name: "Zamboanga del Norte",  cities: ["Dapitan City", "Dipolog City"] },
  { name: "Zamboanga City",       cities: ["Zamboanga City"] },
  { name: "Batangas",             cities: ["Batangas City", "Calaca", "Lemery"] },
  { name: "Oriental Mindoro",     cities: ["Calapan City", "Puerto Galera", "Pinamalayan", "Roxas"] },
  { name: "Occidental Mindoro",   cities: ["San Jose", "Abra de Ilog"] },
  { name: "Metro Manila",         cities: ["Manila", "Pasay"] },
  { name: "Palawan",              cities: ["Puerto Princesa", "Coron", "El Nido"] },
  { name: "Iloilo",               cities: ["Iloilo City", "Dumangas"] },
  { name: "Guimaras",             cities: ["Jordan", "Buenavista"] },
  { name: "Capiz",                cities: ["Roxas City", "Culasi"] },
  { name: "Aklan",                cities: ["Caticlan", "Kalibo", "Dumaguit"] },
  { name: "Antique",              cities: ["San Jose de Buenavista", "Caluya"] },
  { name: "Romblon",              cities: ["Romblon", "Odiongan", "San Agustin"] },
  { name: "Masbate",              cities: ["Masbate City", "Cataingan"] },
  { name: "Sorsogon",             cities: ["Matnog", "Bulan"] },
  { name: "Northern Samar",       cities: ["Allen", "Catarman"] },
  { name: "Samar",                cities: ["Catbalogan City", "Calbayog City"] },
  { name: "Camiguin",             cities: ["Mambajao", "Benoni"] },
  { name: "Misamis Oriental",     cities: ["Cagayan de Oro", "Balingoan"] },
  { name: "Misamis Occidental",   cities: ["Ozamiz City", "Plaridel"] },
  { name: "Lanao del Norte",      cities: ["Iligan City"] },
  { name: "Davao del Sur",        cities: ["Davao City"] },
  { name: "Surigao del Norte",    cities: ["Surigao City", "Dapa", "Dinagat"] },
  { name: "Dinagat Islands",      cities: ["San Jose"] },
  { name: "Basilan",              cities: ["Isabela City", "Lamitan City"] },
  { name: "Sulu",                 cities: ["Jolo"] },
  { name: "Tawi-Tawi",            cities: ["Bongao"] },
];

/** Flat, de-duplicated list of all port cities across provinces, with their
 *  province — used by the searchable city picker in the Add-port dialog. */
export type PHCity = { city: string; province: string };
export const PH_CITIES: PHCity[] = PH_PROVINCES.flatMap((p) =>
  p.cities.map((city) => ({ city, province: p.name })),
);

const STOP_WORDS = new Set(["city", "de", "del", "of", "the", "port"]);

// Canonical, fixed city codes. A city's code is the SAME no matter how many
// ports/terminals exist there (Cebu is always "CEB"). Mirrors the seed PORTS
// codes; cities not listed fall back to a derived code (still deterministic).
export const CITY_CODES: Record<string, string> = {
  "Cebu City": "CEB",
  "Dumaguete City": "DGT",
  "Tagbilaran City": "TAG",
  "Ormoc City": "ORM",
  "Bacolod City": "BAC",
  "Dapitan City": "DAP",
  "Batangas City": "BAT",
  "Calapan City": "CAL",
  "Manila": "MNL",
  "Puerto Princesa": "PPS",
  "Iloilo City": "ILO",
};

/**
 * The fixed city code for a city. Deterministic and stable — the same city
 * always returns the same code regardless of how many ports it has. Uses the
 * canonical map first, then a derived 3-letter code for cities not yet mapped.
 */
export function cityCode(city: string): string {
  return CITY_CODES[city.trim()] ?? suggestCode(city);
}

/** Derive a 3-letter code from a city name (fallback for unmapped cities). */
export function suggestCode(city: string): string {
  const words = city
    .trim()
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  // First letter of the first up-to-three significant words.
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}
