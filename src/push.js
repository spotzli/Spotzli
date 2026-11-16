// Echte Push-Nachrichten (Web Push). Auf dem iPhone nur in der installierten App (Home-Bildschirm).
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const FN_URL = `${SUPABASE_URL}/functions/v1/smooth-task`;
const HEADERS = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY };

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function b64u(s) {
  const p = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
const same = (a, b) => a && b && a.byteLength === b.byteLength && new Uint8Array(a).every((v, i) => v === b[i]);

export async function currentSub() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

// Zustand für die Anzeige: unsupported | install | denied | off | on
export async function pushState() {
  if (!pushSupported()) return isIOS() && !isStandalone() ? 'install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await currentSub();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

export async function enablePush(supabase) {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'denied' : 'dismissed');
  const reg = await navigator.serviceWorker.ready;
  let r;
  try { r = await fetch(`${FN_URL}?action=vapid`, { headers: { apikey: SUPABASE_KEY } }); } catch (e) { throw new Error('Server nicht erreichbar'); }
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`Server ${r.status}${t ? ': ' + t.slice(0, 80) : ''}`); }
  const { key } = await r.json().catch(() => ({}));
  if (!key) throw new Error('Server liefert keinen Schlüssel');
  const appKey = b64u(key);
  let sub = await reg.pushManager.getSubscription();
  if (sub && !same(sub.options?.applicationServerKey, appKey)) { await sub.unsubscribe(); sub = null; }
  if (!sub) {
    try { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey }); }
    catch (e) { throw new Error('Gerät: ' + (e && e.message || e)); }
  }
  await register(supabase, sub);
  return sub;
}

export async function disablePush(supabase) {
  const sub = await currentSub();
  if (!sub) return;
  await supabase.rpc('unregister_push', { p_endpoint: sub.endpoint });
  await sub.unsubscribe();
}

async function register(supabase, sub) {
  const j = sub.toJSON();
  const { error } = await supabase.rpc('register_push', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_ua: navigator.userAgent.slice(0, 200) });
  if (error) throw new Error('Datenbank: ' + (error.message || error.code || 'Fehler'));
}

// Beim Start still nachmelden, falls der Server das Gerät vergessen hat
export async function ensureRegistered(supabase) {
  try { const sub = await currentSub(); if (sub && Notification.permission === 'granted') await register(supabase, sub); } catch (e) {}
}

async function sendTest(sub) {
  let r;
  try { r = await fetch(FN_URL, { method: 'POST', headers: HEADERS, body: JSON.stringify({ action: 'test', endpoint: sub.endpoint }) }); }
  catch (e) { return { err: 'Server nicht erreichbar' }; }
  const j = await r.json().catch(() => ({}));
  return { r, j };
}

// Test mit Selbstreparatur: Gerät neu melden bzw. neu abonnieren, wenn nötig
export async function testPush(supabase) {
  let sub = await currentSub();
  if (!sub) throw new Error('Push ist auf diesem Gerät aus');
  let { r, j, err } = await sendTest(sub);
  if (err) throw new Error(err);
  if (r.status === 404 && j.error === 'unknown') { await register(supabase, sub); ({ r, j, err } = await sendTest(sub)); if (err) throw new Error(err); }
  if (j.status === 404 || j.status === 410 || j.status === 403 || (r.status === 404 && j.error === 'unknown')) {
    try { await sub.unsubscribe(); } catch (e) {}
    sub = await enablePush(supabase);
    ({ r, j, err } = await sendTest(sub)); if (err) throw new Error(err);
  }
  if (r.status === 401) throw new Error('Server 401: In der Funktion „Verify JWT“ ausschalten');
  if (!r.ok || !j.ok) throw new Error(j.status ? 'Apple meldet ' + j.status : 'Server ' + r.status + (j.error ? ': ' + String(j.error).slice(0, 80) : (j.msg || j.message ? ': ' + String(j.msg || j.message).slice(0, 80) : '')));
  return j;
}
