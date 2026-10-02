import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate wide screenshot (1280x720) - Desktop view
const wideSvg = `
<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="spaceGrad" cx="50%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="60%" stop-color="#030712"/>
      <stop offset="100%" stop-color="#020408"/>
    </radialGradient>
    <linearGradient id="neonSky" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
    <linearGradient id="neonCard" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(15, 23, 42, 0.9)"/>
      <stop offset="100%" stop-color="rgba(3, 7, 18, 0.95)"/>
    </linearGradient>
  </defs>

  <!-- Background Space -->
  <rect width="1280" height="720" fill="url(#spaceGrad)"/>

  <!-- Starfield Dots -->
  <circle cx="100" cy="80" r="1.5" fill="#38bdf8" opacity="0.6"/>
  <circle cx="320" cy="140" r="1.2" fill="#fff" opacity="0.8"/>
  <circle cx="560" cy="70" r="2" fill="#818cf8" opacity="0.7"/>
  <circle cx="890" cy="110" r="1.5" fill="#38bdf8" opacity="0.5"/>
  <circle cx="1150" cy="90" r="2" fill="#fff" opacity="0.9"/>
  <circle cx="210" cy="450" r="1.2" fill="#fff" opacity="0.4"/>
  <circle cx="1050" cy="520" r="1.8" fill="#38bdf8" opacity="0.7"/>

  <!-- Top App Navigation Bar -->
  <rect x="180" y="30" width="920" height="60" rx="20" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="1.5"/>
  <text x="220" y="68" fill="#38bdf8" font-family="sans-serif" font-weight="900" font-size="22" letter-spacing="2">SPY STATION 🛰️</text>
  <rect x="920" y="42" width="160" height="36" rx="12" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" stroke-width="1"/>
  <text x="945" y="65" fill="#38bdf8" font-family="sans-serif" font-weight="700" font-size="14">⚡ 2,450 XP</text>

  <!-- Main Hero Card -->
  <rect x="180" y="110" width="920" height="560" rx="28" fill="url(#neonCard)" stroke="rgba(56, 189, 248, 0.35)" stroke-width="2"/>

  <!-- Tactical Header -->
  <text x="640" y="170" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-weight="900" font-size="28">
    لعبة الجاسوس التكتيكية في الفضاء
  </text>
  <text x="640" y="205" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-weight="600" font-size="16">
    محطة الاتصالات الفضائية • انضم للغرفة أو أنشئ محطتك الخاصة
  </text>

  <!-- Middle Action Cards -->
  <!-- Card 1: Create Station -->
  <rect x="230" y="240" width="380" height="230" rx="20" fill="rgba(30, 41, 59, 0.6)" stroke="rgba(56, 189, 248, 0.4)" stroke-width="1.5"/>
  <circle cx="420" cy="310" r="36" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" stroke-width="2"/>
  <text x="420" y="322" text-anchor="middle" font-size="32">🚀</text>
  <text x="420" y="380" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-weight="800" font-size="20">إنشاء محطة جديدة</text>
  <text x="420" y="410" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="13">غرف عامة وخاصة مع أصدقائك</text>

  <!-- Card 2: Join Station -->
  <rect x="670" y="240" width="380" height="230" rx="20" fill="rgba(30, 41, 59, 0.6)" stroke="rgba(129, 140, 248, 0.4)" stroke-width="1.5"/>
  <circle cx="860" cy="310" r="36" fill="rgba(129, 140, 248, 0.2)" stroke="#818cf8" stroke-width="2"/>
  <text x="860" y="322" text-anchor="middle" font-size="32">🛰️</text>
  <text x="860" y="380" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-weight="800" font-size="20">انضمام بكود المحطة</text>
  <text x="860" y="410" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="13">مسح باركود QR أو كتابة الكود</text>

  <!-- Categories Highlights -->
  <rect x="230" y="495" width="820" height="140" rx="18" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(56, 189, 248, 0.2)" stroke-width="1"/>
  <text x="260" y="530" fill="#38bdf8" font-family="sans-serif" font-weight="800" font-size="15">فئات وأطوار اللعب المتنوعة:</text>
  
  <rect x="260" y="550" width="140" height="60" rx="12" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(56, 189, 248, 0.3)"/>
  <text x="330" y="585" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-weight="700" font-size="14">⚽ كرة القدم</text>

  <rect x="420" y="550" width="140" height="60" rx="12" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(56, 189, 248, 0.3)"/>
  <text x="490" y="585" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-weight="700" font-size="14">🍕 مأكولات</text>

  <rect x="580" y="550" width="140" height="60" rx="12" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(56, 189, 248, 0.3)"/>
  <text x="650" y="585" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-weight="700" font-size="14">🎬 سينما</text>

  <rect x="740" y="550" width="140" height="60" rx="12" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(56, 189, 248, 0.3)"/>
  <text x="810" y="585" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-weight="700" font-size="14">😂 تريندات</text>

  <rect x="900" y="550" width="130" height="60" rx="12" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(56, 189, 248, 0.3)"/>
  <text x="965" y="585" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-weight="700" font-size="14">🎲 عشوائي</text>
</svg>
`;

// 2. Generate narrow screenshot (720x1280) - Mobile view
const narrowSvg = `
<svg width="720" height="1280" viewBox="0 0 720 1280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="spaceGradM" cx="50%" cy="20%" r="90%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="70%" stop-color="#030712"/>
      <stop offset="100%" stop-color="#010306"/>
    </radialGradient>
    <linearGradient id="neonCardM" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(15, 23, 42, 0.95)"/>
      <stop offset="100%" stop-color="rgba(3, 7, 18, 0.98)"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="720" height="1280" fill="url(#spaceGradM)"/>

  <!-- Stars -->
  <circle cx="80" cy="120" r="2" fill="#38bdf8" opacity="0.7"/>
  <circle cx="280" cy="80" r="1.5" fill="#fff" opacity="0.9"/>
  <circle cx="580" cy="160" r="2" fill="#818cf8" opacity="0.6"/>
  <circle cx="150" cy="850" r="1.5" fill="#fff" opacity="0.5"/>
  <circle cx="620" cy="980" r="2.2" fill="#38bdf8" opacity="0.8"/>

  <!-- Mobile Top Bar -->
  <rect x="40" y="40" width="640" height="70" rx="22" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="1.5"/>
  <text x="80" y="85" fill="#38bdf8" font-family="sans-serif" font-weight="900" font-size="24">SPY STATION 🚀</text>
  <rect x="520" y="55" width="130" height="40" rx="14" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" stroke-width="1"/>
  <text x="545" y="80" fill="#38bdf8" font-family="sans-serif" font-weight="700" font-size="15">2,450 XP</text>

  <!-- Main Action Container -->
  <rect x="40" y="140" width="640" height="1060" rx="32" fill="url(#neonCardM)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="2"/>

  <!-- Header Text -->
  <text x="360" y="210" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-weight="900" font-size="30">
    لعبة الجاسوس التكتيكية
  </text>
  <text x="360" y="250" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-weight="600" font-size="16">
    اكشف الجاسوس قبل نفاد الوقت والوقود!
  </text>

  <!-- Big Action 1: Create -->
  <rect x="75" y="290" width="570" height="170" rx="24" fill="rgba(30, 41, 59, 0.7)" stroke="#38bdf8" stroke-width="2"/>
  <circle cx="160" cy="375" r="44" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" stroke-width="2"/>
  <text x="160" y="388" text-anchor="middle" font-size="40">🚀</text>
  <text x="240" y="365" fill="#f8fafc" font-family="sans-serif" font-weight="800" font-size="24">إنشاء محطة سرية</text>
  <text x="240" y="400" fill="#94a3b8" font-family="sans-serif" font-weight="600" font-size="15">ابدأ جولة جديدة مع رفاقك</text>

  <!-- Big Action 2: Join -->
  <rect x="75" y="490" width="570" height="170" rx="24" fill="rgba(30, 41, 59, 0.7)" stroke="#818cf8" stroke-width="2"/>
  <circle cx="160" cy="575" r="44" fill="rgba(129, 140, 248, 0.2)" stroke="#818cf8" stroke-width="2"/>
  <text x="160" y="588" text-anchor="middle" font-size="40">🛰️</text>
  <text x="240" y="565" fill="#f8fafc" font-family="sans-serif" font-weight="800" font-size="24">انضمام لمحطة</text>
  <text x="240" y="600" fill="#94a3b8" font-family="sans-serif" font-weight="600" font-size="15">أدخل كود الغرفة أو امسح الـ QR</text>

  <!-- Lucky Wheel & Daily Pass -->
  <rect x="75" y="690" width="570" height="110" rx="20" fill="rgba(88, 28, 135, 0.3)" stroke="rgba(168, 85, 247, 0.5)" stroke-width="1.5"/>
  <text x="120" y="755" font-size="32">🎡</text>
  <text x="180" y="745" fill="#f3e8ff" font-family="sans-serif" font-weight="800" font-size="18">عجلة الحظ المدارية اليومية</text>
  <text x="180" y="775" fill="#d8b4fe" font-family="sans-serif" font-weight="600" font-size="13">جوائز مجانية ونقاط خبرة كل 24 ساعة</text>

  <!-- Categories Grid -->
  <text x="80" y="845" fill="#38bdf8" font-family="sans-serif" font-weight="800" font-size="18">الفئات التكتيكية المتاحة:</text>
  
  <rect x="75" y="870" width="170" height="90" rx="16" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(56, 189, 248, 0.3)"/>
  <text x="160" y="910" text-anchor="middle" font-size="24">⚽</text>
  <text x="160" y="940" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700" font-size="14">كرة قدم</text>

  <rect x="275" y="870" width="170" height="90" rx="16" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(56, 189, 248, 0.3)"/>
  <text x="360" y="910" text-anchor="middle" font-size="24">🍕</text>
  <text x="360" y="940" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700" font-size="14">مأكولات</text>

  <rect x="475" y="870" width="170" height="90" rx="16" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(56, 189, 248, 0.3)"/>
  <text x="560" y="910" text-anchor="middle" font-size="24">🎬</text>
  <text x="560" y="940" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700" font-size="14">سينما</text>

  <rect x="75" y="980" width="170" height="90" rx="16" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(56, 189, 248, 0.3)"/>
  <text x="160" y="1020" text-anchor="middle" font-size="24">🦁</text>
  <text x="160" y="1050" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700" font-size="14">حيوانات</text>

  <rect x="275" y="980" width="170" height="90" rx="16" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(56, 189, 248, 0.3)"/>
  <text x="360" y="1020" text-anchor="middle" font-size="24">🎮</text>
  <text x="360" y="1050" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700" font-size="14">ألعاب</text>

  <rect x="475" y="980" width="170" height="90" rx="16" fill="rgba(30, 41, 59, 0.8)" stroke="rgba(56, 189, 248, 0.3)"/>
  <text x="560" y="1020" text-anchor="middle" font-size="24">🎲</text>
  <text x="560" y="1050" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700" font-size="14">عشوائي</text>

  <!-- Bottom Brand Footnote -->
  <text x="360" y="1140" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-weight="600" font-size="14">
    🚀 تطبيق ويب تقدمي متوافق مع متاجر التطبيقات والهواتف الذكية
  </text>
</svg>
`;

async function run() {
  console.log('Generating PWA store screenshots...');
  await sharp(Buffer.from(wideSvg))
    .png()
    .toFile(path.join(publicDir, 'screenshot-desktop.png'));

  await sharp(Buffer.from(narrowSvg))
    .png()
    .toFile(path.join(publicDir, 'screenshot-mobile.png'));

  // Also generate 96x96 and 144x144 and 384x384 icons from 512x512
  const icon512Path = path.join(publicDir, 'pwa-512x512.png');
  if (fs.existsSync(icon512Path)) {
    await sharp(icon512Path).resize(96, 96).toFile(path.join(publicDir, 'pwa-96x96.png'));
    await sharp(icon512Path).resize(144, 144).toFile(path.join(publicDir, 'pwa-144x144.png'));
    await sharp(icon512Path).resize(384, 384).toFile(path.join(publicDir, 'pwa-384x384.png'));
  }

  console.log('Successfully generated PWA store assets in public/');
}

run().catch(console.error);
