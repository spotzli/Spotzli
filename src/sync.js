// Spozli: lokaler Speicher + Abgleich mit Supabase (offline-fähig)
// Alle Inhalte liegen als Zeilen in der Tabelle "items". Lokal wird eine Kopie
// gehalten; Änderungen kommen in eine Warteschlange (outbox) und werden
// übertragen, sobald eine Verbindung besteht.

const COLLECTIONS = {
  events: { kind: 'event', vis: (r) => (r.cat === 'gemeinsam' ? 'shared' : 'private') },
  todos: { kind: 'todo', vis: () => 'private' },
  chores: { kind: 'chore', vis: () => 'shared' },
  choreLog: { kind: 'chorelog', vis: () => 'shared' },
  list: { kind: 'shop', vis: () => 'shared' },
  habits: { kind: 'habit', vis: () => 'private' },
};
const stable = (v) => {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v ?? null);
};
const strip = (r) => { const d = JSON.parse(JSON.stringify(r)); delete d.id; return d; };
const MANAGED = new Set(['event', 'todo', 'chore', 'chorelog', 'shop', 'habit', 'recent', 'note', 'prefs', 'avatar']);

export function createStore({ supabase, householdId, userId, onRemoteChange, onStatus }) {
  const KEY = `spozli-cache-${householdId}-${userId}`;
  let cache = { rows: {}, outbox: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) cache = JSON.parse(raw);
  } catch (e) { /* leer starten */ }
  cache.rows ||= {};
  cache.outbox ||= {};

  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { /* voll */ } };
  const recentId = `${householdId}:recent`;
  const prefsId = `${userId}:prefs`;
  const noteId = (d) => `${userId}:note:${d}`;

  // Gewünschte Zeilen aus dem App-Zustand ableiten
  function rowsFromState(S) {
    const out = {};
    for (const [coll, cfg] of Object.entries(COLLECTIONS)) {
      for (const r of S[coll] || []) {
        out[r.id] = { kind: cfg.kind, visibility: cfg.vis(r), data: strip(r) };
      }
    }
    out[recentId] = { kind: 'recent', visibility: 'shared', data: { names: S.recent || [] } };
    out[prefsId] = { kind: 'prefs', visibility: 'private', data: { prefs: S.prefs, defRem: S.defRem, pushOn: S.pushOn } };
    if (S.avatars && S.avatars[S.user] !== undefined) {
      out[`${userId}:avatar`] = { kind: 'avatar', visibility: 'shared', data: { slot: S.user, img: S.avatars[S.user] || null } };
    }
    for (const [d, text] of Object.entries(S.notes || {})) {
      out[noteId(d)] = { kind: 'note', visibility: 'private', data: { d, text } };
    }
    return out;
  }

  // App-Zustand aus den Zeilen aufbauen (in-place, UI-Felder bleiben)
  function applyToState(S) {
    const by = { event: [], todo: [], chore: [], chorelog: [], shop: [], habit: [] };
    const avatars = {};
    let recent = null, prefs = null;
    const notes = {};
    for (const [id, r0] of Object.entries(cache.rows)) {
      if (r0.deleted) continue;
      const row = { ...r0, data: JSON.parse(JSON.stringify(r0.data ?? {})) }; // Kopie für die App
      if (by[row.kind]) by[row.kind].push({ ...row.data, id });
      else if (row.kind === 'recent') recent = row.data.names || [];
      else if (row.kind === 'prefs' && id === prefsId) prefs = row.data;
      else if (row.kind === 'note' && row.data?.d) notes[row.data.d] = row.data.text;
      else if (row.kind === 'avatar' && row.data?.slot) avatars[row.data.slot] = row.data.img || null;
    }
    S.events = by.event;
    S.todos = by.todo;
    S.chores = by.chore;
    S.choreLog = by.chorelog;
    S.list = by.shop.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
    S.habits = by.habit;
    S.avatars = avatars;
    S.recent = recent || [];
    S.notes = notes;
    if (prefs) {
      if (prefs.prefs) S.prefs = { ...S.prefs, ...prefs.prefs };
      if (prefs.defRem !== undefined) S.defRem = prefs.defRem;
      if (prefs.pushOn !== undefined) S.pushOn = prefs.pushOn;
    }
  }

  const same = (a, b) => a && b && a.visibility === b.visibility && !a.deleted && stable(a.data) === stable(b.data);

  // Nach jeder Änderung in der App aufrufen
  function commit(S) {
    const want = rowsFromState(S);
    let changed = false;
    for (const [id, row] of Object.entries(want)) {
      const cur = cache.rows[id];
      if (same(cur, row)) continue;
      // Leere Einstellungen/Listen nicht anlegen, solange es sie noch nicht gibt
      if (!cur && row.kind === 'recent' && !row.data.names.length) continue;
      const data = JSON.parse(JSON.stringify(row.data)); // Kopie, damit spätere Änderungen erkannt werden
      cache.rows[id] = { kind: row.kind, visibility: row.visibility, data, deleted: false };
      cache.outbox[id] = { id, kind: row.kind, visibility: row.visibility, data, deleted: false };
      changed = true;
    }
    for (const [id, cur] of Object.entries(cache.rows)) {
      if (cur.deleted || want[id] || !MANAGED.has(cur.kind)) continue;
      if (cur.kind === 'prefs' || cur.kind === 'recent' || cur.kind === 'avatar') continue;
      cur.deleted = true;
      cache.outbox[id] = { id, kind: cur.kind, visibility: cur.visibility, data: cur.data, deleted: true };
      changed = true;
    }
    if (changed) { persist(); flush(); }
  }

  let flushing = false;
  async function flush() {
    if (flushing) return;
    const ops = Object.values(cache.outbox);
    if (!ops.length) { status(); return; }
    if (!navigator.onLine) { status(); return; }
    flushing = true;
    try {
      const payload = ops.map((o) => ({
        id: o.id, household_id: householdId, owner_id: userId, kind: o.kind,
        visibility: o.visibility, data: o.data, deleted: o.deleted,
      }));
      const { error } = await supabase.from('items').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      for (const o of ops) {
        if (cache.outbox[o.id] === o) delete cache.outbox[o.id];
      }
      persist();
    } catch (e) {
      console.warn('Sync fehlgeschlagen, neuer Versuch später', e);
    } finally {
      flushing = false;
      status();
      if (Object.keys(cache.outbox).length && navigator.onLine) setTimeout(flush, 15000);
    }
  }

  function takeRemote(row) {
    if (cache.outbox[row.id]) return false; // lokale Änderung hat Vorrang, bis sie übertragen ist
    cache.rows[row.id] = { kind: row.kind, visibility: row.visibility, data: row.data, deleted: row.deleted, updated_at: row.updated_at };
    return true;
  }

  let lastPull = null;
  async function pull() {
    if (!navigator.onLine) { status(); return; }
    let q = supabase.from('items').select('*').eq('household_id', householdId);
    if (lastPull) q = q.gt('updated_at', lastPull);
    const { data, error } = await q;
    if (error) { console.warn(error); status(); return; }
    let changed = false;
    for (const row of data) {
      if (takeRemote(row)) changed = true;
      if (!lastPull || row.updated_at > lastPull) lastPull = row.updated_at;
    }
    if (!lastPull) lastPull = new Date(0).toISOString();
    persist();
    lastSync = new Date();
    status();
    if (changed) onRemoteChange();
  }

  let channel = null;
  function subscribe() {
    if (channel) supabase.removeChannel(channel);
    channel = supabase
      .channel(`items-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `household_id=eq.${householdId}` }, (p) => {
        const row = p.new;
        if (!row || !row.id) return;
        if (row.updated_at && (!lastPull || row.updated_at > lastPull)) lastPull = row.updated_at;
        if (takeRemote(row)) { persist(); onRemoteChange(); }
      })
      .subscribe((st) => { if (st === 'SUBSCRIBED') pull(); });
  }

  let lastSync = null;
  function status() {
    onStatus?.({ online: navigator.onLine, pending: Object.keys(cache.outbox).length, lastSync });
  }

  window.addEventListener('online', () => { flush(); pull(); subscribe(); });
  window.addEventListener('offline', status);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { flush(); pull(); } });

  return {
    applyToState,
    commit,
    start() { status(); flush(); pull(); subscribe(); setInterval(() => { flush(); }, 60000); },
    hasData: () => Object.keys(cache.rows).length > 0,
    pending: () => Object.keys(cache.outbox).length,
  };
}
