// Export the game's cases and pictures for tools/build_review.py.
// Writes review/data.json and review/pics/<picture>.jpg (needs Playwright and Pillow).
// Usage: node tools/export_review.js && python3 tools/build_review.py
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'review'), PICS = path.join(OUT, 'pics');

(async () => {
  fs.mkdirSync(PICS, { recursive: true });
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 1000 } });
  p.on('pageerror', e => console.error('page error:', e.message));
  await p.goto('file://' + path.join(ROOT, 'index.html')); await p.waitForTimeout(900);
  const data = await p.evaluate(() => {
    const pick = (o, ks) => Object.fromEntries(ks.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
    return {
      D: D.map(d => pick(d, ['n', 't', 's', 'sp', 'fake', 'a', 'x', 'cc', 'v', 'ecg', 'h', 'e', 'l', 'i', 'tx', 'w', 'dispo', 'proc', 'al', 'p', 'mim'])),
      MASK, READ_AT, DDX, DISPO_NAME, TIERS: TIERS.map(t => t.k),
      READS: Object.fromEntries(Object.entries(READS).map(([k, r]) => [k, pick(r, ['k', 'o', 'x', 'x2'])])),
      PROCS: Object.fromEntries(Object.entries(PROCS).map(([k, v]) => [k, v.n || k]))
    };
  });
  // Review highlights and notes live in review/meta.json so they survive a fresh export
  const metaFile = path.join(OUT, 'meta.json');
  if (fs.existsSync(metaFile)) Object.assign(data, JSON.parse(fs.readFileSync(metaFile, 'utf8')));
  fs.writeFileSync(path.join(OUT, 'data.json'), JSON.stringify(data));
  // Each picture is drawn by the game itself, at the width the player sees it
  for (const k of Object.keys(data.READS)) {
    await p.evaluate(k => {
      let h = document.getElementById('revpic');
      if (!h) { h = document.createElement('div'); h.id = 'revpic'; h.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#fff;padding:8px'; document.body.appendChild(h); }
      const kind = READS[k].k; h.style.width = kind === 'ecg' ? '1100px' : kind === 'abg' || kind === 'lab' ? '480px' : '456px';
      h.innerHTML = readImage(k); const z = h.querySelector('.rdzoom'); if (z) z.remove();
    }, k);
    await p.waitForTimeout(60);
    await (await p.$('#revpic')).screenshot({ path: path.join(PICS, k + '.png') });
  }
  await b.close();
  // JPEG keeps the spreadsheet small enough to open on a phone
  execFileSync('python3', ['-c', `import glob,os
from PIL import Image
for f in glob.glob(${JSON.stringify(PICS)}+'/*.png'):
    Image.open(f).convert('RGB').save(f[:-4]+'.jpg',quality=86,optimize=True);os.remove(f)`]);
  console.log('Exported', data.D.length, 'cases and', Object.keys(data.READS).length, 'pictures');
})();
