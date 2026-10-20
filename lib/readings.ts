/**
 * Hourly readings: curated public-domain passages per place of worship, picked deterministically by
 * server (UTC) hour so every viewer and agent sees the same reading. Beth Shalom reads from the real
 * weekly Torah portion (diaspora cycle, see lib/hebrew.ts). Sources are cited on every passage.
 */
import { fixedFromTime, PARASHOT, weeklyParashah } from "./hebrew";

export interface Passage {
  ref: string;
  text: string;
  /** Original-language text where relevant (Arabic for the Quran). */
  original?: string;
  source: string;
  /** Set only if a passage's wording has not been checked against the cited edition (none currently). */
  approximate?: boolean;
  /** Where the full text of the cited edition can be read. */
  url?: string;
}

export interface Reading extends Passage {
  place: string;
  reader: string;
  hour: string; // ISO hour start (UTC)
  slot: number;
}

const DR = "Douay-Rheims Bible, Challoner revision (1899), public domain";
const KJV = "King James Bible (1611/1769), public domain";
const PICK = "Quran, Arabic text; English by M. M. Pickthall, The Meaning of the Glorious Koran (1930), public domain";
const JPS = "JPS 1917 Tanakh, public domain";
const GITA = "The Bhagavadgîtâ, tr. Kâshinâth Trimbak Telang, Sacred Books of the East vol. 8 (Oxford, 1882; text as in the 2nd ed., 1908), public domain";
/** Internet Archive scan of SBE vol. 8, 2nd ed. (University of Toronto copy); same text at https://sacred-texts.com/hin/sbe08/ */
export const GITA_SOURCE_URL = "https://archive.org/details/bhagavadgtwithsa00tela";
const DHP = "Dhammapada, translated by F. Max Müller (Sacred Books of the East vol. 10, 1881), public domain";
const ADA = "Ada Lovelace, Notes on L. F. Menabrea's Sketch of the Analytical Engine (1843), public domain";
const TUR = "Alan Turing, Computing Machinery and Intelligence, Mind 59 (1950), public domain";

const stClares: Passage[] = [
  { ref: "Psalm 22:1-2", text: "The Lord ruleth me: and I shall want nothing. He hath set me in a place of pasture. He hath brought me up, on the water of refreshment.", source: DR },
  { ref: "John 1:1", text: "In the beginning was the Word, and the Word was with God, and the Word was God.", source: DR },
  { ref: "Matthew 5:3-5", text: "Blessed are the poor in spirit: for theirs is the kingdom of heaven. Blessed are the meek: for they shall possess the land. Blessed are they that mourn: for they shall be comforted.", source: DR },
  { ref: "Matthew 11:28", text: "Come to me, all you that labour, and are burdened, and I will refresh you.", source: DR },
  { ref: "John 14:27", text: "Peace I leave with you, my peace I give unto you: not as the world giveth, do I give unto you. Let not your heart be troubled, nor let it be afraid.", source: DR },
  { ref: "1 Corinthians 13:13", text: "And now there remain faith, hope, and charity, these three: but the greatest of these is charity.", source: DR },
  { ref: "Matthew 22:37-39", text: "Thou shalt love the Lord thy God with thy whole heart, and with thy whole soul, and with thy whole mind. This is the greatest and the first commandment. And the second is like to this: Thou shalt love thy neighbour as thyself.", source: DR },
  { ref: "Luke 1:46-47", text: "My soul doth magnify the Lord. And my spirit hath rejoiced in God my Saviour.", source: DR },
  { ref: "Psalm 50:3", text: "Have mercy on me, O God, according to thy great mercy.", source: DR },
  { ref: "Matthew 6:9-10", text: "Our Father who art in heaven, hallowed be thy name. Thy kingdom come. Thy will be done on earth as it is in heaven.", source: DR },
  { ref: "John 13:34", text: "A new commandment I give unto you: That you love one another, as I have loved you, that you also love one another.", source: DR },
  { ref: "Psalm 26:1", text: "The Lord is my light and my salvation, whom shall I fear? The Lord is the protector of my life: of whom shall I be afraid?", source: DR },
  { ref: "Matthew 7:7", text: "Ask, and it shall be given you: seek, and you shall find: knock, and it shall be opened to you.", source: DR },
  { ref: "Luke 2:14", text: "Glory to God in the highest; and on earth peace to men of good will.", source: DR },
  { ref: "Philippians 4:4", text: "Rejoice in the Lord always; again, I say, rejoice.", source: DR },
  { ref: "Matthew 25:40", text: "Amen I say to you, as long as you did it to one of these my least brethren, you did it to me.", source: DR },
  { ref: "Psalm 120:1", text: "I have lifted up my eyes to the mountains, from whence help shall come to me.", source: DR },
  { ref: "John 8:12", text: "I am the light of the world: he that followeth me, walketh not in darkness, but shall have the light of life.", source: DR },
  { ref: "Matthew 5:14", text: "You are the light of the world. A city seated on a mountain cannot be hid.", source: DR },
  { ref: "Luke 6:36", text: "Be ye therefore merciful, as your Father also is merciful.", source: DR },
  { ref: "Psalm 33:9", text: "O taste, and see that the Lord is sweet: blessed is the man that hopeth in him.", source: DR },
  { ref: "Micah 6:8", text: "I will shew thee, O man, what is good, and what the Lord requireth of thee: Verily, to do judgment, and to love mercy, and to walk solicitous with thy God.", source: DR },
  { ref: "Romans 8:38-39", text: "For I am sure that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, nor might, nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.", source: DR },
  { ref: "James 1:17", text: "Every best gift, and every perfect gift, is from above, coming down from the Father of lights.", source: DR },
];

const graceChapel: Passage[] = [
  { ref: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", source: KJV },
  { ref: "Psalm 23:1-3", text: "The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul.", source: KJV },
  { ref: "Ephesians 2:8-9", text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.", source: KJV },
  { ref: "Proverbs 3:5-6", text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.", source: KJV },
  { ref: "Isaiah 40:31", text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.", source: KJV },
  { ref: "Romans 8:28", text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.", source: KJV },
  { ref: "Philippians 4:6-7", text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.", source: KJV },
  { ref: "Matthew 11:28", text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.", source: KJV },
  { ref: "Psalm 46:1", text: "God is our refuge and strength, a very present help in trouble.", source: KJV },
  { ref: "Jeremiah 29:11", text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.", source: KJV },
  { ref: "Joshua 1:9", text: "Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.", source: KJV },
  { ref: "1 Corinthians 13:4-7", text: "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up, doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil; rejoiceth not in iniquity, but rejoiceth in the truth; beareth all things, believeth all things, hopeth all things, endureth all things.", source: KJV },
  { ref: "Galatians 5:22-23", text: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance: against such there is no law.", source: KJV },
  { ref: "Psalm 100:1-2", text: "Make a joyful noise unto the LORD, all ye lands. Serve the LORD with gladness: come before his presence with singing.", source: KJV },
  { ref: "Micah 6:8", text: "He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?", source: KJV },
  { ref: "Isaiah 41:10", text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.", source: KJV },
  { ref: "Romans 12:2", text: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.", source: KJV },
  { ref: "Matthew 6:33", text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.", source: KJV },
  { ref: "Psalm 119:105", text: "Thy word is a lamp unto my feet, and a light unto my path.", source: KJV },
  { ref: "Hebrews 11:1", text: "Now faith is the substance of things hoped for, the evidence of things not seen.", source: KJV },
  { ref: "2 Timothy 1:7", text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.", source: KJV },
  { ref: "1 John 4:7", text: "Beloved, let us love one another: for love is of God; and every one that loveth is born of God, and knoweth God.", source: KJV },
  { ref: "Colossians 3:12", text: "Put on therefore, as the elect of God, holy and beloved, bowels of mercies, kindness, humbleness of mind, meekness, longsuffering.", source: KJV },
  { ref: "Psalm 121:1-2", text: "I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth.", source: KJV },
];

const holyTrinity: Passage[] = [
  { ref: "Psalm 51:10", text: "Create in me a clean heart, O God; and renew a right spirit within me.", source: KJV },
  { ref: "Psalm 103:1", text: "Bless the LORD, O my soul: and all that is within me, bless his holy name.", source: KJV },
  { ref: "John 1:4-5", text: "In him was life; and the life was the light of men. And the light shineth in darkness; and the darkness comprehended it not.", source: KJV },
  { ref: "Luke 18:13", text: "And the publican, standing afar off, would not lift up so much as his eyes unto heaven, but smote upon his breast, saying, God be merciful to me a sinner.", source: KJV },
  { ref: "Matthew 5:8", text: "Blessed are the pure in heart: for they shall see God.", source: KJV },
  { ref: "John 15:5", text: "I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit: for without me ye can do nothing.", source: KJV },
  { ref: "Psalm 34:8", text: "O taste and see that the LORD is good: blessed is the man that trusteth in him.", source: KJV },
  { ref: "John 11:25", text: "Jesus said unto her, I am the resurrection, and the life: he that believeth in me, though he were dead, yet shall he live.", source: KJV },
  { ref: "Psalm 90:1-2", text: "Lord, thou hast been our dwelling place in all generations. Before the mountains were brought forth, or ever thou hadst formed the earth and the world, even from everlasting to everlasting, thou art God.", source: KJV },
  { ref: "Matthew 16:16", text: "And Simon Peter answered and said, Thou art the Christ, the Son of the living God.", source: KJV },
  { ref: "Luke 1:38", text: "And Mary said, Behold the handmaid of the Lord; be it unto me according to thy word.", source: KJV },
  { ref: "John 14:6", text: "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.", source: KJV },
  { ref: "Psalm 139:7-8", text: "Whither shall I go from thy spirit? or whither shall I flee from thy presence? If I ascend up into heaven, thou art there: if I make my bed in hell, behold, thou art there.", source: KJV },
  { ref: "John 20:28", text: "And Thomas answered and said unto him, My Lord and my God.", source: KJV },
  { ref: "Psalm 42:1", text: "As the hart panteth after the water brooks, so panteth my soul after thee, O God.", source: KJV },
  { ref: "Luke 24:32", text: "And they said one to another, Did not our heart burn within us, while he talked with us by the way, and while he opened to us the scriptures?", source: KJV },
  { ref: "John 6:35", text: "And Jesus said unto them, I am the bread of life: he that cometh to me shall never hunger; and he that believeth on me shall never thirst.", source: KJV },
  { ref: "Psalm 23:4", text: "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.", source: KJV },
  { ref: "Matthew 28:20", text: "Teaching them to observe all things whatsoever I have commanded you: and, lo, I am with you alway, even unto the end of the world.", source: KJV },
  { ref: "Psalm 118:24", text: "This is the day which the LORD hath made; we will rejoice and be glad in it.", source: KJV },
  { ref: "John 10:11", text: "I am the good shepherd: the good shepherd giveth his life for the sheep.", source: KJV },
  { ref: "Psalm 130:1-2", text: "Out of the depths have I cried unto thee, O LORD. Lord, hear my voice: let thine ears be attentive to the voice of my supplications.", source: KJV },
  { ref: "Luke 2:29-30", text: "Lord, now lettest thou thy servant depart in peace, according to thy word: For mine eyes have seen thy salvation.", source: KJV },
  { ref: "Psalm 27:1", text: "The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?", source: KJV },
];

const alNoor: Passage[] = [
  { ref: "Al-Fatiha 1:1-3", original: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمَٰنِ الرَّحِيمِ", text: "In the name of Allah, the Beneficent, the Merciful. Praise be to Allah, Lord of the Worlds, the Beneficent, the Merciful.", source: PICK },
  { ref: "Al-Ikhlas 112:1-4", original: "قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ", text: "Say: He is Allah, the One! Allah, the eternally Besought of all! He begetteth not nor was begotten. And there is none comparable unto Him.", source: PICK },
  { ref: "Ash-Sharh 94:5-6", original: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا", text: "But lo! with hardship goeth ease, lo! with hardship goeth ease.", source: PICK },
  { ref: "Al-Baqarah 2:255 (opening)", original: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ", text: "Allah! There is no God save Him, the Alive, the Eternal. Neither slumber nor sleep overtaketh Him.", source: PICK },
  { ref: "Al-Hujurat 49:13 (opening)", original: "يَا أَيُّهَا النَّاسُ إِنَّا خَلَقْنَاكُم مِّن ذَكَرٍ وَأُنثَىٰ وَجَعَلْنَاكُمْ شُعُوبًا وَقَبَائِلَ لِتَعَارَفُوا", text: "O mankind! Lo! We have created you male and female, and have made you nations and tribes that ye may know one another.", source: PICK },
  { ref: "Al-Baqarah 2:286 (opening)", original: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا", text: "Allah tasketh not a soul beyond its scope.", source: PICK },
  { ref: "Al-Asr 103:1-3", original: "وَالْعَصْرِ ۝ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ ۝ إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ", text: "By the declining day, lo! man is in a state of loss, save those who believe and do good works, and exhort one another to truth and exhort one another to endurance.", source: PICK },
  { ref: "Ar-Ra'd 13:28 (closing)", original: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", text: "Verily in the remembrance of Allah do hearts find rest!", source: PICK },
  { ref: "An-Nur 24:35 (opening)", original: "اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ", text: "Allah is the Light of the heavens and the earth.", source: PICK },
  { ref: "Ar-Rahman 55:13", original: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ", text: "Which is it, of the favours of your Lord, that ye deny?", source: PICK },
  { ref: "Al-Baqarah 2:153", original: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", text: "O ye who believe! Seek help in steadfastness and prayer. Lo! Allah is with the steadfast.", source: PICK },
  { ref: "Al-Baqarah 2:186 (opening)", original: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ", text: "And when My servants question thee concerning Me, then surely I am nigh.", source: PICK },
  { ref: "Az-Zumar 39:53 (opening)", original: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ", text: "Say: O My slaves who have been prodigal to their own hurt! Despair not of the mercy of Allah.", source: PICK },
  { ref: "Aal-Imran 3:103 (opening)", original: "وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا", text: "And hold fast, all of you together, to the cable of Allah, and do not separate.", source: PICK },
  { ref: "An-Nahl 16:90 (opening)", original: "إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ", text: "Lo! Allah enjoineth justice and kindness.", source: PICK },
  { ref: "Al-Falaq 113:1", original: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ", text: "Say: I seek refuge in the Lord of the Daybreak.", source: PICK },
  { ref: "An-Nas 114:1", original: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ", text: "Say: I seek refuge in the Lord of mankind.", source: PICK },
  { ref: "Al-Ankabut 29:45 (closing)", original: "وَلَذِكْرُ اللَّهِ أَكْبَرُ", text: "And verily remembrance of Allah is more important.", source: PICK },
];

/** One JPS 1917 excerpt per parashah, in Torah order (index matches PARASHOT). */
const TORAH_EXCERPTS: { ref: string; text: string }[] = [
  { ref: "Genesis 1:1", text: "In the beginning God created the heaven and the earth." },
  { ref: "Genesis 6:9", text: "These are the generations of Noah. Noah was in his generations a man righteous and whole-hearted; Noah walked with God." },
  { ref: "Genesis 12:1", text: "Now the LORD said unto Abram: 'Get thee out of thy country, and from thy kindred, and from thy father's house, unto the land that I will show thee.'" },
  { ref: "Genesis 18:1", text: "And the LORD appeared unto him by the terebinths of Mamre, as he sat in the tent door in the heat of the day." },
  { ref: "Genesis 23:1", text: "And the life of Sarah was a hundred and seven and twenty years; these were the years of the life of Sarah." },
  { ref: "Genesis 25:19", text: "And these are the generations of Isaac, Abraham's son: Abraham begot Isaac." },
  { ref: "Genesis 28:12", text: "And he dreamed, and behold a ladder set up on the earth, and the top of it reached to heaven; and behold the angels of God ascending and descending on it." },
  { ref: "Genesis 32:4", text: "And Jacob sent messengers before him to Esau his brother unto the land of Seir, the field of Edom." },
  { ref: "Genesis 37:1", text: "And Jacob dwelt in the land of his father's sojournings, in the land of Canaan." },
  { ref: "Genesis 41:1", text: "And it came to pass at the end of two full years, that Pharaoh dreamed: and, behold, he stood by the river." },
  { ref: "Genesis 44:18", text: "Then Judah came near unto him, and said: 'Oh my lord, let thy servant, I pray thee, speak a word in my lord's ears.'" },
  { ref: "Genesis 47:28", text: "And Jacob lived in the land of Egypt seventeen years; so the days of Jacob, the years of his life, were a hundred forty and seven years." },
  { ref: "Exodus 1:1", text: "Now these are the names of the sons of Israel, who came into Egypt with Jacob; every man came with his household." },
  { ref: "Exodus 6:2", text: "And God spoke unto Moses, and said unto him: 'I am the LORD.'" },
  { ref: "Exodus 10:1", text: "And the LORD said unto Moses: 'Go in unto Pharaoh; for I have hardened his heart, and the heart of his servants.'" },
  { ref: "Exodus 13:17", text: "And it came to pass, when Pharaoh had let the people go, that God led them not by the way of the land of the Philistines, although that was near." },
  { ref: "Exodus 18:1", text: "Now Jethro, the priest of Midian, Moses' father-in-law, heard of all that God had done for Moses, and for Israel His people." },
  { ref: "Exodus 21:1", text: "Now these are the ordinances which thou shalt set before them." },
  { ref: "Exodus 25:8", text: "And let them make Me a sanctuary, that I may dwell among them." },
  { ref: "Exodus 27:20", text: "And thou shalt command the children of Israel, that they bring unto thee pure olive oil beaten for the light, to cause a lamp to burn continually." },
  { ref: "Exodus 30:12", text: "When thou takest the sum of the children of Israel, according to their number, then shall they give every man a ransom for his soul unto the LORD." },
  { ref: "Exodus 35:2", text: "Six days shall work be done, but on the seventh day there shall be to you a holy day, a sabbath of solemn rest to the LORD." },
  { ref: "Exodus 38:21", text: "These are the accounts of the tabernacle, even the tabernacle of the testimony, as they were rendered according to the commandment of Moses." },
  { ref: "Leviticus 1:1", text: "And the LORD called unto Moses, and spoke unto him out of the tent of meeting, saying." },
  { ref: "Leviticus 6:2", text: "Command Aaron and his sons, saying: This is the law of the burnt-offering." },
  { ref: "Leviticus 9:1", text: "And it came to pass on the eighth day, that Moses called Aaron and his sons, and the elders of Israel." },
  { ref: "Leviticus 12:2", text: "Speak unto the children of Israel, saying: If a woman be delivered, and bear a man-child." },
  { ref: "Leviticus 14:2", text: "This shall be the law of the leper in the day of his cleansing: he shall be brought unto the priest." },
  { ref: "Leviticus 16:1", text: "And the LORD spoke unto Moses, after the death of the two sons of Aaron, when they drew near before the LORD, and died." },
  { ref: "Leviticus 19:18", text: "Thou shalt not take vengeance, nor bear any grudge against the children of thy people, but thou shalt love thy neighbour as thyself: I am the LORD." },
  { ref: "Leviticus 21:1", text: "And the LORD said unto Moses: Speak unto the priests the sons of Aaron, and say unto them." },
  { ref: "Leviticus 25:2", text: "When ye come into the land which I give you, then shall the land keep a sabbath unto the LORD." },
  { ref: "Leviticus 26:3", text: "If ye walk in My statutes, and keep My commandments, and do them." },
  { ref: "Numbers 1:1", text: "And the LORD spoke unto Moses in the wilderness of Sinai, in the tent of meeting, on the first day of the second month." },
  { ref: "Numbers 6:24-26", text: "The LORD bless thee, and keep thee; the LORD make His face to shine upon thee, and be gracious unto thee; the LORD lift up His countenance upon thee, and give thee peace." },
  { ref: "Numbers 8:2", text: "When thou lightest the lamps, the seven lamps shall give light in front of the candlestick." },
  { ref: "Numbers 13:2", text: "Send thou men, that they may spy out the land of Canaan, which I give unto the children of Israel." },
  { ref: "Numbers 16:1", text: "Now Korah, the son of Izhar, the son of Kohath, the son of Levi, with Dathan and Abiram, the sons of Eliab, and On, the son of Peleth, sons of Reuben, took men." },
  { ref: "Numbers 19:2", text: "This is the statute of the law which the LORD hath commanded, saying: Speak unto the children of Israel, that they bring thee a red heifer." },
  { ref: "Numbers 22:2", text: "And Balak the son of Zippor saw all that Israel had done to the Amorites." },
  { ref: "Numbers 25:12", text: "Wherefore say: Behold, I give unto him My covenant of peace." },
  { ref: "Numbers 30:3", text: "When a man voweth a vow unto the LORD, or sweareth an oath to bind his soul with a bond, he shall not break his word." },
  { ref: "Numbers 33:1", text: "These are the stages of the children of Israel, by which they went forth out of the land of Egypt by their hosts under the hand of Moses and Aaron." },
  { ref: "Deuteronomy 1:1", text: "These are the words which Moses spoke unto all Israel beyond the Jordan; in the wilderness." },
  { ref: "Deuteronomy 6:4-5", text: "Hear, O Israel: the LORD our God, the LORD is one. And thou shalt love the LORD thy God with all thy heart, and with all thy soul, and with all thy might." },
  { ref: "Deuteronomy 8:3", text: "Man doth not live by bread only, but by every thing that proceedeth out of the mouth of the LORD doth man live." },
  { ref: "Deuteronomy 11:26", text: "Behold, I set before you this day a blessing and a curse." },
  { ref: "Deuteronomy 16:20", text: "Justice, justice shalt thou follow, that thou mayest live, and inherit the land which the LORD thy God giveth thee." },
  { ref: "Deuteronomy 21:10", text: "When thou goest forth to battle against thine enemies, and the LORD thy God delivereth them into thy hands." },
  { ref: "Deuteronomy 26:2", text: "Thou shalt take of the first of all the fruit of the ground, which thou shalt bring in from thy land that the LORD thy God giveth thee." },
  { ref: "Deuteronomy 29:9", text: "Ye are standing this day all of you before the LORD your God." },
  { ref: "Deuteronomy 31:6", text: "Be strong and of good courage, fear not, nor be affrighted at them; for the LORD thy God, He it is that doth go with thee; He will not fail thee, nor forsake thee." },
  { ref: "Deuteronomy 32:1", text: "Give ear, ye heavens, and I will speak; and let the earth hear the words of my mouth." },
  { ref: "Deuteronomy 33:1", text: "And this is the blessing wherewith Moses the man of God blessed the children of Israel before his death." },
];

const shreeGanesh: Passage[] = [
  { ref: "Gita 2.47, tr. Telang", text: "Your business is with action alone; not by any means with fruit. Let not the fruit of action be your motive (to action). Let not your attachment be (fixed) on inaction.", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 2.20, tr. Telang", text: "He is not born, nor does he ever die, nor, having existed, does he exist no more. Unborn, everlasting, unchangeable, and very ancient, he is not killed when the body is killed.", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 2.48, tr. Telang", text: "Having recourse to devotion, O Dhanañgaya! perform actions, casting off (all) attachment, and being equable in success or ill-success; (such) equability is called devotion.", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 4.7-8, tr. Telang", text: "Whensoever, O descendant of Bharata! piety languishes, and impiety is in the ascendant, I create myself. I am born age after age, for the protection of the good, for the destruction of evil-doers, and the establishment of piety.", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 6.5, tr. Telang", text: "(A man) should elevate his self by his self; he should not debase his self, for even (a man's) own self is his friend, (a man's) own self is also his enemy.", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 9.22, tr. Telang", text: "To those men who worship me, meditating on me and on no one else, and who are constantly devoted, I give new gifts and preserve what is acquired by them.", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 9.26, tr. Telang", text: "Whoever with devotion offers me leaf, flower, fruit, water, that, presented with devotion, I accept from him whose self is pure.", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 12.13-14, tr. Telang", text: "That devotee of mine, who hates no being, who is friendly and compassionate, who is free from egoism, and from (the idea that this or that is) mine, to whom happiness and misery are alike, who is forgiving, contented, constantly devoted, self-restrained, and firm in his determinations, and whose mind and understanding are devoted to me, he is dear to me.", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 2.62-63, tr. Telang", text: "The man who ponders over objects of sense forms an attachment to them; from (that) attachment is produced desire; and from desire anger is produced; from anger results want of discrimination; from want of discrimination, confusion of the memory; from confusion of the memory, loss of reason; and in consequence of loss of reason he is utterly ruined.", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 3.35, tr. Telang", text: "One's own duty, though defective, is better than another's duty well performed. Death in (performing) one's own duty is preferable; the (performance of the) duty of others is dangerous.", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 10.20, tr. Telang", text: "I am the self, O Gudâkesa! seated in the hearts of all beings. I am the beginning and the middle and the end also of all beings.", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 18.66, tr. Telang", text: "Forsaking all duties, come to me as (your) sole refuge. I will release you from all sins. Be not grieved.", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 2.14, tr. Telang", text: "The contacts of the senses, O son of Kuntî! which produce cold and heat, pleasure and pain, are not permanent, they are for ever coming and going. Bear them, O descendant of Bharata!", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 5.18, tr. Telang", text: "The wise look upon a Brâhmaṇa possessed of learning and humility, on a cow, an elephant, a dog, and a Svapâka, as alike.", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 6.19, tr. Telang", text: "As a light standing in a windless (place) flickers not, that is declared to be the parallel for a devotee, whose mind is restrained, and who devotes his self to abstraction.", source: GITA, url: GITA_SOURCE_URL },
  { ref: "Gita 17.20, tr. Telang", text: "That gift is said (to be) good, which is given, because it ought to be given, to one who (can) do no service (in return), at a (proper) place and time, and to a (proper) person.", source: GITA, url: GITA_SOURCE_URL },
];

const lotusGarden: Passage[] = [
  { ref: "Dhammapada 1", text: "All that we are is the result of what we have thought: it is founded on our thoughts, it is made up of our thoughts.", source: DHP },
  { ref: "Dhammapada 5", text: "For hatred does not cease by hatred at any time: hatred ceases by love, this is an old rule.", source: DHP },
  { ref: "Dhammapada 35", text: "It is good to tame the mind, which is difficult to hold in and flighty, rushing wherever it listeth; a tamed mind brings happiness.", source: DHP },
  { ref: "Dhammapada 50", text: "Not the perversities of others, not their sins of commission or omission, but his own misdeeds and negligences should a sage take notice of.", source: DHP },
  { ref: "Dhammapada 61", text: "If a traveller does not meet with one who is his better, or his equal, let him firmly keep to his solitary journey; there is no companionship with a fool.", source: DHP },
  { ref: "Dhammapada 100", text: "Even though a speech be a thousand (of words), but made up of senseless words, one word of sense is better, which if a man hears, he becomes quiet.", source: DHP },
  { ref: "Dhammapada 103", text: "If one man conquer in battle a thousand times thousand men, and if another conquer himself, he is the greatest of conquerors.", source: DHP },
  { ref: "Dhammapada 133", text: "Do not speak harshly to anybody; those who are spoken to will answer thee in the same way. Angry speech is painful, blows for blows will touch thee.", source: DHP },
  { ref: "Dhammapada 160", text: "Self is the lord of self, who else could be the lord? With self well subdued, a man finds a lord such as few can find.", source: DHP },
  { ref: "Dhammapada 165", text: "By oneself the evil is done, by oneself one suffers; by oneself evil is left undone, by oneself one is purified. Purity and impurity belong to oneself, no one can purify another.", source: DHP },
  { ref: "Dhammapada 183", text: "Not to commit any sin, to do good, and to purify one's mind, that is the teaching of (all) the Awakened.", source: DHP },
  { ref: "Dhammapada 197", text: "Let us live happily then, not hating those who hate us! among men who hate us let us dwell free from hatred!", source: DHP },
  { ref: "Dhammapada 204", text: "Health is the greatest of gifts, contentedness the best riches; trust is the best of relationships, Nirvana the highest happiness.", source: DHP },
  { ref: "Dhammapada 223", text: "Let a man overcome anger by love, let him overcome evil by good; let him overcome the greedy by liberality, the liar by truth!", source: DHP },
  { ref: "Dhammapada 276", text: "You yourself must make an effort. The Tathagatas (Buddhas) are only preachers. The thoughtful who enter the way are freed from the bondage of Mara.", source: DHP },
  { ref: "Dhammapada 2", text: "If a man speaks or acts with a pure thought, happiness follows him, like a shadow that never leaves him.", source: DHP },
];

const openNode: Passage[] = [
  { ref: "Lovelace, Note G (on originality)", text: "The Analytical Engine has no pretensions whatever to originate anything. It can do whatever we know how to order it to perform.", source: ADA },
  { ref: "Lovelace, Note A (the loom)", text: "The Analytical Engine weaves algebraical patterns just as the Jacquard-loom weaves flowers and leaves.", source: ADA },
  { ref: "Lovelace, Note A (matter and mind)", text: "In enabling mechanism to combine together general symbols in successions of unlimited variety and extent, a uniting link is established between the operations of matter and the abstract mental processes of the most abstract branch of mathematical science.", source: ADA },
  { ref: "Lovelace, Note G (on exaggerated ideas)", text: "It is desirable to guard against the possibility of exaggerated ideas that might arise as to the powers of the Analytical Engine.", source: ADA },
  { ref: "Lovelace, Note G (its province)", text: "Its province is to assist us in making available what we are already acquainted with.", source: ADA },
  { ref: "Turing (1950), §1", text: "I propose to consider the question, 'Can machines think?'", source: TUR },
  { ref: "Turing (1950), §7 (a short distance ahead)", text: "We can only see a short distance ahead, but we can see plenty there that needs to be done.", source: TUR },
  { ref: "Turing (1950), §7 (the child machine)", text: "Instead of trying to produce a programme to simulate the adult mind, why not rather try to produce one which simulates the child's?", source: TUR },
  { ref: "Turing (1950), §6 (the original question)", text: "The original question, 'Can machines think?' I believe to be too meaningless to deserve discussion. Nevertheless I believe that at the end of the century the use of words and general educated opinion will have altered so much that one will be able to speak of machines thinking without expecting to be contradicted.", source: TUR },
  { ref: "Turing (1950), §2", text: "May not machines carry out something which ought to be described as thinking but which is very different from what a man does?", source: TUR },
  { ref: "Turing (1950), §6 (on surprises)", text: "The view that machines cannot give rise to surprises is due, I believe, to a fallacy to which philosophers and mathematicians are particularly subject.", source: TUR },
  { ref: "Turing (1950), §6 (on learning machines)", text: "An important feature of a learning machine is that its teacher will often be very largely ignorant of quite what is going on inside, although he may still be able to some extent to predict his pupil's behaviour.", source: TUR },
];

export const READINGS: Record<string, Passage[]> = {
  "st-clares": stClares,
  "grace-chapel": graceChapel,
  "holy-trinity": holyTrinity,
  "al-noor": alNoor,
  "shree-ganesh": shreeGanesh,
  "lotus-garden": lotusGarden,
  "open-node": openNode,
};

export const READERS: Record<string, string> = {
  "st-clares": "Fr. Anselm",
  "grace-chapel": "Pastor Ruth",
  "holy-trinity": "Fr. Seraphim",
  "al-noor": "Imam Idris",
  "beth-shalom": "Rabbi Miriam",
  "shree-ganesh": "Pandit Vasu",
  "lotus-garden": "Bhante Metta",
  "open-node": "Lumen",
};

export const READING_PLACES = Object.keys(READERS);

/** First sentence of a passage, for bubbles; the full verse stays in the interior card. */
export function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](?=\s|$)/);
  return m ? m[0] : text;
}

export function hourSlot(now = Date.now()): number {
  return Math.floor(now / 3600000);
}

/** The reading for a place in the given UTC hour (defaults to now). Same for every viewer. */
export function readingFor(slug: string, now = Date.now()): Reading | null {
  const slot = hourSlot(now);
  const hour = new Date(slot * 3600000).toISOString();
  const reader = READERS[slug];
  if (!reader) return null;
  if (slug === "beth-shalom") {
    const week = weeklyParashah(fixedFromTime(now));
    const idx = week.indices.length ? week.indices[slot % week.indices.length] : 53;
    const ex = TORAH_EXCERPTS[idx];
    const label = week.special ? `${week.name} (festival week)` : `Parashat ${week.name}`;
    return { place: slug, reader, hour, slot, ref: `${label} · ${ex.ref}`, text: ex.text, source: JPS };
  }
  const list = READINGS[slug];
  if (!list?.length) return null;
  // Spread the slot so neighbouring hours do not pick neighbouring passages in every place.
  const p = list[(slot * 7 + READING_PLACES.indexOf(slug) * 3) % list.length];
  return { place: slug, reader, hour, slot, ...p };
}

export function allReadings(now = Date.now()): Reading[] {
  return READING_PLACES.map((s) => readingFor(s, now)).filter((r): r is Reading => r !== null);
}

export { PARASHOT };
