# Spotzi

Gemeinsamer Kalender, To-dos, Haushalt und Einkaufsliste für zwei Personen, als installierbare Web-App (PWA) fürs iPhone.

- **App:** https://spotzli.github.io/Spotzli/
- **Technik:** Vite + Vanilla JS, Supabase (Login, Datenbank, Live-Sync), Service Worker für den Offline-Modus
- **Hosting:** GitHub Pages, wird bei jedem Push auf `main` automatisch veröffentlicht

## Einrichtung (einmalig)

1. **Datenbank:** Inhalt von `supabase/schema.sql` im Supabase Dashboard unter *SQL Editor* einfügen und ausführen.
2. **Anmeldung:** Supabase → *Authentication* → *URL Configuration*: Site URL `https://spotzli.github.io/Spotzli/`, Redirect URL `https://spotzli.github.io/Spotzli/**`. E-Mail-Bestätigung bleibt eingeschaltet; der Link öffnet Safari, danach in der installierten App anmelden.
3. **GitHub Pages:** Repo → *Settings* → *Pages* → Source: *GitHub Actions*.

## Push-Nachrichten einrichten (einmalig)

1. `supabase/schema.sql` im Supabase SQL Editor erneut komplett ausführen (legt Push-Tabellen, Trigger und den Minuten-Takt an).
2. Supabase → Edge Functions → „Deploy a new function“ → „Via Editor“. Name: `smooth-task` (so heißt sie bei uns). Inhalt von `supabase/functions/spozli-push/index.ts` einfügen, „Deploy“.
3. In den Details der Funktion „Verify JWT“ (bzw. „Enforce JWT verification“) ausschalten und speichern. Die Funktion prüft selbst einen geheimen Schlüssel aus der Datenbank.
4. In der installierten App: Zahnrad → Benachrichtigungen → „Push aktivieren“, dann „Test senden“.

Die Schlüssel für Web Push erzeugt die Funktion beim ersten Aufruf selbst und speichert sie in `push_config` (für die App nicht lesbar).

## Auf dem iPhone installieren

Die App-Adresse in **Safari** öffnen → Teilen-Symbol → **Zum Home-Bildschirm**.

## Entwicklung

```bash
npm install
BASE_PATH=/ npm run dev
```

## Aufbau

- `src/app.js`: Oberfläche (Kalender, To-dos, Haushalt, Einkauf, Spotzi)
- `src/sync.js`: lokale Kopie, Warteschlange für Offline-Änderungen, Abgleich mit Supabase
- `src/main.js`: Anmelden, Haushalt erstellen oder beitreten, Start
- `supabase/schema.sql`: Tabellen und Zugriffsregeln. Private Einträge sieht nur, wer sie angelegt hat; das prüft die Datenbank selbst.
