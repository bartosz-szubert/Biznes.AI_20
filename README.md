# Planer budżetu i ROI

Aplikacja webowa do planowania rocznego budżetu marketingowego (social media, WWW, radio) i szacowania ROI.
Specyfikacja: [docs/PRD.md](docs/PRD.md).

Dane zostają w przeglądarce (localStorage). Nic nie jest wysyłane na serwer.

## Uruchomienie

```bash
npm install
npm run dev          # tryb developerski
npm run build        # typy + build produkcyjny do dist/
npm run preview      # podgląd builda
```

## Testy

```bash
npm test             # testy jednostkowe modułu obliczeń (Vitest)
npm run test:e2e     # testy end-to-end (Playwright), buduje i uruchamia preview
```

Jeśli Playwright ma używać zainstalowanej przeglądarki Chromium, ustaw `PW_CHROMIUM_PATH=/ścieżka/do/chrome`.

## Struktura

- `src/domain/` – czysta logika: obliczenia (`calc.ts`), presety, przydział przy wyrównywaniu, schemat i import/eksport (zod), zarządzanie scenariuszami.
- `src/components/` – interfejs (planer, lista scenariuszy, porównanie, wykresy Recharts, „O metodzie”).
- `src/storage/` – zapis scenariuszy w localStorage z obsługą błędów.
- `e2e/` – testy akceptacyjne z PRD (sekcja 12).

## Wzory

- Budżet kanału = budżet roczny × udział
- Zysk kanału = budżet kanału × ROI kanału
- ROI całkowite = zysk całkowity / budżet całkowity (= Σ udział × ROI)

Wartości ROI w presetach są założeniami startowymi, nie danymi rynkowymi.
