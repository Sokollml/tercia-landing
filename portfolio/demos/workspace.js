(() => {
  'use strict';

  const money = new Intl.NumberFormat('ru', {style:'currency',currency:'RUB',maximumFractionDigits:0});
  const prettyDate = date => new Intl.DateTimeFormat('ru', {day:'numeric',month:'long',weekday:'short',timeZone:'UTC'})
    .format(new Date(date + 'T12:00:00Z'));
  const timestamp = () => new Date().toISOString();
  const clock = new Intl.DateTimeFormat('ru', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'});
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  const times = ['10:00','11:30','13:00','14:30','16:00','17:30','19:00'];
  const fabrics = [{name:'Рогожка',factor:1},{name:'Велюр',factor:1.2},{name:'Шенилл',factor:1.35}];
  const basePrices = [18000,9000,2500];
  const serviceDurations = [60,150,90];

  function dateOptions() {
    const today = new Intl.DateTimeFormat('sv', {timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const start = new Date(today + 'T12:00:00Z');
    return Array.from({length:10}, (_, index) =>
      new Date(start.getTime() + (index + 1) * 86400000).toISOString().slice(0,10));
  }

  function useSession(key, fallback) {
    let value = fallback;
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) value = JSON.parse(saved);
    } catch {}
    return {
      value,
      save() {
        try { sessionStorage.setItem(key, JSON.stringify(value)); }
        catch { /* The current page remains usable without browser storage. */ }
      }
    };
  }

  function button(label, action, attrs='') {
    return '<button type="button" data-work="'+action+'" '+attrs+'>'+safe(label)+'</button>';
  }

  function input(name, label, value, attrs='', type='text') {
    return '<label class="ws-field"><span>'+safe(label)+'</span><input type="'+type+'" name="'+name+'" value="'+safe(value)+'" '+attrs+'></label>';
  }

  function select(name, label, list, current) {
    const options = list.map(item => '<option value="'+safe(item[0])+'"'+(String(current) === String(item[0]) ? ' selected' : '')+'>'+safe(item[1])+'</option>').join('');
    return '<label class="ws-field"><span>'+safe(label)+'</span><select name="'+name+'">'+options+'</select></label>';
  }
  const indexed = values => values.map((value,index) => [index,value]);

  function area(name, label, value, attrs='') {
    return '<label class="ws-field"><span>'+safe(label)+'</span><textarea name="'+name+'" rows="3" maxlength="800" '+attrs+'>'+safe(value)+'</textarea></label>';
  }

  function details(rows) {
    return '<dl class="ws-data">'+rows.map(([key,value]) =>
      '<div><dt>'+safe(key)+'</dt><dd>'+safe(value)+'</dd></div>').join('')+'</dl>';
  }

  function heading(kicker, title, description) {
    return '<header class="ws-head"><span>'+safe(kicker)+'</span><h1>'+safe(title)+'</h1><p>'+safe(description)+'</p></header>';
  }

  function compressPhoto(file) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      return Promise.reject(new Error('Выберите JPG, PNG или WebP размером до 8 МБ.'));
    }
    return new Promise((resolve,reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 480 / Math.max(image.width,image.height));
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          const context = canvas.getContext('2d');
          context.fillStyle = '#fff';
          context.fillRect(0,0,canvas.width,canvas.height);
          context.drawImage(image,0,0,canvas.width,canvas.height);
          resolve({name:file.name,src:canvas.toDataURL('image/jpeg',.7)});
        } catch { reject(new Error('Не удалось подготовить изображение.')); }
        finally { URL.revokeObjectURL(url); }
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Не удалось открыть изображение.'));
      };
      image.src = url;
    });
  }

  window.createTerciaWorkspace = function createWorkspace({project, panel, siteUrl, onView}) {
    const company = project.brand;
    const workshop = project.type === 'Мебельная мастерская';
    const dental = project.type === 'Стоматология';
    const salon = project.type === 'Салон красоты';
    const vet = !workshop && !dental && !salon;
    const key = 'tercia-workspace-v1:' + company;
    const store = useSession(key,{sequence:0,tickets:[]});
    const database = store.value;
    const statuses = {
      new: workshop ? 'Новая' : 'Ожидает подтверждения',
      active: workshop ? 'В работе' : 'Подтверждена',
      done: workshop ? 'Выполнена' : 'Визит завершён',
      cancelled: 'Отменена'
    };
    const staffName = workshop ? 'Кабинет мастера' : 'Кабинет администратора';
    const serviceNames = workshop ? ['Диван','Кресло','Стул'] : project.services.map(service => service[0]);
    const stepNames = workshop ? ['Мебель и ткани','Фотографии и контакт','Проверка']
      : ['Услуга и специалист','Время и контакт','Проверка'];
    const todayOptions = dateOptions();
    const prefs = new URLSearchParams(location.search);
    function index(value, size) {
      const number = Number(value);
      return Number.isInteger(number) && number >= 0 && number < size ? number : 0;
    }
    const hasSpecialist = prefs.has('specialist') && project.people.length > 0;
    const draft = {
      service:index(prefs.get('service'),serviceNames.length), material:index(prefs.get('material'),fabrics.length),
      specialist:hasSpecialist ? index(prefs.get('specialist'),project.people.length)+1 : 0,
      date:todayOptions[0],time:'',quantity:1,condition:'Только обивка',delivery:'Обсудить с мастером',
      pet:'Собака',petName:'',first:'Первый визит',name:'',email:'',phone:'',comment:'',
      source:'Сайт',photos:[]
    };
    let currentStep=0;
    let currentView='form';
    let selectedId='';
    let lastId='';
    let returnAfterEdit=false;
    let uploadsPending=false;
    let estimateNotice='';
    let staffQuery='';
    let staffStatus='all';
    let staffSort='recent';
    let staffDate='';
    let staffMessage='';

    const specialists = ['Подберёт администратор',...project.people.map(person => person[0])];
    const estimate = value => Math.round(basePrices[value.service] * fabrics[value.material].factor * Number(value.quantity));
    const assignment = value => salon ? project.people[value.service][0] : dental ? specialists[value.specialist] : 'Дежурный врач';
    const duration = value => salon ? serviceDurations[value.service] : dental ? 60 : 30;
    const service = value => serviceNames[value.service];
    const toMinutes = time => (Number(time.slice(0,2))*60 + Number(time.slice(3)));
    const sameCalendar = (ticket, value) => {
      if (salon) return assignment(ticket) === assignment(value);
      return !dental || assignment(ticket) === assignment(value) || ticket.specialist === 0 || value.specialist === 0;
    };

    function available(value, ignoredId='') {
      return times.filter(time => {
        const start = toMinutes(time);
        const finish = start + duration(value);
        return finish <= 21*60 && !database.tickets.some(ticket =>
          ticket.id !== ignoredId && (ticket.status === 'new' || ticket.status === 'active') &&
          ticket.date === value.date && sameCalendar(ticket,value) && ticket.time &&
          start < toMinutes(ticket.time) + duration(ticket) && toMinutes(ticket.time) < finish
        );
      });
    }

    function summaryRows(value, includeContact=false) {
      const rows = workshop
        ? [['Предмет',service(value)],['Ткань',fabrics[value.material].name],['Количество',value.quantity],
          ['Объём работ',value.condition],['Передача мебели',value.delivery],['Оценка от',money.format(estimate(value))]]
        : [['Услуга',service(value)],['Специалист',assignment(value)],['Дата и время',value.time ? prettyDate(value.date)+' · '+value.time : prettyDate(value.date)],
          ['Длительность',duration(value)+' мин.']];
      if (vet) rows.push(['Питомец',value.pet+(value.petName ? ' · '+value.petName : '')],['Тип визита',value.first]);
      if (includeContact) rows.push(['Клиент',value.name],['Email',value.email],['Телефон',value.phone || '—'],['Источник',value.source]);
      return rows;
    }

    const badge = status => '<span class="ws-badge" data-status="'+status+'">'+safe(statuses[status])+'</span>';
    const photoGrid = (photos, removable=false) => '<div class="ws-photos">'+photos.map((photo,i) =>
      '<figure><img alt="'+safe(photo.name)+'" src="'+safe(photo.src)+'"><figcaption>'+safe(photo.name)+
      (removable ? button('Убрать','photo-remove','data-index="'+i+'" class="alt"') : '')+'</figcaption></figure>').join('')+'</div>';

    function setView(view, focus=true) {
      currentView=view;
      onView(view,focus);
    }

    function serviceStep() {
      const cards = serviceNames.map((name,i) => '<label class="ws-choice"><input type="radio" name="service" value="'+i+'"'+
        (draft.service===i?' checked':'')+'><span><strong>'+safe(name)+'</strong><small>'+
        safe(workshop?'от '+money.format(basePrices[i]):salon ? project.services[i][1]+' · '+serviceDurations[i]+' мин.' : project.services[i][1])+
        '</small></span></label>').join('');
      const workshopSettings = workshop
        ? select('material','Обивочная ткань',indexed(fabrics.map(fabric=>fabric.name)),draft.material)+
          input('quantity','Количество предметов',draft.quantity,'min="1" max="15" step="1" required','number')+
          select('condition','Что требуется',['Только обивка','Обивка и наполнитель','Осмотр каркаса'].map(x=>[x,x]),draft.condition)+
          select('delivery','Передача мебели',['Обсудить с мастером','Привезу самостоятельно','Нужен забор мебели'].map(x=>[x,x]),draft.delivery)
        : '';
      const specialist = dental ? select('specialist','Предпочтительный врач',indexed(specialists),draft.specialist)
        : salon ? '<p class="ws-note">Мастер по услуге <strong>'+safe(assignment(draft))+'</strong></p>' : '';
      const pet = vet ? '<div class="ws-fields">'+select('pet','Кого записываем',['Собака','Кошка','Другой питомец'].map(x=>[x,x]),draft.pet)+
        input('petName','Кличка (необязательно)',draft.petName,'maxlength="40"')+
        select('first','Визит',['Первый визит','Повторный визит'].map(x=>[x,x]),draft.first)+'</div>' : '';
      return '<fieldset><legend>'+ (workshop?'Выберите мебель':'Выберите услугу')+
        '</legend><div class="ws-services">'+cards+'</div></fieldset>'+specialist+pet+'<div class="ws-fields">'+workshopSettings+'</div>';
    }

    function scheduleSlots(value, id='', fieldPrefix='') {
      const slotList = available(value,id);
      const chosen = slotList.includes(value.time) ? value.time : '';
      return '<fieldset class="ws-slots"><legend>Доступное время</legend>'+
        (slotList.length ? '<div>'+slotList.map(time=>'<label><input type="radio" name="'+fieldPrefix+'time" value="'+time+'"'+
          (chosen===time?' checked':'')+' required><span>'+time+'</span></label>').join('')+'</div>'
          : '<p class="ws-note">На эту дату свободных слотов нет. Выберите другой день.</p>')+'</fieldset>';
    }

    function schedule(value, id='', fieldPrefix='') {
      const date = todayOptions.includes(value.date) ? value.date : todayOptions[0];
      return select(fieldPrefix+'date','Дата по Москве',todayOptions.map(item=>[item,prettyDate(item)]),date)+
        scheduleSlots({...value,date},id,fieldPrefix);
    }

    function contactStep() {
      const photos = '<fieldset class="ws-upload"><legend>Фотографии мебели</legend><p>Добавьте общий вид и крупный план. До 3 фото в JPG, PNG или WebP.</p>'+
        '<label class="ws-field"><span>Выбрать фотографии</span><input data-upload type="file" accept="image/jpeg,image/png,image/webp" multiple></label>'+
        button('Добавить фото-пример','photo-sample','class="alt"')+photoGrid(draft.photos,true)+
        '<p role="status" data-photo-status>'+safe(estimateNotice)+'</p></fieldset>';
      return (workshop ? photos : '<section class="ws-schedule">'+schedule(draft)+'</section>')+
        '<h3>Как с вами связаться</h3><div class="ws-fields">'+
        input('name','Имя',draft.name,'required maxlength="70" autocomplete="off" placeholder="Например, Анна"')+
        input('email','Email',draft.email,'required maxlength="100" autocomplete="off" placeholder="anna@example.com"','email')+
        input('phone','Телефон (необязательно)',draft.phone,'maxlength="24" autocomplete="off" placeholder="+7 900 000-00-00"','tel')+
        '</div>'+area('comment',workshop?'Что нужно изменить':'Пожелания к визиту',draft.comment)+
        '<p class="ws-note">Используйте тестовые контакты. Заявка останется в этой вкладке.</p>'+
        button('Подставить тестовые контакты','demo-contact','class="alt"');
    }

    function reviewStep() {
      return '<h3>Проверьте данные</h3>'+details(summaryRows(draft,true))+
        (draft.comment ? '<p class="ws-comment">'+safe(draft.comment)+'</p>' : '')+
        (workshop ? photoGrid(draft.photos) : '')+
        '<div class="ws-edit">'+button('Изменить услугу','edit-service','class="alt"')+
        button('Изменить время или контакт','edit-contact','class="alt"')+'</div>';
    }

    function renderForm() {
      const forms = [serviceStep,contactStep,reviewStep];
      const headline = workshop ? 'Рассчитать перетяжку' : salon ? 'Запись в студию' : 'Запись на приём';
      const instruction = workshop ? 'Выберите мебель и ткань. Мастер увидит параметры, оценку и прикреплённые фото.'
        : 'Выберите услугу и удобное время. Запрос появится в кабинете администратора.';
      const sidebar = '<aside class="ws-side"><h2>'+ (workshop?'Предварительная оценка':'Детали записи')+'</h2>'+
        (workshop ? '<div class="ws-amount">'+safe(money.format(estimate(draft)))+'</div><p>Итог зависит от состояния мебели и дополнительных работ.</p>' : '')+
        details(summaryRows(draft))+'<div class="ws-side-links">'+button('Мои заявки','client','class="alt"')+
        (salon ? '<a class="button secondary" href="'+safe(project.map)+'" target="_blank" rel="noopener">Запись в Яндексе</a>' : '')+'</div></aside>';
      panel.innerHTML=heading(company,headline,instruction)+'<ol class="ws-progress">'+stepNames.map((label,i)=>
        '<li'+(i===currentStep?' aria-current="step"':'')+' data-step="'+(i<currentStep?'done':i===currentStep?'current':'next')+'"><span>'+(i+1)+'</span>'+safe(label)+'</li>').join('')+
        '</ol><div class="ws-form-grid"><section class="ws-surface"><h2>'+safe(stepNames[currentStep])+'</h2><form data-booking-form>'+
        forms[currentStep]()+'<p class="ws-feedback" role="status"></p><div class="ws-actions">'+
        (currentStep ? button('Назад','back','class="alt"') : '')+
        '<button type="submit">'+(currentStep===2?(workshop?'Отправить заявку':'Отправить запрос на запись'):'Продолжить')+
        '</button></div></form></section>'+sidebar+'</div>';
    }

    const ticketById = id => database.tickets.find(ticket => ticket.id === id);

    function renderReceipt() {
      const ticket=ticketById(lastId);
      if (!ticket) { renderForm(); return; }
      panel.innerHTML=heading(company,'Заявка принята','Номер '+ticket.id+'. Она доступна в ваших заявках и в кабинете сотрудника.')+
        '<div class="ws-form-grid"><section class="ws-surface"><div class="ws-receipt">'+badge(ticket.status)+'<strong>'+safe(ticket.id)+'</strong></div>'+
        details(summaryRows(ticket,true))+'<div class="ws-actions">'+button('Мои заявки','client','')+
        button(staffName,'staff','class="alt"')+'</div></section><aside class="ws-side"><h2>Что дальше</h2><p>'+
        (workshop?'Мастер проверит фотографии и уточнит оценку.':'Администратор проверит время и подтвердит запись.')+
        '</p><p>Статус можно проверить по номеру заявки в этой вкладке.</p></aside></div>';
    }

    function renderClient() {
      const items = database.tickets.filter(ticket=>!ticket.example).slice().reverse();
      panel.innerHTML=heading(company,'Мои заявки','Статус, время и номер каждой заявки, оформленной в этой вкладке.')+
        '<section class="ws-surface ws-client">'+(items.length ? items.map(ticket =>
          '<article class="ws-client-row"><div><strong>'+safe(service(ticket))+'</strong><p>'+safe(ticket.id)+'</p></div>'+badge(ticket.status)+
          '<div>'+details(summaryRows(ticket))+(ticket.price ? '<p>Согласованная стоимость '+safe(money.format(ticket.price))+'</p>' : '')+'</div>'+
          ((ticket.status==='new'||ticket.status==='active') ? button('Отменить заявку','client-cancel','class="alt" data-id="'+ticket.id+'"') : '')+'</article>').join('')
          : '<p>Здесь появятся ваши заявки после отправки формы.</p>')+
        '<div class="ws-actions">'+button(workshop?'Новая заявка':'Новая запись','new-form')+'</div></section>';
    }

    function visibleTickets() {
      const query = staffQuery.trim().toLocaleLowerCase('ru');
      return database.tickets.filter(ticket =>
        (staffStatus==='all' || ticket.status===staffStatus) && (!staffDate || ticket.date===staffDate) &&
        [ticket.id,ticket.name,ticket.email,ticket.phone,service(ticket),ticket.petName,ticket.source]
          .some(value=>String(value||'').toLocaleLowerCase('ru').includes(query))
      ).sort((a,b)=>staffSort==='date' ? (a.date+' '+a.time).localeCompare(b.date+' '+b.time) : b.created.localeCompare(a.created));
    }

    function transitionLabel(status) {
      return ({new:'Вернуть на рассмотрение',active:workshop?'Взять в работу':'Подтвердить запись',done:workshop?'Отметить выполненной':'Завершить визит',cancelled:'Отменить'})[status];
    }

    function renderTicket(ticket) {
      if (!ticket) return '<section class="ws-surface ws-empty"><h2>Карточка заявки</h2><p>Выберите заявку, чтобы увидеть детали, историю и действия.</p></section>';
      const next = {
        new:['active','cancelled'],
        active:['done','new','cancelled'],
        done:[],
        cancelled:['new']
      }[ticket.status];
      const controls=next.map(status=>button(transitionLabel(status),'status',
        'data-status="'+status+'"'+(status==='cancelled'||status==='new'?' class="alt"':''))).join('');
      const logs=ticket.history.slice().reverse().map(item=>
        '<li><time datetime="'+safe(item.at)+'">'+safe(clock.format(new Date(item.at)))+'</time><span>'+safe(item.text)+'</span></li>').join('');
      return '<section class="ws-surface ws-ticket"><div class="ws-ticket-head"><div><span>'+safe(ticket.id)+'</span><h2 tabindex="-1">'+
        safe(service(ticket))+'</h2></div>'+badge(ticket.status)+'</div>'+details(summaryRows(ticket,true))+
        (ticket.comment?'<h3>Сообщение клиента</h3><p class="ws-comment">'+safe(ticket.comment)+'</p>':'')+
        (workshop&&ticket.photos.length ? '<h3>Фотографии</h3>'+photoGrid(ticket.photos) : '')+
        '<div class="ws-actions">'+controls+'</div>'+
        (workshop ? '<form class="ws-inline" data-estimate-form>'+input('price','Согласованная стоимость, ₽',ticket.price??'','required min="1" max="1000000"','number')+
          '<button type="submit" class="alt">Сохранить оценку</button></form>'
          : ((ticket.status!=='done') ? '<details class="ws-reschedule"><summary>Перенести визит</summary><form data-move-form>'+
            schedule(ticket,ticket.id,'move-')+'<button type="submit" class="alt">Сохранить дату и время</button></form></details>' : ''))+
        '<h3>История</h3><ol class="ws-history">'+logs+'</ol><form data-note-form>'+area('note','Заметка сотрудника','','required')+
        '<button type="submit" class="alt">Добавить заметку</button></form></section>';
    }

    function renderQueue() {
      const visible=visibleTickets();
      const selected=visible.find(ticket=>ticket.id===selectedId) || visible[0];
      selectedId=selected?.id || '';
      panel.querySelector('[data-work-queue]').innerHTML=visible.length?visible.map(ticket=>
        '<button type="button" class="ws-queue-item" data-work="open-ticket" data-id="'+ticket.id+'" aria-pressed="'+(ticket.id===selectedId)+'"><span><strong>'+
        safe(ticket.name)+'</strong><small>'+safe(service(ticket))+' · '+safe(ticket.id)+'</small></span>'+badge(ticket.status)+'</button>').join('')
        : '<p class="ws-empty-list">По этим фильтрам заявок нет.</p>';
      panel.querySelector('[data-work-detail]').innerHTML=renderTicket(selected);
      panel.querySelector('[data-queue-count]').textContent=visible.length+' из '+database.tickets.length;
    }

    function renderStaff() {
      const calendar = workshop ? '' : '<section class="ws-surface ws-calendar"><div><h2>Ближайшие визиты</h2>'+
        '<p>Выберите день, чтобы увидеть заявки на эту дату.</p></div><div class="ws-day-list">'+todayOptions.slice(0,7).map(date=>{
          const total=database.tickets.filter(ticket=>ticket.date===date && ['new','active'].includes(ticket.status)).length;
          return '<button type="button" class="alt" data-work="calendar" data-date="'+date+'" aria-pressed="'+(date===staffDate)+'">'+
            '<span>'+safe(prettyDate(date))+'</span><strong>'+total+'</strong></button>';
        }).join('')+'</div></section>';
      const totals=Object.fromEntries(Object.keys(statuses).map(status=>[status,database.tickets.filter(ticket=>ticket.status===status).length]));
      const metrics=Object.entries(totals).map(([status,total]) => '<button type="button" data-work="metric" data-status="'+status+
        '" aria-pressed="'+(staffStatus===status)+'"><span>'+safe(statuses[status])+'</span><strong>'+total+'</strong></button>').join('');
      panel.innerHTML=heading(company,staffName,'Заявки с сайта, статусы, расписание и история работы команды.')+
        '<div class="ws-dashboard-top"><div class="ws-metrics">'+metrics+'</div><div class="ws-actions">'+
        button('Добавить примеры','seed','class="alt"')+button('Открыть форму','new-form','class="alt"')+'</div></div>'+
        '<p class="ws-feedback" role="status">'+safe(staffMessage)+'</p>'+calendar+
        '<div class="ws-dashboard"><section class="ws-surface ws-inbox"><header><h2>Заявки</h2><span data-queue-count></span></header>'+
        input('query','Поиск по имени, номеру или услуге',staffQuery,'data-staff-query placeholder="Например, Анна"','search')+
        '<div class="ws-fields">'+select('filter','Статус',[['all','Все статусы'],...Object.entries(statuses)],staffStatus)+
        select('sort','Сортировка',[['recent','Сначала новые'],['date','По дате визита']],staffSort)+
        (workshop?'':select('filter-date','Дата',['',...todayOptions].map(date=>[date,date?prettyDate(date):'Все даты']),staffDate))+
        '</div><div data-work-queue></div></section><div data-work-detail></div></div>';
      renderQueue();
    }

    function log(ticket,text) {
      ticket.history.push({text,at:timestamp()});
      store.save();
    }

    function message(text) {
      staffMessage=text;
      const feedback=panel.querySelector('.ws-feedback');
      if (feedback) feedback.textContent=text;
    }

    function resetDraft() {
      Object.assign(draft,{time:'',name:'',email:'',phone:'',comment:'',photos:[],petName:''});
      currentStep=0;
      returnAfterEdit=false;
      estimateNotice='';
    }

    function saveTicket(values={}, example=false) {
      database.sequence++;
      const created=timestamp();
      const ticket={...draft,...values,id:'REQ-'+String(database.sequence).padStart(3,'0'),created,
        photos:[...(values.photos||draft.photos)],status:values.status||'new',example,
        history:[{at:created,text:example?'Добавлена демонстрационная заявка':'Клиент отправил заявку'}]};
      database.tickets.push(ticket);
      store.save();
      return ticket;
    }

    function seed() {
      if (database.tickets.some(ticket=>ticket.example)) {
        message('Примеры уже есть в списке.');
        return;
      }
      ['Анна Белова','Илья Миронов','Мария Соколова'].forEach((name,i)=>{
        const sample = {name,email:'demo'+(i+1)+'@example.com',phone:'',service:i%serviceNames.length,source:i===1?'Яндекс Карты':'Сайт',
          date:todayOptions[i],time:'',specialist:0,material:i,photos:[],petName:vet?['Марта','Тоша','Барни'][i]:'',
          quantity:1,comment:workshop?'Обновить обивку и оценить состояние наполнителя.':'Уточнить детали перед визитом.',
          status:['new','active','done'][i]};
        if (!workshop) sample.time=available(sample)[0]||'';
        saveTicket(sample,true);
      });
      staffMessage='Добавлены три демонстрационные заявки.';
      renderStaff();
    }

    function sync(form) {
      for (const [name,value] of new FormData(form)) {
        if (!(name in draft)) continue;
        draft[name]=['service','specialist','material','quantity'].includes(name)? Number(value) : value;
      }
    }

    function nextStep(form) {
      if (!form.reportValidity() || uploadsPending) return;
      sync(form);
      const error = (text) => { panel.querySelector('.ws-feedback').textContent=text; };
      if (currentStep===1) {
        if (!draft.name.trim()) { error('Укажите имя.'); return; }
        if (workshop && !draft.photos.length) { error('Добавьте фотографию или выберите фото-пример.'); return; }
        if (!workshop && !available(draft).includes(draft.time)) { error('Выберите свободное время.'); return; }
      }
      if (currentStep===2) {
        if (!workshop && !available(draft).includes(draft.time)) {
          currentStep=1;
          renderForm();
          error('Этот слот уже занят. Выберите другое время.');
          return;
        }
        const ticket=saveTicket();
        lastId=ticket.id;
        selectedId=ticket.id;
        resetDraft();
        setView('receipt');
        return;
      }
      currentStep=returnAfterEdit ? 2 : currentStep+1;
      returnAfterEdit=false;
      setView('form');
    }

    function updateStaff(event) {
      const form=event.target;
      const ticket=ticketById(selectedId);
      if (!ticket) return;
      const data=new FormData(form);
      if (form.matches('[data-note-form]')) {
        const note=String(data.get('note')||'').trim();
        if (!note) { message('Введите текст заметки.'); return; }
        log(ticket,'Заметка: '+note);
        message('Заметка добавлена.');
      } else if (form.matches('[data-estimate-form]')) {
        ticket.price=Number(data.get('price'));
        log(ticket,'Согласована стоимость '+money.format(ticket.price));
        message('Стоимость сохранена.');
      } else if (form.matches('[data-move-form]')) {
        const date=String(data.get('move-date')||'');
        const time=String(data.get('move-time')||'');
        if (!todayOptions.includes(date) || !available({...ticket,date},ticket.id).includes(time)) {
          message('Выберите доступные дату и время.');
          return;
        }
        ticket.date=date;
        ticket.time=time;
        log(ticket,'Визит перенесён: '+prettyDate(date)+' · '+time);
        message('Время визита изменено.');
      }
      renderQueue();
    }

    panel.addEventListener('submit',event=>{
      if (!event.target.matches('[data-booking-form], [data-note-form], [data-estimate-form], [data-move-form]')) return;
      event.preventDefault();
      if (event.target.matches('[data-booking-form]')) nextStep(event.target);
      else updateStaff(event);
    });

    panel.addEventListener('change',async event=>{
      const field=event.target;
      const booking=field.closest('[data-booking-form]');
      if (booking && field.matches('[data-upload]')) {
        if (uploadsPending) return;
        const files=[...field.files].slice(0,3-draft.photos.length);
        uploadsPending=true;
        estimateNotice='Готовим фотографии…';
        const status=panel.querySelector('[data-photo-status]');
        if (status) status.textContent=estimateNotice;
        const results=await Promise.allSettled(files.map(compressPhoto));
        for (const result of results) if (result.status==='fulfilled') draft.photos.push(result.value);
        const failed=results.find(result=>result.status==='rejected');
        estimateNotice=failed ? failed.reason.message : draft.photos.length+' из 3 фото приложено.';
        uploadsPending=false;
        if (currentView==='form' && currentStep===1) { sync(booking); renderForm(); }
        return;
      }
      if (booking && ['service','material','quantity','date','specialist','time'].includes(field.name)) {
        sync(booking);
        if (['service','specialist','date'].includes(field.name)) draft.time='';
        const focus=field.name;
        renderForm();
        panel.querySelector('[name="'+focus+'"]:checked, select[name="'+focus+'"], input[type=number][name="'+focus+'"]')?.focus();
      }
      if (currentView==='staff' && ['filter','sort','filter-date'].includes(field.name)) {
        if (field.name==='filter') staffStatus=field.value;
        if (field.name==='sort') staffSort=field.value;
        if (field.name==='filter-date') staffDate=field.value;
        panel.querySelectorAll('[data-work=metric]').forEach(metric=>metric.setAttribute('aria-pressed',String(metric.dataset.status===staffStatus)));
        panel.querySelectorAll('[data-work=calendar]').forEach(day=>day.setAttribute('aria-pressed',String(day.dataset.date===staffDate)));
        renderQueue();
      }
      if (field.name==='move-date') {
        const ticket=ticketById(selectedId);
        const form=field.closest('form');
        if (ticket && form) form.querySelector('.ws-slots').outerHTML=
          scheduleSlots({...ticket,date:field.value,time:''},ticket.id,'move-');
      }
    });

    panel.addEventListener('input',event=>{
      if (event.target.matches('[data-staff-query]')) { staffQuery=event.target.value; renderQueue(); }
    });

    panel.addEventListener('click',event=>{
      const control=event.target.closest('[data-work]');
      if (!control) return;
      const action=control.dataset.work;
      const form=control.closest('[data-booking-form]');
      if (form) sync(form);
      if (action==='back') { currentStep=Math.max(0,currentStep-1); returnAfterEdit=false; setView('form'); return; }
      if (action==='edit-service'||action==='edit-contact') { currentStep=action==='edit-service'?0:1; returnAfterEdit=action==='edit-contact'||workshop; setView('form'); return; }
      if (action==='demo-contact') {
        Object.assign(draft,{name:'Анна Иванова',email:'anna@example.com',phone:'+7 900 000-00-00'});
        renderForm();
        panel.querySelector('[name=name]')?.focus();
        return;
      }
      if (action==='photo-sample') {
        if (!draft.photos.length) draft.photos=[{name:'Пример · диван',src:new URL('../../../assets/portfolio-projects/gallery/peretyazhka-1.jpg',siteUrl).href}];
        estimateNotice=draft.photos.length+' из 3 фото приложено.';
        renderForm();
        return;
      }
      if (action==='photo-remove') { draft.photos.splice(Number(control.dataset.index),1); estimateNotice=''; renderForm(); return; }
      if (action==='new-form') { resetDraft(); setView('form'); return; }
      if (action==='client'||action==='staff') { setView(action); return; }
      if (action==='seed') { seed(); return; }
      if (action==='calendar') { staffDate=staffDate===control.dataset.date?'':control.dataset.date; renderStaff(); return; }
      if (action==='metric') { staffStatus=staffStatus===control.dataset.status?'all':control.dataset.status; renderStaff(); return; }
      if (action==='open-ticket') {
        selectedId=control.dataset.id;
        renderQueue();
        const heading=panel.querySelector('.ws-ticket h2');
        heading?.focus({preventScroll:true});
        heading?.scrollIntoView({block:'nearest'});
        return;
      }
      if (action==='client-cancel') {
        const ticket=ticketById(control.dataset.id);
        if (!ticket) return;
        ticket.status='cancelled';
        log(ticket,'Заявка отменена клиентом');
        renderClient();
        return;
      }
      if (action==='status') {
        const ticket=ticketById(selectedId);
        const status=control.dataset.status;
        if (!ticket || !(status in statuses)) return;
        if (!workshop && ['new','active'].includes(status) && !available(ticket,ticket.id).includes(ticket.time)) {
          message('Слот уже занят. Выберите другое время в карточке.');
          return;
        }
        ticket.status=status;
        log(ticket,'Статус: '+statuses[status]);
        staffMessage='Статус изменён.';
        renderStaff();
        panel.querySelector('.ws-ticket h2')?.focus({preventScroll:true});
      }
    });

    return {
      leave() {
        const form=panel.querySelector('[data-booking-form]');
        if (form) sync(form);
        currentView='';
      },
      choose({service:serviceIndex,specialist,source}) {
        if (serviceIndex!==undefined) draft.service=index(serviceIndex,serviceNames.length);
        if (specialist!==undefined) draft.specialist=index(specialist,specialists.length);
        if (source) draft.source=source;
        draft.time='';
        currentStep=0;
      },
      render(view) {
        currentView=view;
        if (view==='form') renderForm();
        else if (view==='receipt') renderReceipt();
        else if (view==='client') renderClient();
        else renderStaff();
      }
    };
  };
})();
