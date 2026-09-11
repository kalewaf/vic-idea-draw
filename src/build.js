const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const d = JSON.parse(fs.readFileSync(path.join(root, 'data/ideas.json'), 'utf8'));

const officialName = new Map();
for (const f of ['data/ref/nasdaqlisted.txt', 'data/ref/otherlisted.txt']) {
  const lines = fs.readFileSync(path.join(root, f), 'utf8').split('\n');
  for (const line of lines.slice(1)) {
    const cols = line.split('|');
    const sym = cols[0] ? cols[0].trim().toUpperCase() : '';
    if (sym) officialName.set(sym, (cols[1] || '').trim());
  }
}

const STOP = new Set(['INC', 'INCORPORATED', 'CORP', 'CORPORATION', 'CO', 'COMPANY', 'LTD', 'LIMITED', 'LLC', 'LP', 'PLC', 'NV', 'SA', 'AG', 'ASA', 'AB', 'SE', 'HOLDINGS', 'HOLDING', 'GROUP', 'THE', 'COMMON', 'SHARES', 'SHARE', 'STOCK', 'CLASS', 'TRUST', 'FUND', 'GMBH', 'BV', 'OYJ', 'OY', 'KK', 'BHD', 'TBK', 'ORDINARY', 'DEPOSITARY', 'ADS', 'ADR', 'REPRESENTING', 'EACH', 'OF', 'AND', 'BENEFICIAL', 'INTEREST', 'NEW', 'COM', 'N', 'V', 'A', 'B', 'C', 'K', 'PARTNERS', 'PARTNERSHIP', 'REIT']);

function clean(name) { return (name || '').toUpperCase().replace(/['’]/g, ''); }
function tokens(name) {
  return clean(name).replace(/[^A-Z0-9]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !STOP.has(w));
}
function compact(name) { return tokens(name).join(''); }

const FOREIGN_SUFFIX = /\b(PLC|AG|ASA|AB|NV|SPA|SA|SE|OYJ|OY|GMBH|BV|KK|BHD|TBK)\.?\s*$/i;

function namesMatch(company, offName) {
  const a = new Set(tokens(company));
  const b = new Set(tokens(offName));
  for (const w of a) if (b.has(w)) return true;
  const ca = compact(company), cb = compact(offName);
  if (ca.length >= 3 && cb.includes(ca)) return true;
  if (cb.length >= 3 && ca.includes(cb)) return true;
  return false;
}

function classify(tRaw, company) {
  let t = (tRaw || '').trim();
  if (!t) return { ok: false };
  let usOverride = false;
  const usMatch = t.match(/^([A-Za-z.-]{1,8})\s+US$/i);
  if (usMatch) { t = usMatch[1]; usOverride = true; }

  let okFormat = false, tickerClean = null;
  if (!usOverride) {
    if (/:/.test(t) || /\s/.test(t)) { okFormat = false; }
    else if (/^[0-9]+$/.test(t)) { okFormat = false; }
    else if (t.includes('.')) {
      const parts = t.split('.');
      const last = parts[parts.length - 1];
      if (last.length === 0) { tickerClean = parts.slice(0, -1).join('.').toUpperCase(); okFormat = true; }
      else if (last.length === 1) { tickerClean = t.toUpperCase(); okFormat = true; }
    } else if (t.includes('-')) {
      const parts = t.split('-');
      const last = parts[parts.length - 1];
      if (last.length === 1) { tickerClean = t.toUpperCase(); okFormat = true; }
    } else if (/^[A-Za-z]{1,6}$/.test(t)) {
      tickerClean = t.toUpperCase(); okFormat = true;
    }
  } else {
    if (/^[A-Za-z]{1,6}(\.[A-Za-z])?$/.test(t)) { tickerClean = t.toUpperCase(); okFormat = true; }
  }
  if (!okFormat) return { ok: false };

  const baseSym = tickerClean.split('.')[0].split('-')[0];
  if (officialName.has(baseSym)) {
    const offName = officialName.get(baseSym);
    return namesMatch(company, offName) ? { ok: true, clean: tickerClean } : { ok: false };
  }
  if (FOREIGN_SUFFIX.test((company || '') + ' ')) return { ok: false };
  return { ok: true, clean: tickerClean };
}

const usIdeas = [];
for (const r of d) {
  const c = classify(r.ticker, r.company);
  if (c.ok) {
    usIdeas.push([r.keyid, r.slug, r.company, c.clean, r.date.slice(0, 10)]);
  }
}

console.log('total scraped:', d.length);
console.log('US-listed kept:', usIdeas.length);

fs.writeFileSync(path.join(root, 'data/ideas_us.json'), JSON.stringify(usIdeas));

const dates = usIdeas.map(r => r[4].slice(0, 4)).sort();
const minYear = dates[0], maxYear = dates[dates.length - 1];
const countStr = usIdeas.length.toLocaleString('en-US');
const stats = countStr + ' U.S.-listed ideas &middot; <b>' + minYear + '</b>&ndash;<b>' + maxYear + '</b>';

let shell = fs.readFileSync(path.join(__dirname, 'shell.html'), 'utf8');
shell = shell.replace('__VIC_DATA_PLACEHOLDER__', JSON.stringify(usIdeas));
shell = shell.replace('__VIC_STATS_PLACEHOLDER__', stats);

fs.writeFileSync(path.join(root, 'index.html'), shell);
const stat = fs.statSync(path.join(root, 'index.html'));
console.log('wrote', stat.size, 'bytes');
console.log('stats line:', stats);
