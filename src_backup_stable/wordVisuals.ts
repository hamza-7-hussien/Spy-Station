import { CategoryKey } from './types';

// Curated high quality image assets matching game themes
export const WORD_IMAGE_REGISTRY: Record<string, string> = {
  // === PLAYERS (FOOTBALL STARS - نجوم كرة القدم) ===
  "Messi": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300&auto=format&fit=crop&q=80",
  "ميسي": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300&auto=format&fit=crop&q=80",
  "Ronaldo": "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=300&auto=format&fit=crop&q=80",
  "رونالدو": "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=300&auto=format&fit=crop&q=80",
  "Neymar": "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=300&auto=format&fit=crop&q=80",
  "نيمار": "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=300&auto=format&fit=crop&q=80",
  "Mbappe": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80",
  "مبابي": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80",
  "Salah": "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=300&auto=format&fit=crop&q=80",
  "صلاح": "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=300&auto=format&fit=crop&q=80",
  "Haaland": "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=300&auto=format&fit=crop&q=80",
  "هالاند": "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=300&auto=format&fit=crop&q=80",
  "De Bruyne": "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=300&auto=format&fit=crop&q=80",
  "دي بروين": "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=300&auto=format&fit=crop&q=80",
  "Benzema": "https://images.unsplash.com/photo-1489944445391-11dd35574ca6?w=300&auto=format&fit=crop&q=80",
  "بنزيما": "https://images.unsplash.com/photo-1489944445391-11dd35574ca6?w=300&auto=format&fit=crop&q=80",
  "Modric": "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=300&auto=format&fit=crop&q=80",
  "مودريتش": "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=300&auto=format&fit=crop&q=80",
  "Kane": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80",
  "كين": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80",
  "Lewandowski": "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=300&auto=format&fit=crop&q=80",
  "ليفاندوفسكي": "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=300&auto=format&fit=crop&q=80",
  "Griezmann": "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=300&auto=format&fit=crop&q=80",
  "جريزمان": "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=300&auto=format&fit=crop&q=80",
  "Suarez": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80",
  "سواريز": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80",
  "Ramos": "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=300&auto=format&fit=crop&q=80",
  "راموس": "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=300&auto=format&fit=crop&q=80",
  "Van Dijk": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300&auto=format&fit=crop&q=80",
  "فان دايك": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300&auto=format&fit=crop&q=80",
  "Kroos": "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=300&auto=format&fit=crop&q=80",
  "كروس": "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=300&auto=format&fit=crop&q=80",
  "Bellingham": "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=300&auto=format&fit=crop&q=80",
  "بيلينجهام": "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=300&auto=format&fit=crop&q=80",
  "Vinicius Jr": "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=300&auto=format&fit=crop&q=80",
  "فينيسيوس جونيور": "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=300&auto=format&fit=crop&q=80",
  "Lamine Yamal": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80",
  "لامين يامال": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80",
  "Abou Trika": "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=300&auto=format&fit=crop&q=80",
  "أبو تريكة": "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=300&auto=format&fit=crop&q=80",
  "Marmoush": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80",
  "مرموش": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80",
  "Zidane": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80",
  "زيدان": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80",
  "Ronaldinho": "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=300&auto=format&fit=crop&q=80",
  "رونالدينيو": "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=300&auto=format&fit=crop&q=80",
  "Pele": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300&auto=format&fit=crop&q=80",
  "بيليه": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300&auto=format&fit=crop&q=80",
  "Maradona": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300&auto=format&fit=crop&q=80",
  "مارادونا": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300&auto=format&fit=crop&q=80",
  "Son Heung-min": "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=300&auto=format&fit=crop&q=80",
  "سون هيونج مين": "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=300&auto=format&fit=crop&q=80",
  "Ibrahimovic": "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=300&auto=format&fit=crop&q=80",
  "إبراهيموفيتش": "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=300&auto=format&fit=crop&q=80",
  "Iniesta": "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=300&auto=format&fit=crop&q=80",
  "إنييستا": "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=300&auto=format&fit=crop&q=80",
  "Xavi": "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=300&auto=format&fit=crop&q=80",
  "تشافي": "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=300&auto=format&fit=crop&q=80",
  "Buffon": "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=300&auto=format&fit=crop&q=80",
  "بوفون": "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=300&auto=format&fit=crop&q=80",
  "Courtois": "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=300&auto=format&fit=crop&q=80",
  "كورتوا": "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=300&auto=format&fit=crop&q=80",
  "Alisson": "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=300&auto=format&fit=crop&q=80",
  "أليسون": "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=300&auto=format&fit=crop&q=80",
  "Hakimi": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80",
  "حكيمي": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80",
  "Mahrez": "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=300&auto=format&fit=crop&q=80",
  "محرز": "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=300&auto=format&fit=crop&q=80",
  "Mane": "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=300&auto=format&fit=crop&q=80",
  "ماني": "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=300&auto=format&fit=crop&q=80",
  "Saka": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80",
  "ساكا": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80",
  "Foden": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80",
  "فودين": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80",
  "Pedri": "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=300&auto=format&fit=crop&q=80",
  "بيدري": "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=300&auto=format&fit=crop&q=80",
  "Gavi": "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=300&auto=format&fit=crop&q=80",
  "جافي": "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=300&auto=format&fit=crop&q=80",
  "Cole Palmer": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80",
  "كول بالمر": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80",

  // === FOOD (الأكل والمأكولات) ===
  "Pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
  "بيتزا": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
  "Burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80",
  "برجر": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80",
  "Sushi": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&auto=format&fit=crop&q=80",
  "سوشي": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&auto=format&fit=crop&q=80",
  "Pasta": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=300&auto=format&fit=crop&q=80",
  "باستا": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=300&auto=format&fit=crop&q=80",
  "Shawarma": "https://images.unsplash.com/photo-1561651823-34feb02250e4?w=300&auto=format&fit=crop&q=80",
  "شاورما": "https://images.unsplash.com/photo-1561651823-34feb02250e4?w=300&auto=format&fit=crop&q=80",
  "Tacos": "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=300&auto=format&fit=crop&q=80",
  "تاكوس": "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=300&auto=format&fit=crop&q=80",
  "Ice Cream": "https://images.unsplash.com/photo-1560008581-09826d1de69e?w=300&auto=format&fit=crop&q=80",
  "آيس كريم": "https://images.unsplash.com/photo-1560008581-09826d1de69e?w=300&auto=format&fit=crop&q=80",
  "Koshary": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80",
  "كشري": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80",
  "Crepe": "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=300&auto=format&fit=crop&q=80",
  "كريب": "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=300&auto=format&fit=crop&q=80",
  "Falafel": "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=300&auto=format&fit=crop&q=80",
  "فلافل": "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=300&auto=format&fit=crop&q=80",
  "Hummus": "https://images.unsplash.com/photo-1577906096429-f73c2c312435?w=300&auto=format&fit=crop&q=80",
  "حمص": "https://images.unsplash.com/photo-1577906096429-f73c2c312435?w=300&auto=format&fit=crop&q=80",
  "Kebab": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&auto=format&fit=crop&q=80",
  "كباب": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&auto=format&fit=crop&q=80",
  "Donuts": "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=300&auto=format&fit=crop&q=80",
  "دونات": "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=300&auto=format&fit=crop&q=80",
  "Kunafa": "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=300&auto=format&fit=crop&q=80",
  "كنافة": "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=300&auto=format&fit=crop&q=80",
  "Hawawshi": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80",
  "حواوشي": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80",
  "Fattah": "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80",
  "فتة": "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80",
  "Mahshi": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&auto=format&fit=crop&q=80",
  "محشي": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&auto=format&fit=crop&q=80",
  "Molokhia": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80",
  "ملوخية": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80",
  "Ful Medames": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&auto=format&fit=crop&q=80",
  "فول مدمس": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&auto=format&fit=crop&q=80",
  "Ramen": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&auto=format&fit=crop&q=80",
  "رامن": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&auto=format&fit=crop&q=80",
  "Croissant": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&auto=format&fit=crop&q=80",
  "كرواسون": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&auto=format&fit=crop&q=80",
  "Pancakes": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=300&auto=format&fit=crop&q=80",
  "بان كيك": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=300&auto=format&fit=crop&q=80",
  "Waffles": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=300&auto=format&fit=crop&q=80",
  "وافل": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=300&auto=format&fit=crop&q=80",
  "Fries": "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=300&auto=format&fit=crop&q=80",
  "بطاطس مقلية": "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=300&auto=format&fit=crop&q=80",
  "Steak": "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80",
  "ستيك": "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80",
  "Fried Chicken": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=300&auto=format&fit=crop&q=80",
  "فراخ مقلية": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=300&auto=format&fit=crop&q=80",

  // === ANIMALS (الحيوانات) ===
  "Lion": "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=300&auto=format&fit=crop&q=80",
  "أسد": "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=300&auto=format&fit=crop&q=80",
  "Tiger": "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=300&auto=format&fit=crop&q=80",
  "نمر": "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=300&auto=format&fit=crop&q=80",
  "Elephant": "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=300&auto=format&fit=crop&q=80",
  "فيل": "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=300&auto=format&fit=crop&q=80",
  "Falcon": "https://images.unsplash.com/photo-1611689342806-0863700ce9e4?w=300&auto=format&fit=crop&q=80",
  "صقر": "https://images.unsplash.com/photo-1611689342806-0863700ce9e4?w=300&auto=format&fit=crop&q=80",
  "Dolphin": "https://images.unsplash.com/photo-1607153333879-c1a0c102a9eb?w=300&auto=format&fit=crop&q=80",
  "دولفين": "https://images.unsplash.com/photo-1607153333879-c1a0c102a9eb?w=300&auto=format&fit=crop&q=80",
  "Cheetah": "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=300&auto=format&fit=crop&q=80",
  "فهد": "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=300&auto=format&fit=crop&q=80",
  "Wolf": "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=300&auto=format&fit=crop&q=80",
  "ذئب": "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=300&auto=format&fit=crop&q=80",
  "Eagle": "https://images.unsplash.com/photo-1549608276-5786777e6587?w=300&auto=format&fit=crop&q=80",
  "نسر": "https://images.unsplash.com/photo-1549608276-5786777e6587?w=300&auto=format&fit=crop&q=80",
  "Panda": "https://images.unsplash.com/photo-1527118732049-c88155f2107c?w=300&auto=format&fit=crop&q=80",
  "باندا": "https://images.unsplash.com/photo-1527118732049-c88155f2107c?w=300&auto=format&fit=crop&q=80",
  "Penguin": "https://images.unsplash.com/photo-1598439210625-5067c578f3f6?w=300&auto=format&fit=crop&q=80",
  "بطريق": "https://images.unsplash.com/photo-1598439210625-5067c578f3f6?w=300&auto=format&fit=crop&q=80",
  "Camel": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=300&auto=format&fit=crop&q=80",
  "جمل": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=300&auto=format&fit=crop&q=80",
  "Bear": "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=300&auto=format&fit=crop&q=80",
  "دب": "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=300&auto=format&fit=crop&q=80",
  "Giraffe": "https://images.unsplash.com/photo-1538121609137-d10e4e684045?w=300&auto=format&fit=crop&q=80",
  "زرافة": "https://images.unsplash.com/photo-1538121609137-d10e4e684045?w=300&auto=format&fit=crop&q=80",
  "Zebra": "https://images.unsplash.com/photo-1526095179574-46c24f4699fb?w=300&auto=format&fit=crop&q=80",
  "حمار وحشي": "https://images.unsplash.com/photo-1526095179574-46c24f4699fb?w=300&auto=format&fit=crop&q=80",
  "Crocodile": "https://images.unsplash.com/photo-1520542099817-0d19524eed3e?w=300&auto=format&fit=crop&q=80",
  "تمساح": "https://images.unsplash.com/photo-1520542099817-0d19524eed3e?w=300&auto=format&fit=crop&q=80",
  "Kangaroo": "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=300&auto=format&fit=crop&q=80",
  "كنغر": "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=300&auto=format&fit=crop&q=80",
  "Monkey": "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=300&auto=format&fit=crop&q=80",
  "قرد": "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=300&auto=format&fit=crop&q=80",
  "Fox": "https://images.unsplash.com/photo-1516934024742-b461fba47600?w=300&auto=format&fit=crop&q=80",
  "ثعلب": "https://images.unsplash.com/photo-1516934024742-b461fba47600?w=300&auto=format&fit=crop&q=80",
  "Rabbit": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&auto=format&fit=crop&q=80",
  "أرنب": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&auto=format&fit=crop&q=80",
  "Owl": "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=300&auto=format&fit=crop&q=80",
  "بومة": "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=300&auto=format&fit=crop&q=80",
  "Shark": "https://images.unsplash.com/photo-1560275619-4cc9f59e66ff?w=300&auto=format&fit=crop&q=80",
  "قرش": "https://images.unsplash.com/photo-1560275619-4cc9f59e66ff?w=300&auto=format&fit=crop&q=80",
  "Whale": "https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=300&auto=format&fit=crop&q=80",
  "حوت": "https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=300&auto=format&fit=crop&q=80",
  "Octopus": "https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?w=300&auto=format&fit=crop&q=80",
  "أخطبوط": "https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?w=300&auto=format&fit=crop&q=80",
  "Turtle": "https://images.unsplash.com/photo-1508817628294-5a453fa0b8fb?w=300&auto=format&fit=crop&q=80",
  "سلحفاة": "https://images.unsplash.com/photo-1508817628294-5a453fa0b8fb?w=300&auto=format&fit=crop&q=80",
  "Snake": "https://images.unsplash.com/photo-1531386151447-fd76ad50012f?w=300&auto=format&fit=crop&q=80",
  "ثعبان": "https://images.unsplash.com/photo-1531386151447-fd76ad50012f?w=300&auto=format&fit=crop&q=80",

  // === MOVIES & TV SERIES (أفلام ومسلسلات) ===
  "Kirah Wel Genn": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&auto=format&fit=crop&q=80",
  "كيرة والجن": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&auto=format&fit=crop&q=80",
  "Welad Rizk 3": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=300&auto=format&fit=crop&q=80",
  "ولاد رزق 3: القاضية": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=300&auto=format&fit=crop&q=80",
  "El Hashashin": "https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=300&auto=format&fit=crop&q=80",
  "الحشاشين": "https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=300&auto=format&fit=crop&q=80",
  "Gaafar El Omda 2": "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&auto=format&fit=crop&q=80",
  "جعفر العمدة 2": "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&auto=format&fit=crop&q=80",
  "El Ekhtiar 3": "https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=300&auto=format&fit=crop&q=80",
  "الاختيار 3": "https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=300&auto=format&fit=crop&q=80",
  "Beit El Roby": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80",
  "بيت الروبي": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80",
  "El Maddah": "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=300&auto=format&fit=crop&q=80",
  "المداح": "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=300&auto=format&fit=crop&q=80",
  "Taht El Wesaya": "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=300&auto=format&fit=crop&q=80",
  "تحت الوصاية": "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=300&auto=format&fit=crop&q=80",
  "Be 100 Wesh": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&auto=format&fit=crop&q=80",
  "بـ100 وش": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&auto=format&fit=crop&q=80",
  "El Harifa 2": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80",
  "الحريفة 2: الريمونتادا": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80",

  // === SINGERS (المغنيين والموسيقيين) ===
  "Amr Diab": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=80",
  "عمرو دياب": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=80",
  "Tamer Hosny": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
  "تامر حسني": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
  "Mohamed Ramadan": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80",
  "محمد رمضان": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80",
  "Wegz": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&auto=format&fit=crop&q=80",
  "ويجز": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&auto=format&fit=crop&q=80",
  "Mohamed Hamaki": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80",
  "محمد حماقي": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80",
  "Nancy Ajram": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=80",
  "نانسي عجرم": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=80",
  "Sherine": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80",
  "شيرين": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80",
  "Cairokee": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80",
  "كايروكي": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80",
  "Adele": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80",
  "أديل": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80",
  "Taylor Swift": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=80",
  "تايلور سويفت": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=80",
  "The Weeknd": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&auto=format&fit=crop&q=80",
  "ذا ويكند": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&auto=format&fit=crop&q=80",
  "Ed Sheeran": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
  "إد شيران": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",

  // === GAMES (ألعاب الفيديو) ===
  "GTA V": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&auto=format&fit=crop&q=80",
  "جي تي إيه 5": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&auto=format&fit=crop&q=80",
  "Minecraft": "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=300&auto=format&fit=crop&q=80",
  "ماين كرافت": "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=300&auto=format&fit=crop&q=80",
  "PUBG": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80",
  "ببجي": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80",
  "FIFA": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80",
  "فيفا": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80",
  "Fortnite": "https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=300&auto=format&fit=crop&q=80",
  "فورتنايت": "https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=300&auto=format&fit=crop&q=80",
  "Valorant": "https://images.unsplash.com/photo-1542751110-97427bbecf20?w=300&auto=format&fit=crop&q=80",
  "فالورانت": "https://images.unsplash.com/photo-1542751110-97427bbecf20?w=300&auto=format&fit=crop&q=80",
  "Call of Duty": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80",
  "كول أوف ديوتي": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80",
  "Roblox": "https://images.unsplash.com/photo-1612287233207-674f14441098?w=300&auto=format&fit=crop&q=80",
  "روبلوكس": "https://images.unsplash.com/photo-1612287233207-674f14441098?w=300&auto=format&fit=crop&q=80",
  "Among Us": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80",
  "أمونج أس": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80",
  "Rocket League": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&auto=format&fit=crop&q=80",
  "روكيت ليج": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&auto=format&fit=crop&q=80",
  "Cyberpunk 2077": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80",
  "سايبربانك 2077": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80",
  "Elden Ring": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&auto=format&fit=crop&q=80",
  "إلدن رينج": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&auto=format&fit=crop&q=80",
  "Subway Surfers": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80",
  "صب واي سيرفرز": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80",

  // === PLACES (الأماكن والمعالم) ===
  "Pyramids": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=300&auto=format&fit=crop&q=80",
  "الأهرامات": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=300&auto=format&fit=crop&q=80",
  "Eiffel Tower": "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=300&auto=format&fit=crop&q=80",
  "برج إيفل": "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=300&auto=format&fit=crop&q=80",
  "Dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=300&auto=format&fit=crop&q=80",
  "دبي": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=300&auto=format&fit=crop&q=80",
  "London": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300&auto=format&fit=crop&q=80",
  "لندن": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300&auto=format&fit=crop&q=80",
  "Tokyo": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=300&auto=format&fit=crop&q=80",
  "طوكيو": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=300&auto=format&fit=crop&q=80",
  "New York": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=300&auto=format&fit=crop&q=80",
  "نيويورك": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=300&auto=format&fit=crop&q=80",
  "Rome": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=300&auto=format&fit=crop&q=80",
  "روما": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=300&auto=format&fit=crop&q=80",
  "Colosseum": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=300&auto=format&fit=crop&q=80",
  "الكولوسيوم": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=300&auto=format&fit=crop&q=80",
  "Big Ben": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300&auto=format&fit=crop&q=80",
  "بيج بن": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300&auto=format&fit=crop&q=80",
  "Statue of Liberty": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=300&auto=format&fit=crop&q=80",
  "تمثال الحرية": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=300&auto=format&fit=crop&q=80",
  "Burj Khalifa": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=300&auto=format&fit=crop&q=80",
  "برج خليفة": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=300&auto=format&fit=crop&q=80",
  "Cairo Tower": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=300&auto=format&fit=crop&q=80",
  "برج القاهرة": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=300&auto=format&fit=crop&q=80",
  "Paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=300&auto=format&fit=crop&q=80",
  "باريس": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=300&auto=format&fit=crop&q=80"
};

// Category theme palette and icons
export const CATEGORY_STYLES: Record<CategoryKey, { icon: string; titleAr: string; titleEn: string; glow: string; border: string }> = {
  players: { icon: '⚽', titleAr: 'لاعب كرة قدم', titleEn: 'Football Star', glow: 'rgba(56,189,248,0.4)', border: 'border-sky-400' },
  food: { icon: '🍕', titleAr: 'أكل ومأكولات', titleEn: 'Food & Cuisine', glow: 'rgba(251,146,60,0.4)', border: 'border-orange-400' },
  animals: { icon: '🦁', titleAr: 'حيوان وكائنات', titleEn: 'Wildlife & Animal', glow: 'rgba(52,211,153,0.4)', border: 'border-emerald-400' },
  movies: { icon: '🎬', titleAr: 'فيلم / مسلسل', titleEn: 'Movie & Series', glow: 'rgba(232,121,249,0.4)', border: 'border-fuchsia-400' },
  games: { icon: '🎮', titleAr: 'لعبة فيديو', titleEn: 'Video Game', glow: 'rgba(168,85,247,0.4)', border: 'border-purple-400' },
  singers: { icon: '🎤', titleAr: 'مغني / فنان', titleEn: 'Singer & Artist', glow: 'rgba(244,63,94,0.4)', border: 'border-rose-400' },
  places: { icon: '🗺️', titleAr: 'مكان ومعلم', titleEn: 'Place & Landmark', glow: 'rgba(45,212,191,0.4)', border: 'border-teal-400' },
  jobs: { icon: '💼', titleAr: 'مهنة ووظيفة', titleEn: 'Job & Profession', glow: 'rgba(148,163,184,0.3)', border: 'border-slate-500' }
};

/**
 * Returns a dedicated high-quality photo for ANY item in players, food, games, animals, movies, singers, places.
 * Jobs strictly remain without pictures per prior explicit rule.
 */
export function getWordImage(
  wordEn?: string | null,
  wordAr?: string | null,
  category?: CategoryKey | null
): string | null {
  // CRITICAL: Jobs category MUST NOT have pictures
  if (category === 'jobs') {
    return null;
  }

  const cleanEn = (wordEn || '').trim();
  const cleanAr = (wordAr || '').trim();

  // 1. Direct registry lookup
  if (cleanEn && WORD_IMAGE_REGISTRY[cleanEn]) {
    return WORD_IMAGE_REGISTRY[cleanEn];
  }
  if (cleanAr && WORD_IMAGE_REGISTRY[cleanAr]) {
    return WORD_IMAGE_REGISTRY[cleanAr];
  }

  // 2. Case-insensitive lookup
  for (const [key, val] of Object.entries(WORD_IMAGE_REGISTRY)) {
    if (cleanEn && key.toLowerCase() === cleanEn.toLowerCase()) return val;
    if (cleanAr && key === cleanAr) return val;
  }

  // 3. Guaranteed category-specific dynamic visual fallbacks
  switch (category) {
    case 'players':
      return "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80";
    case 'food':
      return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80";
    case 'animals':
      return "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=300&auto=format&fit=crop&q=80";
    case 'movies':
      return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&auto=format&fit=crop&q=80";
    case 'singers':
      return "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=80";
    case 'games':
      return "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&auto=format&fit=crop&q=80";
    case 'places':
      return "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=300&auto=format&fit=crop&q=80";
    default:
      return null;
  }
}
