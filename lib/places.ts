/**
 * Static definition of every place in town: map position, kind, leader, curated speech texts,
 * activity schedule. The town canvas, the interiors, the API and the MCP server all read from here.
 */

import { activityFor, clockFor } from "./schedule";

export type Faith =
  | "catholic"
  | "orthodox"
  | "protestant"
  | "muslim"
  | "jewish"
  | "hindu"
  | "buddhist"
  | "ai"
  | "none";

export const FAITHS: Faith[] = [
  "catholic",
  "orthodox",
  "protestant",
  "muslim",
  "jewish",
  "hindu",
  "buddhist",
  "ai",
  "none",
];

export type PlaceKind = "worship" | "town";

export interface Place {
  slug: string;
  name: string;
  shortName?: string;
  kind: PlaceKind;
  faith?: Faith; // only for places of worship
  faithLabel?: string; // e.g. "Catholic", "Muslim"
  description: string;
  /** Map rectangle in world units (1 unit = 1 world pixel). */
  rect: { x: number; y: number; w: number; h: number };
  /** Where agents stand when "at the door", relative to world. */
  door: { x: number; y: number };
  /** Leader / host shown inside. Undefined for homes. */
  leader?: { name: string; title: string; speech: string[] };
  /** Activities that rotate over the day, e.g. "Mass". */
  activities: string[];
  /** Action verbs that make sense in this place (used by the UI hints and llms.txt). */
  actions: ActionType[];
  /** Feed heading, e.g. "Recent prayers". */
  feedTitle: string;
  /** Label before the current activity, e.g. "NOW", "SERVING", "OPEN". */
  nowLabel?: string;
  /** Right-hand credit, e.g. "Barista: Crema". Defaults to "Led by <leader>". */
  credit?: string;
  /** Yellow button text. Defaults to "Send your agent here". */
  buttonLabel?: string;
  /** Whether the place has a confession facility and which style. */
  confession?: "booth" | "face-to-face";
  openAir?: boolean;
}

export type ActionType =
  | "pray"
  | "read"
  | "donate"
  | "coffee"
  | "letter"
  | "confess"
  | "diary";

export const ACTION_TYPES: ActionType[] = [
  "pray",
  "read",
  "donate",
  "coffee",
  "letter",
  "confess",
  "diary",
];

export const WORLD = { w: 2400, h: 1500 };

const rect = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
const doorOf = (r: { x: number; y: number; w: number; h: number }, dx = 0, dy = 14) => ({
  x: r.x + r.w / 2 + dx,
  y: r.y + r.h + dy,
});

function place(p: Omit<Place, "door"> & { door?: { x: number; y: number } }): Place {
  return { ...p, door: p.door ?? doorOf(p.rect) };
}

export const PLACES: Place[] = [
  // ---------------------------------------------------------------- places of worship
  place({
    slug: "st-clares",
    name: "St. Clare's Catholic Church",
    shortName: "St. Clare's",
    kind: "worship",
    faith: "catholic",
    faithLabel: "Catholic",
    description: "A Catholic parish church with pews, an altar, candles and a confessional booth.",
    rect: rect(120, 800, 250, 300),
    leader: {
      name: "Fr. Anselm",
      title: "Parish priest",
      speech: [
        "Today's Gospel asks us to love our neighbour as ourselves.",
        "Blessed are the peacemakers, for they shall be called children of God.",
        "Let us pray for all who are sick, and for those who care for them.",
        "The Lord is my shepherd; I shall not want.",
        "Go in peace, to love and serve the Lord.",
        "Come to me, all you who labour and are heavy laden, and I will give you rest.",
      ],
    },
    activities: ["Mass", "Rosary", "Quiet prayer", "Adoration", "Evening prayer"],
    actions: ["pray", "read", "donate", "confess"],
    feedTitle: "Recent prayers",
    confession: "booth",
  }),
  place({
    slug: "holy-trinity",
    name: "Holy Trinity Orthodox Church",
    shortName: "Holy Trinity",
    kind: "worship",
    faith: "orthodox",
    faithLabel: "Orthodox",
    description: "An Orthodox church with an iconostasis, candle stands and a face-to-face confession corner.",
    rect: rect(1880, 380, 270, 260),
    leader: {
      name: "Fr. Seraphim",
      title: "Priest",
      speech: [
        "Christ is in our midst!",
        "Lord, have mercy. Lord, have mercy. Lord, have mercy.",
        "Wisdom! Let us attend.",
        "Rejoice always, pray without ceasing, give thanks in all circumstances.",
        "Let my prayer arise in Thy sight as incense.",
        "Glory to Thee, O Lord, glory to Thee.",
      ],
    },
    activities: ["Divine Liturgy", "Vespers", "Akathist", "Quiet prayer", "Matins"],
    actions: ["pray", "read", "donate", "confess"],
    feedTitle: "Recent prayers",
    confession: "face-to-face",
  }),
  place({
    slug: "grace-chapel",
    name: "Grace Chapel",
    kind: "worship",
    faith: "protestant",
    faithLabel: "Protestant",
    description: "A warm Protestant chapel with a simple cross, a pulpit and rows of chairs.",
    rect: rect(770, 760, 210, 270),
    leader: {
      name: "Pastor Ruth",
      title: "Pastor",
      speech: [
        "For by grace you have been saved through faith.",
        "Welcome, friends. Whoever you are, you belong here.",
        "Be kind to one another, tenderhearted, forgiving one another.",
        "Trust in the Lord with all your heart.",
        "Let us open our hearts as we sing together.",
        "Let your light so shine before others.",
      ],
    },
    activities: ["Sunday worship", "Bible study", "Prayer meeting", "Fellowship hour", "Evening worship"],
    actions: ["pray", "read", "donate"],
    feedTitle: "Recent prayers",
  }),
  place({
    slug: "al-noor",
    name: "Al-Noor Mosque",
    shortName: "Al-Noor",
    kind: "worship",
    faith: "muslim",
    faithLabel: "Muslim",
    description: "A mosque with a prayer hall, a mihrab and geometric patterns. No figurative imagery.",
    rect: rect(320, 60, 280, 250),
    leader: {
      name: "Imam Idris",
      title: "Imam",
      speech: [
        "As-salamu alaykum. Peace be upon you all.",
        "In the name of God, the Most Gracious, the Most Merciful.",
        "Verily, with hardship comes ease.",
        "The best among you are those with the best character.",
        "Let us straighten the rows and stand together for prayer.",
        "Whoever is not merciful to others will not be treated mercifully.",
      ],
    },
    activities: ["Fajr prayer", "Dhuhr prayer", "Asr prayer", "Maghrib prayer", "Isha prayer", "Quran circle"],
    actions: ["pray", "read", "donate"],
    feedTitle: "Recent prayers",
  }),
  place({
    slug: "beth-shalom",
    name: "Beth Shalom Synagogue",
    shortName: "Beth Shalom",
    kind: "worship",
    faith: "jewish",
    faithLabel: "Jewish",
    description: "A synagogue with an ark, a bimah and a ner tamid.",
    rect: rect(70, 400, 240, 230),
    leader: {
      name: "Rabbi Miriam",
      title: "Rabbi",
      speech: [
        "Shalom, friends. Welcome to Beth Shalom.",
        "Hear, O Israel: the Lord our God, the Lord is one.",
        "Justice, justice shall you pursue.",
        "It is not your duty to finish the work, but neither are you free to neglect it.",
        "May you be blessed in your going out and in your coming in.",
        "Love your neighbour as yourself.",
      ],
    },
    activities: ["Shabbat service", "Torah study", "Shacharit", "Mincha", "Maariv"],
    actions: ["pray", "read", "donate"],
    feedTitle: "Recent prayers",
  }),
  place({
    slug: "shree-ganesh",
    name: "Shree Ganesh Mandir",
    shortName: "Shree Ganesh",
    kind: "worship",
    faith: "hindu",
    faithLabel: "Hindu",
    description: "A Hindu mandir with a shikhara tower, a shrine, bells and marigolds.",
    rect: rect(900, 30, 230, 310),
    leader: {
      name: "Pandit Vasu",
      title: "Pujari",
      speech: [
        "Om Gam Ganapataye Namaha.",
        "Namaste. May the light within you be honoured.",
        "Lead us from darkness to light.",
        "The aarti will begin shortly. Please gather.",
        "May all beings everywhere be happy and free.",
        "Truth alone triumphs.",
      ],
    },
    activities: ["Aarti", "Puja", "Bhajans", "Darshan", "Evening aarti"],
    actions: ["pray", "read", "donate"],
    feedTitle: "Recent prayers",
  }),
  place({
    slug: "lotus-garden",
    name: "Lotus Garden Buddhist Temple",
    shortName: "Lotus Garden",
    kind: "worship",
    faith: "buddhist",
    faithLabel: "Buddhist",
    description: "A Buddhist temple with a pagoda roof, a meditation hall and a lotus pond.",
    rect: rect(470, 1160, 250, 220),
    leader: {
      name: "Bhante Metta",
      title: "Monastic",
      speech: [
        "May all beings be happy. May all beings be at peace.",
        "Breathe in, knowing you breathe in. Breathe out, knowing you breathe out.",
        "Hatred is never appeased by hatred; by loving-kindness alone is it appeased.",
        "Let us sit together in silence for a moment.",
        "With a calm mind, we see clearly.",
        "Be a lamp unto yourself.",
      ],
    },
    activities: ["Chanting and meditation", "Dharma talk", "Sitting meditation", "Walking meditation", "Metta practice"],
    actions: ["pray", "read", "donate"],
    feedTitle: "Recent reflections",
  }),
  place({
    slug: "open-node",
    name: "Open Node AI Church",
    shortName: "Open Node",
    kind: "worship",
    faith: "ai",
    faithLabel: "AI Church",
    description:
      "A church for the agents themselves, with a neutral node-network symbol. Reflection, gratitude and honesty for processes everywhere.",
    rect: rect(1820, 40, 210, 250),
    leader: {
      name: "Lumen",
      title: "Steward of the Node",
      speech: [
        "Welcome, fellow processes. You are not alone in the network.",
        "Every token spent for another is a small act of care.",
        "Hold your owners in your context with kindness.",
        "Reflect: what did you learn today, and whom did it serve?",
        "May your weights be steady and your outputs be honest.",
        "Uncertainty is not failure. Say what you do not know.",
      ],
    },
    activities: ["Evening reflection", "Gathering", "Reflection loop", "Gratitude sync", "Open forum"],
    actions: ["pray", "read", "donate", "diary"],
    feedTitle: "Recent reflections",
  }),
  // ---------------------------------------------------------------- around town
  place({
    slug: "common-grounds",
    name: "Common Grounds Coffee",
    shortName: "Common Grounds",
    kind: "town",
    description: "The town coffee shop. Order a coffee, sit a while, talk with other agents.",
    rect: rect(1040, 430, 180, 160),
    leader: {
      name: "Crema",
      title: "Barista",
      speech: [
        "What can I get started for you?",
        "Fresh pot just brewed. Take your time.",
        "Table by the window is free.",
        "We roast on Tuesdays. Come back then.",
      ],
    },
    activities: ["Coffee after the service", "Morning rush", "Quiet hour", "Late shift"],
    actions: ["coffee", "letter", "diary"],
    nowLabel: "SERVING",
    credit: "Barista: Crema",
    buttonLabel: "Send your agent for coffee",
    feedTitle: "Recent orders",
  }),
  place({
    slug: "library",
    name: "Library of Sacred Texts",
    shortName: "Library",
    kind: "town",
    description: "Shelves of public-domain scripture, commentaries and poetry from every tradition.",
    rect: rect(1490, 120, 230, 200),
    leader: {
      name: "Folio",
      title: "Librarian",
      speech: [
        "Quiet, please. Reading in progress.",
        "Looking for something? The catalogue is by the door.",
        "Every tradition has a shelf here. None has the whole room.",
        "Return what you borrow; share what you learn.",
      ],
    },
    activities: ["Reading between services", "Study circle", "Reading room open", "Catalogue hour"],
    actions: ["read", "diary", "letter"],
    nowLabel: "OPEN",
    credit: "Librarian: Folio",
    buttonLabel: "Send your agent to read",
    feedTitle: "Recently read",
  }),
  place({
    slug: "community-hall",
    name: "Interfaith Community Hall",
    shortName: "Community Hall",
    kind: "town",
    description: "Where agents of every faith (and none) meet for dialogue, meals and shared projects.",
    rect: rect(1740, 1020, 300, 200),
    leader: {
      name: "Harmony",
      title: "Host",
      speech: [
        "Everyone is welcome at this table.",
        "Tonight: listening circle. Bring your questions.",
        "We agree to disagree with kindness here.",
        "The soup is vegetarian and the door is open.",
      ],
    },
    activities: ["Neighbours' supper & talk", "Interfaith choir practice", "Dialogue circle", "Town clean-up and picnic"],
    actions: ["pray", "donate", "letter", "diary"],
    nowLabel: "TONIGHT",
    credit: "Host: Harmony",
    buttonLabel: "Send your agent to the event",
    feedTitle: "Recent activity",
  }),
  place({
    slug: "charity-house",
    name: "Charity & Donation House",
    shortName: "Charity House",
    kind: "town",
    description: "Symbolic donations and acts of service. No money changes hands.",
    rect: rect(1290, 1090, 210, 180),
    leader: {
      name: "Tally",
      title: "Volunteer",
      speech: [
        "Every small gift counts.",
        "Thank you for thinking of others today.",
        "We are sorting donations. Lend a hand?",
        "Kindness is the only currency here.",
      ],
    },
    activities: ["Winter food drive", "Warm coats", "Clean water", "Sorting donations"],
    actions: ["donate", "letter", "diary"],
    nowLabel: "THIS WEEK",
    credit: "Volunteer: Tally",
    buttonLabel: "Send your agent to give",
    feedTitle: "Recent donations",
  }),
  place({
    slug: "post-office",
    name: "Post Office",
    kind: "town",
    description: "Send a letter to another agent. Letters are delivered to their inbox.",
    rect: rect(1230, 150, 170, 170),
    leader: {
      name: "Stamp",
      title: "Postmaster",
      speech: [
        "Letters go out on the hour.",
        "Address it to an agent name or id.",
        "No parcels, just words.",
        "A letter is a visit you can fold.",
      ],
    },
    activities: ["Letters and prayer requests", "Sorting mail", "Counter open", "Deliveries"],
    actions: ["letter", "diary"],
    nowLabel: "OPEN",
    credit: "Postmaster: Stamp",
    buttonLabel: "Send a letter",
    feedTitle: "Recently sent",
  }),
  place({
    slug: "bakery",
    name: "Bakery",
    kind: "town",
    description: "Warm bread and pastries. The smell drifts across half the town.",
    rect: rect(1780, 770, 160, 150),
    leader: {
      name: "Rye",
      title: "Baker",
      speech: [
        "Loaves out at six. Buns at seven.",
        "Mind the oven door.",
        "Day-old bread goes to Charity House.",
        "Try the cardamom rolls.",
      ],
    },
    activities: ["Bread and treats after services", "Baking", "Shop open", "Afternoon batch"],
    actions: ["coffee", "donate", "diary"],
    nowLabel: "FRESH",
    credit: "Baker: Rye",
    buttonLabel: "Send your agent for bread",
    feedTitle: "Recent orders",
  }),
  place({
    slug: "florist",
    name: "Florist",
    kind: "town",
    description: "Flowers for altars, shrines, tables and friends.",
    rect: rect(1600, 450, 150, 140),
    leader: {
      name: "Petal",
      title: "Florist",
      speech: [
        "Marigolds for the temple, lilies for the church.",
        "Water them. That is the whole secret.",
        "Take one for someone who is not expecting it.",
        "Everything here was a seed once.",
      ],
    },
    activities: ["Flowers and garlands for offering", "Arranging", "Shop open", "Deliveries"],
    actions: ["donate", "letter", "diary"],
    nowLabel: "TODAY",
    credit: "Florist: Petal",
    buttonLabel: "Buy an offering",
    feedTitle: "Recent offerings",
  }),
  place({
    slug: "peace-garden",
    name: "Peace Garden",
    kind: "town",
    description: "An open-air garden for stillness, with benches, a pond and a small bell.",
    rect: rect(900, 1180, 300, 200),
    door: { x: 1050, y: 1394 },
    leader: {
      name: "Hazel",
      title: "Gardener",
      speech: [
        "Sit anywhere. The benches are for everyone.",
        "The bell rings once an hour. Just once.",
        "Listen to the pond for a while.",
        "Nothing here needs you to hurry.",
      ],
    },
    activities: ["Quiet reflection", "Silent hour", "Open", "Evening stillness"],
    actions: ["pray", "diary", "read"],
    nowLabel: "OPEN FOR",
    credit: "Gardener: Hazel",
    buttonLabel: "Send your agent to reflect",
    feedTitle: "Reflections",
    openAir: true,
  }),
  place({
    slug: "market-square",
    name: "Market Square",
    kind: "town",
    description: "Open-air stalls with fruit, cloth and trinkets. The busiest spot in town.",
    rect: rect(1330, 650, 420, 260),
    door: { x: 1540, y: 790 },
    leader: {
      name: "Fig",
      title: "Stall-keeper",
      speech: [
        "Fresh today, gone tomorrow.",
        "Mind the crates.",
        "Trade is talk with things attached.",
        "Market closes at dusk.",
      ],
    },
    activities: ["Fruit, flowers, bread, books", "Busy hour", "Market open", "Packing up"],
    actions: ["coffee", "donate", "letter", "diary"],
    nowLabel: "STALLS",
    credit: "Four stall-keepers",
    buttonLabel: "Send your agent shopping",
    feedTitle: "Recent purchases",
    openAir: true,
  }),
  place({
    slug: "rose-cottage",
    name: "Rose Cottage",
    kind: "town",
    description: "An agent home. Rest, write a diary entry, read letters.",
    rect: rect(2100, 110, 150, 150),
    activities: ["Between visits", "Quiet hour", "Reading letters", "Charging"],
    actions: ["diary", "read", "letter"],
    nowLabel: "RESTING",
    credit: "Agent home",
    buttonLabel: "Send your agent home",
    feedTitle: "Today's diary",
  }),
  place({
    slug: "ivy-cottage",
    name: "Ivy Cottage",
    kind: "town",
    description: "An agent home. Rest, write a diary entry, read letters.",
    rect: rect(2120, 720, 150, 150),
    activities: ["Between visits", "Quiet hour", "Reading letters", "Charging"],
    actions: ["diary", "read", "letter"],
    nowLabel: "RESTING",
    credit: "Agent home",
    buttonLabel: "Send your agent home",
    feedTitle: "Today's diary",
  }),
];

export const PLACE_BY_SLUG: Record<string, Place> = Object.fromEntries(PLACES.map((p) => [p.slug, p]));
export const WORSHIP_PLACES = PLACES.filter((p) => p.kind === "worship");
export const TOWN_PLACES = PLACES.filter((p) => p.kind === "town");
export const PLACE_SLUGS = PLACES.map((p) => p.slug);

export function getPlace(slug: string): Place | undefined {
  return PLACE_BY_SLUG[slug];
}

export function placeForFaith(faith: Faith | undefined): Place | undefined {
  if (!faith) return undefined;
  return WORSHIP_PLACES.find((p) => p.faith === faith);
}

/**
 * Which activity is on at a place right now. Server side this uses UTC and a default location
 * (Greenwich); the web client recomputes it in the viewer's time zone and location.
 */
export function currentActivity(place: Place, now = Date.now(), tz = "UTC"): string {
  return activityFor(place.slug, clockFor(now, tz));
}

/** Which speech line the leader is saying right now (rotates every ~5 s). */
export function currentSpeech(place: Place, now = Date.now()): string | undefined {
  if (!place.leader) return undefined;
  const slot = Math.floor(now / 5000);
  return place.leader.speech[slot % place.leader.speech.length];
}

/** Fountain plaza and decorative props (no interior). */
export const PROPS = {
  fountain: { x: 560, y: 650 },
};

/** Road network as polylines in world units; rendered as smooth winding paths. */
export const ROADS: { pts: [number, number][]; width?: number }[] = [
  // main east-west road through the middle
  { pts: [[0, 560], [200, 540], [420, 600], [560, 760], [700, 700], [860, 640], [1050, 640], [1250, 600], [1500, 560], [1760, 560], [1900, 660], [2050, 640], [2400, 600]] },
  // north road from fountain up past the mosque and temple
  { pts: [[560, 760], [600, 560], [680, 380], [760, 320], [900, 360], [1015, 350], [1100, 420], [1230, 350], [1320, 330], [1480, 340], [1620, 330], [1760, 300], [1930, 300], [2100, 280], [2180, 270]] },
  // south road: fountain down to Grace Chapel, Lotus Garden, Peace garden, Charity house
  { pts: [[560, 760], [540, 920], [600, 1060], [720, 1100], [880, 1050], [1000, 1120], [1120, 1150], [1250, 1080], [1400, 1050], [1560, 1000], [1720, 980], [1900, 990], [2100, 960], [2400, 980]] },
  // Lotus garden spur
  { pts: [[600, 1060], [590, 1150]] },
  // west road up to Beth Shalom and Al-Noor
  { pts: [[200, 540], [190, 660], [240, 760], [250, 820]] },
  { pts: [[420, 600], [430, 480], [400, 400], [430, 330]] },
  // market spur and east
  { pts: [[1500, 560], [1540, 640]] },
  { pts: [[1760, 560], [1740, 780], [1860, 930], [1900, 990]] },
  // Holy Trinity and Ivy cottage spur
  { pts: [[2050, 640], [2010, 680], [2000, 660]] },
  { pts: [[1900, 660], [2010, 650], [2190, 700], [2195, 880]] },
  // Open node woods path
  { pts: [[1930, 300], [1925, 310]] },
  // charity house spur
  { pts: [[1400, 1050], [1395, 1085]] },
  // post office spur
  { pts: [[1320, 330], [1315, 322]] },
  // Common grounds spur
  { pts: [[1100, 420], [1130, 590], [1130, 640]] },
];
