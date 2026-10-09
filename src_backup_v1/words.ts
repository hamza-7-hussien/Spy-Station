import { CategoryKey, Language } from './types';

export const wordsDB: Record<CategoryKey, [string, string][]> = {
  players: [
    ["Messi", "ميسي"], ["Ronaldo", "رونالدو"], ["Neymar", "نيمار"], ["Mbappe", "مبابي"],
    ["Haaland", "هالاند"], ["De Bruyne", "دي بروين"], ["Benzema", "بنزيما"], ["Modric", "مودريتش"],
    ["Salah", "صلاح"], ["Kane", "كين"], ["Lewandowski", "ليفاندوفسكي"], ["Griezmann", "جريزمان"],
    ["Suarez", "سواريز"], ["Ramos", "راموس"], ["Van Dijk", "فان دايك"], ["Kroos", "كروس"],
    ["Casemiro", "كاسيميرو"], ["Bruno Fernandes", "برونو فيرنانديز"], ["Son Heung-min", "سون هيونج مين"],
    ["Vinicius Jr", "فينيسيوس جونيور"], ["Rodrygo", "رودريجو"], ["Pedri", "بيدري"], ["Gavi", "جافي"],
    ["Bellingham", "بيلينجهام"], ["Foden", "فودين"], ["Saka", "ساكا"], ["Rashford", "راشفورد"],
    ["Mane", "ماني"], ["Mahrez", "محرز"], ["Ibrahimovic", "إبراهيموفيتش"], ["Iniesta", "إنييستا"],
    ["Xavi", "تشافي"], ["Casillas", "كاسياس"], ["Buffon", "بوفون"], ["Ronaldinho", "رونالدينيو"],
    ["Zidane", "زيدان"], ["Ronaldo Nazario", "رونالدو نازاريو"], ["Pele", "بيليه"], ["Maradona", "مارادونا"],
    ["Cruyff", "كرويف"], ["Beckenbauer", "بيكنباور"], ["Beckham", "بيكهام"], ["Henry", "هنري"],
    ["Drogba", "دروجبا"], ["Eto'o", "إيتو"], ["Elneny", "النني"], ["Trezeguet", "تريزيجيه"],
    ["Marmoush", "مرموش"], ["Mostafa Mohamed", "مصطفى محمد"], ["Hegazi", "الحجازي"],
    ["Ahmed Fathy", "أحمد فتحي"], ["Emad Meteb", "عماد متعب"], ["Hossam Hassan", "حسام حسن"],
    ["Abou Trika", "أبو تريكة"], ["Mido", "ميدو"], ["El Khatib", "الخطيب"], ["Ali Gabr", "علي جبر"],
    ["Sterling", "ستيرلينج"], ["Grealish", "جريليش"], ["Rice", "رايس"], ["Pogba", "بوجبا"],
    ["Kante", "كانتي"], ["Dembele", "ديمبلي"], ["De Jong", "دي يونج"], ["Kimmich", "كيميش"],
    ["Muller", "مولر"], ["Neuer", "نوير"], ["Cavani", "كافاني"], ["Di Maria", "دي ماريا"],
    ["Aguero", "أجويرو"], ["Falcao", "فالكاو"], ["James Rodriguez", "خامس رودريجيز"],
    ["Alexis Sanchez", "أليكسيس سانشيز"], ["Robben", "روبن"], ["Ribery", "ريبيري"],
    ["Busquets", "بوسكيتس"], ["Puyol", "بويول"], ["Fabregas", "فابريجاس"], ["Torres", "توريس"],
    ["Villa", "فيا"], ["Courtois", "كورتوا"], ["Alisson", "أليسون"], ["Ederson", "إيدرسون"],
    ["Ter Stegen", "تير شتيجن"], ["Hakimi", "حكيمي"], ["Theo Hernandez", "ثيو هيرنانديز"],
    ["Trent Alexander-Arnold", "ترينت ألكسندر أرنولد"], ["Joao Cancelo", "جواو كانسيلو"],
    ["Marquinhos", "ماركينيوس"], ["Varane", "فاران"], ["Rudiger", "روديجر"],
    ["Ruben Dias", "روبن دياز"], ["John Stones", "جون ستونز"], ["Odegaard", "أوديجارد"],
    ["Pulisic", "بوليسيتش"], ["Lamine Yamal", "لامين يامال"], ["Musiala", "موسيالا"],
    ["Wirtz", "فيرتز"], ["Valverde", "فالفيردي"], ["Camavinga", "كامافينجا"],
    ["Enzo Fernandez", "إنزو فيرنانديز"], ["Julian Alvarez", "خوليان ألفاريز"],
    ["Cole Palmer", "كول بالمر"], ["Ahmed Hassan", "أحمد حسن"], ["Wael Gomaa", "وائل جمعة"]
  ],
  food: [
    ["Pizza", "بيتزا"], ["Burger", "برجر"], ["Sushi", "سوشي"], ["Pasta", "باستا"],
    ["Shawarma", "شاورما"], ["Tacos", "تاكوس"], ["Ice Cream", "آيس كريم"], ["Koshary", "كشري"],
    ["Crepe", "كريب"], ["Falafel", "فلافل"], ["Hummus", "حمص"], ["Kebab", "كباب"],
    ["Molokhia", "ملوخية"], ["Ful Medames", "فول مدمس"], ["Ta'meya", "طعمية"], ["Mahshi", "محشي"],
    ["Fattah", "فتة"], ["Sayadeya", "صيادية"], ["Kofta", "كفتة"], ["Shish Tawook", "شيش طاووق"],
    ["Ramen", "رامن"], ["Pho", "فو"], ["Dumplings", "دمبلنجز"], ["Fried Rice", "أرز مقلي"],
    ["Spring Rolls", "سبرنج رول"], ["Croissant", "كرواسون"], ["Pancakes", "بان كيك"],
    ["Waffles", "وافل"], ["Donuts", "دونات"], ["Cheesecake", "تشيز كيك"], ["Tiramisu", "تيراميسو"],
    ["Baklava", "بقلاوة"], ["Basbousa", "بسبوسة"], ["Kunafa", "كنافة"], ["Om Ali", "أم علي"],
    ["Rice Pudding", "أرز باللبن"], ["Popcorn", "فشار"], ["Nachos", "ناتشوز"], ["Fries", "بطاطس مقلية"],
    ["Hot Dog", "هوت دوج"], ["Sandwich", "ساندويتش"], ["Steak", "ستيك"], ["Grilled Fish", "سمك مشوي"],
    ["Lasagna", "لازانيا"], ["Ravioli", "رافيولي"], ["Fried Chicken", "فراخ مقلية"],
    ["Chicken Wings", "أجنحة دجاج"], ["BBQ Ribs", "أضلاع مشوية"], ["Paella", "بايلا"],
    ["Risotto", "ريزوتو"], ["Gnocchi", "نيوكي"], ["Curry", "كاري"], ["Biryani", "برياني"],
    ["Samosa", "سمبوسة"], ["Naan", "نان"], ["Tikka Masala", "تيكا ماسالا"], ["Pad Thai", "باد تاي"],
    ["Dim Sum", "دمسم"], ["Bao Buns", "باو بن"], ["Ceviche", "سيفيتشي"], ["Guacamole", "جواكامولي"],
    ["Quesadilla", "كساديا"], ["Burrito", "بوريتو"], ["Enchilada", "إنشيلادا"], ["Churros", "تشوروس"],
    ["Gelato", "جيلاتو"], ["Macaron", "ماكارون"], ["Fondue", "فوندو"], ["Ratatouille", "راتاتوي"],
    ["Goulash", "جولاش"], ["Schnitzel", "شنيتزل"], ["Pretzel", "بريتزل"], ["Bratwurst", "براتورست"],
    ["Hawawshi", "حواوشي"], ["Feteer", "فطير"], ["Roz Bel Laban", "رز بلبن"], ["Sobia", "سوبيا"],
    ["Karkade", "كركديه"], ["Asab", "عصب"], ["Shakshuka", "شكشوكة"], ["Fesikh", "فسيخ"],
    ["Zalabya", "زلابية"], ["Grilled Shrimp", "جمبري مشوي"], ["Calamari", "كالاماري"],
    ["Lobster", "استاكوزا"], ["Crab Cakes", "كرات السلطعون"], ["Clam Chowder", "شوربة المحار"],
    ["Miso Soup", "شوربة ميسو"], ["Tempura", "تمبورا"], ["Katsu Curry", "كاتسو كاري"],
    ["Bibimbap", "بيبيمباب"], ["Kimchi", "كيمتشي"], ["Bulgogi", "بولجوجي"], ["Tteokbokki", "توك بوكي"],
    ["Manakish", "مناقيش"], ["Fattoush", "فتوش"], ["Tabbouleh", "تبولة"], ["Baba Ghanoush", "بابا غنوج"],
    ["Kibbeh", "كبة"], ["Dubai Chocolate", "شوكولاتة دبي"], ["Chocolate Kunafa", "كنافة شوكولاتة"],
    ["Boba Tea", "بابل تي"], ["Smash Burger", "سماش برجر"], ["Croffle", "كروفل"],
    ["Loaded Fries", "بطاطس محملة"], ["Freakshake", "فريك شيك"], ["Dalgona Coffee", "قهوة دالجونا"],
    ["Birria Tacos", "تاكوس بيريا"]
  ],
  places: [
    ["Pyramids", "الأهرامات"], ["Eiffel Tower", "برج إيفل"], ["Dubai", "دبي"], ["London", "لندن"],
    ["Tokyo", "طوكيو"], ["New York", "نيويورك"], ["Rome", "روما"], ["Colosseum", "الكولوسيوم"],
    ["Big Ben", "بيج بن"], ["Statue of Liberty", "تمثال الحرية"], ["Great Wall of China", "سور الصين العظيم"],
    ["Taj Mahal", "تاج محل"], ["Sydney Opera House", "دار أوبرا سيدني"], ["Niagara Falls", "شلالات نياجرا"],
    ["Grand Canyon", "جراند كانيون"], ["Sahara Desert", "الصحراء الكبرى"], ["Nile River", "نهر النيل"],
    ["Petra", "البتراء"], ["Machu Picchu", "ماتشو بيتشو"], ["Christ the Redeemer", "تمثال المسيح الفادي"],
    ["Burj Khalifa", "برج خليفة"], ["Sphinx", "أبو الهول"], ["Luxor Temple", "معبد الأقصر"],
    ["Karnak Temple", "معبد الكرنك"], ["Abu Simbel", "أبو سمبل"], ["Alexandria Library", "مكتبة الإسكندرية"],
    ["Khan El Khalili", "خان الخليلي"], ["Cairo Tower", "برج القاهرة"], ["Red Sea", "البحر الأحمر"],
    ["Sharm El Sheikh", "شرم الشيخ"], ["Hurghada", "الغردقة"], ["Siwa Oasis", "واحة سيوة"],
    ["Venice", "البندقية"], ["Paris", "باريس"], ["Barcelona", "برشلونة"], ["Amsterdam", "أمستردام"],
    ["Berlin", "برلين"], ["Vienna", "فيينا"], ["Prague", "براغ"], ["Istanbul", "إسطنبول"],
    ["Athens", "أثينا"], ["Santorini", "سانتوريني"], ["Mecca", "مكة"], ["Medina", "المدينة المنورة"],
    ["Jerusalem", "القدس"], ["Marrakech", "مراكش"], ["Casablanca", "الدار البيضاء"],
    ["Cape Town", "كيب تاون"], ["Victoria Falls", "شلالات فيكتوريا"], ["Mount Kilimanjaro", "جبل كليمنجارو"],
    ["Bali", "بالي"], ["Maldives", "المالديف"], ["Singapore", "سنغافورة"], ["Hong Kong", "هونج كونج"],
    ["Shanghai", "شنغهاي"], ["Beijing", "بكين"], ["Seoul", "سيؤول"], ["Bangkok", "بانكوك"],
    ["Kuala Lumpur", "كوالالمبور"], ["Mumbai", "مومباي"], ["Rio de Janeiro", "ريو دي جانيرو"],
    ["Buenos Aires", "بوينس آيرس"], ["Los Angeles", "لوس أنجلوس"], ["Las Vegas", "لاس فيجاس"],
    ["Miami", "ميامي"], ["Chicago", "شيكاجو"], ["Toronto", "تورونتو"], ["Moscow", "موسكو"],
    ["Red Square", "الساحة الحمراء"], ["Amazon Rainforest", "غابات الأمازون"], ["Iguazu Falls", "شلالات إجوازو"],
    ["Mount Everest", "جبل إيفرست"], ["Swiss Alps", "جبال الألب السويسرية"], ["Dead Sea", "البحر الميت"],
    ["Golden Gate Bridge", "جسر البوابة الذهبية"], ["Hollywood Sign", "لافتة هوليوود"],
    ["Central Park", "سنترال بارك"], ["Times Square", "تايمز سكوير"], ["White House", "البيت الأبيض"],
    ["Kremlin", "الكرملين"], ["Acropolis", "الأكروبوليس"], ["Stonehenge", "ستونهنج"],
    ["Vatican City", "الفاتيكان"], ["Notre Dame", "نوتردام"], ["Louvre Museum", "متحف اللوفر"],
    ["Sagrada Familia", "ساجرادا فاميليا"], ["Alhambra", "قصر الحمراء"],
    ["Buckingham Palace", "قصر باكنجهام"], ["Antarctica", "القارة القطبية الجنوبية"]
  ],
  movies: [
    // Egyptian & Arab Movies and Series
    ["Kirah Wel Genn", "كيرة والجن"], ["Restart", "ريستارت"], ["Serr El Bate", "سره الباتع"],
    ["Sayed El Nas", "سيد الناس"], ["Brens", "البرنس"], ["Taj", "تاج"], ["Hogan", "هوجان"],
    ["Profile", "بروفايل"], ["Nasl El Aghrab", "نسل الأغراب"], ["Molouk El Gadaana", "ملوك الجدعنة"],
    ["Be 100 Wesh", "بـ100 وش"], ["Moussa", "موسى"], ["Bedon Sabek Enzar", "بدون سابق إنذار"],
    ["El Ekhtiar", "الاختيار"], ["Welad Rizk", "ولاد رزق"],
    ["Faten Amal Harbi", "فاتن أمل حربي"], ["Gazirat Ghamam", "جزيرة غمام"], ["Beit El Roby", "بيت الروبي"],
    ["El Hashashin", "الحشاشين"], ["Joddar", "جودر"], ["Esm Mo2aqat", "اسم مؤقت"],
    ["El Maddah", "المداح"], ["Welad El Shams", "ولاد الشمس"], ["Taht El Wesaya", "تحت الوصاية"],
    ["Aho Da Elly Sar", "أهو ده اللي صار"], ["Pablo", "بابلو"], ["Tariki", "طريقي"],
    ["El Mashwar", "المشوار"], ["Shahd El Malika", "شهد الملكة"], ["Welad Rizk 3", "ولاد رزق 3"],
    ["El Kelab El Sabaa", "الكلاب السبعة"], ["Barshama", "برشامة"], ["Seko Seko", "سيكو سيكو"],
    ["El Harifa", "الحريفة"], ["X Merati", "اكس مراتي"],
    ["El Hena Elly Ana Fih", "الهنا اللي أنا فيه"], ["Dae Serat Ahl El Dae", "ضي: سيرة أهل الضي"],
    ["Lam Shamseya", "لام شمسية"], ["Gaafar El Omda", "جعفر العمدة"], ["Cobra", "كوبرا"],
    ["Ard El Nefaq", "أرض النفاق"], ["El Rakoon", "الراكون"], ["Ramadan Kareem", "رمضان كريم"],
    ["Qesset Madina", "قصة مدينة"], ["Shoghl Fanadeq", "شغل فنادق"], ["Atabat El Bahga", "عتبات البهجة"],
    ["Hakim Series", "حكيم"], ["Moharib", "محارب"], ["El Amir", "الأمير"], ["Farawla", "فراولة"],
    ["Kamel El Adad", "كامل العدد"], ["Lahzet Ghadab", "لحظة غضب"],
    ["El Feel El Azraq", "الفيل الأزرق"], ["El Kabeer Awy", "الكبير أوي"],
    ["El Lembi", "اللمبي"], ["X-Large", "إكس لارج"], ["Asal Eswed", "عسل أسود"],
    ["Tito", "تيتو"], ["El Gezira", "الجزيرة"], ["Teer Enta", "طير إنت"],
    ["Harb Karmouz", "حرب كرموز"], ["Ibrahim El Abyad", "إبراهيم الأبيض"],
    ["Paranormal", "ما وراء الطبيعة"], ["Raafat El Hagan", "رأفت الهجان"],
    ["Lan A'eesh Fi Gelbab Abi", "لن أعيش في جلباب أبي"], ["El Ostoora", "الأسطورة"],

    // International & Foreign Movies and Series
    ["Breaking Bad", "بريكنج باد"], ["Game of Thrones", "صراع العروش"],
    ["Peaky Blinders", "بيكي بلايندرز"], ["Prison Break", "بريزون بريك"],
    ["Stranger Things", "سترينجر ثينجز"], ["Squid Game", "لعبة الحبار"],
    ["The Walking Dead", "ذا ووكينج ديد"], ["Sherlock", "شارلوك"],
    ["Vikings", "فايكنجز"], ["Dark", "دارك"], ["The Last of Us", "ذا لاست أوف أس"],
    ["Titanic", "تيتانيك"], ["Inception", "إنسبشن"], ["Interstellar", "إنترستيلر"],
    ["The Dark Knight", "ذا دارك نايت"], ["The Godfather", "العراب"],
    ["Avatar", "أفاتار"], ["Harry Potter", "هاري بوتر"],
    ["The Lord of the Rings", "سيد الخواتم"], ["Gladiator", "المصارع"],
    ["Oppenheimer", "أوبنهايمر"], ["Fight Club", "نادي القتال"],
    ["Pulp Fiction", "بالب فيكشن"], ["The Matrix", "ماتريكس"],
    ["Forrest Gump", "فورست جامب"], ["Joker", "الجوكر"],
    ["Spider-Man", "سبايدرمان"], ["Avengers", "أفنجرز"],
    ["Pirates of the Caribbean", "قراصنة الكاريبي"], ["Jurassic Park", "حديقة الديناصورات"],
    ["Home Alone", "هوم ألون"], ["Star Wars", "حرب النجوم"],
    ["Fast and Furious", "فاست آند فيوريوس"], ["Mission Impossible", "مهمة مستحيلة"],
    ["John Wick", "جون ويك"], ["Top Gun", "توب جن"],
    ["Barbie", "باربي"], ["Dune", "كثيب"], ["Shutter Island", "جزيرة شاتر"],
    ["The Shawshank Redemption", "الخلاص من شاوشانك"], ["Narcos", "ناركوس"],
    ["La Casa De Papel", "لاكاسا دي بابيل"]
  ],
  games: [
    ["GTA V", "جي تي إيه 5"], ["Minecraft", "ماين كرافت"], ["PUBG", "ببجي"], ["FIFA", "فيفا"],
    ["Valorant", "فالورانت"], ["Call of Duty", "كول أوف ديوتي"], ["Fortnite", "فورتنايت"],
    ["League of Legends", "ليج أوف ليجيندز"], ["Roblox", "روبلوكس"], ["Among Us", "أمونج أس"],
    ["Apex Legends", "أبيكس ليجيندز"], ["Overwatch", "أوفرواتش"], ["Counter-Strike", "كاونتر سترايك"],
    ["Rainbow Six Siege", "رينبو سيكس سييج"], ["Rocket League", "روكيت ليج"], ["The Sims", "ذا سيمز"],
    ["Red Dead Redemption", "ريد ديد ريدمبشن"], ["The Witcher 3", "ذا ويتشر 3"],
    ["Cyberpunk 2077", "سايبربانك 2077"], ["Elden Ring", "إلدن رينج"], ["Dark Souls", "دارك سولز"],
    ["God of War", "جود أوف وور"], ["The Last of Us", "ذا لاست أوف أس"], ["Uncharted", "أنتشارتد"],
    ["Horizon Zero Dawn", "هورايزن زيرو داون"], ["Assassin's Creed", "أساسنز كريد"],
    ["Far Cry", "فار كراي"], ["Watch Dogs", "واتش دوجز"], ["Resident Evil", "ريزدنت إيفل"],
    ["Silent Hill", "سايلنت هيل"], ["Mortal Kombat", "مورتال كومبات"], ["Street Fighter", "ستريت فايتر"],
    ["Tekken", "تيكن"], ["Super Mario", "سوبر ماريو"], ["Zelda", "زيلدا"], ["Pokemon", "بوكيمون"],
    ["Animal Crossing", "أنيمال كروسينج"], ["Splatoon", "سبلاتون"], ["Kirby", "كيربي"],
    ["Sonic", "سونيك"], ["Crash Bandicoot", "كراش بانديكوت"], ["Spyro", "سبايرو"],
    ["Metal Gear Solid", "ميتال جير سوليد"], ["Halo", "هيلو"], ["Gears of War", "جيرز أوف وور"],
    ["Forza", "فورتزا"], ["Need for Speed", "نيد فور سبيد"], ["Gran Turismo", "جران توريزمو"],
    ["eFootball", "إي فوتبول"], ["Clash of Clans", "كلاش أوف كلانز"], ["Clash Royale", "كلاش رويال"],
    ["Candy Crush", "كاندي كراش"], ["Subway Surfers", "صب واي سيرفرز"], ["Temple Run", "تمبل ران"],
    ["Free Fire", "فري فاير"], ["Brawl Stars", "براول ستارز"], ["Genshin Impact", "جينشين إمباكت"],
    ["Honkai Star Rail", "هونكاي ستار ريل"], ["World of Warcraft", "وورلد أوف ووركرافت"],
    ["Dota 2", "دوتا 2"], ["StarCraft", "ستار كرافت"], ["Diablo", "ديابلو"],
    ["Hearthstone", "هارثستون"], ["Terraria", "تيراريا"], ["Stardew Valley", "ستارديو فالي"],
    ["Fall Guys", "فول جايز"], ["It Takes Two", "إت تيكس تو"], ["Hades", "هيديز"],
    ["Celeste", "سيليست"], ["Hollow Knight", "هولو نايت"], ["Valheim", "فالهايم"],
    ["Palworld", "بال وورلد"], ["Baldur's Gate 3", "بالدرز جيت 3"], ["Helldivers 2", "هيل دايفرز 2"],
    ["Sea of Thieves", "سي أوف ثيفز"], ["Destiny 2", "ديستني 2"], ["Warframe", "وور فريم"],
    ["Mobile Legends", "موبايل ليجندز"], ["Wild Rift", "وايلد ريفت"], ["Slither.io", "سلذر أيو"],
    ["Plants vs Zombies", "بلانتس فيرسس زومبيز"], ["Angry Birds", "أنجري بيردز"], ["8 Ball Pool", "8 بول بول"]
  ],
  animals: [
    ["Lion", "أسد"], ["Tiger", "نمر"], ["Elephant", "فيل"], ["Falcon", "صقر"],
    ["Dolphin", "دولفين"], ["Cheetah", "فهد"], ["Wolf", "ذئب"], ["Eagle", "نسر"],
    ["Bear", "دب"], ["Giraffe", "زرافة"], ["Zebra", "حمار وحشي"], ["Hippo", "فرس النهر"],
    ["Rhino", "وحيد القرن"], ["Crocodile", "تمساح"], ["Kangaroo", "كنغر"], ["Koala", "كوالا"],
    ["Panda", "باندا"], ["Gorilla", "غوريلا"], ["Chimpanzee", "شمبانزي"], ["Monkey", "قرد"],
    ["Camel", "جمل"], ["Fox", "ثعلب"], ["Deer", "أيل"], ["Rabbit", "أرنب"],
    ["Squirrel", "سنجاب"], ["Hedgehog", "قنفذ"], ["Otter", "قضاعة"], ["Beaver", "قندس"],
    ["Raccoon", "راكون"], ["Skunk", "ظربان"], ["Bat", "خفاش"], ["Owl", "بومة"],
    ["Peacock", "طاووس"], ["Parrot", "ببغاء"], ["Flamingo", "فلامنجو"], ["Penguin", "بطريق"],
    ["Ostrich", "نعامة"], ["Swan", "بجعة"], ["Duck", "بطة"], ["Pelican", "بجع"],
    ["Shark", "قرش"], ["Whale", "حوت"], ["Octopus", "أخطبوط"], ["Jellyfish", "قنديل البحر"],
    ["Starfish", "نجم البحر"], ["Seahorse", "حصان البحر"], ["Turtle", "سلحفاة"], ["Snake", "ثعبان"],
    ["Lizard", "سحلية"], ["Chameleon", "حرباء"], ["Iguana", "إجوانا"], ["Frog", "ضفدع"],
    ["Toad", "ضفدع الطين"], ["Butterfly", "فراشة"], ["Bee", "نحلة"], ["Ant", "نملة"],
    ["Spider", "عنكبوت"], ["Scorpion", "عقرب"], ["Snail", "حلزون"], ["Hyena", "ضبع"],
    ["Jackal", "ابن آوى"], ["Leopard", "نمر مرقط"], ["Jaguar", "جاجوار"], ["Puma", "بوما"],
    ["Lynx", "وشق"], ["Wolverine", "ولفرين"], ["Meerkat", "ميركات"], ["Sloth", "كسلان"],
    ["Armadillo", "أرماديلو"], ["Platypus", "منقار البط"], ["Walrus", "فظ"], ["Seal", "فقمة"],
    ["Sea Lion", "أسد البحر"], ["Orca", "الحوت القاتل"], ["Manatee", "خروف البحر"],
    ["Buffalo", "جاموس"], ["Bison", "بيسون"], ["Antelope", "ظبي"], ["Gazelle", "غزال"],
    ["Wildebeest", "النو"], ["Warthog", "خنزير بري"], ["Crow", "غراب"], ["Pigeon", "حمامة"],
    ["Sparrow", "عصفور"], ["Hummingbird", "طائر الطنان"], ["Woodpecker", "نقار الخشب"],
    ["Toucan", "طوقان"], ["Vulture", "رخمة"], ["Condor", "كوندور"], ["Stork", "لقلق"],
    ["Heron", "مالك الحزين"], ["Anteater", "آكل النمل"], ["Aardvark", "أردفارك"],
    ["Tapir", "تابير"], ["Okapi", "أوكابي"], ["Capybara", "كابيبارا"]
  ],
  jobs: [
    ["Doctor", "دكتور"], ["Teacher", "مدرس"], ["Engineer", "مهندس"], ["Pilot", "طيار"],
    ["Chef", "شيف"], ["Nurse", "ممرضة"], ["Lawyer", "محامي"], ["Police Officer", "ضابط شرطة"],
    ["Firefighter", "رجل إطفاء"], ["Farmer", "فلاح"], ["Fisherman", "صياد"],
    ["Electrician", "كهربائي"], ["Plumber", "سباك"], ["Carpenter", "نجار"],
    ["Painter", "رسام"], ["Photographer", "مصور"], ["Journalist", "صحفي"], ["Actor", "ممثل"],
    ["Singer", "مطرب"], ["Dancer", "راقص"], ["Athlete", "رياضي"], ["Soldier", "جندي"],
    ["Judge", "قاضي"], ["Accountant", "محاسب"], ["Architect", "مهندس معماري"],
    ["Dentist", "طبيب أسنان"], ["Pharmacist", "صيدلي"], ["Veterinarian", "طبيب بيطري"],
    ["Scientist", "عالم"], ["Astronaut", "رائد فضاء"], ["Taxi Driver", "سائق تاكسي"],
    ["Bus Driver", "سائق أتوبيس"], ["Mechanic", "ميكانيكي"], ["Barber", "حلاق"],
    ["Tailor", "ترزي"], ["Baker", "خباز"], ["Butcher", "جزار"], ["Waiter", "جرسون"],
    ["Bartender", "بارمان"], ["Receptionist", "موظف استقبال"], ["Secretary", "سكرتيرة"],
    ["Manager", "مدير"], ["Salesman", "بائع"], ["Cashier", "كاشير"], ["Security Guard", "حارس أمن"],
    ["Cleaner", "عامل نظافة"], ["Gardener", "بستاني"], ["Librarian", "أمين مكتبة"],
    ["Translator", "مترجم"], ["Programmer", "مبرمج"], ["Graphic Designer", "مصمم جرافيك"],
    ["Web Developer", "مطور مواقع"], ["Data Analyst", "محلل بيانات"],
    ["Real Estate Agent", "سمسار عقارات"], ["Flight Attendant", "مضيف طيران"],
    ["Tour Guide", "مرشد سياحي"], ["Fashion Designer", "مصمم أزياء"],
    ["Interior Designer", "مصمم ديكور"], ["Content Creator", "صانع محتوى"],
    ["Influencer", "مؤثر"], ["YouTuber", "يوتيوبر"], ["Social Media Manager", "مسؤول سوشيال ميديا"],
    ["UI/UX Designer", "مصمم واجهات"], ["Delivery Captain", "كابتن توصيل"],
    ["Video Editor", "مونتير"], ["Digital Marketing Specialist", "أخصائي تسويق رقمي"],
    ["E-commerce Seller", "بائع أونلاين"], ["Freelancer", "فريلانسر"],
    ["Podcaster", "بودكاستر"], ["App Developer", "مطور تطبيقات"], ["Barista", "باريستا"],
    ["Personal Trainer", "مدرب شخصي"], ["Makeup Artist", "فنان مكياج"]
  ],
  singers: [
    ["Amr Diab", "عمرو دياب"], ["Tamer Hosny", "تامر حسني"], ["Mohamed Ramadan", "محمد رمضان"],
    ["Mohamed Hamaki", "محمد حماقي"], ["Ahmed Saad", "أحمد سعد"], ["Assala", "أصالة"],
    ["Sherine", "شيرين"], ["Angham", "أنغام"], ["Nancy Ajram", "نانسي عجرم"], ["Elissa", "إليسا"],
    ["Haifa Wehbe", "هيفاء وهبي"], ["Nawal El Zoghbi", "نوال الزغبي"], ["Wael Kfoury", "وائل كفوري"],
    ["Ragheb Alama", "راغب علامة"], ["Kazem Al Saher", "كاظم الساهر"], ["Cheb Khaled", "الشاب خالد"],
    ["Saad Lamjarred", "سعد لمجرد"], ["Balqees", "بلقيس"], ["Dina Hayek", "دينا حايك"],
    ["Myriam Fares", "ميريام فارس"], ["Hamada Helal", "حماده هلال"], ["Mostafa Amar", "مصطفى قمر"],
    ["Mohamed Mounir", "محمد منير"], ["Ali El Haggar", "علي الحجار"], ["Hakim", "حكيم"],
    ["Shaaban Abdel Rahim", "شعبان عبد الرحيم"], ["Saad El Soghayar", "سعد الصغير"],
    ["Bosy", "بوسي"], ["Hisham Abbas", "هشام عباس"], ["Amir Eid", "أمير عيد"],
    ["Cairokee", "كايروكي"], ["Wust El Balad", "وسط البلد"], ["Massar Egbari", "مسار إجباري"],
    ["Aziz Maraka", "عزيز مرقة"], ["Yara", "يارا"], ["Diana Karazon", "ديانا كرزون"],
    ["Maher Zain", "ماهر زين"], ["Humood Alkhudher", "حمود الخضر"], ["Wegz", "ويجز"],
    ["Marwan Pablo", "مروان بابلو"], ["Marwan Moussa", "مروان موسى"], ["Abyusif", "أبيوسف"],
    ["Molotof", "مولوتوف"], ["Afroto", "أفروتو"], ["Shahyn", "شاهين"], ["Ziad Zaza", "زياد زازا"],
    ["Hamo Bika", "حمو بيكا"], ["Hassan Shakosh", "حسن شاكوش"], ["Omar Kamal", "عمر كمال"],
    ["Perrie", "بيري"], ["Tul8te", "تول8ت"], ["Dalia Mubarak", "داليا مبارك"], ["Adele", "أديل"],
    ["Beyonce", "بيونسيه"], ["Rihanna", "ريهانا"], ["Ed Sheeran", "إد شيران"],
    ["Justin Bieber", "جاستن بيبر"], ["Taylor Swift", "تايلور سويفت"], ["Bruno Mars", "برونو مارس"],
    ["The Weeknd", "ذا ويكند"], ["Drake", "دريك"], ["Shakira", "شاكيرا"],
    ["Enrique Iglesias", "إنريكي إجليسياس"]
  ],
  memes: [
    ["El Lembi", "اللمبي"], ["Adel Emam", "عادل إمام"], ["Abdel Ghafour", "عبد الغفور البرعي"],
    ["Tuk-Tuk", "التوك توك"], ["Fesikh", "فسيخ ورنجة"], ["Moms Group", "جروب الماميز"],
    ["Mint Tea Glass", "كباية شاي بالنعناع"], ["Hasoona", "حسونة"], ["Shrimp Trend", "تريند الجمبري"],
    ["Captain Maged", "كابتن ماجد"], ["Reda El Bahrawy", "رضا البحراوي"], ["El Kousa", "الكوسة والواسطة"],
    ["Geddo", "جدو علي"], ["Thug Life", "ثج لايف"], ["Popcorn Drama", "فيشار وخناقة"],
    ["Batates Mahshiya", "بطاطس محشية"], ["Daheeh", "الدحيح"], ["Amr Diab T-Shirt", "تيشرت عمرو دياب"],
    ["El Basha Telmeez", "الباشا تلميذ"], ["Fol Medames Cart", "عربية فول"], ["Saidi in Cairo", "صعيدي في الجامعة الأمريكية"],
    ["El Nazer", "الناظر صلاح الدين"], ["Ghabi Mino Feeh", "غبي منه فيه"], ["Abo Ali", "أبو علي"],
    ["El Kebir Awi", "الكبير أوي"], ["Hagras", "هجرس"], ["Johnny", "جوني"], ["Marbouha", "مربوحة"],
    ["Doctor Rabei", "الدكتور ربيع"], ["Nafsana", "النفسنة"], ["Oshaaq El Kahwa", "عشاق القهوة السادة"]
  ],
  awkward: [
    ["Wrong Group Message", "رسالة اتبعتت في الجروب غلط"], ["Empty Wallet at Cashier", "المحفظة فاضية عند الكاشير"],
    ["Forgot Friend Name", "نسيت اسم صاحبك وأنت بتعرفه"], ["Met an Ex", "قابلت الإكس صدفة في الشارع"],
    ["Loud Stomach Growl", "صوت بطنك طلع في عز السكوت"], ["Waving to Wrong Person", "شاورت لحد وافتكرته صاحبك"],
    ["Trip and Fall in Public", "اتكعبلت ووقعت قدام الناس"], ["Calling Teacher Mom", "ناديت المدرس يا ماما"],
    ["Stuck in Elevator", "الأسانسير وقف بين الأدوار"], ["Torn Pants", "البنطلون اتقطع فجأة"],
    ["Coughing During Silence", "كحة وشرقة في وقت هادي"], ["Phone Rang Loud in Mosque", "الموبايل رن بصوت عالي"],
    ["In-Laws Dinner", "عزومة عند النسايب"], ["Failed High Five", "سقفت في الهواء وحد طنشك"],
    ["Tooth Spinach", "خضار لازق في سنانك وأنت بتضحك"], ["Fake Laugh Got Caught", "ضحكت مجاملة والكل بصلك"]
  ]
};

export const CATEGORY_META: Record<CategoryKey, { icon: string; key: string }> = {
  players: { icon: '⚽', key: 'catFootball' },
  food: { icon: '🍕', key: 'catFood' },
  places: { icon: '🗺️', key: 'catPlaces' },
  movies: { icon: '🎬', key: 'catMovies' },
  games: { icon: '🎮', key: 'catGames' },
  animals: { icon: '🦁', key: 'catAnimals' },
  jobs: { icon: '💼', key: 'catJobs' },
  singers: { icon: '🎤', key: 'catSingers' },
  memes: { icon: '😂', key: 'catMemes' },
  awkward: { icon: '🫣', key: 'catAwkward' }
};

export function getCombinedWordList(categories: CategoryKey[]): [string, string][] {
  let combined: [string, string][] = [];
  categories.forEach(cat => {
    if (wordsDB[cat]) combined = combined.concat(wordsDB[cat]);
  });
  if (combined.length === 0) combined = wordsDB.players;
  return combined;
}

// Known International / Foreign Movies and TV Series (all lowercase for reliable matching)
export const FOREIGN_MOVIES_SET = new Set([
  'breaking bad',
  'game of thrones',
  'peaky blinders',
  'prison break',
  'stranger things',
  'squid game',
  'the walking dead',
  'sherlock',
  'vikings',
  'dark',
  'the last of us',
  'titanic',
  'inception',
  'interstellar',
  'the dark knight',
  'the godfather',
  'avatar',
  'harry potter',
  'the lord of the rings',
  'gladiator',
  'oppenheimer',
  'fight club',
  'pulp fiction',
  'the matrix',
  'forrest gump',
  'joker',
  'spider-man',
  'avengers',
  'pirates of the caribbean',
  'jurassic park',
  'home alone',
  'star wars',
  'fast and furious',
  'mission impossible',
  'john wick',
  'top gun',
  'barbie',
  'dune',
  'shutter island',
  'the shawshank redemption',
  'narcos',
  'la casa de papel'
]);

export function isForeignMovie(wordEn?: string | null): boolean {
  if (!wordEn) return false;
  return FOREIGN_MOVIES_SET.has(wordEn.trim().toLowerCase());
}

/**
 * Universal Word Display Helper according to player's brief:
 * - All categories (games, animals, players, food, singers, places, jobs, etc.):
 *   Shows Arabic if player language is 'ar', English if player language is 'en'.
 * - Exception for Movies & Series:
 *   If Egyptian/Arab: ALWAYS shown in Arabic (both for 'ar' and 'en' users).
 *   If Foreign/International: ALWAYS shown in English (both for 'ar' and 'en' users).
 */
// ==============================================================
// 🦎 SMART TWIN CHAMELEON PAIRS & CLUSTERS
// Ensures the Chameleon gets a word intimately close in nationality,
// era, genre, or style to make deception truly challenging and fun!
// ==============================================================
const TWIN_PAIRS_MAP: Record<string, string> = {
  // --- Football Players (Same team / rivalry / nationality / role) ---
  "Messi": "Ronaldo", "Ronaldo": "Messi",
  "Neymar": "Mbappe", "Mbappe": "Neymar",
  "Haaland": "De Bruyne", "De Bruyne": "Haaland",
  "Salah": "Mane", "Mane": "Salah",
  "Modric": "Kroos", "Kroos": "Modric",
  "Pedri": "Gavi", "Gavi": "Pedri",
  "Bellingham": "Foden", "Foden": "Bellingham",
  "Saka": "Rashford", "Rashford": "Saka",
  "Benzema": "Suarez", "Suarez": "Benzema",
  "Vinicius Jr": "Rodrygo", "Rodrygo": "Vinicius Jr",
  "Casillas": "Buffon", "Buffon": "Casillas",
  "Iniesta": "Xavi", "Xavi": "Iniesta",
  "Ramos": "Puyol", "Puyol": "Ramos",
  "Alisson": "Ederson", "Ederson": "Alisson",
  "Courtois": "Ter Stegen", "Ter Stegen": "Courtois",
  "Robben": "Ribery", "Ribery": "Robben",
  "Musiala": "Wirtz", "Wirtz": "Musiala",
  "Lamine Yamal": "Pedri",
  "Julian Alvarez": "Enzo Fernandez", "Enzo Fernandez": "Julian Alvarez",
  "Drogba": "Eto'o", "Eto'o": "Drogba",
  "Abou Trika": "El Khatib", "El Khatib": "Abou Trika",
  "Trezeguet": "Marmoush", "Marmoush": "Trezeguet",
  "Mostafa Mohamed": "Emad Meteb", "Emad Meteb": "Mostafa Mohamed",
  "Hossam Hassan": "Ahmed Hassan", "Ahmed Hassan": "Hossam Hassan",
  "Elneny": "Ahmed Fathy", "Ahmed Fathy": "Elneny",
  "Mahrez": "Salah",
  "Pele": "Maradona", "Maradona": "Pele",
  "Zidane": "Ronaldinho", "Ronaldinho": "Zidane",
  "Kane": "Lewandowski", "Lewandowski": "Kane",
  "Casemiro": "Bruno Fernandes", "Bruno Fernandes": "Casemiro",
  "Hakimi": "Theo Hernandez", "Theo Hernandez": "Hakimi",
  "Camavinga": "Valverde", "Valverde": "Camavinga",
  "Cole Palmer": "Foden",

  // --- Food (Same cuisine / style) ---
  "Pizza": "Burger", "Burger": "Pizza",
  "Shawarma": "Kebab", "Kebab": "Shawarma",
  "Falafel": "Koshary", "Koshary": "Falafel",
  "Molokhia": "Mahshi", "Mahshi": "Molokhia",
  "Sushi": "Ramen", "Ramen": "Sushi",
  "Pasta": "Lasagna", "Lasagna": "Pasta",
  "Crepe": "Waffles", "Waffles": "Crepe",
  "Pancakes": "Donuts", "Donuts": "Pancakes",
  "Cheesecake": "Tiramisu", "Tiramisu": "Cheesecake",
  "Kunafa": "Baklava", "Baklava": "Kunafa",
  "Basbousa": "Om Ali", "Om Ali": "Basbousa",
  "Tacos": "Burrito", "Burrito": "Tacos",
  "Quesadilla": "Nachos", "Nachos": "Quesadilla",
  "Steak": "BBQ Ribs", "BBQ Ribs": "Steak",
  "Fried Chicken": "Chicken Wings", "Chicken Wings": "Fried Chicken",
  "Biryani": "Curry", "Curry": "Biryani",
  "Samosa": "Spring Rolls", "Spring Rolls": "Samosa",
  "Hot Dog": "Sandwich", "Sandwich": "Hot Dog",
  "Hawawshi": "Feteer", "Feteer": "Hawawshi",
  "Ice Cream": "Gelato", "Gelato": "Ice Cream",
  "Grilled Shrimp": "Calamari", "Calamari": "Grilled Shrimp",
  "Boba Tea": "Dalgona Coffee", "Dalgona Coffee": "Boba Tea",
  "Dubai Chocolate": "Chocolate Kunafa", "Chocolate Kunafa": "Dubai Chocolate",

  // --- Places (Same region / landmark type) ---
  "Pyramids": "Sphinx", "Sphinx": "Pyramids",
  "Eiffel Tower": "Louvre Museum", "Louvre Museum": "Eiffel Tower",
  "Big Ben": "Buckingham Palace", "Buckingham Palace": "Big Ben",
  "Statue of Liberty": "Times Square", "Times Square": "Statue of Liberty",
  "Colosseum": "Vatican City", "Vatican City": "Colosseum",
  "Burj Khalifa": "Dubai", "Dubai": "Burj Khalifa",
  "Mecca": "Medina", "Medina": "Mecca",
  "Cairo Tower": "Khan El Khalili", "Khan El Khalili": "Cairo Tower",
  "Sharm El Sheikh": "Hurghada", "Hurghada": "Sharm El Sheikh",
  "Tokyo": "Seoul", "Seoul": "Tokyo",
  "Paris": "Rome", "Rome": "Paris",
  "London": "New York", "New York": "London",
  "Niagara Falls": "Victoria Falls", "Victoria Falls": "Niagara Falls",
  "Mount Everest": "Mount Kilimanjaro", "Mount Kilimanjaro": "Mount Everest",
  "Venice": "Amsterdam", "Amsterdam": "Venice",
  "Taj Mahal": "Petra", "Petra": "Taj Mahal",
  "Great Wall of China": "Machu Picchu", "Machu Picchu": "Great Wall of China",
  "Maldives": "Bali", "Bali": "Maldives",
  "Luxor Temple": "Karnak Temple", "Karnak Temple": "Luxor Temple",

  // --- Movies & Series ---
  "Titanic": "Avatar", "Avatar": "Titanic",
  "The Dark Knight": "Joker", "Joker": "The Dark Knight",
  "Harry Potter": "Lord of the Rings", "Lord of the Rings": "Harry Potter",
  "Inception": "Interstellar", "Interstellar": "Inception",
  "Avengers": "Spider-Man", "Spider-Man": "Avengers",
  "Kirah Wel Genn": "El Feel El Azraq", "El Feel El Azraq": "Kirah Wel Genn",
  "El Lemby": "Booha", "Booha": "El Lemby",
  "Ibrahim Labyad": "Tito", "Tito": "Ibrahim Labyad",
  "Squid Game": "Money Heist", "Money Heist": "Squid Game",
  "Breaking Bad": "Better Call Saul", "Better Call Saul": "Breaking Bad",
  "Game of Thrones": "House of the Dragon", "House of the Dragon": "Game of Thrones",
  "The Godfather": "Scarface", "Scarface": "The Godfather",

  // --- Games ---
  "PUBG": "Free Fire", "Free Fire": "PUBG",
  "Fortnite": "Warzone", "Warzone": "Fortnite",
  "FIFA": "PES", "PES": "FIFA",
  "GTA": "Cyberpunk 2077", "Cyberpunk 2077": "GTA",
  "Minecraft": "Roblox", "Roblox": "Minecraft",
  "League of Legends": "Dota 2", "Dota 2": "League of Legends",
  "Valorant": "CS:GO", "CS:GO": "Valorant",
  "Elden Ring": "Dark Souls", "Dark Souls": "Elden Ring",
  "Among Us": "Fall Guys", "Fall Guys": "Among Us",
  "Subway Surfers": "Temple Run", "Temple Run": "Subway Surfers",

  // --- Animals ---
  "Lion": "Tiger", "Tiger": "Lion",
  "Wolf": "Fox", "Fox": "Wolf",
  "Cat": "Dog", "Dog": "Cat",
  "Eagle": "Falcon", "Falcon": "Eagle",
  "Dolphin": "Whale", "Whale": "Dolphin",
  "Shark": "Orca", "Orca": "Shark",
  "Elephant": "Rhino", "Rhino": "Elephant",
  "Giraffe": "Zebra", "Zebra": "Giraffe",
  "Cheetah": "Leopard", "Leopard": "Cheetah",
  "Rabbit": "Hamster", "Hamster": "Rabbit",
  "Monkey": "Chimpanzee", "Chimpanzee": "Monkey",

  // --- Jobs ---
  "Doctor": "Pharmacist", "Pharmacist": "Doctor",
  "Nurse": "Surgeon", "Surgeon": "Nurse",
  "Engineer": "Architect", "Architect": "Engineer",
  "Pilot": "Flight Attendant", "Flight Attendant": "Pilot",
  "Police Officer": "Detective", "Detective": "Police Officer",
  "Teacher": "Professor", "Professor": "Teacher",
  "Judge": "Lawyer", "Lawyer": "Judge",
  "Chef": "Baker", "Baker": "Chef",
  "Astronaut": "Astronomer", "Astronomer": "Astronaut",
  "Programmer": "Data Scientist", "Data Scientist": "Programmer",

  // --- Singers ---
  "Amr Diab": "Tamer Hosny", "Tamer Hosny": "Amr Diab",
  "Mohamed Hamaki": "Ramy Sabry", "Ramy Sabry": "Mohamed Hamaki",
  "Wegz": "Marwan Pablo", "Marwan Pablo": "Wegz",
  "Sherine": "Angham", "Angham": "Sherine",
  "Umm Kulthum": "Abdel Halim Hafez", "Abdel Halim Hafez": "Umm Kulthum",
  "Drake": "Travis Scott", "Travis Scott": "Drake",
  "The Weeknd": "Bruno Mars", "Bruno Mars": "The Weeknd",
  "Taylor Swift": "Ariana Grande", "Ariana Grande": "Taylor Swift",
  "Billie Eilish": "Olivia Rodrigo", "Olivia Rodrigo": "Billie Eilish",
  "Eminem": "50 Cent", "50 Cent": "Eminem"
};

export function getSmartTwinWord(
  targetPair: [string, string],
  category: CategoryKey,
  availableList: [string, string][]
): [string, string] {
  const targetEn = targetPair[0].trim();

  // 1. Direct matched pair
  const twinEn = TWIN_PAIRS_MAP[targetEn];
  if (twinEn) {
    const found = availableList.find(p => p[0].toLowerCase() === twinEn.toLowerCase());
    if (found) return found;
  }

  // 2. Fallback: pick the closest neighbor in the category list (next or prev item)
  const idx = availableList.findIndex(p => p[0] === targetPair[0]);
  if (idx !== -1) {
    // Pick adjacent neighbor
    const neighborIdx = (idx % 2 === 0 ? idx + 1 : idx - 1 + availableList.length) % availableList.length;
    const neighbor = availableList[neighborIdx];
    if (neighbor && neighbor[0] !== targetPair[0]) {
      return neighbor;
    }
  }

  // 3. Fallback: any other item from the same category
  const others = availableList.filter(p => p[0] !== targetPair[0]);
  return others.length > 0 ? others[Math.floor(Math.random() * others.length)] : targetPair;
}

export function getSecretWordDisplay(
  wordEn: string | undefined | null,
  wordAr: string | undefined | null,
  category: CategoryKey | undefined | null,
  lang: Language
): string {
  const en = (wordEn || '').trim();
  const ar = (wordAr || '').trim();
  if (!en && !ar) return '';

  if (category === 'movies') {
    if (isForeignMovie(en)) {
      return en || ar;
    }
    // Egyptian / Arab movie or series: always Arabic
    return ar || en;
  }

  // All other categories: adapt to selected language
  if (lang === 'ar') {
    return ar || en;
  }
  return en || ar;
}


