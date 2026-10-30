const { execSync } = require('child_process');
const fs = require('fs');

const crops = [
  // Sheet 1: City / Classic Step-Through & Commuter (public/catalog/katalog-sepeda-city.jpeg)
  { id: 'sky', file: 'public/catalog/katalog-sepeda-city.jpeg', w: 620, h: 405, x: 20, y: 345 },
  { id: 'noah', file: 'public/catalog/katalog-sepeda-city.jpeg', w: 620, h: 405, x: 640, y: 345 },
  { id: 'arlo', file: 'public/catalog/katalog-sepeda-city.jpeg', w: 620, h: 405, x: 20, y: 770 },
  { id: 'hana', file: 'public/catalog/katalog-sepeda-city.jpeg', w: 620, h: 405, x: 640, y: 770 },
  { id: 'rose', file: 'public/catalog/katalog-sepeda-city.jpeg', w: 620, h: 405, x: 20, y: 1190 },
  { id: 'blue', file: 'public/catalog/katalog-sepeda-city.jpeg', w: 620, h: 405, x: 640, y: 1190 },

  // Sheet 2: Classic Commuter / Federal / Hybrid (public/catalog/katalog-sepeda-vintage.jpeg)
  { id: 'baskara', file: 'public/catalog/katalog-sepeda-vintage.jpeg', w: 620, h: 375, x: 20, y: 60 },
  { id: 'candy', file: 'public/catalog/katalog-sepeda-vintage.jpeg', w: 620, h: 375, x: 640, y: 60 },
  { id: 'budi', file: 'public/catalog/katalog-sepeda-vintage.jpeg', w: 620, h: 385, x: 20, y: 445 },
  { id: 'zilpher', file: 'public/catalog/katalog-sepeda-vintage.jpeg', w: 620, h: 385, x: 640, y: 445 },
  { id: 'ocean', file: 'public/catalog/katalog-sepeda-vintage.jpeg', w: 620, h: 385, x: 20, y: 840 },
  { id: 'roxo', file: 'public/catalog/katalog-sepeda-vintage.jpeg', w: 620, h: 385, x: 640, y: 840 },
  { id: 'leoni', file: 'public/catalog/katalog-sepeda-vintage.jpeg', w: 620, h: 360, x: 330, y: 1240 },

  // Sheet 3: MTB Series (public/catalog/katalog-sepeda-mtb.jpeg)
  { id: 'mazara_black', file: 'public/catalog/katalog-sepeda-mtb.jpeg', w: 620, h: 420, x: 20, y: 275 },
  { id: 'mazara_neon', file: 'public/catalog/katalog-sepeda-mtb.jpeg', w: 620, h: 420, x: 640, y: 275 },
  { id: 'phoniex_beige', file: 'public/catalog/katalog-sepeda-mtb.jpeg', w: 620, h: 420, x: 20, y: 705 },
  { id: 'phoniex_biru', file: 'public/catalog/katalog-sepeda-mtb.jpeg', w: 620, h: 420, x: 640, y: 705 },
  { id: 'foster', file: 'public/catalog/katalog-sepeda-mtb.jpeg', w: 620, h: 430, x: 20, y: 1145 },
  { id: 'fastron', file: 'public/catalog/katalog-sepeda-mtb.jpeg', w: 620, h: 430, x: 640, y: 1145 }
];

crops.forEach(c => {
  const outPath = `public/bikes/${c.id}.jpg`;
  const cmd = `convert "${c.file}" -crop ${c.w}x${c.h}+${c.x}+${c.y} +repage -quality 92 "${outPath}"`;
  execSync(cmd);
  console.log(`Cropped ${c.id} -> ${outPath}`);
});

console.log('All 19 bike images cropped successfully!');
