/**
 * Real CTR Sports data extracted from official sources:
 * www.ctrsports.in, the CTR–JK Tyre INCRC 2026 deck, the World of CTR deck,
 * and the press-meet LED banners. Placeholder entries are clearly marked and
 * fully editable in the CMS.
 */

export const BRAND = {
  org: "CTR Unified",
  teamName: "Chennai Turbo Riders",
  championship: "CTR–JK Tyre FMSCI Indian National Car Racing Championship",
  championshipShort: "INCRC 2026",
  tagline: "One Nation. One Championship.",
  legacyLine: "From Passion to Purpose. From Track to Legacy.",
  address: "29, Tilak Street, T. Nagar, Chennai, Tamil Nadu 600017",
  phone: "9500016999",
  email: "admin@ctrsports.in",
  accent: "#FFC800",
};

export const PEOPLE = {
  teamPrincipal: { name: "Keerthivasan", title: "Team Principal, CTR" },
  directors: [
    {
      name: "Dr. Swetha Sundeep Anand",
      title: "Director, CTR (Chennai Turbo Riders)",
      quote:
        "From competing on the track to organizing the nation's biggest racing spectacle—CTR is proud to lead the CTR JK Tyre FMSCI Indian National Car Racing Championship 2026. This is more than a championship; it's the beginning of a new era for Indian motorsport.",
    },
    {
      name: "Dr. J. L. Sri Rakshika",
      title: "Director, CTR",
      quote:
        "From taking the track in 2022 to partnering with the legendary JK Tyre for the CTR–JK Tyre FMSCI Indian National Car Racing Championship 2026—this is only the beginning. My ambition is simple: race by race, more young racers, more teams, and many more women drivers ruling the track.",
    },
  ],
};

export const CIRCUITS = [
  {
    slug: "kari-motor-speedway",
    name: "Kari Motor Speedway",
    officialName: "Kari Motor Speedway, Chettipalayam",
    locality: "Coimbatore",
    country: "India",
    countryCode: "IN",
    lengthKm: 2.1,
    turns: 15,
    direction: "Clockwise",
    fiaGrade: "3",
    owner: "B. Vijay Kumar (LG Sports)",
    website: "https://lgsports.co.in",
    lapRecord: "1:03.296",
    lapRecordYear: 2024,
    firstGpYear: 2003,
    description:
      "A technical, tight circuit named in memory of legendary Indian racer and constructor S. Karivardhan. The cradle of Indian grassroots motorsport, the Coimbatore track has launched generations of racing careers — and hosts the opening two rounds of the 2026 championship.",
    photoAsset: "assets/circuits/circuit1.webp",
    mapAsset: "assets/circuits/map1.webp",
  },
  {
    slug: "bren-raceway",
    name: "Bren Raceway",
    officialName: "Bren Raceway, Doddaballapur",
    locality: "Bengaluru",
    country: "India",
    countryCode: "IN",
    lengthKm: 4.1,
    turns: 14,
    direction: "Clockwise",
    fiaGrade: "2",
    owner: "Boopesh Reddy (Bren Garage)",
    website: "https://brengarage.com",
    lapRecord: null,
    lapRecordYear: null,
    firstGpYear: 2024,
    description:
      "FIA Grade 2 specification private racetrack designed for testing, performance driving, and exclusive motorsport events. Bengaluru's new 4.1 km international circuit at Doddaballapur joins the national calendar for the first time in 2026.",
    photoAsset: "assets/circuits/circuit2.webp",
    mapAsset: "assets/circuits/map2.webp",
  },
  {
    slug: "madras-international-circuit",
    name: "Madras International Circuit",
    officialName: "Madras International Circuit, Irungattukottai",
    locality: "Chennai",
    country: "India",
    countryCode: "IN",
    lengthKm: 3.71,
    turns: 12,
    direction: "Clockwise",
    fiaGrade: "2",
    owner: "Madras Motor Sports Club",
    website: "https://en.madrasmotorsports.com",
    lapRecord: "1:30.323",
    lapRecordYear: 2020,
    firstGpYear: 1990,
    description:
      "India's original permanent race track, home of Indian national racing since 1990. A long back straight into a hairpin — the season's decider, hosting the 2026 finale on CTR's home soil.",
    photoAsset: "assets/circuits/circuit3.webp",
    mapAsset: "assets/circuits/map3.webp",
  },
];

/** Reusable brand/content assets from the existing CTR site repo (webp). */
export const ASSET_SOURCE_DIR = "C:/Users/Arkhins/Documents/Projects/CTR_Sports_New/public";

export const BRAND_ASSETS = [
  { key: "ctr-logo", path: "images/brand/ctr-logo.webp", alt: "CTR logo" },
  { key: "jktyre-logo", path: "assets/incrc/introduction/jktyre.webp", alt: "JK Tyre" },
  { key: "fmsci-logo", path: "assets/incrc/introduction/fmsci.webp", alt: "FMSCI" },
  { key: "ctr-partner", path: "assets/incrc/introduction/ctr.webp", alt: "Chennai Turbo Riders" },
  { key: "cars-lineup", path: "images/incrc/cars-lineup.webp", alt: "The multi-category INCRC grid line-up" },
  { key: "one-nation", path: "images/incrc/one-nation.webp", alt: "One Nation, One Championship — Kari Motor Speedway render" },
  { key: "family", path: "images/incrc/family.webp", alt: "The motorsport family on the grid" },
  { key: "signing-1", path: "images/incrc/signing-1.webp", alt: "CTR, JK Tyre and FMSCI sign the championship agreement" },
  { key: "signing-2", path: "images/incrc/signing-2.webp", alt: "The partnership handshake" },
  { key: "signing-3", path: "images/incrc/signing-3.webp", alt: "Leadership with the signed agreement" },
  { key: "hero-bg", path: "images/hero/background.webp", alt: "CTR hero background" },
  { key: "banner-1", path: "assets/incrc/banners/banner1.webp", alt: "INCRC banner" },
  { key: "banner-2", path: "assets/incrc/banners/banner2.webp", alt: "The Team has been forged. The Track awaits the Winners." },
  { key: "banner-3", path: "assets/incrc/banners/banner3.webp", alt: "INCRC banner" },
  { key: "banner-4", path: "assets/incrc/banners/banner4.webp", alt: "INCRC banner" },
  { key: "banner-5", path: "assets/incrc/banners/banner5.webp", alt: "INCRC banner" },
  { key: "crest-racing", path: "assets/landing/crest/national-racing.webp", alt: "INCRC crest" },
];

/** Vision cards (official copy). */
export const VISION = [
  { title: "Elevate Indian motorsport", body: "Raise the standard of competitive racing across all categories on India's finest circuits." },
  { title: "Inspire the next generation", body: "Nurture and develop the next wave of Indian racing champions from grassroots to national level." },
  { title: "Build a world-class ecosystem", body: "Create a self-sustaining motorsport infrastructure with safety, broadcast and fan engagement at its core." },
  { title: "Position India globally", body: "Establish India as a premier motorsport destination, attracting international talent and investment." },
];

/** 2026 calendar — 4 rounds (from the official championship deck). */
export const ROUNDS = [
  { round: 1, circuit: "kari-motor-speedway", city: "Coimbatore", start: "2026-09-11", end: "2026-09-13" },
  { round: 2, circuit: "kari-motor-speedway", city: "Coimbatore", start: "2026-10-23", end: "2026-10-25" },
  { round: 3, circuit: "bren-raceway", city: "Bengaluru", start: "2026-11-13", end: "2026-11-15" },
  { round: 4, circuit: "madras-international-circuit", city: "Chennai", start: "2026-12-11", end: "2026-12-13" },
];

/** The 7 racing categories (official). */
export const CATEGORIES = [
  {
    slug: "indian-super-touring-cars",
    name: "Indian Super Touring Cars",
    shortName: "ISC",
    color: "#E10600",
    carSpec: "The premier tin-top class — high-spec touring cars built to national Super Touring regulations.",
    description:
      "The headline act of the championship. India's fastest touring cars, professional teams and the country's most experienced tin-top racers fighting for the premier national title.",
  },
  {
    slug: "indian-touring-cars",
    name: "Indian Touring Cars",
    shortName: "ITC",
    color: "#FFC800",
    carSpec: "Race-prepared touring cars to Indian Touring Car regulations.",
    description:
      "The traditional heart of Indian circuit racing — closely-matched touring cars where craft and consistency decide championships.",
  },
  {
    slug: "indian-junior-touring-cars",
    name: "Indian Junior Touring Cars",
    shortName: "IJTC",
    color: "#3671C6",
    carSpec: "Junior-specification touring cars — the stepping stone into tin-top racing.",
    description:
      "Where the next generation of touring car stars earn their stripes before graduating to ITC and ISC machinery.",
  },
  {
    slug: "super-stock",
    name: "Super Stock",
    shortName: "SS",
    color: "#27AE60",
    carSpec: "Production-based stock cars with controlled preparation for cost-capped racing.",
    description:
      "Affordable, fiercely competitive racing in near-showroom machinery — the most accessible four-wheel class on the grid.",
  },
  {
    slug: "levitas-cup",
    name: "Levitas Cup",
    shortName: "LEV",
    color: "#9B59B6",
    carSpec: "One-make cup machinery — identical cars, driver-decided results.",
    description:
      "A single-make cup where every car is equal and only the driver makes the difference. Pure, unfiltered racing.",
  },
  {
    slug: "formula-lgb-f4",
    name: "Formula LGB F4",
    shortName: "LGB F4",
    color: "#FF6B1A",
    carSpec: "India's classic single-seater — the Formula LGB chassis that has schooled a generation of open-wheel racers.",
    description:
      "The proving ground of Indian single-seater racing. Slicks, wings and slipstream battles from lights to flag.",
  },
  {
    slug: "formula-1300",
    name: "Formula 1300",
    shortName: "F1300",
    color: "#00A8C6",
    carSpec: "Entry-level single-seaters — the Novice Cup for first-time formula racers.",
    description:
      "The first rung on the single-seater ladder. New racers, low costs, and the same dream every champion started with.",
  },
];

/** Teams — CTR is real; the rest are PLACEHOLDER entries editable in the CMS. */
export const TEAMS = [
  {
    slug: "chennai-turbo-riders",
    name: "CTR Racing",
    fullName: "Chennai Turbo Riders",
    base: "Chennai, Tamil Nadu",
    firstEntryYear: 2022,
    color: "#FFC800",
    secondary: "#1B2A6B",
    principal: "Keerthivasan",
    placeholder: false,
    description:
      "The team that became a championship. Chennai Turbo Riders took to the track in 2022 and now leads the CTR–JK Tyre FMSCI Indian National Car Racing Championship — racing under its own banner while building the platform for Indian motorsport's next generation.",
  },
  { slug: "kovai-speed-syndicate", name: "Kovai Speed Syndicate", fullName: "Kovai Speed Syndicate (placeholder)", base: "Coimbatore, Tamil Nadu", firstEntryYear: 2026, color: "#E10600", secondary: "#15151E", principal: "TBA", placeholder: true },
  { slug: "bengaluru-apex-motorsport", name: "Bengaluru Apex Motorsport", fullName: "Bengaluru Apex Motorsport (placeholder)", base: "Bengaluru, Karnataka", firstEntryYear: 2026, color: "#3671C6", secondary: "#FFFFFF", principal: "TBA", placeholder: true },
  { slug: "madras-racing-collective", name: "Madras Racing Collective", fullName: "Madras Racing Collective (placeholder)", base: "Chennai, Tamil Nadu", firstEntryYear: 2026, color: "#27AE60", secondary: "#15151E", principal: "TBA", placeholder: true },
  { slug: "southern-velocity", name: "Southern Velocity Racing", fullName: "Southern Velocity Racing (placeholder)", base: "Hyderabad, Telangana", firstEntryYear: 2026, color: "#9B59B6", secondary: "#FFFFFF", principal: "TBA", placeholder: true },
  { slug: "garuda-performance", name: "Garuda Performance", fullName: "Garuda Performance (placeholder)", base: "Pune, Maharashtra", firstEntryYear: 2026, color: "#FF6B1A", secondary: "#15151E", principal: "TBA", placeholder: true },
];

/** PLACEHOLDER driver name pool — 8 per category, all CMS-editable. */
export const DRIVER_POOL = [
  "Arjun Menon", "Karthik Iyer", "Vikram Nair", "Aditya Rao", "Rahul Deshmukh", "Pranav Kumar", "Siddharth Pillai", "Ashwin Raj",
  "Dhruv Sharma", "Nikhil Reddy", "Varun Krishnan", "Rohan Patil", "Akash Verma", "Sanjay Gowda", "Harish Balan", "Manoj Srinivas",
  "Kavya Ramesh", "Aniruddh Joshi", "Tejas Kulkarni", "Ritvik Anand", "Shreyas Hegde", "Abhinav Das", "Farhan Sheikh", "Vivek Chandran",
  "Meera Subramaniam", "Ishaan Kapoor", "Yash Thakur", "Adithya Varma", "Kiran Shetty", "Suraj Naidu", "Devang Mehta", "Lokesh Prabhu",
  "Ananya Krishnamurthy", "Raghav Bhatt", "Naveen Sekar", "Arvind Swamy", "Jaidev Singh", "Parth Desai", "Gautham Ravi", "Sameer Khan",
  "Divya Venkatesh", "Nitin Bose", "Ajay Mohan", "Vishal Dutta", "Rakesh Yadav", "Sachin Murthy", "Aravind Selvam", "Imran Ali",
  "Priya Narayanan", "Kunal Bajaj", "Surya Prakash", "Vinay Kamath", "Rohit Chawla", "Deepak Nambiar", "Arun Vijay", "Mohit Agarwal",
] as const;

/** Ticket tiers (from the official LED banners). */
export const TICKET_TIERS = [
  {
    name: "Grand Stand",
    strap: "The best seats. The true atmosphere.",
    features: ["Grandstand race view", "Food court access", "Car fest", "Go-karting", "Music & entertainment"],
  },
  {
    name: "Riders Terrace",
    strap: "If you want to experience motorsport in style…",
    features: ["Premium race view near the pit lane", "Photo booth", "Complimentary refreshments", "Food court access", "Car fest", "Go-karting", "Music & entertainment"],
  },
  {
    name: "Turbo Deck",
    strap: "This isn't just a ticket. It's the ultimate race day experience.",
    features: ["Full championship access", "Complimentary food", "Premium hospitality", "The best viewing experience"],
  },
  {
    name: "CTR Executive Lounge",
    strap: "If you want the ultimate VIP experience…",
    features: ["Premium viewing deck", "Premium food service", "Air-conditioned lounge", "Pit access", "Food court access", "Car fest", "Go-karting", "Music & entertainment"],
  },
];

/** Partners (from the associates + partner LED banners). */
export const PARTNERS: { name: string; tier: "global_partner" | "official_partner" | "supplier"; label?: string }[] = [
  { name: "JK Tyre", tier: "global_partner", label: "Title Partner" },
  { name: "FMSCI", tier: "global_partner", label: "Sanctioning Body" },
  { name: "Bhaarath Medical College and Hospital", tier: "official_partner", label: "CTR Associate" },
  { name: "Bharath Institute of Higher Education and Research", tier: "official_partner", label: "CTR Associate" },
  { name: "Accord Group of Companies", tier: "official_partner", label: "CTR Associate" },
  { name: "Jollo X Digital Engineering", tier: "supplier", label: "Digital Partner" },
  { name: "Jollo Experiences Pvt. Ltd.", tier: "supplier", label: "Event Partner" },
];

/** CTR Unified — the wider sports collective (from ctrsports.in). */
export const CTR_UNIFIED_TEAMS = [
  { sport: "Field Hockey", team: "Accord Tamil Nadu Dragons" },
  { sport: "Pickleball", team: "Chennai Super Warriors" },
  { sport: "Volleyball", team: "Kasi Warriors" },
  { sport: "Cricket", team: "Ossudu Accord Warriors" },
];

export const SOCIAL_LINKS = [
  { platform: "instagram", url: "https://www.instagram.com/incrc_/" },
  { platform: "facebook", url: "https://www.facebook.com/chennaiturboriders" },
  { platform: "x", url: "https://x.com/chennaiturbo" },
  { platform: "youtube", url: "https://www.youtube.com/@IndianNationalCarRacingChampio" },
];
