import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// ==============================================================================
// 1. SCREENSHOT: REAL HOME TAB & CATEGORIES (Mobile 720x1280)
// ==============================================================================
const homeMobileSvg = `
<svg width="720" height="1280" viewBox="0 0 720 1280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="spaceBg" cx="50%" cy="20%" r="95%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="60%" stop-color="#030712"/>
      <stop offset="100%" stop-color="#010306"/>
    </radialGradient>
    <linearGradient id="neonCard" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(15, 23, 42, 0.95)"/>
      <stop offset="100%" stop-color="rgba(3, 7, 18, 0.98)"/>
    </linearGradient>
    <linearGradient id="amberLaunch" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="50%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>

  <!-- Cosmic Background -->
  <rect width="720" height="1280" fill="url(#spaceBg)"/>
  <circle cx="80" cy="120" r="2" fill="#38bdf8" opacity="0.8"/>
  <circle cx="340" cy="80" r="1.5" fill="#fff" opacity="0.9"/>
  <circle cx="620" cy="140" r="2.2" fill="#818cf8" opacity="0.7"/>
  <circle cx="160" cy="540" r="1.5" fill="#fff" opacity="0.5"/>
  <circle cx="650" cy="890" r="2" fill="#38bdf8" opacity="0.8"/>

  <!-- Top Profile Card -->
  <rect x="40" y="40" width="640" height="84" rx="24" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(56, 189, 248, 0.35)" stroke-width="1.5"/>
  <circle cx="86" cy="82" r="28" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <text x="86" y="93" text-anchor="middle" font-size="28">👨‍🚀</text>
  <text x="130" y="74" fill="#38bdf8" font-family="'Cairo', sans-serif" font-weight="800" font-size="18">حمزة (Commander)</text>
  <text x="130" y="96" fill="#94a3b8" font-family="'Cairo', sans-serif" font-weight="700" font-size="13">🚀 رائد فضاء • 2,450 XP</text>
  <text x="650" y="86" text-anchor="end" fill="#c084fc" font-family="'Chakra Petch', sans-serif" font-weight="900" font-size="20">SPY STATION</text>

  <!-- Main Categories Container (Starts directly under profile bar) -->
  <rect x="40" y="148" width="640" height="980" rx="32" fill="url(#neonCard)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="2"/>
  <text x="75" y="195" fill="#94a3b8" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">✨ إنشاء محطة جديدة:</text>
  <text x="645" y="195" text-anchor="end" fill="#c084fc" font-family="'Cairo', sans-serif" font-weight="700" font-size="13">8 فئات + عشوائي</text>

  <!-- 3x3 Categories Grid -->
  <!-- Row 1 -->
  <rect x="65" y="225" width="180" height="110" rx="20" fill="rgba(2, 6, 23, 0.8)" stroke="rgba(56, 189, 248, 0.25)" stroke-width="1"/>
  <text x="155" y="278" text-anchor="middle" font-size="32">⚽</text>
  <text x="155" y="315" text-anchor="middle" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">كرة القدم</text>

  <rect x="270" y="225" width="180" height="110" rx="20" fill="rgba(2, 6, 23, 0.8)" stroke="rgba(56, 189, 248, 0.25)" stroke-width="1"/>
  <text x="360" y="278" text-anchor="middle" font-size="32">🍕</text>
  <text x="360" y="315" text-anchor="middle" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">أكلات ومشروبات</text>

  <rect x="475" y="225" width="180" height="110" rx="20" fill="rgba(2, 6, 23, 0.8)" stroke="rgba(56, 189, 248, 0.25)" stroke-width="1"/>
  <text x="565" y="278" text-anchor="middle" font-size="32">🎬</text>
  <text x="565" y="315" text-anchor="middle" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">أفلام ومسلسلات</text>

  <!-- Row 2 -->
  <rect x="65" y="355" width="180" height="110" rx="20" fill="rgba(2, 6, 23, 0.8)" stroke="rgba(56, 189, 248, 0.25)" stroke-width="1"/>
  <text x="155" y="408" text-anchor="middle" font-size="32">🌍</text>
  <text x="155" y="445" text-anchor="middle" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">أماكن ومعالم</text>

  <rect x="270" y="355" width="180" height="110" rx="20" fill="rgba(2, 6, 23, 0.8)" stroke="rgba(56, 189, 248, 0.25)" stroke-width="1"/>
  <text x="360" y="408" text-anchor="middle" font-size="32">🎮</text>
  <text x="360" y="445" text-anchor="middle" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">ألعاب فيديو</text>

  <rect x="475" y="355" width="180" height="110" rx="20" fill="rgba(2, 6, 23, 0.8)" stroke="rgba(56, 189, 248, 0.25)" stroke-width="1"/>
  <text x="565" y="408" text-anchor="middle" font-size="32">🦁</text>
  <text x="565" y="445" text-anchor="middle" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">حيوانات</text>

  <!-- Row 3 -->
  <rect x="65" y="485" width="180" height="110" rx="20" fill="rgba(2, 6, 23, 0.8)" stroke="rgba(56, 189, 248, 0.25)" stroke-width="1"/>
  <text x="155" y="538" text-anchor="middle" font-size="32">💼</text>
  <text x="155" y="575" text-anchor="middle" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">وظائف</text>

  <rect x="270" y="485" width="180" height="110" rx="20" fill="rgba(2, 6, 23, 0.8)" stroke="rgba(56, 189, 248, 0.25)" stroke-width="1"/>
  <text x="360" y="538" text-anchor="middle" font-size="32">🎤</text>
  <text x="360" y="575" text-anchor="middle" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">مطربين</text>

  <rect x="475" y="485" width="180" height="110" rx="20" fill="rgba(88, 28, 135, 0.4)" stroke="#a855f7" stroke-width="1.5"/>
  <text x="565" y="538" text-anchor="middle" font-size="32">🎲</text>
  <text x="565" y="575" text-anchor="middle" fill="#d8b4fe" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">عشوائي</text>

  <!-- ⚡ Sleek & Clean Quick Match Launch Button directly under categories -->
  <rect x="65" y="620" width="590" height="66" rx="22" fill="url(#amberLaunch)" stroke="#fcd34d" stroke-width="2"/>
  <text x="360" y="662" text-anchor="middle" fill="#020617" font-family="'Cairo', sans-serif" font-weight="900" font-size="24">انطلاق ⚡</text>

  <!-- Divider -->
  <line x1="65" y1="715" x2="655" y2="715" stroke="#1e293b" stroke-width="1.5"/>

  <!-- Join Station by Code Section -->
  <text x="75" y="755" fill="#94a3b8" font-family="'Cairo', sans-serif" font-weight="800" font-size="14">🔑 الانضمام عبر كود مكون من 6 أرقام:</text>
  <rect x="65" y="775" width="430" height="58" rx="18" fill="rgba(2, 6, 23, 0.9)" stroke="rgba(56, 189, 248, 0.4)" stroke-width="1.5"/>
  <text x="280" y="812" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-weight="900" font-size="20" letter-spacing="4">K5R0MY</text>
  <rect x="510" y="775" width="145" height="58" rx="18" fill="#38bdf8"/>
  <text x="582" y="812" text-anchor="middle" fill="#020617" font-family="'Cairo', sans-serif" font-weight="900" font-size="16">انضمام 🛰️</text>

  <!-- Bottom Navigation -->
  <rect x="40" y="1170" width="640" height="74" rx="26" fill="rgba(15, 23, 42, 0.95)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="1.5"/>
  <text x="120" y="1215" text-anchor="middle" fill="#38bdf8" font-family="'Cairo', sans-serif" font-weight="800" font-size="14">🏠 الرئيسية</text>
  <text x="280" y="1215" text-anchor="middle" fill="#64748b" font-family="'Cairo', sans-serif" font-weight="700" font-size="14">🌐 المحطات</text>
  <text x="440" y="1215" text-anchor="middle" fill="#64748b" font-family="'Cairo', sans-serif" font-weight="700" font-size="14">👥 الأصدقاء</text>
  <text x="600" y="1215" text-anchor="middle" fill="#64748b" font-family="'Cairo', sans-serif" font-weight="700" font-size="14">⚙️ الإعدادات</text>
</svg>
`;

// ==============================================================================
// 2. SCREENSHOT: ACTIVE GAMEPLAY & SINGLE WORD CLUES (Mobile 720x1280)
// ==============================================================================
const gameMobileSvg = `
<svg width="720" height="1280" viewBox="0 0 720 1280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="gameBg" cx="50%" cy="20%" r="95%">
      <stop offset="0%" stop-color="#0b132b"/>
      <stop offset="60%" stop-color="#030712"/>
      <stop offset="100%" stop-color="#020408"/>
    </radialGradient>
    <linearGradient id="turnGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(14, 165, 233, 0.3)"/>
      <stop offset="50%" stop-color="rgba(99, 102, 241, 0.3)"/>
      <stop offset="100%" stop-color="rgba(14, 165, 233, 0.3)"/>
    </linearGradient>
  </defs>

  <rect width="720" height="1280" fill="url(#gameBg)"/>
  <circle cx="120" cy="90" r="1.5" fill="#38bdf8"/>
  <circle cx="640" cy="180" r="2" fill="#818cf8"/>
  <circle cx="320" cy="920" r="1.5" fill="#fff"/>

  <!-- Top Biometric Scanner Card -->
  <rect x="40" y="40" width="640" height="120" rx="24" fill="rgba(15, 23, 42, 0.9)" stroke="#38bdf8" stroke-width="2"/>
  <text x="65" y="75" fill="#94a3b8" font-family="'Cairo', sans-serif" font-weight="800" font-size="13">🔒 فحص البصمة والتشفير (اضغط للمعاينة)</text>
  <text x="655" y="75" text-anchor="end" fill="#38bdf8" font-family="'Cairo', sans-serif" font-weight="700" font-size="12">فئة: كرة القدم ⚽</text>
  <rect x="65" y="90" width="590" height="54" rx="14" fill="rgba(2, 6, 23, 0.8)" stroke="rgba(56, 189, 248, 0.4)" stroke-width="1"/>
  <text x="360" y="126" text-anchor="middle" fill="#38bdf8" font-family="'Cairo', sans-serif" font-weight="900" font-size="22">الكلمة السرية: ميسي ⚽</text>

  <!-- Hero Speaking Turn Banner with Circular Countdown -->
  <rect x="40" y="175" width="640" height="96" rx="26" fill="url(#turnGlow)" stroke="#38bdf8" stroke-width="2"/>
  <circle cx="95" cy="223" r="28" fill="#38bdf8"/>
  <text x="95" y="233" text-anchor="middle" font-size="28">🎙️</text>
  <text x="140" y="212" fill="#94a3b8" font-family="'Cairo', sans-serif" font-weight="700" font-size="12">الدور الحالي لإعطاء التلميح</text>
  <text x="140" y="238" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="900" font-size="18">👉 دورك الآن! أعطِ تلميحك</text>
  
  <!-- Digital HUD Timer -->
  <rect x="535" y="197" width="125" height="52" rx="16" fill="rgba(2, 6, 23, 0.9)" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="597" y="231" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-weight="900" font-size="20">00:15</text>

  <!-- Space Crew Astronaut Roster with Speech Bubbles -->
  <rect x="40" y="285" width="640" height="540" rx="30" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(56, 189, 248, 0.25)" stroke-width="1.5"/>
  <text x="65" y="325" fill="#94a3b8" font-family="'Cairo', sans-serif" font-weight="800" font-size="14">🛸 طاقم المحطة الفضائية (5 رواد فضاء)</text>

  <!-- Astronaut 1 ( حمزة - Me / Turn Active) -->
  <rect x="65" y="380" width="175" height="180" rx="20" fill="rgba(14, 165, 233, 0.15)" stroke="#38bdf8" stroke-width="2"/>
  <circle cx="152" cy="440" r="32" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
  <text x="152" y="452" text-anchor="middle" font-size="34">👨‍🚀</text>
  <text x="152" y="500" text-anchor="middle" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="900" font-size="15">حمزة (أنت)</text>
  <!-- Voice Status Pill -->
  <rect x="102" y="515" width="100" height="26" rx="13" fill="#020617" stroke="#1e293b"/>
  <text x="152" y="533" text-anchor="middle" font-size="12">🎙️ 🎧</text>

  <!-- Astronaut 2 (فارس 🤖 with Speech Bubble) -->
  <!-- Floating Clue Bubble -->
  <rect x="275" y="340" width="110" height="34" rx="14" fill="#ffffff" stroke="#38bdf8" stroke-width="2"/>
  <text x="330" y="362" text-anchor="middle" fill="#020617" font-family="'Cairo', sans-serif" font-weight="900" font-size="14">أسطورة</text>
  <polygon points="325,374 335,374 330,382" fill="#ffffff"/>

  <rect x="272" y="380" width="175" height="180" rx="20" fill="rgba(2, 6, 23, 0.6)" stroke="#334155" stroke-width="1"/>
  <circle cx="360" cy="440" r="32" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  <text x="360" y="452" text-anchor="middle" font-size="34">🤖</text>
  <text x="360" y="500" text-anchor="middle" fill="#cbd5e1" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">فارس 🤖</text>
  <rect x="310" y="515" width="100" height="26" rx="13" fill="#020617" stroke="#1e293b"/>
  <text x="360" y="533" text-anchor="middle" font-size="12">🎙️ 🎧</text>

  <!-- Astronaut 3 (مريم with Speech Bubble) -->
  <rect x="485" y="340" width="110" height="34" rx="14" fill="#ffffff" stroke="#38bdf8" stroke-width="2"/>
  <text x="540" y="362" text-anchor="middle" fill="#020617" font-family="'Cairo', sans-serif" font-weight="900" font-size="14">مراوغ</text>
  <polygon points="535,374 545,374 540,382" fill="#ffffff"/>

  <rect x="480" y="380" width="175" height="180" rx="20" fill="rgba(2, 6, 23, 0.6)" stroke="#334155" stroke-width="1"/>
  <circle cx="567" cy="440" r="32" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  <text x="567" y="452" text-anchor="middle" font-size="34">👩‍🚀</text>
  <text x="567" y="500" text-anchor="middle" fill="#cbd5e1" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">مريم</text>
  <rect x="517" y="515" width="100" height="26" rx="13" fill="#020617" stroke="#1e293b"/>
  <text x="567" y="533" text-anchor="middle" font-size="12">🎙️ 🎧</text>

  <!-- Astronaut 4 (كريم 🤖 with Speech Bubble) -->
  <rect x="170" y="580" width="110" height="34" rx="14" fill="#ffffff" stroke="#38bdf8" stroke-width="2"/>
  <text x="225" y="602" text-anchor="middle" fill="#020617" font-family="'Cairo', sans-serif" font-weight="900" font-size="14">أرجنتيني</text>
  <polygon points="220,614 230,614 225,622" fill="#ffffff"/>

  <rect x="165" y="620" width="175" height="180" rx="20" fill="rgba(2, 6, 23, 0.6)" stroke="#334155" stroke-width="1"/>
  <circle cx="252" cy="680" r="32" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  <text x="252" y="692" text-anchor="middle" font-size="34">🤖</text>
  <text x="252" y="740" text-anchor="middle" fill="#cbd5e1" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">كريم 🤖</text>
  <rect x="202" y="755" width="100" height="26" rx="13" fill="#020617" stroke="#1e293b"/>
  <text x="252" y="773" text-anchor="middle" font-size="12">🎙️ 🎧</text>

  <!-- Astronaut 5 (زياد) -->
  <rect x="380" y="620" width="175" height="180" rx="20" fill="rgba(2, 6, 23, 0.6)" stroke="#334155" stroke-width="1"/>
  <circle cx="467" cy="680" r="32" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  <text x="467" y="692" text-anchor="middle" font-size="34">👨‍🚀</text>
  <text x="467" y="740" text-anchor="middle" fill="#cbd5e1" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">زياد</text>
  <rect x="417" y="755" width="100" height="26" rx="13" fill="#020617" stroke="#1e293b"/>
  <text x="467" y="773" text-anchor="middle" font-size="12">🎙️ 🎧</text>

  <!-- Bottom Action Console -->
  <rect x="40" y="845" width="640" height="395" rx="30" fill="rgba(15, 23, 42, 0.95)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="2"/>
  <text x="65" y="885" fill="#38bdf8" font-family="'Cairo', sans-serif" font-weight="800" font-size="14">🎙️ اكتب تلميحك الذكي (كلمة واحدة فقط):</text>

  <!-- Clue Input Bar + Send + Pass -->
  <rect x="65" y="905" width="375" height="60" rx="20" fill="rgba(2, 6, 23, 0.9)" stroke="#38bdf8" stroke-width="2"/>
  <text x="85" y="942" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="800" font-size="17">ساحر</text>

  <rect x="450" y="905" width="115" height="60" rx="20" fill="#38bdf8"/>
  <text x="507" y="942" text-anchor="middle" fill="#020617" font-family="'Cairo', sans-serif" font-weight="900" font-size="16">إرسال 🚀</text>

  <rect x="575" y="905" width="80" height="60" rx="20" fill="#1e293b" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="615" y="942" text-anchor="middle" fill="#fcd34d" font-family="'Cairo', sans-serif" font-weight="900" font-size="14">تفويت ⏩</text>

  <!-- Big Red Emergency Accusation Button -->
  <rect x="65" y="990" width="590" height="66" rx="22" fill="linear-gradient(to right, #e11d48, #be123c)" stroke="#f43f5e" stroke-width="2"/>
  <text x="360" y="1032" text-anchor="middle" fill="#ffffff" font-family="'Cairo', sans-serif" font-weight="900" font-size="18">🚨 كشف الجاسوس / توجيه اتهام طارئ</text>

  <!-- Voice Chat Bar at very bottom -->
  <rect x="65" y="1075" width="590" height="54" rx="18" fill="rgba(2, 6, 23, 0.8)" stroke="#334155" stroke-width="1"/>
  <text x="95" y="1108" fill="#38bdf8" font-family="'Cairo', sans-serif" font-weight="800" font-size="14">🎙️ المكالمة الصوتية المباشرة نشطة • 5 أعضاء</text>
  <rect x="535" y="1083" width="105" height="38" rx="12" fill="#10b981"/>
  <text x="587" y="1108" text-anchor="middle" fill="#020617" font-family="'Cairo', sans-serif" font-weight="900" font-size="12">متصل 🟢</text>
</svg>
`;

// ==============================================================================
// 3. SCREENSHOT: DRAMATIC VOTING & INTERROGATION SCREEN (Mobile 720x1280)
// ==============================================================================
const votingMobileSvg = `
<svg width="720" height="1280" viewBox="0 0 720 1280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="voteBg" cx="50%" cy="20%" r="95%">
      <stop offset="0%" stop-color="#2a0815"/>
      <stop offset="60%" stop-color="#0a0206"/>
      <stop offset="100%" stop-color="#020408"/>
    </radialGradient>
  </defs>

  <rect width="720" height="1280" fill="url(#voteBg)"/>

  <!-- Emergency Protocol Header Banner -->
  <rect x="40" y="50" width="640" height="120" rx="26" fill="rgba(225, 29, 72, 0.2)" stroke="#f43f5e" stroke-width="2.5"/>
  <text x="360" y="100" text-anchor="middle" fill="#f43f5e" font-family="'Cairo', sans-serif" font-weight="900" font-size="24">🚨 بروتوكول التصويت الطارئ</text>
  <text x="360" y="135" text-anchor="middle" fill="#fda4af" font-family="'Cairo', sans-serif" font-weight="700" font-size="15">حدد المشتبه به وطرده قبل تخريب المحطة!</text>

  <!-- Countdown Timer Clock -->
  <rect x="245" y="190" width="230" height="54" rx="20" fill="rgba(2, 6, 23, 0.9)" stroke="#f43f5e" stroke-width="2"/>
  <text x="360" y="225" text-anchor="middle" fill="#f43f5e" font-family="monospace" font-weight="900" font-size="22">⏱️ 00:72s</text>

  <!-- Suspect Astronaut Cards -->
  <rect x="40" y="270" width="640" height="880" rx="30" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(244, 63, 94, 0.3)" stroke-width="1.5"/>
  <text x="65" y="310" fill="#cbd5e1" font-family="'Cairo', sans-serif" font-weight="800" font-size="15">صوّت ضد من تعتقد أنه الجاسوس:</text>

  <!-- Suspect 1 (فارس 🤖 - Top Suspect with 3 votes) -->
  <rect x="65" y="335" width="590" height="95" rx="22" fill="rgba(225, 29, 72, 0.2)" stroke="#f43f5e" stroke-width="2"/>
  <circle cx="115" cy="382" r="30" fill="#1e293b" stroke="#f43f5e" stroke-width="2"/>
  <text x="115" y="393" text-anchor="middle" font-size="32">🤖</text>
  <text x="165" y="375" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="900" font-size="18">فارس 🤖</text>
  <text x="165" y="402" fill="#fda4af" font-family="'Cairo', sans-serif" font-weight="700" font-size="13">آخر تلميح: أسطورة</text>
  <rect x="535" y="358" width="100" height="48" rx="16" fill="#f43f5e"/>
  <text x="585" y="388" text-anchor="middle" fill="#ffffff" font-family="'Cairo', sans-serif" font-weight="900" font-size="15">3 أصوات 🗳️</text>

  <!-- Suspect 2 (مريم - 1 vote) -->
  <rect x="65" y="450" width="590" height="95" rx="22" fill="rgba(2, 6, 23, 0.7)" stroke="#334155" stroke-width="1"/>
  <circle cx="115" cy="497" r="30" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <text x="115" y="508" text-anchor="middle" font-size="32">👩‍🚀</text>
  <text x="165" y="490" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="900" font-size="18">مريم</text>
  <text x="165" y="517" fill="#94a3b8" font-family="'Cairo', sans-serif" font-weight="700" font-size="13">آخر تلميح: مراوغ</text>
  <rect x="535" y="473" width="100" height="48" rx="16" fill="#1e293b" stroke="#334155"/>
  <text x="585" y="503" text-anchor="middle" fill="#cbd5e1" font-family="'Cairo', sans-serif" font-weight="800" font-size="14">صوت 🗳️</text>

  <!-- Suspect 3 (كريم 🤖) -->
  <rect x="65" y="565" width="590" height="95" rx="22" fill="rgba(2, 6, 23, 0.7)" stroke="#334155" stroke-width="1"/>
  <circle cx="115" cy="612" r="30" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <text x="115" y="623" text-anchor="middle" font-size="32">🤖</text>
  <text x="165" y="605" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="900" font-size="18">كريم 🤖</text>
  <text x="165" y="632" fill="#94a3b8" font-family="'Cairo', sans-serif" font-weight="700" font-size="13">آخر تلميح: أرجنتيني</text>
  <rect x="545" y="588" width="90" height="48" rx="16" fill="#0f172a" stroke="#334155"/>
  <text x="590" y="618" text-anchor="middle" fill="#64748b" font-family="'Cairo', sans-serif" font-weight="800" font-size="13">صوت له</text>

  <!-- Suspect 4 (زياد) -->
  <rect x="65" y="680" width="590" height="95" rx="22" fill="rgba(2, 6, 23, 0.7)" stroke="#334155" stroke-width="1"/>
  <circle cx="115" cy="727" r="30" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <text x="115" y="738" text-anchor="middle" font-size="32">👨‍🚀</text>
  <text x="165" y="720" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="900" font-size="18">زياد</text>
  <text x="165" y="747" fill="#94a3b8" font-family="'Cairo', sans-serif" font-weight="700" font-size="13">آخر تلميح: بطولات</text>
  <rect x="545" y="703" width="90" height="48" rx="16" fill="#0f172a" stroke="#334155"/>
  <text x="590" y="733" text-anchor="middle" fill="#64748b" font-family="'Cairo', sans-serif" font-weight="800" font-size="13">صوت له</text>

  <!-- Skip Voting Button -->
  <rect x="65" y="800" width="590" height="66" rx="22" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
  <text x="360" y="842" text-anchor="middle" fill="#cbd5e1" font-family="'Cairo', sans-serif" font-weight="900" font-size="18">⏩ تخطي التصويت (لا تطرد أحداً)</text>
</svg>
`;

// ==============================================================================
// 4. SCREENSHOT: CINEMATIC LASER PRISON CAGE EJECTION (Mobile 720x1280)
// ==============================================================================
const ejectionMobileSvg = `
<svg width="720" height="1280" viewBox="0 0 720 1280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="cageBg" cx="50%" cy="40%" r="95%">
      <stop offset="0%" stop-color="#3b0712"/>
      <stop offset="50%" stop-color="#020408"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <linearGradient id="laserBar" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fb7185"/>
      <stop offset="50%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#e11d48"/>
    </linearGradient>
  </defs>

  <rect width="720" height="1280" fill="url(#cageBg)"/>

  <!-- Cosmic Stars -->
  <circle cx="90" cy="110" r="1.5" fill="#fff" opacity="0.8"/>
  <circle cx="630" cy="160" r="2" fill="#fb7185" opacity="0.9"/>
  <circle cx="150" cy="980" r="1.8" fill="#fde047" opacity="0.7"/>

  <!-- Center Stage Avatar Box -->
  <rect x="235" y="380" width="250" height="250" rx="36" fill="#0f172a" stroke="#334155" stroke-width="4"/>
  <circle cx="360" cy="490" r="75" fill="#1e293b"/>
  <text x="360" y="525" text-anchor="middle" font-size="95">🤖</text>

  <!-- 🔒 LASER PRISON CAGE DROPPED FROM ABOVE OVER SPY -->
  <!-- Cage Top Bar -->
  <rect x="220" y="360" width="280" height="18" rx="9" fill="#be123c" stroke="#fb7185" stroke-width="2"/>
  
  <!-- Laser Vertical Bars -->
  <rect x="240" y="375" width="10" height="260" rx="5" fill="url(#laserBar)"/>
  <rect x="285" y="375" width="10" height="260" rx="5" fill="url(#laserBar)"/>
  <rect x="330" y="375" width="10" height="260" rx="5" fill="url(#laserBar)"/>
  <rect x="375" y="375" width="10" height="260" rx="5" fill="url(#laserBar)"/>
  <rect x="420" y="375" width="10" height="260" rx="5" fill="url(#laserBar)"/>
  <rect x="465" y="375" width="10" height="260" rx="5" fill="url(#laserBar)"/>

  <!-- Cage Bottom Bar + Padlock -->
  <rect x="220" y="630" width="280" height="18" rx="9" fill="#be123c" stroke="#fb7185" stroke-width="2"/>
  <circle cx="360" cy="655" r="22" fill="#020617" stroke="#f59e0b" stroke-width="3"/>
  <text x="360" y="663" text-anchor="middle" font-size="20">🔒</text>

  <!-- Player Name Tag -->
  <rect x="260" y="695" width="200" height="44" rx="22" fill="#0f172a" stroke="#334155" stroke-width="2"/>
  <text x="360" y="724" text-anchor="middle" fill="#ffffff" font-family="'Cairo', sans-serif" font-weight="900" font-size="18">فارس 🤖</text>

  <!-- Dramatic Verdict Banner -->
  <rect x="60" y="780" width="600" height="150" rx="30" fill="rgba(76, 5, 25, 0.9)" stroke="#f43f5e" stroke-width="2.5"/>
  <text x="360" y="835" text-anchor="middle" fill="#ffffff" font-family="'Cairo', sans-serif" font-weight="900" font-size="26">تم حبس الجاسوس في القفص! 🕵️🔒</text>
  <text x="360" y="880" text-anchor="middle" fill="#fda4af" font-family="'Cairo', sans-serif" font-weight="700" font-size="16">أحسنت المحطة! تم كشف العميل المندس فارس بنجاح وحبسه خلف القضبان.</text>

  <!-- 5-Second Cinematic Progress Bar at bottom -->
  <rect x="160" y="1180" width="400" height="12" rx="6" fill="#1e293b"/>
  <rect x="160" y="1180" width="260" height="12" rx="6" fill="linear-gradient(to right, #f43f5e, #fbbf24)"/>
  <text x="360" y="1225" text-anchor="middle" fill="#94a3b8" font-family="'Cairo', sans-serif" font-weight="700" font-size="13">استعراض مشهد الإقصاء (5 ثوانٍ)</text>
</svg>
`;

// ==============================================================================
// 5. SCREENSHOT: DESKTOP WIDE VIEW (1280x720)
// ==============================================================================
const desktopSvg = `
<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="deskBg" cx="50%" cy="30%" r="85%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="60%" stop-color="#030712"/>
      <stop offset="100%" stop-color="#010306"/>
    </radialGradient>
    <linearGradient id="amberLaunchD" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>

  <rect width="1280" height="720" fill="url(#deskBg)"/>
  <circle cx="80" cy="120" r="1.5" fill="#38bdf8"/>
  <circle cx="1180" cy="90" r="2" fill="#818cf8"/>
  <circle cx="640" cy="650" r="1.5" fill="#fff"/>

  <!-- Top Navigation Bar -->
  <rect x="120" y="30" width="1040" height="64" rx="20" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="1.5"/>
  <text x="160" y="70" fill="#38bdf8" font-family="'Chakra Petch', sans-serif" font-weight="900" font-size="22" letter-spacing="2">SPY STATION 🛰️</text>
  <text x="640" y="68" text-anchor="middle" fill="#94a3b8" font-family="'Cairo', sans-serif" font-weight="700" font-size="14">المحطة الفضائية المدارية • الغرفة التكتيكية</text>
  <rect x="980" y="44" width="160" height="36" rx="12" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8"/>
  <text x="1060" y="68" text-anchor="middle" fill="#38bdf8" font-family="'Cairo', sans-serif" font-weight="800" font-size="13">🚀 2,450 XP</text>

  <!-- Main Content Dual Columns -->
  <!-- Left Column: Active Station Details -->
  <rect x="120" y="115" width="680" height="565" rx="26" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="1.5"/>
  <text x="150" y="160" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="900" font-size="22">فئات اللعبة التكتيكية المتنوعة</text>
  
  <!-- Categories 4x2 Grid -->
  <rect x="150" y="185" width="140" height="90" rx="16" fill="#020617" stroke="#334155"/>
  <text x="220" y="225" text-anchor="middle" font-size="26">⚽</text>
  <text x="220" y="255" text-anchor="middle" fill="#fff" font-family="'Cairo', sans-serif" font-weight="800" font-size="13">كرة القدم</text>

  <rect x="310" y="185" width="140" height="90" rx="16" fill="#020617" stroke="#334155"/>
  <text x="380" y="225" text-anchor="middle" font-size="26">🍕</text>
  <text x="380" y="255" text-anchor="middle" fill="#fff" font-family="'Cairo', sans-serif" font-weight="800" font-size="13">أكلات</text>

  <rect x="470" y="185" width="140" height="90" rx="16" fill="#020617" stroke="#334155"/>
  <text x="540" y="225" text-anchor="middle" font-size="26">🎬</text>
  <text x="540" y="255" text-anchor="middle" fill="#fff" font-family="'Cairo', sans-serif" font-weight="800" font-size="13">أفلام</text>

  <rect x="630" y="185" width="140" height="90" rx="16" fill="#020617" stroke="#334155"/>
  <text x="700" y="225" text-anchor="middle" font-size="26">🌍</text>
  <text x="700" y="255" text-anchor="middle" fill="#fff" font-family="'Cairo', sans-serif" font-weight="800" font-size="13">أماكن</text>

  <!-- Row 2 -->
  <rect x="150" y="290" width="140" height="90" rx="16" fill="#020617" stroke="#334155"/>
  <text x="220" y="330" text-anchor="middle" font-size="26">🎮</text>
  <text x="220" y="360" text-anchor="middle" fill="#fff" font-family="'Cairo', sans-serif" font-weight="800" font-size="13">ألعاب</text>

  <rect x="310" y="290" width="140" height="90" rx="16" fill="#020617" stroke="#334155"/>
  <text x="380" y="330" text-anchor="middle" font-size="26">🦁</text>
  <text x="380" y="360" text-anchor="middle" fill="#fff" font-family="'Cairo', sans-serif" font-weight="800" font-size="13">حيوانات</text>

  <rect x="470" y="290" width="140" height="90" rx="16" fill="#020617" stroke="#334155"/>
  <text x="540" y="330" text-anchor="middle" font-size="26">💼</text>
  <text x="540" y="360" text-anchor="middle" fill="#fff" font-family="'Cairo', sans-serif" font-weight="800" font-size="13">وظائف</text>

  <rect x="630" y="290" width="140" height="90" rx="16" fill="rgba(88, 28, 135, 0.4)" stroke="#a855f7"/>
  <text x="700" y="330" text-anchor="middle" font-size="26">🎲</text>
  <text x="700" y="360" text-anchor="middle" fill="#d8b4fe" font-family="'Cairo', sans-serif" font-weight="800" font-size="13">عشوائي</text>

  <!-- ⚡ Quick Launch Button -->
  <rect x="150" y="405" width="620" height="60" rx="18" fill="url(#amberLaunchD)"/>
  <text x="460" y="443" text-anchor="middle" fill="#020617" font-family="'Cairo', sans-serif" font-weight="900" font-size="20">⚡ انطلاق (لعب سريع أونلاين)</text>

  <!-- Join Code -->
  <rect x="150" y="485" width="460" height="54" rx="16" fill="#020617" stroke="#38bdf8"/>
  <text x="380" y="520" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-weight="900" font-size="18">كود الغرفة: SPY-702</text>
  <rect x="630" y="485" width="140" height="54" rx="16" fill="#38bdf8"/>
  <text x="700" y="520" text-anchor="middle" fill="#020617" font-family="'Cairo', sans-serif" font-weight="900" font-size="16">انضمام 🛰️</text>

  <!-- Right Column: Live Crew Comms & Radar -->
  <rect x="825" y="115" width="335" height="565" rx="26" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="1.5"/>
  <text x="855" y="160" fill="#f8fafc" font-family="'Cairo', sans-serif" font-weight="900" font-size="18">طاقم المحطة والمكالمات 🎙️</text>

  <!-- Crew 1 -->
  <rect x="855" y="185" width="275" height="64" rx="16" fill="#020617" stroke="#38bdf8"/>
  <text x="875" y="225" font-size="24">👨‍🚀</text>
  <text x="915" y="215" fill="#fff" font-family="'Cairo', sans-serif" font-weight="800" font-size="14">حمزة (القائد)</text>
  <text x="915" y="235" fill="#38bdf8" font-family="'Cairo', sans-serif" font-weight="700" font-size="12">🎙️ مايك نشط</text>

  <!-- Crew 2 -->
  <rect x="855" y="260" width="275" height="64" rx="16" fill="#020617" stroke="#334155"/>
  <text x="875" y="300" font-size="24">🤖</text>
  <text x="915" y="290" fill="#cbd5e1" font-family="'Cairo', sans-serif" font-weight="800" font-size="14">فارس 🤖</text>
  <text x="915" y="310" fill="#94a3b8" font-family="'Cairo', sans-serif" font-weight="700" font-size="12">آخر تلميح: أسطورة</text>

  <!-- Crew 3 -->
  <rect x="855" y="335" width="275" height="64" rx="16" fill="#020617" stroke="#334155"/>
  <text x="875" y="375" font-size="24">👩‍🚀</text>
  <text x="915" y="365" fill="#cbd5e1" font-family="'Cairo', sans-serif" font-weight="800" font-size="14">مريم</text>
  <text x="915" y="385" fill="#94a3b8" font-family="'Cairo', sans-serif" font-weight="700" font-size="12">آخر تلميح: مراوغ</text>

  <!-- Language Badge -->
  <rect x="855" y="420" width="275" height="50" rx="14" fill="rgba(56, 189, 248, 0.1)" stroke="#38bdf8"/>
  <text x="992" y="452" text-anchor="middle" fill="#38bdf8" font-family="'Cairo', sans-serif" font-weight="800" font-size="13">🌐 22 لغة عالمية مدعومة</text>
</svg>
`;

async function run() {
  console.log('Rendering 5 authentic game screenshots with sharp...');

  // 1. Home Mobile
  await sharp(Buffer.from(homeMobileSvg))
    .png()
    .toFile(path.join(publicDir, 'screenshot-home.png'));

  // Also replace legacy screenshot-mobile.png with the new authentic home
  await sharp(Buffer.from(homeMobileSvg))
    .png()
    .toFile(path.join(publicDir, 'screenshot-mobile.png'));

  // 2. Active Gameplay Mobile
  await sharp(Buffer.from(gameMobileSvg))
    .png()
    .toFile(path.join(publicDir, 'screenshot-gameplay.png'));

  // 3. Voting & Interrogation Mobile
  await sharp(Buffer.from(votingMobileSvg))
    .png()
    .toFile(path.join(publicDir, 'screenshot-voting.png'));

  // 4. Cinematic Laser Ejection Mobile
  await sharp(Buffer.from(ejectionMobileSvg))
    .png()
    .toFile(path.join(publicDir, 'screenshot-ejection.png'));

  // 5. Desktop Wide View
  await sharp(Buffer.from(desktopSvg))
    .png()
    .toFile(path.join(publicDir, 'screenshot-desktop.png'));

  console.log('Generated all 5 high-fidelity game screenshots in public/ successfully!');
}

run().catch(console.error);
