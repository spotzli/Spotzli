// Kalender im iCal-Format (ICS) lesen und Termine für einen Zeitraum ausrechnen
const pad = (n) => String(n).padStart(2, '0');
const isoD = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hmOf = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());
const unesc = (s) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

function tzOffset(ts, tz) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ts / 1000) * 1000;
}
function zonedToTs(y, mo, d, h, mi, s, tz) {
  const g = Date.UTC(y, mo - 1, d, h, mi, s);
  try { let t = g - tzOffset(g, tz); t = g - tzOffset(t, tz); return t; }
  catch (e) { return new Date(y, mo - 1, d, h, mi, s).getTime(); } // unbekannte Zeitzone: als Ortszeit
}
// Windows-Zeitzonennamen (Outlook) auf IANA abbilden, die häufigsten
const WINTZ = { 'W. Europe Standard Time': 'Europe/Berlin', 'Central Europe Standard Time': 'Europe/Budapest', 'Romance Standard Time': 'Europe/Paris', 'GMT Standard Time': 'Europe/London', 'UTC': 'UTC', 'Central European Standard Time': 'Europe/Warsaw' };

function parseDT(val, params) {
  const v = val.trim();
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(v)) {
    return { allday: true, date: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` };
  }
  const m = v.match(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)?(Z)?$/);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0)];
  let ts;
  if (m[7]) ts = Date.UTC(y, mo - 1, d, h, mi, s);
  else if (params.TZID) { const tz = params.TZID.replace(/^"|"$/g, ''); ts = zonedToTs(y, mo, d, h, mi, s, WINTZ[tz] || tz); }
  else ts = new Date(y, mo - 1, d, h, mi, s).getTime();
  return { allday: false, ts };
}
function parseDuration(v) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v || '');
  if (!m) return 0;
  return ((+(m[2] || 0)) * 7 * 1440 + (+(m[3] || 0)) * 1440 + (+(m[4] || 0)) * 60 + (+(m[5] || 0))) * 60000;
}

export function parseICS(text) {
  const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const out = []; let cur = null, depth = 0;
  for (const l of lines) {
    if (l === 'BEGIN:VEVENT') { cur = { ex: [] }; depth = 0; continue; }
    if (l === 'END:VEVENT') { if (cur && cur.start) out.push(cur); cur = null; continue; }
    if (!cur) continue;
    if (l.startsWith('BEGIN:')) { depth++; continue; }
    if (l.startsWith('END:')) { depth--; continue; }
    if (depth > 0) continue; // VALARM usw. überspringen
    const i = l.indexOf(':'); if (i < 0) continue;
    const head = l.slice(0, i), val = l.slice(i + 1);
    const [name, ...ps] = head.split(';');
    const params = {};
    ps.forEach((p) => { const j = p.indexOf('='); if (j > 0) params[p.slice(0, j).toUpperCase()] = p.slice(j + 1); });
    switch (name.toUpperCase()) {
      case 'SUMMARY': cur.title = unesc(val); break;
      case 'DTSTART': cur.start = parseDT(val, params); break;
      case 'DTEND': cur.end = parseDT(val, params); break;
      case 'DURATION': cur.dur = parseDuration(val); break;
      case 'RRULE': cur.rrule = Object.fromEntries(val.split(';').map((x) => x.split('='))); break;
      case 'EXDATE': val.split(',').forEach((v) => { const d = parseDT(v, params); if (d) cur.ex.push(d); }); break;
      case 'UID': cur.uid = val; break;
      case 'RECURRENCE-ID': cur.recid = parseDT(val, params); break;
      case 'LOCATION': cur.loc = unesc(val); break;
      case 'STATUS': cur.status = val.toUpperCase(); break;
    }
  }
  return out.filter((e) => e.start && e.status !== 'CANCELLED');
}

const WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const keyOf = (dt) => dt.allday ? dt.date : String(dt.ts);
const startDate = (s) => s.allday ? new Date(+s.date.slice(0, 4), +s.date.slice(5, 7) - 1, +s.date.slice(8, 10)) : new Date(s.ts);

// Alle Vorkommen im Zeitraum [from, to] (ISO-Daten) als einfache Termine
export function expandICS(vevents, from, to, prefix) {
  const overrides = new Set(vevents.filter((e) => e.recid && e.uid).map((e) => e.uid + '|' + keyOf(e.recid)));
  const fromD = new Date(from + 'T00:00:00'), toD = new Date(to + 'T23:59:59');
  const res = [];
  for (const e of vevents) {
    const s0 = startDate(e.start);
    let durMs;
    if (e.end) durMs = startDate(e.end) - s0;
    else if (e.dur) durMs = e.dur;
    else durMs = e.start.allday ? 864e5 : 0;
    if (durMs < 0) durMs = 0;
    const exs = new Set(e.ex.map(keyOf));
    const occ = [];
    const push = (d) => {
      const k = e.start.allday ? isoD(d) : String(d.getTime());
      if (exs.has(k)) return;
      if (!e.recid && e.uid && overrides.has(e.uid + '|' + k)) return;
      occ.push(new Date(d));
    };
    const r = e.rrule;
    if (!r || e.recid) push(s0);
    else {
      const freq = r.FREQ, iv = Math.max(1, +(r.INTERVAL || 1));
      const count = r.COUNT ? +r.COUNT : Infinity;
      let until = Infinity;
      if (r.UNTIL) { const u = parseDT(r.UNTIL, {}); if (u) until = u.allday ? new Date(u.date + 'T23:59:59').getTime() : u.ts; }
      const byday = (r.BYDAY || '').split(',').filter(Boolean).map((x) => { const m = /^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(x); return m ? { n: m[1] ? +m[1] : 0, wd: WD[m[2]] } : null; }).filter(Boolean);
      const bymd = r.BYMONTHDAY ? r.BYMONTHDAY.split(',').map(Number) : null;
      let n = 0, guard = 0;
      const emit = (d) => { if (d < s0 || d.getTime() > until || n >= count) return false; n++; if (d <= toD) push(d); return true; };
      const atTime = (y, mo, day) => new Date(y, mo, day, s0.getHours(), s0.getMinutes(), s0.getSeconds());
      if (freq === 'DAILY') {
        for (let d = new Date(s0); d.getTime() <= until && d <= toD && n < count && guard++ < 5000; d.setDate(d.getDate() + iv)) emit(new Date(d));
      } else if (freq === 'WEEKLY') {
        const days = byday.length ? byday.map((b) => b.wd) : [s0.getDay()];
        const wkStart = new Date(s0); wkStart.setDate(wkStart.getDate() - ((wkStart.getDay() + 6) % 7));
        for (let w = new Date(wkStart); w.getTime() <= until && w <= toD && n < count && guard++ < 3000; w.setDate(w.getDate() + 7 * iv)) {
          for (const wd of [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))) {
            const d = atTime(w.getFullYear(), w.getMonth(), w.getDate() + ((wd + 6) % 7));
            emit(d);
          }
        }
      } else if (freq === 'MONTHLY') {
        for (let k = 0; n < count && guard++ < 1200; k += iv) {
          const base = new Date(s0.getFullYear(), s0.getMonth() + k, 1);
          if (base > toD || base.getTime() > until) break;
          const y = base.getFullYear(), mo = base.getMonth(), dim = new Date(y, mo + 1, 0).getDate();
          let ds = [];
          if (byday.length) {
            for (const b of byday) {
              const all = []; for (let day = 1; day <= dim; day++) if (new Date(y, mo, day).getDay() === b.wd) all.push(day);
              if (b.n > 0 && all[b.n - 1]) ds.push(all[b.n - 1]); else if (b.n < 0 && all[all.length + b.n]) ds.push(all[all.length + b.n]); else if (!b.n) ds.push(...all);
            }
          } else if (bymd) ds = bymd.map((x) => (x < 0 ? dim + 1 + x : x)).filter((x) => x >= 1 && x <= dim);
          else if (s0.getDate() <= dim) ds = [s0.getDate()];
          for (const day of ds.sort((a, b) => a - b)) emit(atTime(y, mo, day));
        }
      } else if (freq === 'YEARLY') {
        for (let k = 0; n < count && guard++ < 300; k += iv) {
          const y = s0.getFullYear() + k;
          const d = atTime(y, s0.getMonth(), s0.getDate());
          if (d > toD || d.getTime() > until) break;
          if (d.getMonth() === s0.getMonth()) emit(d);
        }
      } else push(s0);
    }
    for (const d of occ) {
      const endD = new Date(d.getTime() + durMs);
      if (endD < fromD && d < fromD) continue;
      if (d > toD) continue;
      const date = isoD(d);
      let endDate, time = null, end = null;
      if (e.start.allday) { const last = new Date(endD); last.setDate(last.getDate() - 1); endDate = durMs > 864e5 ? isoD(last) : null; }
      else { time = hmOf(d); end = hmOf(endD); const ed = isoD(endD); endDate = ed > date && !(end === '00:00' && isoD(new Date(endD - 1)) === date) ? ed : null; if (end === '00:00' && !endDate) end = '23:59'; }
      res.push({ id: `${prefix}:${e.uid || res.length}:${date}${time ? 'T' + time : ''}`, title: e.title || '(ohne Titel)', date, endDate, time, end, allday: !!e.start.allday, repeat: 'none', rems: [], loc: e.loc || '', ext: true });
    }
  }
  return res;
}

// Für den einmaligen Import: Termine in Spotzi-Termine umwandeln (einfache Wiederholungen bleiben erhalten)
export function toSpotziEvents(vevents, fromDate) {
  const out = [];
  for (const e of vevents) {
    if (e.recid) continue;
    const s0 = startDate(e.start);
    const r = e.rrule;
    let repeat = 'none';
    if (r) {
      const iv = +(r.INTERVAL || 1), simple = !r.BYDAY || r.FREQ === 'WEEKLY' && r.BYDAY.split(',').length === 1;
      if (simple && r.FREQ === 'DAILY' && iv === 1) repeat = 'daily';
      else if (simple && r.FREQ === 'WEEKLY' && iv === 1) repeat = 'weekly';
      else if (simple && r.FREQ === 'WEEKLY' && iv === 2) repeat = 'biweekly';
      else if (simple && r.FREQ === 'MONTHLY' && iv === 1 && !r.BYDAY) repeat = 'monthly';
      else if (r.FREQ === 'YEARLY' && iv === 1) repeat = 'yearly';
    }
    if (repeat === 'none' && isoD(s0) < fromDate) continue;
    let durMs = e.end ? startDate(e.end) - s0 : e.dur || (e.start.allday ? 864e5 : 3600000);
    const endD = new Date(s0.getTime() + Math.max(0, durMs));
    const date = isoD(s0);
    let endDate = null, time = null, end = null;
    if (e.start.allday) { const last = new Date(endD); last.setDate(last.getDate() - 1); if (durMs > 864e5) endDate = isoD(last); }
    else { time = hmOf(s0); end = hmOf(endD); if (isoD(endD) > date && hmOf(endD) !== '00:00') endDate = isoD(endD); if (end === '00:00') end = '23:59'; }
    out.push({ title: e.title || '(ohne Titel)', date, endDate, time, end, allday: !!e.start.allday, repeat, note: e.loc || '' });
  }
  return out;
}
