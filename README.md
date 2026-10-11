# Planer budżetu i ROI

Aplikacja webowa do planowania rocznego budżetu marketingowego (social media, WWW, radio) i szacowania ROI.
Specyfikacja: [docs/PRD.md](docs/PRD.md).

Czysty HTML, CSS i JavaScript (ES modules). Bez frameworka i bez kroku budowania. Dane zostają w przeglądarce (localStorage), nic nie jest wysyłane na serwer.

## Uruchomienie

Aplikacja to zwykłe pliki statyczne, więc wystarczy dowolny serwer HTTP (moduły ES nie działają przez `file://`):

```bash
npm start          # python3 -m http.server 4173  → http://localhost:4173
```

## Testy

```bash
npm install
npm test           # testy jednostkowe modułu obliczeń (node:test, bez zależności)
npm run test:e2e   # testy end-to-end (Playwright), uruchamia serwer sam
```

Jeśli Playwright ma używać zainstalowanej przeglądarki Chromium, ustaw `PW_CHROMIUM_PATH=/ścieżka/do/chrome`.

## Struktura

- `index.html` – układ i wszystkie ekrany (planer, scenariusze, porównanie, o metodzie).
- `css/styles.css` – kolory jako tokeny (jasny i ciemny motyw), układ, responsywność.
- `js/domain.js` – logika: obliczenia, presety, „Wyrównaj do 100%”, walidacja i import/eksport, formatowanie. Bez DOM, więc testowalna w Node.
- `js/charts.js` – wykresy jako SVG (pierścień, słupki grupowane, słupki skumulowane).
- `js/store.js` – zapis scenariuszy w localStorage z obsługą błędów.
- `js/app.js` – stan i interfejs.
- `test/` – testy jednostkowe. `e2e/` – testy akceptacyjne z PRD (sekcja 12).

## Wzory

- Budżet kanału = budżet roczny × udział
- Zysk kanału = budżet kanału × ROI kanału
- ROI całkowite = zysk całkowity / budżet całkowity (= Σ udział × ROI)

Wartości ROI w presetach są założeniami startowymi, nie danymi rynkowymi.
