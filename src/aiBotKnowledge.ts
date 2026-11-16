import { CategoryKey } from './types';
import { isForeignMovie } from './words';
import { EXTRA_AR_ALIASES, EXTRA_WORD_ASSOCIATIONS } from './aiBotKnowledgeAdditions';

export function normalizeArabicText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .trim();
}

export const SPECIFIC_WORD_ASSOCIATIONS: Record<string, { ar: string[]; en: string[] }> = {
  'messi': { ar: ['أرجنتيني', 'برشلونة', 'مراوغ', 'أسطورة', 'ساحر', 'كأس'], en: ['Argentine', 'Barcelona', 'dribbler', 'GOAT', 'magician', 'lefty'] },
  'ronaldo': { ar: ['برتغالي', 'صاروخ', 'قفزة', 'نصر', 'مدريد', 'حاسم'], en: ['Portuguese', 'Madrid', 'header', 'athletic', 'rocket', 'record'] },
  'salah': { ar: ['ليفربول', 'مصري', 'فرعون', 'جناح', 'سريع', 'أحمر'], en: ['Liverpool', 'Egyptian', 'winger', 'speed', 'pharaoh', 'finisher'] },
  'neymar': { ar: ['برازيلي', 'سامبا', 'مهاري', 'مراوغ', 'استعراض', 'هلال'], en: ['Brazil', 'samba', 'skills', 'dribbler', 'flashy', 'flair'] },
  'mbappe': { ar: ['فرنسي', 'صاروخي', 'مدريد', 'شاب', 'نفاثة', 'هجوم'], en: ['French', 'Madrid', 'rocket', 'speedster', 'striker', 'young'] },
  'haaland': { ar: ['نرويجي', 'سيتي', 'فايكنج', 'طويل', 'قناص', 'أشقر'], en: ['Norwegian', 'Viking', 'tall', 'finisher', 'cyborg', 'power'] },
  'benzema': { ar: ['حكومة', 'فرنسي', 'اتحاد', 'قناص', 'ذهبية', 'مدريد'], en: ['striker', 'French', 'captain', 'clutch', 'golden', 'Madrid'] },
  'modric': { ar: ['كرواتي', 'مايسترو', 'تمريرات', 'خارجية', 'عقل', 'مدريد'], en: ['Croatian', 'maestro', 'passing', 'midfield', 'vision', 'veteran'] },
  'de bruyne': { ar: ['بلجيكي', 'سيتي', 'أسيست', 'رؤية', 'صانع', 'تسديد'], en: ['Belgian', 'assists', 'playmaker', 'vision', 'crossing', 'midfield'] },
  'vinicius jr': { ar: ['برازيلي', 'جناح', 'مدريد', 'سريع', 'رقصة', 'مراوغ'], en: ['Brazilian', 'winger', 'Madrid', 'flair', 'pace', 'dribbler'] },
  'abou trika': { ar: ['أهلي', 'ماجيكو', 'مصري', 'أخلاق', 'أسطورة', 'صانع'], en: ['Ahly', 'Egyptian', 'magician', 'legend', 'playmaker', 'beloved'] },
  'marmoush': { ar: ['مصري', 'سيتي', 'ألمانيا', 'سريع', 'ضربات', 'مهاجم'], en: ['Egyptian', 'fast', 'striker', 'freekick', 'Bundesliga', 'forward'] },
  'casillas': { ar: ['حارس', 'أسباني', 'مدريد', 'قديس', 'تصديات', 'كابتن'], en: ['keeper', 'Spanish', 'Madrid', 'saves', 'captain', 'legend'] },
  'buffon': { ar: ['حارس', 'إيطالي', 'يوفنتوس', 'عنكبوت', 'تاريخي', 'كأس'], en: ['keeper', 'Italian', 'Juventus', 'veteran', 'saves', 'icon'] },
  'maradona': { ar: ['أرجنتيني', 'أسطورة', 'نابولي', 'يد', 'تاريخي', 'مراوغ'], en: ['Argentine', 'Napoli', 'hand', 'legend', 'dribbler', 'icon'] },
  'pele': { ar: ['برازيلي', 'ملك', 'تاريخي', 'ثلاثة', 'سانتوس', 'أسطورة'], en: ['Brazilian', 'king', 'vintage', 'three', 'Santos', 'icon'] },
  'zidane': { ar: ['فرنسي', 'أصلع', 'مدرب', 'مدريد', 'مايسترو', 'نطحة'], en: ['French', 'maestro', 'coach', 'Madrid', 'elegant', 'header'] },

  'pizza': { ar: ['إيطالي', 'جبنة', 'مثلثات', 'فرن', 'صلصة', 'عجين'], en: ['Italian', 'cheese', 'slices', 'oven', 'crust', 'sauce'] },
  'burger': { ar: ['ساندوتش', 'لحم', 'جبنة', 'بطاطس', 'مشوي', 'عيش'], en: ['bun', 'patty', 'cheddar', 'fries', 'grilled', 'beef'] },
  'koshary': { ar: ['مصري', 'مكرونة', 'دقة', 'شطة', 'بصل', 'عدس'], en: ['Egyptian', 'lentils', 'pasta', 'onions', 'spicy', 'garlic'] },
  'shawarma': { ar: ['سيخ', 'تومية', 'صاج', 'ملفوف', 'شامي', 'ساندوتش'], en: ['wrap', 'garlic', 'rotisserie', 'spiced', 'skewer', 'toasted'] },
  'sushi': { ar: ['ياباني', 'سمك', 'أرز', 'عيدان', 'صويا', 'بحري'], en: ['Japanese', 'salmon', 'chopsticks', 'rice', 'seaweed', 'rolls'] },
  'molokhia': { ar: ['خضراء', 'طشة', 'ثوم', 'شوربة', 'شهقة', 'مصري'], en: ['green', 'garlic', 'stew', 'broth', 'Egyptian', 'leaves'] },
  'falafel': { ar: ['فول', 'مقلي', 'أخضر', 'سمسم', 'فطار', 'مقرمش'], en: ['crispy', 'fried', 'sesame', 'breakfast', 'herbs', 'patties'] },
  "ta'meya": { ar: ['مصري', 'فطار', 'أخضر', 'سمسم', 'مقرمش', 'سخن'], en: ['Egyptian', 'breakfast', 'green', 'sesame', 'crispy', 'fried'] },
  'mahshi': { ar: ['أرز', 'كرنب', 'ورق', 'طبيخ', 'خلطة', 'مصري'], en: ['stuffed', 'rice', 'leaves', 'herbs', 'casserole', 'homemade'] },
  'hawawshi': { ar: ['بلدي', 'مفروم', 'رغيف', 'فرن', 'فلفل', 'مصري'], en: ['crispy', 'minced', 'loaf', 'baked', 'spiced', 'Egyptian'] },
  'kunafa': { ar: ['رمضان', 'قشطة', 'شربات', 'شعر', 'ذهبي', 'حلو'], en: ['Ramadan', 'syrup', 'crispy', 'cream', 'sweet', 'pastry'] },
  'basbousa': { ar: ['سميد', 'شربات', 'قشطة', 'صينية', 'لوز', 'حلو'], en: ['semolina', 'syrup', 'tray', 'sweet', 'dessert', 'almond'] },
  'kebab': { ar: ['فحم', 'مشوي', 'أسياخ', 'دخان', 'لحم', 'تتبيلة'], en: ['charcoal', 'grilled', 'skewers', 'smoky', 'lamb', 'tender'] },
  'kofta': { ar: ['سيخ', 'مفروم', 'فحم', 'بقدونس', 'مشوي', 'طرب'], en: ['minced', 'skewers', 'charcoal', 'grilled', 'herbs', 'savory'] },
  'om ali': { ar: ['مكسرات', 'لبن', 'طاجن', 'قرفة', 'سخن', 'حلو'], en: ['nuts', 'milk', 'oven', 'cinnamon', 'warm', 'pastry'] },
  'ramen': { ar: ['ياباني', 'نودلز', 'شوربة', 'بيض', 'عيدان', 'سخن'], en: ['Japanese', 'noodles', 'broth', 'egg', 'chopsticks', 'steaming'] },
  'tacos': { ar: ['مكسيكي', 'ذرة', 'حار', 'لحم', 'أفوكادو', 'مقرمش'], en: ['Mexican', 'shell', 'spicy', 'salsa', 'filling', 'crunchy'] },
  'dubai chocolate': { ar: ['فستق', 'كنافة', 'مقرمش', 'ترند', 'فاخر', 'كاكاو'], en: ['pistachio', 'knafeh', 'viral', 'crunchy', 'rich', 'cocoa'] },

  'pyramids': { ar: ['فراعنة', 'الجيزة', 'حجارة', 'مثلث', 'آثار', 'قديم'], en: ['pharaohs', 'Giza', 'stones', 'triangles', 'ancient', 'wonder'] },
  'sphinx': { ar: ['تمثال', 'فرعوني', 'الجيزة', 'رأس', 'أسد', 'حجر'], en: ['statue', 'pharaoh', 'Giza', 'lion', 'stone', 'riddle'] },
  'eiffel tower': { ar: ['باريس', 'فرنسا', 'حديد', 'أنوار', 'ارتفاع', 'رومانسي'], en: ['Paris', 'France', 'iron', 'lights', 'tower', 'romantic'] },
  'dubai': { ar: ['إمارات', 'ناطحات', 'تسوق', 'فخامة', 'صحراء', 'خليفة'], en: ['UAE', 'skyscrapers', 'luxury', 'desert', 'mall', 'futuristic'] },
  'burj khalifa': { ar: ['أطول', 'دبي', 'ناطحة', 'زجاج', 'سحاب', 'قمة'], en: ['tallest', 'Dubai', 'skyscraper', 'clouds', 'glass', 'tower'] },
  'london': { ar: ['ضباب', 'تيمز', 'باص', 'أحمر', 'تاج', 'ساعة'], en: ['fog', 'Thames', 'redbus', 'royal', 'rainy', 'British'] },
  'paris': { ar: ['عطور', 'أنوار', 'موضة', 'سين', 'فرنسا', 'لوفر'], en: ['perfume', 'lights', 'fashion', 'Seine', 'France', 'Louvre'] },
  'tokyo': { ar: ['يابان', 'أنمي', 'نيون', 'قطار', 'تكنولوجيا', 'سوشي'], en: ['Japan', 'anime', 'neon', 'bullet', 'tech', 'shibuya'] },
  'mecca': { ar: ['كعبة', 'حج', 'عمرة', 'مسجد', 'حرم', 'مقدس'], en: ['Kaaba', 'pilgrimage', 'sacred', 'mosque', 'prayer', 'Saudi'] },
  'sharm el sheikh': { ar: ['سيناء', 'غطس', 'شعب', 'سياحة', 'بحر', 'منتجع'], en: ['Sinai', 'diving', 'coral', 'resort', 'sunny', 'coast'] },
  'khan el khalili': { ar: ['حسين', 'تراث', 'تحف', 'قهوة', 'قاهرة', 'سوق'], en: ['bazaar', 'souvenirs', 'lanterns', 'Cairo', 'heritage', 'coffee'] },
  'maldives': { ar: ['جزر', 'أكواخ', 'فيروزي', 'محيط', 'هدوء', 'شاطئ'], en: ['islands', 'villas', 'turquoise', 'ocean', 'tropical', 'paradise'] },

  'breaking bad': { ar: ['كيمياء', 'مختبر', 'صحراء', 'هايزنبرج', 'بلورات', 'عصابة'], en: ['chemistry', 'desert', 'Heisenberg', 'lab', 'cartel', 'teacher'] },
  'game of thrones': { ar: ['تنانين', 'عرش', 'سيوف', 'شتاء', 'ملوك', 'ممالك'], en: ['dragons', 'throne', 'winter', 'swords', 'kingdoms', 'crowns'] },
  'squid game': { ar: ['كوري', 'ألعاب', 'ملابس', 'أقنعة', 'جائزة', 'أخضر'], en: ['Korean', 'masks', 'contest', 'green', 'survival', 'prize'] },
  'la casa de papel': { ar: ['بنك', 'أحمر', 'أقنعة', 'سرقة', 'بروفيسور', 'أسباني'], en: ['heist', 'red', 'masks', 'bank', 'Professor', 'Spanish'] },
  'titanic': { ar: ['سفينة', 'جليد', 'غرق', 'رومانسي', 'محيط', 'قارب'], en: ['ship', 'iceberg', 'sinking', 'ocean', 'romance', 'cruise'] },
  'inception': { ar: ['أحلام', 'لاوعي', 'طبقات', 'نولان', 'دوامة', 'زمن'], en: ['dreams', 'layers', 'subconscious', 'Nolan', 'totem', 'heist'] },
  'interstellar': { ar: ['فضاء', 'ثقب', 'كواكب', 'زمن', 'جاذبية', 'مزرعة'], en: ['space', 'wormhole', 'gravity', 'relativity', 'cosmos', 'NASA'] },
  'avatar': { ar: ['أزرق', 'كوكب', 'غابة', 'كائنات', 'ثريدي', 'قبيلة'], en: ['blue', 'Pandora', 'forest', 'aliens', 'nature', 'tribe'] },
  'harry potter': { ar: ['سحر', 'مدرسة', 'عصا', 'نظارة', 'مكنسة', 'بومة'], en: ['wizard', 'wand', 'school', 'magic', 'broom', 'scar'] },
  'joker': { ar: ['مهرج', 'ضحكة', 'جوثام', 'سلالم', 'مكياج', 'جنون'], en: ['clown', 'laugh', 'Gotham', 'makeup', 'stairs', 'chaos'] },
  'spider-man': { ar: ['عنكبوت', 'شبكة', 'نيويورك', 'قناع', 'تسلق', 'أحمر'], en: ['web', 'hero', 'swinging', 'red', 'mask', 'Manhattan'] },
  'el kabeer awy': { ar: ['مزاريطة', 'صعيدي', 'كوميدي', 'جوني', 'حزلقوم', 'عمدة'], en: ['comedy', 'village', 'Egyptian', 'brothers', 'turban', 'funny'] },
  'el feel el azraq': { ar: ['نفسي', 'مستشفى', 'حبوب', 'رعب', 'جن', 'يحيى'], en: ['thriller', 'asylum', 'pills', 'supernatural', 'mystery', 'doctor'] },
  'gaafar el omda': { ar: ['سيدة', 'زوجات', 'ابنه', 'رمضان', 'شعبي', 'انتقام'], en: ['Ramadan', 'drama', 'family', 'revenge', 'Egypt', 'street'] },
  'welad rizk': { ar: ['سرقة', 'إخوات', 'أكشن', 'عصابة', 'صفقة', 'قاهرة'], en: ['heist', 'brothers', 'action', 'gang', 'Cairo', 'cars'] },
  'el hashashin': { ar: ['قلعة', 'تاريخي', 'ألموت', 'أتباع', 'صباح', 'مؤامرة'], en: ['castle', 'historical', 'assassins', 'sect', 'Persia', 'fortress'] },

  'gta v': { ar: ['عصابة', 'سيارات', 'سرقة', 'مدينة', 'مطاردة', 'خريطة'], en: ['cars', 'heist', 'city', 'wanted', 'openworld', 'gang'] },
  'minecraft': { ar: ['مكعبات', 'تعدين', 'دايموند', 'بناء', 'زومبي', 'خشب'], en: ['blocks', 'mining', 'diamond', 'crafting', 'creeper', 'pixels'] },
  'pubg': { ar: ['باراشوت', 'زون', 'أسلحة', 'دروب', 'طاسة', 'جزيرة'], en: ['parachute', 'airdrop', 'zone', 'pan', 'loot', 'squad'] },
  'fifa': { ar: ['كرة', 'ألتيميت', 'ملاعب', 'مباراة', 'تشكيلة', 'درافت'], en: ['football', 'packs', 'stadium', 'kickoff', 'squad', 'pitch'] },
  'valorant': { ar: ['عملاء', 'سبايك', 'قدرات', 'قناصة', 'خريطة', 'تكتيك'], en: ['agents', 'spike', 'abilities', 'tactical', 'shooter', 'ranks'] },
  'fortnite': { ar: ['بناء', 'سكينز', 'جزيرة', 'رقصة', 'ستورم', 'باتل'], en: ['building', 'bus', 'skins', 'storm', 'emotes', 'battle'] },
  'among us': { ar: ['محطة', 'خائن', 'مهمات', 'اجتماع', 'أنفاق', 'تصويت'], en: ['impostor', 'vents', 'tasks', 'meeting', 'spaceship', 'sus'] },
  'roblox': { ar: ['مابات', 'روباكس', 'شخصيات', 'أطفال', 'مكعبات', 'عالم'], en: ['obby', 'avatars', 'sandbox', 'minigames', 'worlds', 'blocky'] },
  'elden ring': { ar: ['زعماء', 'سيوف', 'خاتم', 'صعوبة', 'عالم', 'فانتازيا'], en: ['bosses', 'souls', 'fantasy', 'challenging', 'swords', 'ring'] },
  'free fire': { ar: ['موبايل', 'هبوط', 'بقاء', 'شخصيات', 'سريع', 'أسلحة'], en: ['mobile', 'survival', 'island', 'drop', 'fast', 'loot'] },

  'lion': { ar: ['زئير', 'غابة', 'لبدة', 'ملك', 'مفترس', 'قطيع'], en: ['roar', 'mane', 'savannah', 'king', 'pride', 'predator'] },
  'tiger': { ar: ['مخطط', 'برتقالي', 'مفترس', 'أنياب', 'غابة', 'نمر'], en: ['stripes', 'orange', 'jungle', 'fierce', 'claws', 'predator'] },
  'elephant': { ar: ['خرطوم', 'ضخم', 'عاج', 'أذنين', 'ذاكرة', 'رمادي'], en: ['trunk', 'tusks', 'giant', 'ears', 'grey', 'ivory'] },
  'dolphin': { ar: ['ذكي', 'محيط', 'قفز', 'موجات', 'زعانف', 'ودود'], en: ['smart', 'waves', 'friendly', 'fins', 'sonar', 'playful'] },
  'shark': { ar: ['زعنفة', 'أنياب', 'مفترس', 'محيط', 'قرش', 'غواص'], en: ['fin', 'jaws', 'teeth', 'ocean', 'predator', 'hunter'] },
  'camel': { ar: ['صحراء', 'سنام', 'عطش', 'قافلة', 'سفينة', 'رمال'], en: ['desert', 'hump', 'sand', 'caravan', 'thirst', 'endurance'] },
  'penguin': { ar: ['ثلج', 'قطب', 'أبيض', 'أسود', 'سباحة', 'بطريق'], en: ['ice', 'tuxedo', 'Antarctica', 'waddle', 'swim', 'cold'] },
  'chameleon': { ar: ['ألوان', 'تخفي', 'لسان', 'عيون', 'شجرة', 'تغير'], en: ['camouflage', 'colors', 'tongue', 'lizard', 'blend', 'eyes'] },
  'falcon': { ar: ['مخالب', 'تحليق', 'بصر', 'سرعة', 'صياد', 'جناح'], en: ['dives', 'vision', 'feathers', 'swift', 'prey', 'talons'] },
  'doctor': { ar: ['سماعة', 'مستشفى', 'روشتة', 'علاج', 'بالطو', 'كشف'], en: ['stethoscope', 'clinic', 'prescription', 'coat', 'diagnosis', 'cure'] },
  'teacher': { ar: ['سبورة', 'فصل', 'امتحان', 'شرح', 'مدرسة', 'طباشير'], en: ['classroom', 'board', 'homework', 'students', 'lessons', 'exam'] },
  'engineer': { ar: ['رسومات', 'موقع', 'خوذة', 'تصميم', 'إنشاء', 'مشاريع'], en: ['blueprints', 'helmet', 'design', 'structures', 'planning', 'site'] },
  'pilot': { ar: ['كابينة', 'طائرة', 'مطار', 'سحاب', 'رحلة', 'مدرج'], en: ['cockpit', 'runway', 'altitude', 'flight', 'wings', 'captain'] },
  'chef': { ar: ['مطبخ', 'قبعة', 'وصفات', 'مقلاة', 'بهارات', 'طهي'], en: ['kitchen', 'recipes', 'apron', 'spices', 'oven', 'cuisine'] },
  'astronaut': { ar: ['صاروخ', 'خوذة', 'قمر', 'جاذبية', 'كواكب', 'مدار'], en: ['rocket', 'helmet', 'orbit', 'gravity', 'moon', 'spacewalk'] },
  'programmer': { ar: ['كود', 'شاشة', 'خوارزمية', 'تطبيق', 'أخطاء', 'سيرفر'], en: ['code', 'keyboard', 'debugging', 'software', 'algorithm', 'terminal'] },
  'police officer': { ar: ['دورية', 'قانون', 'صافرة', 'شارة', 'أمان', 'بلاغ'], en: ['patrol', 'badge', 'siren', 'law', 'uniform', 'safety'] },
  'firefighter': { ar: ['خرطوم', 'حريق', 'خوذة', 'سلم', 'إنقاذ', 'دخان'], en: ['hose', 'flames', 'rescue', 'ladder', 'smoke', 'hydrant'] },
  'amr diab': { ar: ['هضبة', 'صيف', 'نورالعين', 'أسطورة', 'لياقة', 'تملي'], en: ['legend', 'summer', 'Mediterranean', 'hits', 'classic', 'icon'] },
  'tamer hosny': { ar: ['جيل', 'أفلام', 'رومانسي', 'مسرح', 'ملحن', 'نجم'], en: ['romantic', 'actor', 'concerts', 'generation', 'star', 'composer'] },
  'wegz': { ar: ['راب', 'إسكندرية', 'البخت', 'تراب', 'جديد', 'تيشيرت'], en: ['rap', 'Alexandria', 'trap', 'bars', 'beat', 'youth'] },
  'sherine': { ar: ['إحساس', 'حزن', 'جرح', 'صوت', 'عاطفة', 'مشاعر'], en: ['emotion', 'soulful', 'ballads', 'heartbreak', 'vocal', 'drama'] },
  'cairokee': { ar: ['باند', 'روك', 'شباب', 'جيتار', 'أمير', 'تغيير'], en: ['band', 'rock', 'guitar', 'youth', 'anthem', 'indie'] },
  'mohamed ramadan': { ar: ['نمبروان', 'أسطورة', 'استعراض', 'مسلسل', 'حفلات', 'سيارات'], en: ['showman', 'flashy', 'concerts', 'actor', 'bold', 'performer'] },
  'adele': { ar: ['بريطانية', 'قوة', 'حزن', 'جوائز', 'بيانو', 'أرقام'], en: ['British', 'piano', 'Grammy', 'ballads', 'powerhouse', 'heartbreak'] },
  'drake': { ar: ['كندي', 'راب', 'هيب', 'ألبوم', 'ليل', 'بيلبورد'], en: ['Canadian', 'rap', 'Billboard', 'Toronto', 'tracks', 'hiphop'] },
  ...EXTRA_WORD_ASSOCIATIONS
};

const AR_WORD_ALIAS_MAP: Record<string, string> = {
  'ميسي': 'messi', 'رونالدو': 'ronaldo', 'صلاح': 'salah', 'نيمار': 'neymar',
  'مبابي': 'mbappe', 'هالاند': 'haaland', 'بنزيما': 'benzema', 'مودريتش': 'modric',
  'دي بروين': 'de bruyne', 'فينيسيوس جونيور': 'vinicius jr', 'ابو تريكه': 'abou trika',
  'مرموش': 'marmoush', 'كاسياس': 'casillas', 'بوفون': 'buffon', 'مارادونا': 'maradona',
  'بيليه': 'pele', 'زيدان': 'zidane', 'بيتزا': 'pizza', 'برجر': 'burger', 'كشري': 'koshary',
  'شاورما': 'shawarma', 'سوشي': 'sushi', 'ملوخيه': 'molokhia', 'فلافل': 'falafel',
  'طعميه': "ta'meya", 'محشي': 'mahshi', 'حواوشي': 'hawawshi', 'كنافه': 'kunafa',
  'بسبوسه': 'basbousa', 'كباب': 'kebab', 'كفته': 'kofta', 'ام علي': 'om ali',
  'رامن': 'ramen', 'تاكوس': 'tacos', 'شوكولاته دبي': 'dubai chocolate',
  'الاهرامات': 'pyramids', 'ابو الهول': 'sphinx', 'برج ايفل': 'eiffel tower',
  'دبي': 'dubai', 'برج خليفه': 'burj khalifa', 'لندن': 'london', 'باريس': 'paris',
  'طوكيو': 'tokyo', 'مكه': 'mecca', 'شرم الشيخ': 'sharm el sheikh',
  'خان الخليلي': 'khan el khalili', 'المالديف': 'maldives',
  'بريكنج باد': 'breaking bad', 'صراع العروش': 'game of thrones', 'لعبه الحبار': 'squid game',
  'لاكاسا دي بابيل': 'la casa de papel', 'تيتانيك': 'titanic', 'انسبشن': 'inception',
  'انترستيلر': 'interstellar', 'افاتار': 'avatar', 'هاري بوتر': 'harry potter',
  'الجوكر': 'joker', 'سبايدرمان': 'spider-man', 'الكبير اوي': 'el kabeer awy',
  'الفيل الازرق': 'el feel el azraq', 'جعفر العمده': 'gaafar el omda',
  'ولاد رزق': 'welad rizk', 'الحشاشين': 'el hashashin',
  'جي تي ايه 5': 'gta v', 'ماين كرافت': 'minecraft', 'ببجي': 'pubg', 'فيفا': 'fifa',
  'فالورانت': 'valorant', 'فورتنايت': 'fortnite', 'امونج اس': 'among us',
  'روبلوكس': 'roblox', 'الدن رينج': 'elden ring', 'فري فاير': 'free fire',
  'اسد': 'lion', 'نمر': 'tiger', 'فيل': 'elephant', 'دولفين': 'dolphin',
  'قرش': 'shark', 'جمل': 'camel', 'بطريق': 'penguin', 'حرباء': 'chameleon', 'صقر': 'falcon',
  'دكتور': 'doctor', 'مدرس': 'teacher', 'مهندس': 'engineer', 'طيار': 'pilot',
  'شيف': 'chef', 'رائد فضاء': 'astronaut', 'مبرمج': 'programmer',
  'ضابط شرطه': 'police officer', 'رجل اطفاء': 'firefighter',
  'عمرو دياب': 'amr diab', 'تامر حسني': 'tamer hosny', 'ويجز': 'wegz',
  'شيرين': 'sherine', 'كايروكي': 'cairokee', 'محمد رمضان': 'mohamed ramadan',
  'اديل': 'adele', 'دريك': 'drake',
  ...EXTRA_AR_ALIASES
};

export function resolveWordAssociation(wordEn: string, wordAr: string): { ar: string[]; en: string[] } | undefined {
  const cleanEn = (wordEn || '').toLowerCase().trim();
  const normAr = normalizeArabicText(wordAr);
  if (cleanEn && SPECIFIC_WORD_ASSOCIATIONS[cleanEn]) return SPECIFIC_WORD_ASSOCIATIONS[cleanEn];
  const aliasKey = AR_WORD_ALIAS_MAP[normAr] || AR_WORD_ALIAS_MAP[normAr.replace(/^ال/, '')];
  return aliasKey ? SPECIFIC_WORD_ASSOCIATIONS[aliasKey] : undefined;
}

export function inferWordSubClusterClues(wordEn: string, wordAr: string, category: CategoryKey, isAr: boolean): string[] {
  const en = (wordEn || '').toLowerCase();
  const ar = normalizeArabicText(wordAr);

  if (category === 'movies') {
    return isForeignMovie(en)
      ? (isAr ? ['أجنبي', 'هوليود', 'مترجم', 'نتفليكس', 'عالمي'] : ['Hollywood', 'international', 'subtitled', 'Netflix', 'cinema'])
      : (isAr ? ['مصري', 'عربي', 'رمضاني', 'نجوم', 'جماهيري'] : ['Egyptian', 'Arabic', 'Ramadan', 'local', 'popular']);
  }
  if (category === 'players') {
    if (/courtois|alisson|ederson|ter stegen|neuer|casillas|buffon/.test(en)) return isAr ? ['حارس', 'قفاز', 'مرمى', 'تصديات'] : ['keeper', 'gloves', 'saves', 'goalline'];
    if (/ramos|van dijk|puyol|hakimi|hernandez|arnold|cancelo|marquinhos|varane|rudiger|dias|stones|gabr|gomaa|hegazi|fathy/.test(en)) return isAr ? ['مدافع', 'تأمين', 'صلب', 'تغطية'] : ['defender', 'tackles', 'backline', 'solid'];
    if (/salah|elneny|trezeguet|marmoush|mostafa|hegazi|fathy|meteb|hassan|trika|mido|khatib|gabr|gomaa/.test(en)) return isAr ? ['مصري', 'منتخب', 'جماهيري', 'وطني'] : ['Egyptian', 'national', 'icon', 'African'];
    if (/cruyff|beckenbauer|beckham|henry|drogba|eto|ronaldinho|nazario|pele|maradona|zidane|xavi|iniesta/.test(en)) return isAr ? ['أسطورة', 'تاريخي', 'معتزل', 'كلاسيكي'] : ['retired', 'legend', 'classic', 'iconic'];
  }
  if (category === 'food') {
    if (/cake|tiramisu|baklava|basbousa|kunafa|om ali|pudding|gelato|donut|waffle|pancake|churro|macaron|zalabya|chocolate|croffle/.test(en) || /كنافه|بسبوسه|بقلاوه|كيك|شوكولاته|حلو/.test(ar)) return isAr ? ['حلو', 'سكر', 'تحلية', 'قشطة'] : ['sweet', 'sugar', 'dessert', 'creamy'];
    if (/tea|coffee|sobia|karkade|asab|freakshake/.test(en) || /عصير|شاي|قهوه|سوبيا|كركديه|عصب/.test(ar)) return isAr ? ['مشروب', 'منعش', 'بارد', 'كوباية'] : ['drink', 'refreshing', 'cup', 'beverage'];
    if (/fish|shrimp|calamari|lobster|crab|clam|sushi/.test(en) || /سمك|جمبري|كالاماري|استاكوزا/.test(ar)) return isAr ? ['بحري', 'ليمون', 'صياد', 'طازة'] : ['seafood', 'ocean', 'lemon', 'coastal'];
    if (/koshary|molokhia|ful|ta'meya|mahshi|fattah|sayadeya|hawawshi|feteer|fesikh|shakshuka|sobia/.test(en)) return isAr ? ['مصري', 'بلدي', 'شعبي', 'أصيل'] : ['Egyptian', 'traditional', 'local', 'authentic'];
  }
  if (category === 'singers') {
    if (/bika|shakosh|kamal|shaaban|soghayar|bosy|hakim/.test(en)) return isAr ? ['شعبي', 'مهرجان', 'فرح', 'إيقاع'] : ['street', 'festival', 'wedding', 'rhythm'];
    if (/wegz|pablo|moussa|abyusif|molotof|afroto|shahyn|zaza|tul8te/.test(en)) return isAr ? ['راب', 'تراك', 'جديد', 'فلو'] : ['rap', 'trap', 'bars', 'flow'];
    if (/adele|beyonce|rihanna|sheeran|bieber|swift|mars|weeknd|drake|shakira|enrique/.test(en)) return isAr ? ['عالمي', 'أجنبي', 'بيلبورد', 'هيت'] : ['global', 'Billboard', 'Grammy', 'popstar'];
    return isAr ? ['عربي', 'طرب', 'رومانسي', 'نجم'] : ['Arabic', 'romantic', 'melodic', 'star'];
  }
  if (category === 'animals') {
    if (/dolphin|shark|whale|octopus|jellyfish|starfish|seahorse|walrus|seal|orca|manatee|turtle/.test(en)) return isAr ? ['بحري', 'محيط', 'سباحة', 'زعانف'] : ['marine', 'ocean', 'swimming', 'fins'];
    if (/falcon|eagle|owl|peacock|parrot|flamingo|penguin|ostrich|swan|duck|pelican|crow|pigeon|sparrow|hummingbird|woodpecker|toucan|vulture|condor|stork|heron/.test(en)) return isAr ? ['طائر', 'ريش', 'جناح', 'تحليق'] : ['bird', 'feathers', 'wings', 'flight'];
    if (/snake|lizard|chameleon|iguana|crocodile|frog|toad/.test(en)) return isAr ? ['زاحف', 'حراشف', 'أخضر', 'برية'] : ['reptile', 'scales', 'wild', 'swamp'];
  }
  if (category === 'jobs') {
    if (/programmer|graphic|web|data|ui\/ux|app|video|marketing|content|influencer|youtuber|podcaster|social|freelancer|e-commerce/.test(en)) return isAr ? ['رقمي', 'شاشة', 'إنترنت', 'إبداع'] : ['digital', 'screen', 'online', 'creative'];
    if (/doctor|nurse|dentist|pharmacist|veterinarian/.test(en)) return isAr ? ['طبي', 'علاج', 'عيادة', 'بالطو'] : ['medical', 'clinic', 'care', 'coat'];
  }
  if (category === 'places' && /pyramid|sphinx|nile|luxor|karnak|abu simbel|alexandria|khan|cairo|red sea|sharm|hurghada|siwa/.test(en)) {
    return isAr ? ['مصري', 'تاريخ', 'حضارة', 'نيل'] : ['Egyptian', 'history', 'civilization', 'Nile'];
  }
  return [];
}

export const CATEGORY_ASSOCIATIONS: Record<CategoryKey, { ar: string[]; en: string[] }> = {
  players: { ar: ['مهارة', 'سرعة', 'ملعب', 'بطولة', 'كابتن', 'تسديدة', 'دوري', 'موهبة'], en: ['skill', 'speed', 'pitch', 'trophy', 'captain', 'shot', 'league', 'talent'] },
  food: { ar: ['لذيذ', 'سخن', 'طازة', 'وجبة', 'مطبخ', 'توابل', 'ريحة', 'شهي'], en: ['delicious', 'fresh', 'meal', 'spices', 'aroma', 'flavor', 'savory', 'crispy'] },
  places: { ar: ['معلم', 'سياحة', 'سفر', 'عاصمة', 'بلد', 'آثار', 'تاريخ', 'طبيعة'], en: ['landmark', 'tourism', 'travel', 'capital', 'country', 'ancient', 'historic', 'heritage'] },
  movies: { ar: ['سينما', 'قصة', 'مخرج', 'أكشن', 'نجم', 'حوار', 'دراما', 'مشهد'], en: ['cinema', 'plot', 'director', 'action', 'star', 'soundtrack', 'drama', 'scene'] },
  games: { ar: ['أونلاين', 'جرافيكس', 'تحدي', 'سيرفر', 'سلاح', 'تكتيك', 'فوز', 'مرحلة'], en: ['multiplayer', 'controls', 'graphics', 'challenge', 'server', 'tactics', 'victory', 'level'] },
  animals: { ar: ['بري', 'طبيعة', 'صوت', 'سرعة', 'قوة', 'فرو', 'غابة', 'صيد'], en: ['wildlife', 'creature', 'nature', 'sound', 'speed', 'fur', 'habitat', 'hunter'] },
  jobs: { ar: ['مهنة', 'عمل', 'مكتب', 'راتب', 'شركة', 'خبرة', 'تخصص', 'شهادة'], en: ['profession', 'career', 'office', 'salary', 'company', 'expert', 'uniform', 'duty'] },
  singers: { ar: ['مطرب', 'أغنية', 'صوت', 'ألحان', 'كلمات', 'موسيقى', 'ألبوم', 'حفلة'], en: ['vocalist', 'song', 'melody', 'lyrics', 'rhythm', 'album', 'concert', 'stage'] }
};
