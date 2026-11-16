import './style.css';
import { createClient } from '@supabase/supabase-js';
import { startApp } from './app.js';
import { createStore } from './sync.js';
import { disablePush } from './push.js';

// Zoomen verhindern (Pinch und Doppeltipp), damit es sich wie eine App anfühlt
['gesturestart', 'gesturechange', 'gestureend'].forEach((n) => document.addEventListener(n, (e) => e.preventDefault(), { passive: false }));
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
// Doppeltipp-Zoom ist per CSS (touch-action: manipulation) abgeschaltet
import { lumoSvg } from './figure.js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const root = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CTX_KEY = 'spozli-ctx';
const APP_URL = location.origin + import.meta.env.BASE_URL;
const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const fromConfirmLink = /type=(signup|email)/.test(location.hash + location.search);

function screen(html) {
  document.body.classList.add('auth');
  document.body.classList.remove('booting');
  root.innerHTML = `<div class="authwrap"><div class="authfig">${lumoSvg('happy')}</div>${html}</div>`;
}
function setMsg(text, isError) {
  const el = document.getElementById('msg');
  if (el) { el.textContent = text; el.className = 'authmsg' + (isError ? ' err' : ''); }
}
function busy(btn, on, label) {
  if (!btn) return;
  btn.disabled = on;
  if (label) btn.textContent = label;
}
const errText = (e) => {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/Invalid login credentials/i.test(m)) return 'E-Mail oder Passwort stimmt nicht.';
  if (/Email not confirmed/i.test(m)) return 'Bitte bestätige zuerst deine E-Mail über den Link, den wir dir geschickt haben.';
  if (/User already registered/i.test(m)) return 'Für diese E-Mail gibt es schon ein Konto. Melde dich einfach an.';
  if (/Password should be at least/i.test(m)) return 'Das Passwort braucht mindestens 6 Zeichen.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Keine Verbindung. Prüfe dein Internet und versuch es nochmal.';
  return m;
};

// ---------- Anmelden ----------
function showLogin(mode = 'login') {
  const signup = mode === 'signup';
  screen(`<h1 class="authtitle">${signup ? 'Konto erstellen' : 'Willkommen bei Spozli'}</h1>
  <p class="authsub">${signup ? 'Mit E-Mail und Passwort. Du bleibst danach auf diesem Gerät angemeldet.' : 'Euer gemeinsamer Kalender, To-dos, Haushalt und Einkaufsliste.'}</p>
  <form id="authform" class="card authcard">
    <div class="field"><label for="email">E-Mail</label><input class="inp" id="email" type="email" autocomplete="email" required></div>
    <div class="field"><label for="pw">Passwort</label><input class="inp" id="pw" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required></div>
    <button class="btn primary" id="go" type="submit">${signup ? 'Konto erstellen' : 'Anmelden'}</button>
    <p class="authmsg" id="msg" role="status"></p>
  </form>
  <button class="authswitch" id="switch">${signup ? 'Ich habe schon ein Konto' : 'Neu hier? Konto erstellen'}</button>
  ${signup ? '' : '<button class="authswitch small" id="forgot">Passwort vergessen?</button>'}`);
  document.getElementById('switch').onclick = () => showLogin(signup ? 'login' : 'signup');
  const forgot = document.getElementById('forgot');
  if (forgot) forgot.onclick = async () => {
    const email = document.getElementById('email').value.trim();
    if (!email) { setMsg('Gib oben deine E-Mail ein, dann schicken wir dir einen Link.', true); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: APP_URL });
    setMsg(error ? errText(error) : 'Wir haben dir eine E-Mail zum Zurücksetzen geschickt.', !!error);
  };
  document.getElementById('authform').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('pw').value;
    const btn = document.getElementById('go');
    busy(btn, true, 'Einen Moment …');
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: APP_URL } });
        if (error) throw error;
        if (!data.session) {
          busy(btn, false, 'Konto erstellen');
          setMsg('Fast geschafft: Wir haben dir eine E-Mail geschickt. Tipp auf den Link darin und melde dich dann hier an.');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await boot();
    } catch (err) {
      busy(btn, false, signup ? 'Konto erstellen' : 'Anmelden');
      setMsg(errText(err), true);
      if (/not confirmed/i.test(err?.message || '')) showResend(email);
    }
  };
}

function showResend(email) {
  if (document.getElementById('resend')) return;
  const b = document.createElement('button');
  b.className = 'authswitch'; b.id = 'resend'; b.textContent = 'Bestätigungs-Mail nochmal senden';
  b.onclick = async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: APP_URL } });
    setMsg(error ? errText(error) : 'Neue Mail ist unterwegs. Öffne den Link darin und melde dich dann hier an.', !!error);
  };
  document.getElementById('authform').after(b);
}

function showConfirmed() {
  screen(`<h1 class="authtitle">E-Mail bestätigt!</h1>
  <p class="authsub">Dein Konto ist bereit. Öffne Spozli jetzt über das Icon auf deinem Home-Bildschirm und melde dich dort mit E-Mail und Passwort an.</p>
  <p class="authsub">Noch nicht installiert? Tippe in Safari auf das Teilen-Symbol und dann auf „Zum Home-Bildschirm“.</p>
  <button class="authswitch" id="here">Lieber hier im Browser weitermachen</button>`);
  document.getElementById('here').onclick = () => boot();
}

function showNewPassword() {
  screen(`<h1 class="authtitle">Neues Passwort</h1>
  <form id="pwform" class="card authcard">
    <div class="field"><label for="pw">Neues Passwort</label><input class="inp" id="pw" type="password" autocomplete="new-password" minlength="6" required></div>
    <button class="btn primary" id="go" type="submit">Speichern</button>
    <p class="authmsg" id="msg" role="status"></p>
  </form>`);
  document.getElementById('pwform').onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: document.getElementById('pw').value });
    if (error) setMsg(errText(error), true); else boot();
  };
}

// ---------- Haushalt einrichten ----------
function showSetup(user) {
  screen(`<h1 class="authtitle">Schön, dass du da bist!</h1>
  <p class="authsub">Wie heißt du? So sieht dich deine Partnerin oder dein Partner in Spozli.</p>
  <div class="card authcard">
    <div class="field"><label for="name">Dein Name</label><input class="inp" id="name" autocomplete="given-name" placeholder="z. B. Sevi"></div>
    <div class="seg vseg" role="group" aria-label="Haushalt"><button type="button" data-mode="create" aria-pressed="true">Neu erstellen</button><button type="button" data-mode="join" aria-pressed="false">Einladungscode</button></div>
    <div id="create-box">
      <p class="hint" style="margin:0 0 10px">Du erstellst euren gemeinsamen Haushalt und bekommst einen Code für die zweite Person.</p>
      <label class="check"><input type="checkbox" id="filmen" checked> Ich brauche die Kategorie „Filmen“</label>
    </div>
    <div id="join-box" hidden>
      <div class="field"><label for="code">Einladungscode</label><input class="inp" id="code" autocapitalize="characters" placeholder="z. B. 4F2A9C" maxlength="6"></div>
    </div>
    <button class="btn primary" id="go" style="margin-top:12px">Los geht's</button>
    <p class="authmsg" id="msg" role="status"></p>
  </div>
  <button class="authswitch small" id="out">Abmelden (${esc(user.email)})</button>`);
  let mode = 'create';
  document.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => {
    mode = b.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    document.getElementById('create-box').hidden = mode !== 'create';
    document.getElementById('join-box').hidden = mode !== 'join';
  });
  document.getElementById('out').onclick = signOut;
  document.getElementById('go').onclick = async (e) => {
    const name = document.getElementById('name').value.trim();
    if (!name) { setMsg('Bitte gib deinen Namen ein.', true); return; }
    busy(e.target, true, 'Einen Moment …');
    try {
      if (mode === 'create') {
        const { error } = await supabase.rpc('create_household', { p_name: name, p_filmen: document.getElementById('filmen').checked });
        if (error) throw error;
      } else {
        const code = document.getElementById('code').value.trim();
        if (!code) throw new Error('Bitte gib den Einladungscode ein.');
        const { error } = await supabase.rpc('join_household', { p_code: code, p_name: name });
        if (error) throw error;
      }
      await boot();
    } catch (err) {
      busy(e.target, false, "Los geht's");
      setMsg(errText(err), true);
    }
  };
}

// ---------- Start ----------
async function loadContext(user) {
  const { data: mem, error } = await supabase.from('members').select('household_id').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (!mem) return null;
  const hh = mem.household_id;
  const [{ data: members, error: e1 }, { data: house, error: e2 }] = await Promise.all([
    supabase.from('members').select('user_id,name,slot,filmen').eq('household_id', hh),
    supabase.from('households').select('id,name,invite_code').eq('id', hh).single(),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const ctx = { userId: user.id, email: user.email, householdId: hh, inviteCode: house.invite_code, members };
  try { localStorage.setItem(CTX_KEY, JSON.stringify(ctx)); } catch (e) { /* egal */ }
  return ctx;
}

let running = null;
function launch(info) {
  document.body.classList.remove('auth', 'booting');
  const me = info.members.find((m) => m.user_id === info.userId);
  const by = Object.fromEntries(info.members.map((m) => [m.slot, m]));
  const users = {
    sevi: { name: by.sevi?.name || 'Partner' },
    sie: { name: by.sie?.name || 'Partner' },
  };
  let app = null;
  const store = createStore({
    supabase, householdId: info.householdId, userId: info.userId,
    onRemoteChange: () => app?.remoteChanged(),
    onStatus: (st) => app?.setStatus(st),
  });
  app = startApp({
    store, users, me: me.slot, filmen: !!by.sevi?.filmen, email: info.email,
    inviteCode: info.inviteCode, partnerJoined: info.members.length > 1, onSignOut: signOut, supabase,
  });
  store.start();
  running = { info };
  // Wenn die zweite Person beitritt, Namen nachladen
  supabase.channel('members').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'members', filter: `household_id=eq.${info.householdId}` }, () => location.reload()).subscribe();
}

async function signOut() {
  try { await disablePush(supabase); } catch (e) { /* egal */ }
  try { await supabase.auth.signOut(); } catch (e) { /* offline */ }
  try {
    localStorage.removeItem(CTX_KEY);
    Object.keys(localStorage).filter((k) => k.startsWith('spozli-cache-')).forEach((k) => localStorage.removeItem(k));
  } catch (e) { /* egal */ }
  location.reload();
}

async function boot() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { showLogin(); return; }
  const user = session.user;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CTX_KEY) || 'null'); } catch (e) { /* egal */ }
  if (cached && cached.userId !== user.id) cached = null;

  if (cached && !running) launch(cached); // sofort starten, auch offline
  if (!navigator.onLine) { if (!cached) showLogin(); return; }
  try {
    const ctx = await loadContext(user);
    if (!ctx) { showSetup(user); return; }
    if (!running) launch(ctx);
    else if (ctx.members.length !== cached?.members?.length) location.reload();
  } catch (e) {
    console.warn(e);
    if (!running) screen(`<h1 class="authtitle">Verbindung fehlgeschlagen</h1><p class="authsub">${esc(errText(e))}</p><button class="btn primary" onclick="location.reload()">Nochmal versuchen</button><button class="authswitch small" id="out">Abmelden</button>`);
    const out = document.getElementById('out'); if (out) out.onclick = signOut;
  }
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') showNewPassword();
});

// Nach dem Tippen auf den Bestätigungs-Link öffnet iOS Safari, nicht die installierte App.
if (fromConfirmLink && !standalone) {
  supabase.auth.getSession().then(() => { history.replaceState(null, '', APP_URL); showConfirmed(); });
} else {
  boot();
}

// Service Worker (Offline-Modus) registrieren
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}
