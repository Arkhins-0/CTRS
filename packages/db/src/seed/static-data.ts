/**
 * Hand-maintained enrichment the Ergast/Jolpica API doesn't provide:
 * team colours, principals, power units, car models, country codes,
 * circuit stats. Everything here is editable later through the CMS —
 * this only gives the seed a complete starting point.
 */

/** Ergast constructorId → canonical team (identity survives rebrands). */
export const CONSTRUCTOR_TO_TEAM: Record<
  string,
  { slug: string; name: string; fullName: string; base: string; countryCode: string; firstEntryYear: number; championships: number }
> = {
  mclaren: { slug: "mclaren", name: "McLaren", fullName: "McLaren Formula 1 Team", base: "Woking, United Kingdom", countryCode: "GB", firstEntryYear: 1966, championships: 10 },
  ferrari: { slug: "ferrari", name: "Ferrari", fullName: "Scuderia Ferrari HP", base: "Maranello, Italy", countryCode: "IT", firstEntryYear: 1950, championships: 16 },
  red_bull: { slug: "red-bull-racing", name: "Red Bull Racing", fullName: "Oracle Red Bull Racing", base: "Milton Keynes, United Kingdom", countryCode: "AT", firstEntryYear: 2005, championships: 6 },
  mercedes: { slug: "mercedes", name: "Mercedes", fullName: "Mercedes-AMG PETRONAS F1 Team", base: "Brackley, United Kingdom", countryCode: "DE", firstEntryYear: 1954, championships: 8 },
  aston_martin: { slug: "aston-martin", name: "Aston Martin", fullName: "Aston Martin Aramco F1 Team", base: "Silverstone, United Kingdom", countryCode: "GB", firstEntryYear: 2021, championships: 0 },
  alpine: { slug: "alpine", name: "Alpine", fullName: "BWT Alpine F1 Team", base: "Enstone, United Kingdom", countryCode: "FR", firstEntryYear: 2021, championships: 0 },
  haas: { slug: "haas", name: "Haas", fullName: "MoneyGram Haas F1 Team", base: "Kannapolis, United States", countryCode: "US", firstEntryYear: 2016, championships: 0 },
  rb: { slug: "racing-bulls", name: "Racing Bulls", fullName: "Visa Cash App Racing Bulls F1 Team", base: "Faenza, Italy", countryCode: "IT", firstEntryYear: 2006, championships: 0 },
  williams: { slug: "williams", name: "Williams", fullName: "Atlassian Williams Racing", base: "Grove, United Kingdom", countryCode: "GB", firstEntryYear: 1977, championships: 9 },
  // Sauber rebranded to Audi for 2026 — same canonical team row
  sauber: { slug: "audi", name: "Audi", fullName: "Audi F1 Team", base: "Hinwil, Switzerland", countryCode: "DE", firstEntryYear: 1993, championships: 0 },
  audi: { slug: "audi", name: "Audi", fullName: "Audi F1 Team", base: "Hinwil, Switzerland", countryCode: "DE", firstEntryYear: 1993, championships: 0 },
  cadillac: { slug: "cadillac", name: "Cadillac", fullName: "Cadillac Formula 1 Team", base: "Fishers, United States", countryCode: "US", firstEntryYear: 2026, championships: 0 },
};

type SeasonTeamInfo = {
  displayName: string;
  shortName: string;
  primaryColor: string;
  secondaryColor?: string;
  principal: string;
  powerUnit: string;
  carModel: string;
};

/** Per-season entry details keyed by season → constructorId. */
export const TEAM_SEASON_INFO: Record<number, Record<string, SeasonTeamInfo>> = {
  2025: {
    mclaren: { displayName: "McLaren Formula 1 Team", shortName: "McLaren", primaryColor: "#FF8000", secondaryColor: "#47C7FC", principal: "Andrea Stella", powerUnit: "Mercedes", carModel: "MCL39" },
    ferrari: { displayName: "Scuderia Ferrari HP", shortName: "Ferrari", primaryColor: "#E80020", secondaryColor: "#FFF200", principal: "Frédéric Vasseur", powerUnit: "Ferrari", carModel: "SF-25" },
    red_bull: { displayName: "Oracle Red Bull Racing", shortName: "Red Bull Racing", primaryColor: "#3671C6", secondaryColor: "#CC1E4A", principal: "Laurent Mekies", powerUnit: "Honda RBPT", carModel: "RB21" },
    mercedes: { displayName: "Mercedes-AMG PETRONAS F1 Team", shortName: "Mercedes", primaryColor: "#27F4D2", secondaryColor: "#000000", principal: "Toto Wolff", powerUnit: "Mercedes", carModel: "W16" },
    aston_martin: { displayName: "Aston Martin Aramco F1 Team", shortName: "Aston Martin", primaryColor: "#229971", secondaryColor: "#CEDC00", principal: "Andy Cowell", powerUnit: "Mercedes", carModel: "AMR25" },
    alpine: { displayName: "BWT Alpine F1 Team", shortName: "Alpine", primaryColor: "#00A1E8", secondaryColor: "#FF87BC", principal: "Flavio Briatore", powerUnit: "Renault", carModel: "A525" },
    haas: { displayName: "MoneyGram Haas F1 Team", shortName: "Haas", primaryColor: "#B6BABD", secondaryColor: "#E10600", principal: "Ayao Komatsu", powerUnit: "Ferrari", carModel: "VF-25" },
    rb: { displayName: "Visa Cash App Racing Bulls F1 Team", shortName: "Racing Bulls", primaryColor: "#6692FF", secondaryColor: "#FFFFFF", principal: "Laurent Mekies / Alan Permane", powerUnit: "Honda RBPT", carModel: "VCARB 02" },
    williams: { displayName: "Atlassian Williams Racing", shortName: "Williams", primaryColor: "#64C4FF", secondaryColor: "#00234A", principal: "James Vowles", powerUnit: "Mercedes", carModel: "FW47" },
    sauber: { displayName: "Stake F1 Team Kick Sauber", shortName: "Kick Sauber", primaryColor: "#52E252", secondaryColor: "#000000", principal: "Jonathan Wheatley", powerUnit: "Ferrari", carModel: "C45" },
  },
  2026: {
    mclaren: { displayName: "McLaren Formula 1 Team", shortName: "McLaren", primaryColor: "#FF8000", secondaryColor: "#47C7FC", principal: "Andrea Stella", powerUnit: "Mercedes", carModel: "MCL40" },
    ferrari: { displayName: "Scuderia Ferrari HP", shortName: "Ferrari", primaryColor: "#E80020", secondaryColor: "#FFF200", principal: "Frédéric Vasseur", powerUnit: "Ferrari", carModel: "SF-26" },
    red_bull: { displayName: "Oracle Red Bull Racing", shortName: "Red Bull Racing", primaryColor: "#3671C6", secondaryColor: "#CC1E4A", principal: "Laurent Mekies", powerUnit: "Red Bull Ford Powertrains", carModel: "RB22" },
    mercedes: { displayName: "Mercedes-AMG PETRONAS F1 Team", shortName: "Mercedes", primaryColor: "#27F4D2", secondaryColor: "#000000", principal: "Toto Wolff", powerUnit: "Mercedes", carModel: "W17" },
    aston_martin: { displayName: "Aston Martin Aramco Honda F1 Team", shortName: "Aston Martin", primaryColor: "#229971", secondaryColor: "#CEDC00", principal: "Andy Cowell", powerUnit: "Honda", carModel: "AMR26" },
    alpine: { displayName: "BWT Alpine F1 Team", shortName: "Alpine", primaryColor: "#00A1E8", secondaryColor: "#FF87BC", principal: "Steve Nielsen", powerUnit: "Mercedes", carModel: "A526" },
    haas: { displayName: "MoneyGram Haas F1 Team", shortName: "Haas", primaryColor: "#B6BABD", secondaryColor: "#E10600", principal: "Ayao Komatsu", powerUnit: "Ferrari", carModel: "VF-26" },
    rb: { displayName: "Visa Cash App Racing Bulls F1 Team", shortName: "Racing Bulls", primaryColor: "#6692FF", secondaryColor: "#FFFFFF", principal: "Alan Permane", powerUnit: "Red Bull Ford Powertrains", carModel: "VCARB 03" },
    williams: { displayName: "Atlassian Williams Racing", shortName: "Williams", primaryColor: "#64C4FF", secondaryColor: "#00234A", principal: "James Vowles", powerUnit: "Mercedes", carModel: "FW48" },
    audi: { displayName: "Audi F1 Team", shortName: "Audi", primaryColor: "#BB0A30", secondaryColor: "#0F0F0F", principal: "Jonathan Wheatley", powerUnit: "Audi", carModel: "R26" },
    cadillac: { displayName: "Cadillac Formula 1 Team", shortName: "Cadillac", primaryColor: "#1C2C5B", secondaryColor: "#C8A652", principal: "Graeme Lowdon", powerUnit: "Ferrari", carModel: "CT-01" },
  },
};

/** Ergast nationality string → ISO 3166-1 alpha-2 code. */
export const NATIONALITY_TO_CODE: Record<string, string> = {
  British: "GB", Dutch: "NL", Monegasque: "MC", Spanish: "ES", Mexican: "MX",
  German: "DE", Finnish: "FI", Australian: "AU", Canadian: "CA", Japanese: "JP",
  Chinese: "CN", Thai: "TH", Danish: "DK", French: "FR", Italian: "IT",
  American: "US", Brazilian: "BR", Argentine: "AR", "Argentinian ": "AR", Argentinian: "AR",
  "New Zealander": "NZ", Swedish: "SE", Swiss: "CH", Belgian: "BE", Austrian: "AT",
  Polish: "PL", Russian: "RU", Indonesian: "ID", Estonian: "EE",
};

/** Circuit country string → ISO code. */
export const COUNTRY_TO_CODE: Record<string, string> = {
  Australia: "AU", China: "CN", Japan: "JP", Bahrain: "BH", "Saudi Arabia": "SA",
  USA: "US", "United States": "US", Italy: "IT", Monaco: "MC", Canada: "CA",
  Spain: "ES", Austria: "AT", UK: "GB", "United Kingdom": "GB", "Great Britain": "GB",
  Hungary: "HU", Belgium: "BE", Netherlands: "NL", Azerbaijan: "AZ", Singapore: "SG",
  Mexico: "MX", Brazil: "BR", Qatar: "QA", UAE: "AE", "United Arab Emirates": "AE",
  Portugal: "PT", France: "FR", Germany: "DE", Turkey: "TR", Russia: "RU",
  Vietnam: "VN", "South Korea": "KR", India: "IN", Malaysia: "MY", "South Africa": "ZA",
};

/** Circuit stats the API doesn't carry (lengthKm, raceLaps, firstGpYear). */
export const CIRCUIT_STATS: Record<string, { lengthKm: number; raceLaps: number; firstGpYear?: number }> = {
  albert_park: { lengthKm: 5.278, raceLaps: 58, firstGpYear: 1996 },
  shanghai: { lengthKm: 5.451, raceLaps: 56, firstGpYear: 2004 },
  suzuka: { lengthKm: 5.807, raceLaps: 53, firstGpYear: 1987 },
  bahrain: { lengthKm: 5.412, raceLaps: 57, firstGpYear: 2004 },
  jeddah: { lengthKm: 6.174, raceLaps: 50, firstGpYear: 2021 },
  miami: { lengthKm: 5.412, raceLaps: 57, firstGpYear: 2022 },
  imola: { lengthKm: 4.909, raceLaps: 63, firstGpYear: 1980 },
  monaco: { lengthKm: 3.337, raceLaps: 78, firstGpYear: 1950 },
  catalunya: { lengthKm: 4.657, raceLaps: 66, firstGpYear: 1991 },
  villeneuve: { lengthKm: 4.361, raceLaps: 70, firstGpYear: 1978 },
  red_bull_ring: { lengthKm: 4.318, raceLaps: 71, firstGpYear: 1970 },
  silverstone: { lengthKm: 5.891, raceLaps: 52, firstGpYear: 1950 },
  spa: { lengthKm: 7.004, raceLaps: 44, firstGpYear: 1950 },
  hungaroring: { lengthKm: 4.381, raceLaps: 70, firstGpYear: 1986 },
  zandvoort: { lengthKm: 4.259, raceLaps: 72, firstGpYear: 1952 },
  monza: { lengthKm: 5.793, raceLaps: 53, firstGpYear: 1950 },
  baku: { lengthKm: 6.003, raceLaps: 51, firstGpYear: 2016 },
  marina_bay: { lengthKm: 4.94, raceLaps: 62, firstGpYear: 2008 },
  americas: { lengthKm: 5.513, raceLaps: 56, firstGpYear: 2012 },
  rodriguez: { lengthKm: 4.304, raceLaps: 71, firstGpYear: 1963 },
  interlagos: { lengthKm: 4.309, raceLaps: 71, firstGpYear: 1973 },
  vegas: { lengthKm: 6.201, raceLaps: 50, firstGpYear: 2023 },
  losail: { lengthKm: 5.419, raceLaps: 57, firstGpYear: 2021 },
  yas_marina: { lengthKm: 5.281, raceLaps: 58, firstGpYear: 2009 },
  madring: { lengthKm: 5.474, raceLaps: 57, firstGpYear: 2026 },
  sepang: { lengthKm: 5.543, raceLaps: 56, firstGpYear: 1999 },
};

/** Points schemes per season. */
export const SEASON_POINTS: Record<number, { race: number[]; sprint: number[]; fastestLapPoint: boolean }> = {
  2025: { race: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], sprint: [8, 7, 6, 5, 4, 3, 2, 1], fastestLapPoint: false },
  2026: { race: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], sprint: [8, 7, 6, 5, 4, 3, 2, 1], fastestLapPoint: false },
};
