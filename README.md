# Spozli

Gemeinsamer Kalender, To-dos, Haushalt und Einkaufsliste für zwei Personen, als installierbare Web-App (PWA) fürs iPhone.

- **App:** https://spotzli.github.io/Spotzli/
- **Technik:** Vite + Vanilla JS, Supabase (Login, Datenbank, Live-Sync), Service Worker für den Offline-Modus
- **Hosting:** GitHub Pages, wird bei jedem Push auf `main` automatisch veröffentlicht

## Einrichtung (einmalig)

1. **Datenbank:** Inhalt von `supabase/schema.sql` im Supabase Dashboard unter *SQL Editor* einfügen und ausführen.
2. **Anmeldung:** Supabase → *Authentication* → *Sign In / Providers* → *Email*: „Confirm email“ ausschalten (sonst funktioniert die Bestätigungs-Mail im iPhone-Web-App-Modus nicht zuverlässig). Optional unter *URL Configuration* die Site URL `https://spotzli.github.io/Spotzli/` setzen (für „Passwort vergessen“).
3. **GitHub Pages:** Repo → *Settings* → *Pages* → Source: *GitHub Actions*.

## Auf dem iPhone installieren

Die App-Adresse in **Safari** öffnen → Teilen-Symbol → **Zum Home-Bildschirm**.

## Entwicklung

```bash
npm install
BASE_PATH=/ npm run dev
```

## Aufbau

- `src/app.js`: Oberfläche (Kalender, To-dos, Haushalt, Einkauf, Spozli)
- `src/sync.js`: lokale Kopie, Warteschlange für Offline-Änderungen, Abgleich mit Supabase
- `src/main.js`: Anmelden, Haushalt erstellen oder beitreten, Start
- `supabase/schema.sql`: Tabellen und Zugriffsregeln. Private Einträge sieht nur, wer sie angelegt hat; das prüft die Datenbank selbst.
