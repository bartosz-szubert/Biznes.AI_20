// Okna dialogowe w stronie. Zastępują window.confirm / prompt, które nie działają
// w podglądzie artefaktu w claude.ai (zwracają od razu „anuluj”).

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Pokazuje okno. Zwraca Promise:
 * - potwierdzenie: true / false,
 * - pole tekstowe (input): wpisany tekst albo null,
 * - tekst tylko do odczytu (textarea): null po zamknięciu.
 */
export function openDialog({
  title,
  message = '',
  input = null,
  textarea = null,
  okLabel = 'OK',
  cancelLabel = 'Anuluj',
  copy = false,
}) {
  const dialog = document.getElementById('dialog');
  return new Promise((resolve) => {
    dialog.innerHTML = `
      <h2 id="dialog-title">${esc(title)}</h2>
      ${message ? `<p class="muted">${esc(message)}</p>` : ''}
      ${input !== null ? `<input type="text" id="dlg-input" maxlength="60" value="${esc(input)}" aria-label="${esc(title)}" />` : ''}
      ${textarea !== null ? `<textarea id="dlg-text" readonly rows="12" aria-label="${esc(title)}">${esc(textarea)}</textarea>` : ''}
      <div class="row dialog-actions">
        ${copy ? '<button type="button" id="dlg-copy">Kopiuj do schowka</button>' : ''}
        ${cancelLabel ? `<button type="button" id="dlg-cancel">${esc(cancelLabel)}</button>` : ''}
        <button type="button" id="dlg-ok" class="primary">${esc(okLabel)}</button>
      </div>`;

    const cancelValue = input !== null || textarea !== null ? null : false;
    const finish = (value) => {
      if (dialog.open) dialog.close();
      resolve(value);
    };

    dialog.querySelector('#dlg-ok').addEventListener('click', () => {
      if (input !== null) return finish(dialog.querySelector('#dlg-input').value);
      if (textarea !== null) return finish(null);
      finish(true);
    });
    dialog.querySelector('#dlg-cancel')?.addEventListener('click', () => finish(cancelValue));
    dialog.oncancel = (e) => {
      e.preventDefault();
      finish(cancelValue);
    };

    if (copy) {
      const btn = dialog.querySelector('#dlg-copy');
      const area = dialog.querySelector('#dlg-text');
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(area.value);
          btn.textContent = 'Skopiowano';
        } catch {
          // Schowek bywa zablokowany – zaznaczamy tekst, żeby użytkownik skopiował ręcznie.
          area.focus();
          area.select();
          btn.textContent = 'Zaznaczono – skopiuj Ctrl+C';
        }
      });
    }

    dialog.showModal();
    (dialog.querySelector('#dlg-input') ?? dialog.querySelector('#dlg-text') ?? dialog.querySelector('#dlg-ok')).focus();
  });
}
