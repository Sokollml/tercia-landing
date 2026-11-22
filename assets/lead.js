/* Форма заявки: прямая отправка + мессенджеры запасным путём.
   Один файл на все страницы — поля везде одинаковые:
   #lead, #f-name, #f-phone, #f-task, #f-ok, #f-status.

   ENDPOINT — адрес приёмника заявок. Пока пусто, прямой отправки нет
   и работают только мессенджеры: так было до этой правки.
   Заполнить — и кнопка «Отправить заявку» включится сама.
   Приёмник должен быть на российском сервере: персональные данные
   граждан России обрабатываются только в РФ (ч. 5 ст. 18 152-ФЗ). */
(function () {
  var ENDPOINT = '';
  var WA = '79166649555', TG = 'tercia_it';

  var form = document.getElementById('lead'); if (!form) return;
  var box = document.getElementById('f-status');
  var sendBtn = form.querySelector('[data-send]');
  var waBtn = form.querySelector('[data-wa]');
  var tgBtn = form.querySelector('[data-tg]');
  var altRow = form.querySelector('[data-alt]');
  var busy = false;
  var reqId = newId();

  /* стили только для того, что добавилось */
  var css = document.createElement('style');
  css.textContent =
    '.alt-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;font-size:13.6px;color:var(--muted-2)}' +
    '.alt-row .btn{padding:9px 16px;font-size:13.5px}' +
    '[data-send][disabled]{opacity:.6;pointer-events:none}';
  document.head.appendChild(css);

  /* без приёмника прямой отправки нет — оставляем прежнее поведение */
  if (!ENDPOINT && sendBtn) {
    sendBtn.hidden = true;
    if (altRow) altRow.querySelector('[data-alt-label]') &&
      (altRow.querySelector('[data-alt-label]').textContent = 'Отправьте заявку в мессенджер:');
  }

  function newId() {
    return 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function val(id) { var el = document.getElementById(id); return el ? (el.value || '').trim() : ''; }
  function say(m, ok) {
    box.textContent = m;
    box.classList.add('on');
    box.style.border = '1px solid ' + (ok ? 'rgba(84,224,138,.3)' : 'rgba(255,138,107,.35)');
    box.style.background = ok ? 'rgba(84,224,138,.08)' : 'rgba(255,138,107,.08)';
    box.style.color = ok ? '#54E08A' : '#FF8A6B';
  }
  function valid() {
    if (!val('f-name')) { say('Напишите, как к вам обращаться.', false); return false; }
    if (!val('f-phone')) { say('Оставьте телефон или адрес сайта — иначе не сможем ответить.', false); return false; }
    var ok = document.getElementById('f-ok');
    if (ok && !ok.checked) { say('Отметьте согласие на обработку данных.', false); return false; }
    return true;
  }
  function compose() {
    var t = 'Заявка с сайта tercia.dev\n';
    t += 'Имя: ' + val('f-name') + '\nКонтакт: ' + val('f-phone') + '\n';
    if (val('f-task')) t += 'Задача: ' + val('f-task') + '\n';
    return t;
  }

  /* ---------- прямая отправка ---------- */
  function sendDirect() {
    if (busy) return;                      /* второе нажатие игнорируем */
    if (!valid()) return;
    busy = true;
    if (sendBtn) { sendBtn.disabled = true; sendBtn.dataset.label = sendBtn.textContent; sendBtn.textContent = 'Отправляем…'; }
    say('Отправляем заявку…', true);

    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { ctrl && ctrl.abort(); }, 15000);

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({
        requestId: reqId,              /* тот же id при повторе — приёмник отсеет дубль */
        page: location.pathname,
        name: val('f-name'),
        contact: val('f-phone'),
        task: val('f-task')
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      clearTimeout(timer);
      say('Заявка принята. Ответим в рабочее время, обычно в тот же день. Если срочно — напишите в Telegram.', true);
      form.reset();
      reqId = newId();                 /* следующая заявка — уже новая */
      restore();
    }).catch(function () {
      clearTimeout(timer);
      say('Не получилось отправить — похоже, пропала связь. Напишите в Telegram @tercia_it или на info@tercia.dev, мы ответим.', false);
      restore();
    });
  }
  function restore() {
    busy = false;
    if (sendBtn) { sendBtn.disabled = false; if (sendBtn.dataset.label) sendBtn.textContent = sendBtn.dataset.label; }
  }

  /* ---------- мессенджеры ---------- */
  function sendMsg(ch) {
    if (!valid()) return;
    var text = compose();
    if (ch === 'wa') {
      window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      say('Открыли WhatsApp — текст заявки уже подставлен, нажмите «отправить».', true);
    } else {
      var go = function () {
        window.open('https://t.me/' + TG, '_blank', 'noopener');
        say('Текст заявки скопирован. Открыли Telegram — вставьте его в чат и отправьте.', true);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(go, go);
      else go();
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (ENDPOINT) sendDirect(); else sendMsg('wa');
  });
  if (waBtn) waBtn.addEventListener('click', function () { sendMsg('wa'); });
  if (tgBtn) tgBtn.addEventListener('click', function () { sendMsg('tg'); });
})();
