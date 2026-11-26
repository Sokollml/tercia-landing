(() => {
'use strict';
const d = JSON.parse(document.querySelector('#project-data').textContent);
const app = document.querySelector('main');
const panel = document.querySelector('#panel');
const home = panel.innerHTML;
const nav = document.querySelector('.demo-nav');
const mode = d.type;
const workshop = mode === 'Мебельная мастерская';
const dental = mode === 'Стоматология';
const vet = mode === 'Ветеринарная клиника';
const salon = mode === 'Салон красоты';
const state = { source:'Прямой заход', entry:null, booked:false, draft:0, service:0, specialist:0, slot:0, material:0, photo:'', clicks:0 };
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const action = (label, id, extra='') => '<button type="button" data-action="'+id+'" '+extra+'>'+label+'</button>';
const rows = pairs => pairs.map(p=>'<div class="row"><span>'+esc(p[0])+'</span><strong>'+esc(p[1])+'</strong></div>').join('');
const options = (items, selected=0) => items.map((v,i) => '<option value="'+i+'" '+(i===selected?'selected':'')+'>'+esc(v)+'</option>').join('');
const slots = ['Завтра в 11:30', 'Завтра в 17:30', 'В субботу в 12:00'];
const materials = [
  {name: 'Рогожка', factor: 1},
  {name: 'Велюр', factor: 1.2},
  {name: 'Шенилл', factor: 1.35}
];
const furniturePrices = [18000, 9000, 2500];
const amount = new Intl.NumberFormat('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0});
const field = (id, label, choices, selected) =>
  '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '">' +
  options(choices, selected) + '</select></div>';
const contact = '<div class="field"><label for="contact">Тестовый контакт</label><input id="contact" type="email" value="client@example.com" required></div>';
function photoDrawing(canvas, detail=false){
  canvas.width=560; canvas.height=230;
  const c=canvas.getContext('2d');
  const wall=c.createLinearGradient(0,0,550,190);
  wall.addColorStop(0,'#e1c19a'); wall.addColorStop(1,'#a27958');
  c.fillStyle=wall;c.fillRect(0,0,560,230);
  c.fillStyle='#a0714d';c.fillRect(0,180,560,50);
  function box(x,y,w,h,r,col){c.fillStyle=col;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
  if(detail){c.translate(-185,-91);c.scale(1.68,1.68);}
  box(74,165,400,28,18,'#735b43');
  box(100,172,18,29,5,'#473121');box(438,172,18,29,5,'#473121');
  box(92,67,374,109,19,'#555338');
  for(let n=0;n<3;n++){box(109+n*114,67,109,65,15,['#777748','#79774c','#74724b'][n]);box(103+n*119,127,118,28,12,['#858153','#827d51','#7a764c'][n]);}
  box(72,113,42,67,19,'#66633f');box(446,113,42,67,19,'#66633f');
  c.globalAlpha=.10;
  for(let i=0;i<6200;i++){
    const x=74+(i*971%412), y=72+(i*373%104);
    if((y<113&&(x<101||x>460)))continue;
    c.fillStyle=i%3?'#eedfae':'#16130d';c.fillRect(x,y,1.7,1);
  }
  c.globalAlpha=1;
  return canvas.toDataURL('image/png');
}
function render(view) {
  panel.classList.toggle('workflow', view !== 'site');
  nav.querySelectorAll('[data-action]').forEach(b=>b.setAttribute('aria-current',view===b.dataset.action?'page':'false'));
  switch(view){
    case 'site':
      if(panel.innerHTML!==home) panel.innerHTML=home;
      break;
    case 'form':
      if (salon) {
        renderSalonForm();
      } else {
        renderRequestForm();
      }
      break;
    case 'success':
      panel.innerHTML='<div class="success"><h2>'+(salon?'Тестовая запись подготовлена':'Тестовая заявка принята')+'</h2><p>'+(salon?'Выбранные услуга, мастер и время появились в аналитике записи.':workshop?'Мастер увидит фото, задачу и контакт.':'Запрос ждёт подтверждения администратора.')+'</p>'+action(salon?'Посмотреть аналитику':workshop?'Посмотреть глазами мастера':'Посмотреть глазами администратора','staff')+'</div>';
      break;
    case 'staff':
      panel.innerHTML='<h2>'+(workshop?'Экран мастера':salon?'Учёт переходов к записи':'Экран администратора')+'</h2>'+(state.entry?'<div class="card">'+rows(state.entry)+(workshop&&state.photo?'<img class="preview" alt="Приложенное тестовое изображение" src="'+esc(state.photo)+'">':'')+'</div>':'<p>Пройдите сценарий на вкладке «Сайт», чтобы увидеть результат.</p>')+(!salon&&state.entry?'<div class="model" role="status">'+(state.booked?(workshop?'В работе у мастера':'Тестовое время подтверждено'):(workshop?'Назначен мастер · тестовое уведомление':'Время ожидает подтверждения'))+'</div>'+(state.booked?'':action(workshop?'Взять в работу':'Подтвердить время','confirm')):'')+'<h3 class="list">Счётчик в демо</h3>'+rows([['Площадка',state.entry?state.entry.at(-1)[1]:state.source],[salon?'Переходов к записи':'Заявок',salon?state.clicks:state.entry?1:0]]);
      break;
    case 'maps':
      panel.innerHTML='<h2>Яндекс Карты и 2ГИС</h2><p class="note">Предлагаемый вид карточек. Адрес привязан к месту. Часы, телефон и ссылки для карточек подлежат сверке.</p>'+['Яндекс Карты','2ГИС'].map((p,i)=>'<div class="card"><h3>'+p+'</h3>'+rows([['Адрес',d.address],['Часы',d.hours],['Контакт','client@example.com'],['Переход',d.cta]])+'<div class="actions">'+action('Пройти путь от карточки','source','class="alt" data-index="'+i+'"')+'</div></div>').join('')+'<p><a href="'+d.map+'" target="_blank" rel="noopener">Открыть найденную карточку Яндекса</a></p>';
      break;
    case 'review':
      panel.innerHTML='<h2>Новый отзыв без ответа</h2><p class="note">Вымышленный отзыв · '+esc(d.review[0])+'</p><div class="card"><p>'+esc(d.review[1])+'</p>'+(salon?'<p class="model">Уведомление: администратор салона</p>':'')+(vet&&state.draft>0?'<p class="model">Назначен дежурный администратор</p>':'')+(state.draft>(vet?1:0)?'<div class="model"><strong>'+(state.draft>(vet?2:1)?'Передано на согласование управляющему':'Черновик ответа')+'</strong><p>'+esc(d.review[2])+'</p></div>':'')+'</div>'+(state.draft<(vet?3:2)?action(vet&&!state.draft?'Назначить ответственного':state.draft===(vet?1:0)?'Подготовить черновик':'Передать управляющему','review-action'):'<p class="success">Согласование запрошено в демо.</p>');
      break;
  }
}
function renderSalonForm() {
  const durations = ['45–60 минут', 'до 2,5 часа', '60–90 минут'];
  panel.innerHTML = '<h2>Запись в студию</h2><p class="note">Подберите услугу и время, чтобы пройти тестовый сценарий. Актуальные слоты доступны в карточке студии.</p>' +
    '<form>' + field('service', 'Услуга', d.services.map(item => item[0]), state.service) +
    '<div class="card" id="master" aria-live="polite"></div>' +
    field('time', 'Удобное время в демо', slots, state.slot) +
    '<div class="booking-links"><button type="submit">Проверить запись</button>' +
    '<a class="button secondary" id="booking" href="' + esc(d.map) + '" target="_blank" rel="noopener">Открыть запись в Яндексе</a></div></form>' +
    '<p class="note">Источник: ' + esc(state.source) + '.</p>';
  const select = document.querySelector('#service');
  const time = document.querySelector('#time');
  function refresh() {
    const person = d.people[state.service];
    document.querySelector('#master').innerHTML = '<strong>' + esc(person[0]) + '</strong><span>' +
      esc(person[1]) + '</span><span>' + esc(d.services[state.service][1]) + ' · ' + durations[state.service] + '</span>';
  }
  function recordSelection() {
    state.clicks++;
    state.entry = [
      ['Услуга', d.services[state.service][0]],
      ['Мастер', d.people[state.service][0]],
      ['Время в демо', slots[state.slot]],
      ['Источник', state.source]
    ];
  }
  select.addEventListener('change', () => {
    state.service = Number(select.value);
    refresh();
  });
  time.addEventListener('change', () => { state.slot = Number(time.value); });
  panel.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    recordSelection();
    openView('success');
  });
  document.querySelector('#booking').addEventListener('click', recordSelection);
  refresh();
}

function renderRequestForm() {
  const specialists = ['Любой подходящий специалист', ...d.people.map(person => person[0])];
  const names = workshop ? ['Диван', 'Кресло', 'Стул'] : d.services.map(item => item[0]);
  const photoFields = '<div class="field"><label for="photo">Тестовое фото мебели</label><input id="photo" type="file" accept="image/*"><div class="actions">' +
    action('Прикрепить образец', 'sample', 'class="alt"') +
    '</div><div id="preview"></div></div><div class="field"><label for="task">Что нужно сделать</label>' +
    '<textarea id="task" required>Заменить обивку, проверить наполнитель.</textarea></div>';
  const visitFields = (dental ? field('specialist', 'Врач', specialists, state.specialist) : '') +
    (vet ? field('pet', 'Питомец', ['Собака', 'Кошка', 'Другой питомец'], 0) : '') +
    field('time', 'Удобное время в демо', slots, state.slot);
  panel.innerHTML = '<h2>' + esc(d.cta) + '</h2><p class="note">Используйте тестовые данные. Источник: ' +
    esc(state.source) + '.</p><form>' +
    field('service', workshop ? 'Что ремонтируем' : 'Направление', names, state.service) +
    (workshop ? field('material', 'Обивочная ткань', materials.map(item => item.name), state.material) +
      '<div class="estimate"><p>Предварительно от <output id="estimate" for="service material" aria-live="polite"></output></p>' +
      '<p class="note">Тестовый расчёт по предмету и ткани. Дополнительные работы мастер оценивает отдельно.</p></div>' +
      photoFields : visitFields) + contact +
    '<button type="submit">Отправить тестовый запрос</button><p id="feedback" role="status"></p></form>';

  const service = document.querySelector('#service');
  const value = id => document.querySelector('#' + id).value;
  const choice = id => document.querySelector('#' + id).selectedOptions[0].textContent;
  service.addEventListener('change', () => {
    state.service = Number(service.value);
    if (workshop) showEstimate();
  });
  function showEstimate() {
    document.querySelector('#estimate').value = amount.format(furniturePrices[state.service] * materials[state.material].factor);
  }

  if (workshop) {
    const material = document.querySelector('#material');
    material.addEventListener('change', () => { state.material = Number(material.value); showEstimate(); });
    document.querySelector('#photo').addEventListener('change', event => {
      const file = event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        document.querySelector('#feedback').textContent = 'Выберите файл изображения.';
        return;
      }
      if (state.photo.startsWith('blob:')) URL.revokeObjectURL(state.photo);
      state.photo = URL.createObjectURL(file);
      showPreview();
    });
    showEstimate();
    showPreview();
  }

  panel.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    if (workshop && !state.photo) {
      document.querySelector('#feedback').textContent = 'Прикрепите тестовое фото или образец.';
      return;
    }
    const subject = [[workshop ? 'Предмет' : 'Направление', choice('service')]];
    const details = workshop
      ? [['Ткань', materials[state.material].name], ['Ориентир', value('estimate')], ['Работа', value('task')]]
      : [['Время', choice('time')]];
    if (dental) details.push(['Врач', choice('specialist')]);
    if (vet) details.push(['Питомец', choice('pet')]);
    state.entry = [...subject, ...details, ['Контакт', value('contact')], ['Источник', state.source]];
    state.booked = false;
    openView('success');
  });
}

function showPreview(){
  document.querySelector('#preview').innerHTML=state.photo?'<img class="preview" alt="Выбранное тестовое изображение" src="'+esc(state.photo)+'">':'';
  document.querySelector('#feedback').textContent=state.photo?'Фото приложено.':'';
}
app.onclick=e=>{
  if(e.target.closest('[data-home-link]') && panel.classList.contains('workflow')) render('site');
  const b=e.target.closest('[data-action]');
  if(!b)return;
  const a=b.dataset.action;
  if(a==='sample'){if(state.photo.startsWith('blob:'))URL.revokeObjectURL(state.photo);state.photo=photoDrawing(document.createElement('canvas'),true);showPreview();return;}
  if(a==='source'){state.source=b.dataset.index==='0'?'Яндекс Карты':'2ГИС';if(salon)state.service=1;openView('form');return;}
  if(a==='service'){state.service=Number(b.dataset.index);if(dental)state.specialist=0;openView('form');return;}
  if(a==='specialist'){state.specialist=Number(b.dataset.index)+1;state.service=0;openView('form');return;}
  if(a==='call'){document.querySelector('#call-state').textContent='Для реального обращения откройте карточку клиники по ссылке в разделе «Контакты». В демо звонок не совершается.';return;}
  if(a==='confirm'){state.booked=true;render('staff');return;}
  if(a==='review-action'){state.draft++;render('review');return;}
  openView(a);
};

function openView(view) {
  render(view);
  panel.focus({preventScroll: true});
  panel.scrollIntoView({block: 'start'});
}
nav.innerHTML=action('Сайт','site')+action(salon?'Аналитика записи':'Кабинет сотрудника','staff')+action('Карты','maps')+(d.review?action('Отзывы','review'):'');
render('site');

})();
