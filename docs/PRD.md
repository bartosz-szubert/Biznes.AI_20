# PRD: Planer budżetu marketingowego i ROI

| Pole | Wartość |
|---|---|
| Wersja dokumentu | 1.0 (MVP) |
| Data | 2026-10-11 |
| Status | Draft do akceptacji |
| Decyzje i akceptacja presetów | Właściciel produktu |
| Typ produktu | Aplikacja webowa (SPA, działa w przeglądarce) |

---

## 1. Streszczenie

Aplikacja webowa do **planowania rocznego budżetu marketingowego** i **szacowania zwrotu z inwestycji (ROI)**. Użytkownik podaje roczny budżet, a aplikacja dzieli go między trzy kanały: **Social media**, **WWW** i **Radio**. Podział startuje z gotowego presetu dopasowanego do profilu firmy. Aplikacja liczy ROI każdego kanału i ROI całkowite, pokazuje wyniki na wykresach, pozwala zapisać kilka scenariuszy i porównać je obok siebie.

## 2. Problem i cel

**Problem.** Małe i średnie firmy planują budżet marketingowy w arkuszach kalkulacyjnych. Trudno w nich szybko sprawdzić, jak zmiana podziału budżetu wpłynie na wynik. Porównywanie wariantów („co jeśli damy więcej na social media?”) wymaga kopiowania arkuszy, łatwo w nich o błąd i trudno pokazać wynik zarządowi.

**Cel produktu.** Pozwolić w mniej niż 5 minut:
1. ustalić roczny budżet i podzielić go między kanały,
2. zobaczyć prognozowany zwrot dla każdego kanału i dla całości,
3. zapisać kilka wariantów i wybrać najlepszy na podstawie porównania.

### Cele biznesowe (MVP)
- Skrócić czas przygotowania wariantów budżetu z godzin do minut.
- Ujednolicić sposób liczenia ROI w firmie: jedna, jawna formuła.
- Dać czytelny materiał (wykres + tabela, eksport) do rozmów z zarządem.

### Poza zakresem MVP (non-goals)
- Konta użytkowników, logowanie, zapis w chmurze, praca zespołowa.
- Integracje z Meta Ads, Google Analytics, systemami CRM (pomiar *rzeczywistego* ROI).
- Kanały inne niż Social media, WWW i Radio (patrz roadmapa).
- Planowanie miesięczne i kwartalne oraz sezonowość (patrz roadmapa).
- Doradztwo finansowe: aplikacja daje **prognozę na założeniach użytkownika**, nie gwarancję wyniku.

## 3. Użytkownicy

| Persona | Opis | Główna potrzeba |
|---|---|---|
| **Marketing manager w MŚP** | Odpowiada za roczny plan i budżet marketingu | Szybko przygotować 2–4 warianty budżetu i uzasadnić wybór |
| **Właściciel małej firmy** | Sam decyduje o wydatkach, nie jest analitykiem | Prosty start z gotowego szablonu, wynik w złotówkach |
| **Konsultant / agencja** | Przygotowuje propozycje dla klientów | Szybko zmieniać założenia i eksportować porównanie dla klienta |

### Kluczowe historie użytkownika
- **US-1.** Jako marketing manager chcę wpisać roczny budżet i wybrać profil firmy, żeby od razu dostać sensowny podział między kanały.
- **US-2.** Jako użytkownik chcę zmienić procentowy podział i ROI dla każdego kanału, żeby dopasować plan do mojej sytuacji.
- **US-3.** Jako użytkownik chcę zobaczyć ROI każdego kanału i ROI całkowite, żeby ocenić opłacalność planu.
- **US-4.** Jako użytkownik chcę widzieć podział i wyniki na wykresach, żeby szybko zrozumieć plan i pokazać go innym.
- **US-5.** Jako użytkownik chcę zapisać kilka scenariuszy pod własnymi nazwami, żeby wrócić do nich później.
- **US-6.** Jako użytkownik chcę porównać 2–4 scenariusze obok siebie, żeby wybrać najlepszy.
- **US-7.** Jako konsultant chcę wyeksportować scenariusze do pliku, żeby przenieść je na inny komputer lub wysłać klientowi.

## 4. Model obliczeń

### 4.1 Definicje

| Symbol | Znaczenie |
|---|---|
| `B` | Roczny budżet całkowity (PLN) |
| `wᵢ` | Udział kanału *i* w budżecie (%), suma = 100% |
| `Bᵢ = B × wᵢ` | Budżet kanału *i* (PLN) |
| `ROIᵢ` | Zakładany ROI kanału *i* (%) |
| `Zᵢ = Bᵢ × ROIᵢ` | Prognozowany zysk netto z kanału *i* (PLN) |
| `Pᵢ = Bᵢ + Zᵢ` | Prognozowany przychód przypisany do kanału *i* (PLN) |

### 4.2 Formuły

- **ROI kanału:** `ROIᵢ = (Pᵢ − Bᵢ) / Bᵢ × 100%`. Użytkownik wpisuje go jako założenie.
- **Zysk całkowity:** `Z = Σ Zᵢ`
- **ROI całkowite:** `ROI = Z / B × 100% = Σ (wᵢ × ROIᵢ)`, czyli średnia ROI kanałów ważona udziałem w budżecie.
- **Dodatkowe wskaźniki:**
  - **ROAS** (zwrot z wydatków reklamowych) = `P / B` (np. 2,5×)
  - **Udział kanału w zysku** = `Zᵢ / Z`

> **Uwaga o ROI ujemnym:** ROI może być ujemne (od −100%). Kanał z ROI ujemnym jest oznaczony ostrzeżeniem.

### 4.3 Tryb „ROI na marży” (opcjonalny przełącznik)

Domyślnie ROI liczony jest od przypisanego przychodu. Użytkownik może włączyć tryb **„ROI na marży”** i podać marżę brutto `m` (%). Wtedy:
`ROI_marża = (P × m − B) / B × 100%`.
Ten tryb pokazuje realną opłacalność, bo przychód to nie zysk. Wynik pokazywany jest obok ROI podstawowego.

### 4.4 Przykład obliczeń (preset „Zrównoważony”, budżet 500 000 PLN)

| Kanał | Udział | Budżet | ROI | Zysk | Przychód |
|---|---:|---:|---:|---:|---:|
| Social media | 45% | 225 000 zł | 150% | 337 500 zł | 562 500 zł |
| WWW | 35% | 175 000 zł | 200% | 350 000 zł | 525 000 zł |
| Radio | 20% | 100 000 zł | 80% | 80 000 zł | 180 000 zł |
| **Razem** | **100%** | **500 000 zł** | **153,5%** | **767 500 zł** | **1 267 500 zł** |

Kontrola: 0,45 × 150 + 0,35 × 200 + 0,20 × 80 = 67,5 + 70 + 16 = **153,5%**. ROAS = 2,54×.

## 5. Presety: założony „optymalny” podział i ROI

### 5.1 Uzasadnienie podziału

W modelu liniowym „optymalnie” byłoby przeznaczyć 100% budżetu na kanał z najwyższym ROI. W praktyce tak się nie robi z trzech powodów:
1. **Malejące przychody krańcowe.** Każda kolejna złotówka w tym samym kanale przynosi mniej, bo grupa odbiorców się nasyca.
2. **Dywersyfikacja ryzyka.** Zmiana algorytmu platformy albo wzrost stawek nie może zatrzymać całej sprzedaży.
3. **Kanały się wspierają.** Radio i social budują rozpoznawalność, a WWW zamienia ją w sprzedaż. Część efektu radia widać w wynikach WWW.

Dlatego presety to **zbalansowany podział z minimalnym i maksymalnym udziałem** każdego kanału, a nie wynik czystej maksymalizacji ROI.

### 5.2 Tabela presetów

> ⚠️ **Wartości ROI to założenia startowe do kalibracji, a nie dane rynkowe.** Rzeczywisty ROI zależy od branży, jakości kreacji, marży, sposobu przypisywania sprzedaży do kanałów (atrybucji) i regionu. Aplikacja pokazuje to zastrzeżenie przy każdym presecie i zachęca do wpisania własnych danych historycznych.

| Preset | Social media | WWW | Radio | ROI Social | ROI WWW | ROI Radio | **ROI całkowite** |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Zrównoważony** (domyślny) | 45% | 35% | 20% | 150% | 200% | 80% | **153,5%** |
| **Lokalna firma B2C** | 40% | 30% | 30% | 180% | 220% | 90% | **165,0%** |
| **E-commerce** | 50% | 40% | 10% | 200% | 300% | 50% | **225,0%** |
| **B2B** | 30% | 60% | 10% | 120% | 250% | 30% | **189,0%** |

Opis kanałów w aplikacji (tooltip):
- **Social media:** płatne kampanie i prowadzenie profili (Meta, Instagram, TikTok, LinkedIn).
- **WWW:** strona i sklep, SEO, content, Google Ads (wyszukiwarka), e-mail marketing przez stronę.
- **Radio:** spoty w radiu lokalnym lub ogólnopolskim, sponsoring audycji, radio internetowe.

### 5.3 Zalecane widełki udziału (ostrzeżenia, nie blokady)

| Kanał | Min | Max | Komunikat po przekroczeniu |
|---|---:|---:|---|
| Social media | 20% | 60% | „Udział poza typowym zakresem – rozważ ryzyko nasycenia lub zbyt małego zasięgu.” |
| WWW | 20% | 65% | jw. |
| Radio | 0% | 35% | jw. |

## 6. Wymagania funkcjonalne

Priorytety: **M** = Must (MVP), **S** = Should (MVP, jeśli wystarczy czasu), **C** = Could (później).

### 6.1 Planowanie budżetu
| ID | Wymaganie | Priorytet |
|---|---|---|
| FR-01 | Użytkownik wpisuje roczny budżet w PLN (liczba > 0, maks. 1 000 000 000). Pole formatuje kwotę z separatorem tysięcy. | M |
| FR-02 | Użytkownik wybiera preset (sekcja 5.2). Wybór uzupełnia udziały % i ROI kanałów. | M |
| FR-03 | Dla każdego kanału można edytować udział (%) suwakiem i polem liczbowym (krok 1%, dokładność 0,1%). | M |
| FR-04 | Suma udziałów musi wynosić 100%. Gdy jest inna, aplikacja pokazuje różnicę (np. „Pozostało 5%”) i blokuje zapis scenariusza. Przycisk **„Wyrównaj do 100%”** rozkłada różnicę proporcjonalnie na pozostałe kanały. | M |
| FR-05 | Opcja **„Zablokuj kanał”** (kłódka): zablokowany kanał nie zmienia się przy automatycznym wyrównywaniu. | S |
| FR-06 | Dla każdego kanału można edytować zakładany ROI (%) w zakresie od −100% do 1000%. | M |
| FR-07 | Obok udziału % aplikacja pokazuje kwotę kanału w PLN. Można też wpisać kwotę, a aplikacja przeliczy %. | S |
| FR-08 | Przycisk **„Przywróć preset”** cofa ręczne zmiany do wartości presetu. | M |
| FR-09 | Ostrzeżenia o widełkach (sekcja 5.3) i o ujemnym ROI kanału. | S |

### 6.2 Obliczenia i wyniki
| ID | Wymaganie | Priorytet |
|---|---|---|
| FR-10 | Dla każdego kanału aplikacja liczy budżet, zysk, przychód i ROI (sekcja 4). | M |
| FR-11 | Aplikacja liczy ROI całkowite, zysk całkowity, przychód całkowity i ROAS. | M |
| FR-12 | Wyniki przeliczają się na żywo po każdej zmianie (< 100 ms), bez przycisku „Oblicz”. | M |
| FR-13 | Panel KPI na górze: **Budżet**, **Prognozowany przychód**, **Zysk**, **ROI całkowite**. | M |
| FR-14 | Przełącznik **„ROI na marży”** z polem marży brutto (sekcja 4.3). | S |
| FR-15 | Pod wynikami widoczna jest formuła ROI: „Jak liczymy?”. | M |

### 6.3 Wizualizacja
| ID | Wymaganie | Priorytet |
|---|---|---|
| FR-20 | **Wykres pierścieniowy (donut)**: podział budżetu między kanały (% i PLN w etykietach i podpowiedziach po najechaniu). | M |
| FR-21 | **Wykres słupkowy grupowany**: dla każdego kanału budżet obok przychodu (lub zysku, do wyboru). | M |
| FR-22 | Wykresy aktualizują się na żywo razem z danymi. | M |
| FR-23 | Każdy kanał ma stały kolor we wszystkich wykresach i widokach. Kolor nie jest jedynym nośnikiem informacji: są też etykiety i legenda. | M |
| FR-24 | Pod każdym wykresem jest tabela z tymi samymi danymi (dostępność, kopiowanie liczb). | M |
| FR-25 | Eksport wykresu do PNG. | C |

### 6.4 Scenariusze
| ID | Wymaganie | Priorytet |
|---|---|---|
| FR-30 | Zapis bieżącego planu jako scenariusza: nazwa (wymagana, maks. 60 znaków) i opcjonalna notatka (maks. 500 znaków). | M |
| FR-31 | Lista zapisanych scenariuszy pokazuje nazwę, datę modyfikacji, budżet i ROI całkowite. | M |
| FR-32 | Akcje na scenariuszu: otwórz/edytuj, zmień nazwę, duplikuj, usuń (z potwierdzeniem). | M |
| FR-33 | Limit: co najmniej 20 scenariuszy. Przy przekroczeniu limitu pamięci przeglądarki aplikacja pokazuje czytelny komunikat. | M |
| FR-34 | Gdy w otwartym scenariuszu są niezapisane zmiany, aplikacja ostrzega przed zamknięciem lub przejściem do innego scenariusza. | S |
| FR-35 | Scenariusze zapisują się lokalnie w przeglądarce (IndexedDB lub localStorage). Nic nie jest wysyłane na serwer. | M |
| FR-36 | Eksport wszystkich lub wybranych scenariuszy do pliku **JSON** i import z pliku JSON. Import sprawdza poprawność pliku i pyta, co zrobić przy konflikcie nazw. | M |
| FR-37 | Eksport scenariusza lub porównania do **CSV** (do Excela, separator `;`, przecinek dziesiętny). | S |
| FR-38 | Eksport porównania do **PDF** lub widok do druku. | C |

### 6.5 Porównanie scenariuszy
| ID | Wymaganie | Priorytet |
|---|---|---|
| FR-40 | Użytkownik zaznacza od 2 do 4 scenariuszy i otwiera widok **Porównanie**. | M |
| FR-41 | Tabela porównawcza: wiersze to wskaźniki (budżet, udziały %, ROI kanałów, zysk, przychód, ROI całkowite, ROAS), kolumny to scenariusze. | M |
| FR-42 | Jeden scenariusz jest **bazowy**. Pozostałe pokazują różnicę względem niego (Δ w PLN i w punktach procentowych), w kolorze zielonym lub czerwonym ze strzałką ▲/▼. | M |
| FR-43 | Najlepsza wartość ROI całkowitego i zysku jest wyróżniona („Najwyższy ROI”, „Najwyższy zysk”). | M |
| FR-44 | **Wykres słupkowy grupowany**: ROI całkowite i zysk dla każdego scenariusza. | M |
| FR-45 | **Wykres skumulowany (stacked bar)**: struktura budżetu (udziały kanałów) w każdym scenariuszu. | M |
| FR-46 | Gdy porównywane scenariusze mają różne budżety, aplikacja pokazuje informację, że zysk w PLN nie jest wprost porównywalny i warto patrzeć na ROI. | S |

## 7. UX i ekrany

### 7.1 Mapa ekranów
1. **Planer** (ekran główny): budżet, preset, kanały, KPI, wykresy, „Zapisz scenariusz”.
2. **Scenariusze**: lista z akcjami, zaznaczanie do porównania, import i eksport.
3. **Porównanie**: tabela z różnicami i wykresy porównawcze.
4. **O metodzie**: formuły, opis presetów, zastrzeżenie o charakterze prognozy.

### 7.2 Układ ekranu „Planer” (desktop)
```
┌────────────────────────────────────────────────────────────────┐
│ Planer budżetu   [Planer] [Scenariusze] [Porównanie]           │
├────────────────────────────────────────────────────────────────┤
│ Budżet roczny: [ 500 000 zł ]   Preset: [Zrównoważony ▾]       │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│ Budżet       │ Przychód     │ Zysk         │ ROI całkowite     │
│ 500 000 zł   │ 1 267 500 zł │ 767 500 zł   │ 153,5%            │
├──────────────┴──────────────┴──────────────┴───────────────────┤
│ Kanał        Udział            Kwota       ROI      Zysk       │
│ Social  🔓  ━━━━●━━━ 45%      225 000 zł  [150%]   337 500 zł  │
│ WWW     🔓  ━━━●━━━━ 35%      175 000 zł  [200%]   350 000 zł  │
│ Radio   🔓  ━●━━━━━━ 20%      100 000 zł  [ 80%]    80 000 zł  │
│ Suma: 100% ✓                       [Wyrównaj] [Przywróć preset]│
├──────────────────────────────┬─────────────────────────────────┤
│  (donut: podział budżetu)    │  (słupki: budżet vs przychód)   │
├──────────────────────────────┴─────────────────────────────────┤
│                                    [Zapisz jako scenariusz]    │
└────────────────────────────────────────────────────────────────┘
```

### 7.3 Zasady UX
- **Pierwsze uruchomienie:** od razu ładuje się preset „Zrównoważony” z budżetem przykładowym 500 000 zł. Użytkownik widzi gotowy wynik bez wypełniania formularza.
- **Responsywność:** desktop od 1280 px, tablet, telefon od 360 px. Na telefonie sekcje układają się pionowo, a wykresy mają pełną szerokość.
- **Format liczb:** polski (`1 267 500 zł`, `153,5%`).
- **Język:** wyłącznie polski. Teksty interfejsu trzymane w jednym pliku, ale bez mechanizmu wielu języków w MVP.
- **Motyw jasny i ciemny** zgodny z ustawieniem systemu.

## 8. Wymagania niefunkcjonalne

| ID | Obszar | Wymaganie |
|---|---|---|
| NFR-01 | Wydajność | Pierwsze załadowanie < 2 s na łączu 4G; przeliczenie i odświeżenie wykresów < 100 ms. |
| NFR-02 | Prywatność | Brak backendu i kont. Dane zostają w przeglądarce użytkownika. Brak cookies i brak jakiejkolwiek analityki użycia ani skryptów firm trzecich śledzących użytkownika. |
| NFR-03 | Trwałość danych | Komunikat w aplikacji: dane są zapisane w tej przeglądarce. Wyczyszczenie danych przeglądarki je usuwa, więc warto robić eksport JSON. Przypomnienie o kopii po 5 zapisanych scenariuszach. |
| NFR-04 | Dostępność | WCAG 2.1 AA: kontrast, obsługa klawiaturą (suwaki), etykiety ARIA, tabelaryczna alternatywa dla wykresów. |
| NFR-05 | Przeglądarki | 2 ostatnie wersje Chrome, Edge, Firefox i Safari (desktop i mobile). |
| NFR-06 | Dokładność | Obliczenia na liczbach w groszach lub z zaokrągleniem dopiero przy wyświetlaniu. Suma kwot kanałów zawsze równa budżetowi (różnicę z zaokrągleń dopisujemy do największego kanału). |
| NFR-07 | Jakość | Testy jednostkowe dla modułu obliczeń (100% pokrycia formuł) i testy E2E dla głównych ścieżek (planowanie → zapis → porównanie). |
| NFR-08 | Wersjonowanie danych | Każdy zapisany scenariusz ma pole `schemaVersion`, co umożliwia migrację formatu w kolejnych wersjach. |

## 9. Model danych

```json
{
  "schemaVersion": 1,
  "id": "a3f1c2e0-...-uuid",
  "name": "Wariant A – więcej social",
  "note": "Propozycja na Q-review",
  "createdAt": "2026-10-11T10:00:00Z",
  "updatedAt": "2026-10-11T10:15:00Z",
  "currency": "PLN",
  "totalBudget": 500000,
  "presetId": "balanced",
  "marginMode": { "enabled": false, "grossMarginPct": 40 },
  "channels": [
    { "id": "social", "sharePct": 45, "roiPct": 150, "locked": false },
    { "id": "www",    "sharePct": 35, "roiPct": 200, "locked": false },
    { "id": "radio",  "sharePct": 20, "roiPct": 80,  "locked": false }
  ]
}
```

Wyniki (kwoty, zysk, ROI całkowite) **nie są zapisywane**. Aplikacja liczy je przy każdym otwarciu, więc nie ma ryzyka niespójnych danych.

Plik eksportu: `{ "app": "budget-roi-planner", "exportedAt": "...", "scenarios": [ ... ] }`.

## 10. Proponowana architektura (rekomendacja)

- **Frontend:** React + TypeScript + Vite.
- **Wykresy:** Recharts albo Chart.js (dostępne tooltipy, responsywność).
- **Stan:** Zustand lub React Context. **Zapis:** IndexedDB (np. przez `idb`), localStorage jako rezerwa.
- **Walidacja importu:** Zod (schemat scenariusza).
- **Obliczenia:** osobny, czysty moduł `calc.ts` bez zależności od UI, w pełni pokryty testami (Vitest).
- **Testy E2E:** Playwright.
- **Hosting:** statyczny (np. GitHub Pages, Netlify, Vercel). Brak serwera i bazy danych.
- **PWA (C):** praca offline po pierwszym wejściu.

## 11. Metryki sukcesu

Aplikacja **nie ma analityki użycia** (decyzja właściciela produktu). Sukces oceniamy testami z użytkownikami i opiniami, a nie danymi z aplikacji.

| Metryka | Sposób pomiaru | Cel |
|---|---|---|
| Czas od wejścia do pierwszego wyniku | Test z 5 użytkownikami, pomiar stoperem | mediana < 60 s |
| Przygotowanie i porównanie 3 scenariuszy bez pomocy | Ten sam test, zadanie do wykonania | ≥ 4 z 5 osób |
| Zrozumienie wyniku (ROI całkowite, różnice w porównaniu) | Pytania po teście | ≥ 4 z 5 poprawnych odpowiedzi |
| Błędy obliczeń | Testy automatyczne + zgłoszenia użytkowników | 0 |

## 12. Kryteria akceptacji MVP (wybrane)

1. **Dane:** budżet 500 000 zł i preset „Zrównoważony”. **Wynik:** ROI całkowite 153,5%, zysk 767 500 zł, przychód 1 267 500 zł.
2. **Dane:** udziały 50/30/15 (suma 95%). **Wynik:** komunikat „Pozostało 5%”, przycisk „Zapisz” nieaktywny. Po „Wyrównaj do 100%” suma wynosi 100%.
3. **Dane:** Radio zablokowane na 20%, użytkownik zmienia Social na 55% i klika „Wyrównaj”. **Wynik:** WWW = 25%, Radio = 20%.
4. **Dane:** zapisany scenariusz, odświeżenie strony. **Wynik:** scenariusz jest na liście z tymi samymi wartościami.
5. **Dane:** 3 zaznaczone scenariusze i „Porównaj”. **Wynik:** tabela z różnicami względem scenariusza bazowego, wyróżniony najwyższy ROI, dwa wykresy porównawcze.
6. **Dane:** eksport JSON, wyczyszczenie danych przeglądarki, import pliku. **Wynik:** wszystkie scenariusze odtworzone 1:1.
7. **Dane:** import uszkodzonego pliku JSON. **Wynik:** czytelny komunikat o błędzie, istniejące scenariusze bez zmian.
8. **Dane:** ROI Radia ustawione na −20%. **Wynik:** ostrzeżenie przy kanale, ROI całkowite poprawnie obniżone.

## 13. Ryzyka

| Ryzyko | Wpływ | Mitygacja |
|---|---|---|
| Użytkownik traktuje ROI z presetu jako pewną prognozę | Złe decyzje budżetowe | Widoczne zastrzeżenie przy presetach, sekcja „O metodzie”, zachęta do wpisania własnych danych |
| Model liniowy przeszacowuje zwrot przy dużych budżetach | Przeszacowany wynik | Widełki i ostrzeżenia (5.3); krzywe nasycenia w wersji 2 |
| Utrata danych po wyczyszczeniu przeglądarki | Frustracja użytkownika | Komunikat o lokalnym zapisie, przypomnienia o eksporcie JSON |
| Trudność przypisania sprzedaży do konkretnego kanału (np. radio) | Niedoszacowanie radia | Opis w „O metodzie”; w wersji 2 parametr „efekt wspierający” |

## 14. Decyzje

| Pytanie | Decyzja |
|---|---|
| Profil firmy dla domyślnego podziału | Kilka presetów do wyboru (sekcja 5.2), domyślny „Zrównoważony” |
| Zapis scenariuszy | Lokalnie w przeglądarce + eksport i import JSON, bez kont |
| Analityka użycia | Brak w MVP |
| Język | Tylko polski |
| Źródło wartości ROI w presetach | Założenia startowe (brak danych historycznych), z widocznym zastrzeżeniem; użytkownik koryguje je w aplikacji |
| Akceptacja wartości presetów | Właściciel produktu |

## 15. Roadmapa

| Etap | Zakres |
|---|---|
| **MVP (v1.0)** | Wszystkie wymagania M z sekcji 6, eksport i import JSON, presety, porównanie do 4 scenariuszy |
| **v1.1** | Wymagania S: blokada kanału, kwoty w PLN, ROI na marży, eksport CSV, ostrzeżenia o widełkach |
| **v2.0** | Konta i zapis w chmurze, współdzielenie scenariuszy; podział na miesiące i kwartały z sezonowością; krzywe nasycenia i **optymalizator** (proponuje podział maksymalizujący ROI w zadanych widełkach) |
| **v2.x** | Dodatkowe kanały (TV, outdoor, prasa, influencerzy, e-mail); własne kanały; import rzeczywistych wyników (plan vs wykonanie); eksport PDF; wersja angielska (jeśli pojawi się potrzeba) |
