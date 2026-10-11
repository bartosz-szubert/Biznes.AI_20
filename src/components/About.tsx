import { CHANNELS } from '../domain/channels';
import { PRESETS } from '../domain/presets';
import { CHANNEL_IDS } from '../domain/types';

export function About() {
  return (
    <section className="card about" aria-labelledby="about-title">
      <h2 id="about-title">O metodzie</h2>
      <p>
        Aplikacja pokazuje <strong>prognozę</strong> zwrotu z inwestycji na podstawie założeń, które wpisujesz. To nie jest gwarancja wyniku ani doradztwo finansowe.
      </p>

      <h3>Wzory</h3>
      <div className="formula">
        Budżet kanału = Budżet roczny × udział<br />
        Zysk kanału = Budżet kanału × ROI kanału<br />
        Przychód kanału = Budżet kanału + Zysk kanału<br />
        ROI całkowite = Zysk całkowity / Budżet całkowity (= Σ udział × ROI kanału)<br />
        ROAS = Przychód całkowity / Budżet całkowity
      </div>

      <h3>Kanały</h3>
      <dl>
        {CHANNEL_IDS.map((id) => (
          <div key={id}>
            <dt>{CHANNELS[id].name}</dt>
            <dd>{CHANNELS[id].description}</dd>
          </div>
        ))}
      </dl>

      <h3>Presety</h3>
      <p>
        Presety to zbalansowane punkty startowe, a nie maksymalizacja ROI. Każdy kanał ma swoje widełki udziału, bo każda kolejna złotówka w tym samym kanale przynosi mniej (nasycenie odbiorców), a rozłożenie budżetu zmniejsza ryzyko.
      </p>
      <ul>
        {PRESETS.map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong> – {p.description}
          </li>
        ))}
      </ul>
      <p className="legend-note">
        Wartości ROI w presetach to założenia startowe, nie dane rynkowe. Zanim podejmiesz decyzję, skoryguj je na podstawie własnych wyników z poprzednich kampanii.
      </p>

      <h3>Prywatność i dane</h3>
      <p>
        Aplikacja działa w całości w Twojej przeglądarce. Scenariusze zapisują się lokalnie i nie są wysyłane na serwer. Wyczyszczenie danych przeglądarki je usuwa, więc regularnie eksportuj je do pliku JSON.
      </p>
    </section>
  );
}
