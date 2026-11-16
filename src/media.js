// Bilder (Hintergrund, Moodboard) bleiben auf dem Gerät, in IndexedDB.
const DB = 'spozli-media', STORE = 'media';
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
export async function getMedia(key) {
  try {
    const d = await db();
    return await new Promise((res) => {
      const q = d.transaction(STORE).objectStore(STORE).get(key);
      q.onsuccess = () => res(q.result ?? null);
      q.onerror = () => res(null);
    });
  } catch (e) { return null; }
}
export async function setMedia(key, val) {
  const d = await db();
  await new Promise((res, rej) => {
    const tx = d.transaction(STORE, 'readwrite');
    if (val == null) tx.objectStore(STORE).delete(key); else tx.objectStore(STORE).put(val, key);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
// Foto verkleinern und als JPEG-Daten-URL zurückgeben (quadratisch zugeschnitten, wenn square)
export function resizeImage(file, max, square = false, quality = 0.82) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
      if (square) { const m = Math.min(sw, sh); sx = (sw - m) / 2; sy = (sh - m) / 2; sw = sh = m; }
      const k = Math.min(1, max / Math.max(sw, sh));
      const c = document.createElement('canvas');
      c.width = Math.round(sw * k); c.height = Math.round(sh * k);
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Bild konnte nicht gelesen werden')); };
    img.src = url;
  });
}
