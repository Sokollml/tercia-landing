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
  const priorityFilter = document.querySelector('#queue-priority');
  const ownerFilter = document.querySelector('#queue-owner');
  const seedButton = document.querySelector('#seed-inbox');
  const storageKey = 'tercia-inquiry-desk-v2';
  const team = ['Мария','Алексей','Ирина'];
  const displayTime = new Intl.DateTimeFormat('ru',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'});
  let saved = {};
  try { saved=JSON.parse(sessionStorage.getItem(storageKey)) || {}; } catch {}
  const requests = new Map(Array.isArray(saved.requests)?saved.requests:[]);
  duplicates.textContent=saved.duplicates||0;
  errors.textContent=saved.errors||0;

  function persist() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        requests:[...requests],duplicates:Number(duplicates.textContent),errors:Number(errors.textContent)
      }));
    } catch {}
  }

  function log(ticket,text) {
    ticket.history.push({text,at:new Date().toISOString()});
    persist();
  }
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

  function buildDetails(ticket) {
    const detail = node('details', '', 'ticket-details');
    const heading = node('summary', 'Открыть карточку');
    const body = node('p', ticket.description || 'Описание не добавлено.');
    const meta = node('p', 'Создана '+displayTime.format(new Date(ticket.created))+' · '+ticket.email);
    const history = node('ol', '', 'ticket-notes');
    history.setAttribute('aria-label', 'История заявки');
    function updateHistory() {
      history.replaceChildren(...ticket.history.slice().reverse().map(item =>
        node('li', displayTime.format(new Date(item.at))+' · '+item.text)
      ));
    }
    updateHistory();
    const actions = node('div','','ticket-assign');
    function setting(label, options, initial, change) {
      const target=node('label',label);
      const choice=node('select','');
      for(const value of options) {
        const option=node('option',value||'Не назначен');
        option.value=value;
        choice.append(option);
      }
      choice.value=initial;
      choice.addEventListener('change',()=>change(choice.value));
      target.append(choice);
      return target;
    }
    actions.append(
      setting('Ответственный',['',...team],ticket.owner,value=>{
        ticket.owner=value;
        log(ticket,value?'Назначен сотрудник: '+value:'Назначение снято');
        renderQueue(ticket.id);
      }),
      setting('Приоритет',['Обычный','Высокий'],ticket.priority,value=>{
        ticket.priority=value;
        log(ticket,'Приоритет: '+value);
        renderQueue(ticket.id);
      })
    );
    const noteForm = node('form', '', 'ticket-note-form');
    const label = node('label', 'Внутренняя заметка');
    const input = node('input', '');
    input.id = 'note-' + ticket.id;
    input.required = true;
    input.maxLength = 280;
    label.htmlFor = input.id;
    const send = node('button', 'Добавить заметку', 'secondary');
    send.type = 'submit';
    const feedback = node('p', '', 'note-status');
    feedback.setAttribute('role', 'status');
    noteForm.addEventListener('submit', event => {
      event.preventDefault();
      const note = input.value.trim();
      if (!note) {
        input.focus();
        feedback.textContent = 'Введите текст заметки.';
        return;
      }
      log(ticket,'Заметка: '+note);
      updateHistory();
      input.value = '';
      feedback.textContent = 'Заметка добавлена.';
    });
    noteForm.append(label, input, send, feedback);
    detail.append(heading, body, meta, actions, history, noteForm);
    return detail;
  }

  function renderQueue(openId='') {
    if (typeof openId!=='string') openId='';
    const search = query.value.trim().toLowerCase();
    const visible = [...requests.values()].filter(ticket =>
      (!filter.value || ticket.state === filter.value) &&
      (!priorityFilter.value || priorityFilter.value===ticket.priority) &&
      (!ownerFilter.value || ownerFilter.value===(ticket.owner||'none')) &&
      [ticket.id, ticket.subject, ticket.email, ticket.category, ticket.priority, ticket.owner].some(value => value.toLowerCase().includes(search))
    );

    received.textContent=requests.size;
    seedButton.hidden=[...requests.values()].some(ticket=>ticket.example);
    queue.replaceChildren(...visible.slice().reverse().map(ticket => {
      const state = states[ticket.state];
      const row = node('li', '');
      const header = node('div', '', 'queue-row-header');
      const heading = node('strong', ticket.subject);
      const badge = node('span', state.label, 'ticket-status');
      badge.dataset.state = ticket.state;
      header.append(heading, badge);
      const details = node('span', [ticket.id, ticket.category, ticket.priority, ticket.email].join(' · '));
      const owner = node('span', ticket.owner ? 'Ответственный: '+ticket.owner : 'Ответственный не назначен');
      const action = node('button', state.action, 'secondary ticket-action');
      action.type = 'button';
      action.dataset.ticketAction = ticket.id;
      action.setAttribute('aria-label', state.action + ' ' + ticket.id);
      action.addEventListener('click', () => {
        ticket.state = state.next;
        if (ticket.state==='active' && !ticket.owner) ticket.owner=team[0];
        log(ticket,'Статус: '+states[ticket.state].label);
        renderQueue();
        const nextAction = [...queue.querySelectorAll('button')].find(button =>
          button.dataset.ticketAction === ticket.id
        );
        (nextAction || filter).focus();
      });
      const card=buildDetails(ticket);
      card.open=ticket.id===openId;
      row.append(header, details, owner, card, action);
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
    const priority = fields.priority.value;
    const description = fields.description.value.trim();
    const key = JSON.stringify([subject.toLowerCase(), email, category, priority, description]);
    const existing = requests.get(key);
    if (existing) {
      duplicates.textContent = Number(duplicates.textContent) + 1;
      persist();
      announce('Заявка ' + existing.id + ' уже есть в очереди. Повтор не добавлен.', 'success');
      return;
    }

    const id = 'INQ-' + String(requests.size + 1).padStart(3, '0');
    const created=new Date().toISOString();
    requests.set(key,{id,subject,email,category,priority,description,state:'new',owner:'',created,history:[{at:created,text:'Заявка создана'}]});
    persist();
    received.textContent = requests.size;
    renderQueue();
    announce('Тестовая заявка ' + id + ' принята.', 'success');
  });

  query.addEventListener('input', renderQueue);
  for (const control of [filter,priorityFilter,ownerFilter]) control.addEventListener('change',renderQueue);
  seedButton.addEventListener('click',()=>{
    if ([...requests.values()].some(ticket=>ticket.example)) return;
    const created=new Date().toISOString();
    const subjects=['Пополнить упаковку на складе','Уточнить дату поставки','Заменить сканер на выдаче'];
    const descriptions=['Нужен тираж от 100 единиц. Запросить предложение у поставщика.','Ожидаем подтверждение перевозчика. Сверить время разгрузки.','Сканер работает нестабильно. Проверить доступность замены.'];
    subjects.forEach((subject,i)=>{
      const id='INQ-'+String(requests.size+1).padStart(3,'0');
      requests.set('sample-'+i,{id,subject,email:'demo'+(i+1)+'@example.com',category:['Закупки','Логистика','Поддержка'][i],
        priority:i===1?'Высокий':'Обычный',description:descriptions[i],owner:i?team[i-1]:'',
        state:['new','active','done'][i],created,example:true,history:[{at:created,text:'Добавлен тестовый пример'}]});
    });
    persist();
    renderQueue();
  });

  document.querySelector('#error').addEventListener('click', () => {
    errors.textContent = Number(errors.textContent) + 1;
    persist();
    announce('Не удалось подтвердить отправку. Повторите попытку.', 'error');
  });

  document.querySelector('#reset').addEventListener('click', () => {
    for (const control of [query,filter,priorityFilter,ownerFilter]) control.value='';
    renderQueue();
  });
  const workspace = document.querySelector('#workspace-panels');
  const requestPanel = document.querySelector('#request');
  const queuePanel = document.querySelector('#queue-panel');
  const views = [...document.querySelectorAll('[data-view]')];

  function openView(view) {
    requestPanel.hidden = view === 'inbox';
    queuePanel.hidden = view === 'form';
    workspace.classList.toggle('one-panel', view !== 'overview');
    for (const link of views) {
      if (link.closest('nav')) {
        if (link.dataset.view === view) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    }
  }
  function readView() {
    const view = new URLSearchParams(window.location.search).get('view');
    openView(view === 'inbox' || view === 'form' ? view : 'overview');
  }
  for (const link of views) {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      window.history.pushState(null, '', link.href);
      openView(link.dataset.view);
    });
  }
  window.addEventListener('popstate', readView);
  readView();
  renderQueue();
})();
