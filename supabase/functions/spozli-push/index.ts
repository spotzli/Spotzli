// Spozli Push-Funktion (Supabase Edge Function "spozli-push")
// - action "tick": jede Minute per Cron; verschickt fällige Erinnerungen, Morgen-Übersicht, Habits, Wasser
// - action "item": neuer gemeinsamer Termin, Push an die andere Person (per Datenbank-Trigger)
// - action "vapid": öffentlicher Schlüssel für die App
// - action "test": Test-Nachricht an ein Gerät
// Verschlüsselung (RFC 8291) und VAPID (RFC 8292) mit Web Crypto, ohne Zusatzbibliotheken.
import postgres from 'npm:postgres@3.4.5';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 3 });
const APP_URL = 'https://spotzli.github.io/Spotzli/';
const LOOK = 10 * 60000; // fällige Nachrichten der letzten 10 Minuten nachholen
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-spozli-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ---------- Base64url ----------
const enc = new TextEncoder();
function b64u(buf: Uint8Array): string {
  let s = '';
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64u(s: string): Uint8Array {
  const p = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
const concat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };

// ---------- Konfiguration / VAPID ----------
async function config(): Promise<Record<string, string>> {
  const rows = await sql`select key, value from public.push_config`;
  return Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
}
let vapidCache: { pub: string; key: CryptoKey } | null = null;
async function vapid() {
  if (vapidCache) return vapidCache;
  let c = await config();
  if (!c.vapid_jwk || !c.vapid_pub) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
    const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
    const pub = b64u(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)));
    await sql`insert into public.push_config(key, value) values ('vapid_jwk', ${JSON.stringify(jwk)}), ('vapid_pub', ${pub}) on conflict (key) do nothing`;
    c = await config();
  }
  const key = await crypto.subtle.importKey('jwk', JSON.parse(c.vapid_jwk), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  vapidCache = { pub: c.vapid_pub, key };
  return vapidCache;
}
const jwtCache = new Map<string, { t: string; exp: number }>();
async function vapidJwt(aud: string) {
  const now = Math.floor(Date.now() / 1000);
  const c = jwtCache.get(aud);
  if (c && c.exp - now > 3600) return c.t;
  const { key } = await vapid();
  const exp = now + 12 * 3600;
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp, sub: APP_URL })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${body}`)));
  const t = `${head}.${body}.${b64u(sig)}`;
  jwtCache.set(aud, { t, exp });
  return t;
}

// ---------- Verschlüsselung aes128gcm ----------
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}
export async function encryptPayload(p256dh: string, authSecret: string, text: string) {
  const uaPub = unb64u(p256dh), auth = unb64u(authSecret);
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(auth, secret, concat(enc.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(enc.encode(text), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return concat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}

type Sub = { endpoint: string; p256dh: string; auth: string; user_id: string };
async function sendPush(sub: Sub, msg: Record<string, unknown>, ttl = 6 * 3600) {
  const body = await encryptPayload(sub.p256dh, sub.auth, JSON.stringify(msg));
  const { pub } = await vapid();
  const jwt = await vapidJwt(new URL(sub.endpoint).origin);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(ttl), Urgency: 'high', Authorization: `vapid t=${jwt}, k=${pub}` },
    body,
  });
  if (res.status === 404 || res.status === 410) await sql`delete from public.push_subs where endpoint = ${sub.endpoint}`;
  else if (res.status >= 400) console.warn('push', res.status, await res.text().catch(() => ''));
  return res.status;
}

// ---------- Zeit ----------
const WDN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function partsIn(ts: number, tz: string) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' });
  const p: Record<string, string> = Object.fromEntries(f.formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}`, wd: WDN.indexOf(p.weekday) };
}
function tzOffset(ts: number, tz: string) {
  const p = partsIn(ts, tz);
  const [y, m, d] = p.date.split('-').map(Number), [h, mi] = p.hm.split(':').map(Number);
  return Date.UTC(y, m - 1, d, h, mi) - Math.floor(ts / 60000) * 60000;
}
function zoned(date: string, hm: string, tz: string) {
  const [y, m, d] = date.split('-').map(Number), [h, mi] = (hm || '09:00').split(':').map(Number);
  const g = Date.UTC(y, m - 1, d, h, mi);
  let t = g - tzOffset(g, tz);
  t = g - tzOffset(t, tz);
  return t;
}
const dayNum = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const addDays = (s: string, n: number) => new Date((dayNum(s) + n) * 864e5).toISOString().slice(0, 10);
const wdOf = (s: string) => new Date(dayNum(s) * 864e5).getUTCDay();
const dateLabel = (s: string) => new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' }).format(new Date(dayNum(s) * 864e5));
const toMin = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
const fromMin = (n: number) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');

function startsOn(ev: any, d: string) {
  const a = dayNum(ev.date), b = dayNum(d);
  if (b < a) return false;
  const rep = ev.repeat || 'none';
  if (rep === 'none') return a === b;
  if (rep === 'daily') return true;
  if (rep === 'weekly') return (b - a) % 7 === 0;
  if (rep === 'biweekly') return (b - a) % 14 === 0;
  const [, xm, xd] = ev.date.split('-').map(Number), [, ym, yd] = d.split('-').map(Number);
  if (rep === 'monthly') return xd === yd;
  if (rep === 'yearly') return xd === yd && xm === ym;
  return false;
}
const occursOn = (ev: any, d: string) => {
  const span = ev.endDate && ev.endDate > ev.date ? dayNum(ev.endDate) - dayNum(ev.date) : 0;
  for (let k = 0; k <= span; k++) if (startsOn(ev, addDays(d, -k))) return true;
  return false;
};
const CATL: Record<string, string> = { gemeinsam: 'Beide', filmen: 'Filmen', sevi_privat: 'Privat', sie_privat: 'Privat' };
function evTitle(ev: any, d: string) {
  const y = Number(d.slice(0, 4));
  if (ev.kind === 'bday') return `🎂 ${ev.title}${ev.year ? ' wird ' + (y - ev.year) : ' hat Geburtstag'}`;
  if (ev.kind === 'anniv') return `💍 ${ev.title}${ev.year ? ' · ' + (y - ev.year) + '. Jahrestag' : ''}`;
  return (ev.cat === 'filmen' ? '🎬 ' : ev.cat === 'gemeinsam' ? '♥ ' : '') + ev.title;
}
function inText(m: number) {
  if (m === 0) return 'Jetzt';
  if (m < 60) return `In ${m} Min`;
  if (m < 1440) return `In ${Math.round(m / 60)} Std`;
  if (m < 10080) { const d = Math.round(m / 1440); return d === 1 ? 'Morgen' : `In ${d} Tagen`; }
  const w = Math.round(m / 10080); return w === 1 ? 'In 1 Woche' : `In ${w} Wochen`;
}

// ---------- Sprüche ----------
let sayings: any[] | null = null;
async function saying(today: string) {
  try {
    if (!sayings) sayings = await (await fetch(APP_URL + 'sayings.json')).json();
    const doy = dayNum(today) - dayNum(`${Number(today.slice(0, 4)) - 1}-12-31`);
    return sayings![(doy - 1) % sayings!.length]?.[0] || '';
  } catch (e) { return ''; }
}
const WATER_MSG = ['Zeit für ein Glas Wasser 💧', 'Spozli hat Durst. Du vielleicht auch? 💧', 'Ein Schluck Wasser, ein tiefer Atemzug. 💧', 'Kleine Trinkpause gefällig? 💧', 'Dein Körper sagt Danke für ein Glas Wasser 💧'];

// ---------- Was ist jetzt fällig? ----------
async function tick() {
  const now = Date.now();
  const [members, subs, items] = await Promise.all([
    sql`select household_id, user_id, slot, name from public.members`,
    sql`select endpoint, p256dh, auth, user_id from public.push_subs`,
    sql`select id, household_id, owner_id, kind, visibility, data from public.items where not deleted and kind in ('event','todo','chore','habit','prefs','shop','countdown')`,
  ]);
  const subsBy: Record<string, Sub[]> = {};
  for (const s of subs as any[]) (subsBy[s.user_id] ||= []).push(s);
  const prefsBy: Record<string, any> = {};
  for (const it of items as any[]) if (it.kind === 'prefs' && it.id === `${it.owner_id}:prefs`) prefsBy[it.owner_id] = it.data || {};
  let sent = 0;
  for (const m of members as any[]) {
    const mySubs = subsBy[m.user_id];
    if (!mySubs?.length) continue;
    const pr = prefsBy[m.user_id] || {}, P = pr.prefs || {};
    if (pr.pushOn === false) continue;
    const tz = P.tz || 'Europe/Zurich';
    const F = P.features || {};
    const loc = partsIn(now, tz), today = loc.date;
    const hh = (items as any[]).filter((i) => i.household_id === m.household_id);
    const cand: { key: string; msg: any }[] = [];
    const add = (key: string, at: number, title: string, body: string, tag?: string) => {
      if (at > now - LOOK && at <= now) cand.push({ key: `${m.user_id}:${key}`, msg: { title, body, tag, url: APP_URL } });
    };
    const quiet = (at: number) => {
      if (P.quiet === false) return at;
      const p = partsIn(at, tz);
      if (p.hm >= '22:00') return zoned(addDays(p.date, 1), '07:00', tz);
      if (p.hm < '07:00') return zoned(p.date, '07:00', tz);
      return at;
    };
    // Termine, Geburtstage, Jahrestage
    for (const it of hh) {
      if (F.cal === false) break;
      if (it.kind !== 'event' || !(it.visibility === 'shared' || it.owner_id === m.user_id)) continue;
      const ev = it.data || {};
      if (!ev.date || (P.cats && P.cats[ev.cat] === false)) continue;
      const rems: number[] = (ev.rems || []).filter((x: any) => typeof x === 'number');
      if (!rems.length) continue;
      const days = Math.ceil(Math.max(...rems) / 1440) + 1;
      const minRem = Math.min(...rems);
      for (let i = -2; i <= days; i++) {
        const d = addDays(today, i);
        if (!startsOn(ev, d)) continue;
        const st = zoned(d, ev.allday || !ev.time ? '09:00' : ev.time, tz);
        const t = evTitle(ev, d);
        const when = (r: number) => `${inText(r)}${ev.allday || !ev.time ? (r >= 1440 ? ' · ' + dateLabel(d) : '') : ' · ' + (r >= 1440 ? dateLabel(d) + ', ' : '') + ev.time + ' Uhr'}${ev.cat ? ' · ' + (CATL[ev.cat] || '') : ''}`;
        for (const r of rems) add(`ev:${it.id}:${d}:${r}`, quiet(st - r * 60000), t, when(r), `ev-${it.id}`);
        const nag = Number(ev.nag) || 0;
        const extra = nag === 1 ? [10] : nag === 2 ? [10, 20] : nag === 99 ? [15, 30, 45, 60, 75, 90, 105, 120] : [];
        for (const x of extra) {
          const at = st - minRem * 60000 + x * 60000;
          if (nag === 99 && at > st) break;
          add(`ev:${it.id}:${d}:${minRem}:n${x}`, quiet(at), '🔔 ' + t, 'Nochmal zur Erinnerung · ' + (ev.allday || !ev.time ? dateLabel(d) : ev.time + ' Uhr'), `ev-${it.id}`);
        }
      }
    }
    // To-dos
    for (const it of hh) {
      if (F.todo === false) break;
      if (it.kind !== 'todo' || it.owner_id !== m.user_id) continue;
      const t = it.data || {};
      if (t.done) continue;
      if (t.remindAt) {
        const [d, hm] = String(t.remindAt).split('T');
        add(`td:${it.id}:${t.remindAt}`, quiet(zoned(d, hm, tz)), '✅ ' + t.title, t.due ? `Fällig ${dateLabel(t.due)}${t.time ? ', ' + t.time + ' Uhr' : ''}` : 'Spozli erinnert dich an dein To-do', `td-${it.id}`);
      } else if (typeof t.remind === 'number' && t.due) {
        add(`td:${it.id}:${t.due}:${t.remind}`, quiet(zoned(t.due, t.time || '09:00', tz) - t.remind * 60000), '✅ ' + t.title, t.remind === 0 ? 'Jetzt fällig' : `Fällig ${dateLabel(t.due)}${t.time ? ', ' + t.time + ' Uhr' : ''}`, `td-${it.id}`);
      }
    }
    // Haushalt
    for (const it of hh) {
      if (F.house === false) break;
      if (it.kind !== 'chore') continue;
      const c = it.data || {};
      if (!c.remind || !c.due) continue;
      const mine = c.assign === 'both' || (c.assign === 'alt' ? c.next === m.slot : c.assign === m.slot);
      if (!mine) continue;
      add(`ch:${it.id}:${c.due}`, quiet(zoned(c.due, c.rtime || '18:00', tz)), `${c.icon || '🧹'} ${c.title}`, c.assign === 'alt' ? 'Heute bist du dran' : 'Heute im Haushalt fällig', `ch-${it.id}`);
    }
    // Habits
    for (const it of hh) {
      if (F.habits === false) break;
      if (it.kind !== 'habit' || it.owner_id !== m.user_id) continue;
      const h = it.data || {};
      if (!h.remind || !(h.rdays || [0, 1, 2, 3, 4, 5, 6]).includes(loc.wd)) continue;
      const log: string[] = h.log || [];
      let body = 'Kleine Erinnerung von Spozli. Du schaffst das!';
      if (h.freq === 'weekly') {
        const ws = addDays(today, -((loc.wd + 6) % 7));
        const n = log.filter((d) => d >= ws && d <= addDays(ws, 6)).length;
        if (n >= (h.target || 1)) continue;
        body = `Diese Woche ${n} von ${h.target || 1}. Ein kleiner Schritt reicht!`;
      } else if (log.includes(today)) continue;
      add(`hb:${it.id}:${today}`, quiet(zoned(today, h.rtime || '19:00', tz)), `${h.icon || '⭐'} ${h.title}`, body, `hb-${it.id}`);
    }
    // Morgen-Übersicht
    if (P.morning !== false && !((loc.wd === 0 || loc.wd === 6) && P.mweekend === false)) {
      const at = zoned(today, P.mtime || '07:30', tz);
      if (at > now - LOOK && at <= now) {
        const lines: string[] = [];
        const evs = F.cal === false ? [] : hh.filter((it) => it.kind === 'event' && (it.visibility === 'shared' || it.owner_id === m.user_id) && it.data?.date && occursOn(it.data, today) && !(P.cats && P.cats[it.data.cat] === false))
          .map((it) => it.data).sort((a: any, b: any) => (a.allday ? '00' : a.time || '').localeCompare(b.allday ? '00' : b.time || ''));
        if (F.cal !== false) lines.push(evs.length ? evs.map((e: any) => `${e.allday || !e.time ? 'Ganztägig' : e.time}  ${evTitle(e, today)}`).join('\n') : 'Heute keine Termine.');
        const td = F.todo === false ? [] : hh.filter((it) => it.kind === 'todo' && it.owner_id === m.user_id && !it.data?.done && it.data?.due && it.data.due <= today).map((it) => it.data.title);
        if (td.length) lines.push('To-dos: ' + td.slice(0, 3).join(', ') + (td.length > 3 ? ' …' : ''));
        const hc = F.house === false ? [] : hh.filter((it) => it.kind === 'chore' && it.data?.due && it.data.due <= today && (it.data.assign === 'both' || (it.data.assign === 'alt' ? it.data.next === m.slot : it.data.assign === m.slot))).map((it) => it.data.title);
        if (hc.length) lines.push('Haushalt: ' + hc.join(', '));
        const hb = F.habits === false ? 0 : hh.filter((it) => it.kind === 'habit' && it.owner_id === m.user_id).length;
        if (hb) lines.push(`Habits: ${hb} für heute`);
        if (F.countdown !== false) {
          const cds = hh.filter((it) => it.kind === 'countdown' && (it.visibility === 'shared' || it.owner_id === m.user_id) && it.data?.date >= today)
            .map((it) => it.data).sort((a: any, b: any) => a.date.localeCompare(b.date)).slice(0, 2);
          for (const c of cds) { const n = dayNum(c.date) - dayNum(today); lines.push(n === 0 ? `${c.icon || '⏳'} Heute: ${c.title}!` : `${c.icon || '⏳'} Noch ${n} ${n === 1 ? 'Tag' : 'Tage'} bis ${c.title}`); }
        }
        if (P.mshop !== false && F.shop !== false) { const sh = hh.filter((it) => it.kind === 'shop'); if (sh.length) lines.push(`Einkauf: ${sh.length} Artikel`); }
        if (P.mquote !== false && P.lumo !== false) { const q = await saying(today); if (q) lines.push('Spozli: ' + q); }
        cand.push({ key: `${m.user_id}:mo:${today}`, msg: { title: `Guten Morgen, ${m.name}! Das steht heute an`, body: lines.join('\n'), tag: 'morning', url: APP_URL } });
      }
    }
    // Wasser
    const W = P.water;
    if (W && W.on) {
      const g = P.glasses && P.glasses.d === today ? P.glasses.n : 0;
      const goal = W.goal || 8;
      if (g < goal) {
        const step = Math.max(15, Number(W.every) || 120);
        for (let t = toMin(W.from || '09:00') + step; t <= toMin(W.to || '21:00'); t += step) {
          const hm = fromMin(t);
          add(`wa:${today}:${hm}`, zoned(today, hm, tz), WATER_MSG[Math.floor(t / step) % WATER_MSG.length], `${g} von ${goal} Gläsern heute`, 'water');
        }
      }
    }
    if (!cand.length) continue;
    const fresh = await sql`insert into public.push_log(key) select unnest(${cand.map((c) => c.key)}::text[]) on conflict do nothing returning key`;
    const ok = new Set(fresh.map((r: any) => r.key));
    for (const c of cand) {
      if (!ok.has(c.key)) continue;
      for (const s of mySubs) { try { await sendPush(s, c.msg); sent++; } catch (e) { console.warn('send', e); } }
    }
  }
  if (new Date(now).getUTCMinutes() % 30 === 0) await sql`delete from public.push_log where sent_at < now() - interval '4 days'`;
  return sent;
}

// Neuer gemeinsamer Termin: die andere Person bekommt eine Nachricht
async function newItem(id: string) {
  const [it] = await sql`select id, household_id, owner_id, kind, visibility, data, deleted from public.items where id = ${id}`;
  if (!it || it.deleted || it.kind !== 'event' || it.visibility !== 'shared') return 0;
  const ev = it.data || {};
  const members = await sql`select user_id, name from public.members where household_id = ${it.household_id}`;
  const owner = (members as any[]).find((m) => m.user_id === it.owner_id);
  let sent = 0;
  for (const m of members as any[]) {
    if (m.user_id === it.owner_id) continue;
    const [p] = await sql`select data from public.items where id = ${m.user_id + ':prefs'}`;
    const pr = p?.data || {};
    if (pr.pushOn === false || pr.prefs?.cats?.gemeinsam === false) continue;
    const fresh = await sql`insert into public.push_log(key) values (${`${m.user_id}:new:${id}`}) on conflict do nothing returning key`;
    if (!fresh.length) continue;
    const subs = await sql`select endpoint, p256dh, auth, user_id from public.push_subs where user_id = ${m.user_id}`;
    const what = ev.kind === 'bday' ? 'Neuer Geburtstag' : ev.kind === 'anniv' ? 'Neuer Jahrestag' : 'Neuer gemeinsamer Termin';
    const end = ev.endDate && ev.endDate > ev.date ? ' bis ' + dateLabel(ev.endDate) : '';
    const msg = { title: `${what} von ${owner?.name || 'deinem Schatz'}`, body: `${ev.title} · ${dateLabel(ev.date)}${end}${ev.allday || !ev.time ? '' : ', ' + ev.time + ' Uhr'}`, tag: `ev-${id}`, url: APP_URL };
    for (const s of subs as any[]) { try { await sendPush(s, msg); sent++; } catch (e) { console.warn('send', e); } }
  }
  return sent;
}

// ---------- Kalender: fremden Kalender abrufen (nur für angemeldete Nutzer) ----------
async function userFromReq(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const apikey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u?.id ? u : null;
}
async function fetchIcs(raw: string) {
  let url = String(raw || '').trim().replace(/^webcals?:\/\//i, 'https://');
  if (!/^https?:\/\//i.test(url)) throw new Error('Ungültiger Link');
  const host = new URL(url).hostname;
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/.test(host) || host.endsWith('.internal')) throw new Error('Ungültiger Link');
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'Spozli-Kalender/1.0', Accept: 'text/calendar, */*' } });
    if (!r.ok) throw new Error(`Kalender antwortet mit ${r.status}`);
    const text = await r.text();
    if (text.length > 5_000_000) throw new Error('Kalender ist zu groß');
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Kein Kalender unter diesem Link');
    return text;
  } finally { clearTimeout(t); }
}

// ---------- Spozli als Kalender-Abo (für Apple Kalender) ----------
const icsEsc = (s: string) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
const icsDate = (d: string) => d.replace(/-/g, '');
const icsDT = (d: string, hm: string) => icsDate(d) + 'T' + hm.replace(':', '') + '00';
function fold(line: string) {
  const out: string[] = [];
  let cur = '';
  for (const ch of line) { if (new TextEncoder().encode(cur + ch).length > 73) { out.push(cur); cur = ' ' + ch; } else cur += ch; }
  out.push(cur);
  return out.join('\r\n');
}
const RRULE: Record<string, string> = { daily: 'FREQ=DAILY', weekly: 'FREQ=WEEKLY', biweekly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' };
async function feed(token: string) {
  if (!token || token.length < 16) return null;
  const [pr] = await sql`select owner_id, household_id from public.items where kind = 'prefs' and not deleted and data->'prefs'->>'feedToken' = ${token} limit 1`;
  if (!pr) return null;
  const [m] = await sql`select name from public.members where user_id = ${pr.owner_id} and household_id = ${pr.household_id}`;
  const rows = await sql`select id, data, updated_at from public.items where household_id = ${pr.household_id} and kind = 'event' and not deleted and (visibility = 'shared' or owner_id = ${pr.owner_id})`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Spozli//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:Spozli${m?.name ? ' (' + icsEsc(m.name) + ')' : ''}`, 'X-PUBLISHED-TTL:PT30M', 'REFRESH-INTERVAL;VALUE=DURATION:PT30M'];
  for (const r of rows as any[]) {
    const ev = r.data || {};
    if (!ev.date) continue;
    const title = ev.kind === 'bday' ? `🎂 ${ev.title}` : ev.kind === 'anniv' ? `💍 ${ev.title}` : (ev.cat === 'filmen' ? '🎬 ' : '') + ev.title;
    L.push('BEGIN:VEVENT', `UID:${r.id}@spozli`, `DTSTAMP:${stamp}`, fold(`SUMMARY:${icsEsc(title)}`));
    const endDate = ev.endDate && ev.endDate > ev.date ? ev.endDate : ev.date;
    if (ev.allday || !ev.time) {
      L.push(`DTSTART;VALUE=DATE:${icsDate(ev.date)}`, `DTEND;VALUE=DATE:${icsDate(addDays(endDate, 1))}`);
    } else {
      let end = ev.end || ev.time;
      let ed = endDate;
      if (ed === ev.date && toMin(end) <= toMin(ev.time)) end = fromMin(Math.min(toMin(ev.time) + 60, 23 * 60 + 59));
      L.push(`DTSTART:${icsDT(ev.date, ev.time)}`, `DTEND:${icsDT(ed, end)}`);
    }
    if (RRULE[ev.repeat]) L.push(`RRULE:${RRULE[ev.repeat]}`);
    const cat = ev.cat === 'gemeinsam' ? 'Beide' : ev.cat === 'filmen' ? 'Filmen' : 'Privat';
    L.push(`CATEGORIES:${cat}`);
    if (ev.note) L.push(fold(`DESCRIPTION:${icsEsc(ev.note)}`));
    for (const rm of (ev.rems || []) as number[]) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', fold(`DESCRIPTION:${icsEsc(title)}`), `TRIGGER:-PT${rm}M`, 'END:VALARM');
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n') + '\r\n';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = new URL(req.url);
    let body: any = {};
    if (req.method === 'POST') body = await req.json().catch(() => ({}));
    const action = url.searchParams.get('action') || body.action;
    if (action === 'vapid') return json({ key: (await vapid()).pub });
    if (action === 'feed') {
      const ics = await feed(url.searchParams.get('t') || '');
      if (!ics) return new Response('Nicht gefunden', { status: 404, headers: CORS });
      return new Response(ics, { headers: { ...CORS, 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-cache' } });
    }
    if (action === 'ics') {
      if (!(await userFromReq(req))) return json({ error: 'Bitte neu anmelden' }, 401);
      try { return new Response(await fetchIcs(body.url), { headers: { ...CORS, 'Content-Type': 'text/calendar; charset=utf-8' } }); }
      catch (e) { return json({ error: String((e as Error)?.message || e) }, 400); }
    }
    if (action === 'test') {
      const [s] = await sql`select endpoint, p256dh, auth, user_id from public.push_subs where endpoint = ${String(body.endpoint || '')}`;
      if (!s) return json({ ok: false, error: 'unknown' }, 404);
      const st = await sendPush(s as any, { title: 'Spozli sagt Hallo 👋', body: 'So kommen ab jetzt deine Erinnerungen an. Alles klappt!', tag: 'test', url: APP_URL }, 600);
      return json({ ok: st < 300, status: st });
    }
    const c = await config();
    if (!c.cron_secret || req.headers.get('x-spozli-key') !== c.cron_secret) return json({ error: 'forbidden' }, 403);
    if (action === 'tick') return json({ ok: true, sent: await tick() });
    if (action === 'item') return json({ ok: true, sent: await newItem(String(body.id || '')) });
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
