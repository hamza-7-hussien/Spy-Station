const fs = require('fs');

const transText = fs.readFileSync('src/translations.ts', 'utf8');

const enLines = transText.split('\n');
let inEn = false;
const dict = {};
for (const line of enLines) {
  if (line.includes('const enDict = {')) inEn = true;
  else if (inEn && line.startsWith('};')) inEn = false;
  else if (inEn) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('//') && trimmed.includes(':')) {
      const idx = trimmed.indexOf(':');
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if (val.endsWith(',')) val = val.substring(0, val.length - 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      dict[key] = val;
    }
  }
}
console.log('Found', Object.keys(dict).length, 'keys in enDict');
fs.writeFileSync('scripts/enDict.json', JSON.stringify(dict, null, 2));
console.log('Saved to scripts/enDict.json');
