(() => {
  'use strict';
  const form = document.querySelector('#inquiry-form');
  const fields = form.elements;
  const queue = document.querySelector('#queue');
  const status = document.querySelector('#status');
  const empty = document.querySelector('#empty');
  const received = document.querySelector('#received');
  const duplicates = document.querySelector('#duplicates');
  const errors = document.querySelector('#errors');
  const requests = new Set();

  function announce(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const subject = fields.subject.value.trim();
    const email = fields.email.value.trim().toLowerCase();
    if (!subject) {
      fields.subject.focus();
      announce('Введите тему заявки.', 'error');
      return;
    }
    const key = JSON.stringify([subject, email]);
    if (requests.has(key)) {
      duplicates.textContent = Number(duplicates.textContent) + 1;
      announce('Повтор обработан. В очереди осталась исходная заявка.', 'success');
      return;
    }

    requests.add(key);
    received.textContent = requests.size;
    empty.hidden = true;
    const row = document.createElement('li');
    const title = document.createElement('strong');
    const details = document.createElement('span');
    title.textContent = subject;
    const reference = 'INQ-' + String(requests.size).padStart(3, '0');
    details.textContent = reference + ' · ' + email + ' · Ответственная Мария';
    row.append(title, details);
    queue.append(row);
    announce('Тестовая заявка принята, уведомление создано.', 'success');
  });

  document.querySelector('#error').addEventListener('click', () => {
    errors.textContent = Number(errors.textContent) + 1;
    announce('Не удалось подтвердить отправку. Повторите попытку.', 'error');
  });

  document.querySelector('#reset').addEventListener('click', () => {
    requests.clear();
    for (const metric of [received, duplicates, errors]) metric.textContent = '0';
    queue.replaceChildren();
    empty.hidden = false;
    form.reset();
    announce('Готово к тестовой отправке.', '');
  });
})();
