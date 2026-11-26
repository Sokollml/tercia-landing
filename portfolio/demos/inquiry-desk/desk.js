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
  const query = document.querySelector('#queue-search');
  const filter = document.querySelector('#queue-filter');
  const summary = document.querySelector('#queue-summary');
  const requests = new Map();
  const states = {
    new: {label: 'Новая', next: 'active', action: 'Взять в работу'},
    active: {label: 'В работе', next: 'done', action: 'Закрыть заявку'},
    done: {label: 'Закрыта', next: 'active', action: 'Вернуть в работу'}
  };

  function announce(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  function node(tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function renderQueue() {
    const search = query.value.trim().toLowerCase();
    const visible = [...requests.values()].filter(ticket =>
      (!filter.value || ticket.state === filter.value) &&
      [ticket.id, ticket.subject, ticket.email, ticket.category].some(value => value.toLowerCase().includes(search))
    );

    queue.replaceChildren(...visible.map(ticket => {
      const state = states[ticket.state];
      const row = node('li', '');
      const header = node('div', '', 'queue-row-header');
      const heading = node('strong', ticket.subject);
      const badge = node('span', state.label, 'ticket-status');
      badge.dataset.state = ticket.state;
      header.append(heading, badge);
      const details = node('span', [ticket.id, ticket.category, ticket.email].join(' · '));
      const owner = node('span', ticket.state === 'new' ? 'Ответственный не назначен' : 'Ответственная: Мария');
      const action = node('button', state.action, 'secondary ticket-action');
      action.type = 'button';
      action.setAttribute('aria-label', state.action + ' ' + ticket.id);
      action.addEventListener('click', () => {
        ticket.state = state.next;
        renderQueue();
        const nextAction = [...queue.querySelectorAll('button')].find(button =>
          button.getAttribute('aria-label').endsWith(ticket.id)
        );
        (nextAction || filter).focus();
      });
      row.append(header, details, owner, action);
      return row;
    }));

    empty.hidden = visible.length > 0;
    empty.textContent = requests.size ? 'По этим фильтрам заявок нет.' : 'Здесь появится заявка после отправки.';
    summary.textContent = requests.size ? 'Показано ' + visible.length + ' из ' + requests.size : '';
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
    const category = fields.category.value;
    const key = JSON.stringify([subject.toLowerCase(), email, category]);
    const existing = requests.get(key);
    if (existing) {
      duplicates.textContent = Number(duplicates.textContent) + 1;
      announce('Заявка ' + existing.id + ' уже есть в очереди. Повтор не добавлен.', 'success');
      return;
    }

    const id = 'INQ-' + String(requests.size + 1).padStart(3, '0');
    requests.set(key, {id, subject, email, category, state: 'new'});
    received.textContent = requests.size;
    renderQueue();
    announce('Тестовая заявка ' + id + ' принята.', 'success');
  });

  query.addEventListener('input', renderQueue);
  filter.addEventListener('change', renderQueue);

  document.querySelector('#error').addEventListener('click', () => {
    errors.textContent = Number(errors.textContent) + 1;
    announce('Не удалось подтвердить отправку. Повторите попытку.', 'error');
  });

  document.querySelector('#reset').addEventListener('click', () => {
    requests.clear();
    for (const metric of [received, duplicates, errors]) metric.textContent = '0';
    query.value = '';
    filter.value = '';
    form.reset();
    renderQueue();
    announce('Готово к тестовой отправке.', '');
  });
})();
