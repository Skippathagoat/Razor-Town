const https = require('https'), fs = require('fs');
const UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'};
function get(url) { return new Promise((res, rej) => { https.get(url, {headers: UA}, r => { let d=''; r.on('data', c=>d+=c); r.on('end', ()=>res(d)); }).on('error', rej); }); }
async function dl(url, fp) {
  const buf = await new Promise((res, rej) => { https.get(url, {headers: UA}, r => { const c=[]; r.on('data', ch=>c.push(ch)); r.on('end', ()=>res(Buffer.concat(c))); }).on('error', rej); });
  fs.writeFileSync(fp, buf);
}
(async () => {
  const cssOut = [];
  const fams = ['Alfa+Slab+One', 'Special+Elite', 'Spectral:wght@400;600;700'];
  for (const fam of fams) {
    const css = await get('https://fonts.googleapis.com/css2?family=' + fam + '&display=swap');
    const parts = css.split(/\/\*\s*([a-z-]+)\s*\*\//);
    for (let i = 1; i < parts.length; i += 2) {
      const subset = parts[i], block = parts[i + 1];
      if (subset !== 'latin') continue;
      const murl = block.match(/url\((https:[^)]+\.woff2)\)/);
      const f2 = (block.match(/font-family:\s*'([^']+)'\s*;/) || [])[1];
      const weight = (block.match(/font-weight:\s*(\d+)/) || [])[1] || '400';
      const style = (block.match(/font-style:\s*(\w+)/) || [])[1] || 'normal';
      const fn = f2.replace(/\s+/g, '').replace(/%20/g, '') + '-' + weight + (style !== 'normal' ? '-' + style : '') + '.woff2';
      if (!fs.existsSync('public/fonts/' + fn)) { await dl(murl[1], 'public/fonts/' + fn); console.log('saved', fn); }
      cssOut.push('@font-face{font-family:"' + f2 + '";font-style:' + style + ';font-weight:' + weight + ';font-display:swap;src:url("../fonts/' + fn + '") format("woff2");}');
    }
  }
  fs.writeFileSync('public/css/fonts.css', cssOut.join('\n'));
  console.log('fonts.css written,', cssOut.length, 'faces');
})().catch(e => { console.error(e); process.exit(1); });
