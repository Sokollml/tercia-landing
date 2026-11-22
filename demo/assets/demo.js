/* Движок демо-концептов Tercia.
   Всё содержимое приходит из config.js (window.DEMO).
   Кнопки проигрывают сценарий внутри страницы и никуда ничего не отправляют. */
(function () {
'use strict';
var C = window.DEMO;
var $ = function (s, r) { return (r || document).querySelector(s); };
var el = function (t, cls, html) { var n = document.createElement(t); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
  return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function money(n) { return typeof n === 'number' ? n.toLocaleString('ru-RU') + ' ₽' : esc(n); }

document.documentElement.style.setProperty('--accent', C.brand.accent || '#2F6BFF');
document.title = C.brand.name + ' — демо-концепт Tercia';

/* ---------- каркас ---------- */
var root = $('#app');
root.innerHTML =
  '<div class="ribbon">Демо-концепт <b>Tercia</b> · не сайт компании · данные тестовые ' +
  '<a href="https://tercia.dev/" target="_blank" rel="noopener">tercia.dev</a></div>' +
  '<div class="phone">' +
  '  <div class="scroll" id="scroll">' +
  '    <div class="top"><div class="logo-dot">' + esc(C.brand.name.charAt(0)) + '</div>' +
  '      <div><div class="nm">' + esc(C.brand.name) + '</div><div class="sub">' + esc(C.brand.kind) + ' · ' + esc(C.brand.area) + '</div></div></div>' +
  '    <div class="view on" id="v-site"></div>' +
  '    <div class="view" id="v-form"></div>' +
  '    <div class="view" id="v-staff"></div>' +
  '    <div class="view" id="v-rev"></div>' +
  '    <div class="view" id="v-maps"></div>' +
  '  </div>' +
  '  <nav class="tabs" id="tabs"></nav>' +
  '</div>';

/* ---------- вкладки ---------- */
var TABS = [
  { id: 'site',  t: 'Сайт',      ic: '<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>' },
  { id: 'staff', t: 'Заявка',    ic: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h7"/>' },
  { id: 'rev',   t: 'Отзывы',    ic: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l2-5.2A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>' },
  { id: 'maps',  t: 'Карты',     ic: '<path d="M9 3 3 5.5v15L9 18l6 3 6-2.5v-15L15 6z"/><path d="M9 3v15M15 6v15"/>' }
];
var tabsEl = $('#tabs');
TABS.filter(function (t) {
  if (t.id === 'rev')  return !!C.reviews;
  if (t.id === 'maps') return !!C.maps;
  return true;
}).forEach(function (t) {
  var b = el('button', 'tab');
  b.dataset.go = t.id;
  b.innerHTML = '<span class="i"><svg width="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + t.ic + '</svg></span>' + t.t;
  tabsEl.appendChild(b);
});
function show(id) {
  ['site','form','staff','rev','maps'].forEach(function (v) { $('#v-' + v).classList.toggle('on', v === id); });
  Array.prototype.forEach.call(tabsEl.children, function (b) {
    var active = b.dataset.go === id || (id === 'form' && b.dataset.go === 'site');
    if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('#scroll').scrollTop = 0;
}
tabsEl.addEventListener('click', function (e) {
  var b = e.target.closest('[data-go]');
  if (b) { show(b.dataset.go); history.replaceState(null, '', '#' + b.dataset.go); }
});

/* ---------- витрина ---------- */
function block(b) {
  var s = el('section', 'sec');
  if (b.title) s.appendChild(el('h2', null, esc(b.title)));
  if (b.type === 'services') {
    var w = el('div');
    b.items.forEach(function (i) {
      w.appendChild(el('div', 'row',
        '<span><b style="display:block;font-weight:600">' + esc(i.name) + '</b>' +
        (i.note ? '<span class="muted xs">' + esc(i.note) + '</span>' : '') + '</span>' +
        '<b>' + money(i.price) + '</b>'));
    });
    s.appendChild(w);
  } else if (b.type === 'gallery') {
    var g = el('div', 'cards2');
    b.items.forEach(function (i) { g.appendChild(el('div', 'ph', esc(i.caption))); });
    s.appendChild(g);
    s.appendChild(el('p', 'note', 'Фотографии — заглушки. На сайте компании здесь её собственные работы.'));
  } else if (b.type === 'people') {
    var p = el('div', 'tiles');
    b.items.forEach(function (i) {
      p.appendChild(el('div', 'tile',
        '<h3>' + esc(i.name) + '</h3><p class="sm muted" style="margin-top:3px">' + esc(i.role) + '</p>' +
        (i.note ? '<p class="sm" style="margin-top:8px">' + esc(i.note) + '</p>' : '')));
    });
    s.appendChild(p);
  } else if (b.type === 'steps') {
    var st = el('div', 'flow');
    b.items.forEach(function (i, n) {
      st.appendChild(el('div', 'step-row',
        '<div class="step-dot">' + (n + 1) + '</div><div><h3>' + esc(i.t) + '</h3>' +
        '<p class="sm" style="margin-top:3px">' + esc(i.p) + '</p></div>'));
    });
    s.appendChild(st);
  } else if (b.type === 'text') {
    s.appendChild(el('p', null, esc(b.body)));
  } else if (b.type === 'hours') {
    var h = el('div');
    b.items.forEach(function (i) { h.appendChild(el('div', 'row', '<span>' + esc(i.k) + '</span><b>' + esc(i.v) + '</b>')); });
    s.appendChild(h);
  }
  return s;
}
var site = $('#v-site');
var hero = el('section', 'sec');
hero.innerHTML = '<div class="eyebrow">' + esc(C.brand.kind) + '</div><h1>' + esc(C.site.heroTitle).replace(/\n/g, '<br>') + '</h1>' +
                 '<p>' + esc(C.site.heroSub) + '</p>';
var acts = el('div', 'btn-row');
C.site.actions.forEach(function (a) {
  var b = el('button', 'btn ' + (a.kind === 'urgent' ? 'btn-urgent' : a.kind === 'ghost' ? 'btn-ghost' : 'btn-main'), esc(a.label));
  if (a.go === 'form') b.addEventListener('click', function () { show('form'); });
  else if (a.go) b.addEventListener('click', function () { show(a.go); });
  else b.addEventListener('click', function () { alert('В демо эта кнопка ничего не отправляет.'); });
  acts.appendChild(b);
});
hero.appendChild(acts);
if (C.site.heroNote) hero.appendChild(el('p', 'note', C.site.heroNote));
site.appendChild(hero);
C.site.blocks.forEach(function (b) { site.appendChild(block(b)); });
var ct = el('section', 'sec');
ct.innerHTML = '<h2>Контакты</h2>' +
  '<div class="row"><span>Адрес</span><b style="text-align:right">' + esc(C.brand.address) + '</b></div>' +
  '<div class="row"><span>Часы</span><b>' + esc(C.brand.hours) + '</b></div>' +
  '<div class="row"><span>Телефон</span><b>' + esc(C.brand.phone) + '</b></div>' +
  '<p class="note">Адрес и телефон вымышленные. Это концепт для показа, а не сайт компании.</p>';
site.appendChild(ct);

/* ---------- заявка ---------- */
var photos = [];
var form = $('#v-form');
function drawForm() {
  var r = C.request;
  form.innerHTML = '';
  var s = el('section', 'sec');
  s.appendChild(el('div', 'eyebrow', 'Шаг 1 из 2'));
  s.appendChild(el('h1', null, esc(r.title)));
  s.appendChild(el('p', null, esc(r.intro)));
  var f = el('form');
  f.style.marginTop = '18px';
  r.fields.forEach(function (fl) {
    var w = el('div', 'field');
    w.innerHTML = '<label for="q-' + fl.id + '">' + esc(fl.label) + '</label>';
    if (fl.type === 'chips') {
      var c = el('div', 'chips');
      fl.options.forEach(function (o, i) {
        var ch = el('button', 'chip' + (i === 0 ? ' on' : ''), esc(o));
        ch.type = 'button';
        ch.addEventListener('click', function () {
          Array.prototype.forEach.call(c.children, function (x) { x.classList.remove('on'); });
          ch.classList.add('on');
        });
        c.appendChild(ch);
      });
      c.id = 'q-' + fl.id;
      w.appendChild(c);
    } else if (fl.type === 'textarea') {
      w.innerHTML += '<textarea id="q-' + fl.id + '" placeholder="' + esc(fl.ph || '') + '"></textarea>';
    } else {
      w.innerHTML += '<input id="q-' + fl.id + '" type="text" placeholder="' + esc(fl.ph || '') + '">';
    }
    f.appendChild(w);
  });
  if (r.photo) {
    var d = el('div', 'field');
    d.innerHTML = '<label>' + esc(r.photoLabel || 'Фотографии') + '</label>' +
      '<label class="drop" for="q-photo"><div class="big">Приложить фото</div>' +
      '<p class="sm muted" style="margin-top:4px">' + esc(r.photoHint || 'Снимите с двух ракурсов — так оценка точнее') + '</p></label>' +
      '<input id="q-photo" type="file" accept="image/*" multiple hidden><div class="thumbs" id="thumbs"></div>';
    f.appendChild(d);
    setTimeout(function () {
      var inp = $('#q-photo');
      inp.addEventListener('change', function () {
        Array.prototype.forEach.call(inp.files, function (file) {
          var url = URL.createObjectURL(file);
          photos.push(url);
          var t = el('div', 'thumb', '<img src="' + url + '" alt="">');
          $('#thumbs').appendChild(t);
        });
      });
    }, 0);
  }
  var sub = el('button', 'btn btn-main');
  sub.type = 'submit';
  sub.textContent = r.submit || 'Отправить';
  sub.style.marginTop = '6px';
  f.appendChild(sub);
  f.addEventListener('submit', function (e) { e.preventDefault(); done(); });
  s.appendChild(f);
  s.appendChild(el('p', 'note', '<b>В демо ничего не отправляется.</b> Заявка остаётся внутри этой страницы — посмотрите вкладку «Заявка», чтобы увидеть её глазами сотрудника.'));
  form.appendChild(s);
}
function readForm() {
  var out = {};
  C.request.fields.forEach(function (fl) {
    var n = document.getElementById('q-' + fl.id);
    if (!n) return;
    if (fl.type === 'chips') { var on = n.querySelector('.chip.on'); out[fl.id] = on ? on.textContent : ''; }
    else out[fl.id] = (n.value || '').trim() || (fl.demo || '');
  });
  return out;
}
var sent = null;
function done() {
  sent = readForm();
  form.innerHTML = '';
  var s = el('section', 'sec ok-box');
  s.innerHTML = '<div class="ok-ic"><svg width="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></div>' +
    '<h2>' + esc(C.request.successTitle) + '</h2><p>' + esc(C.request.successText) + '</p>';
  var b = el('button', 'btn btn-ghost', 'Посмотреть глазами сотрудника →');
  b.style.marginTop = '18px';
  b.addEventListener('click', function () { show('staff'); });
  s.appendChild(b);
  form.appendChild(s);
  drawStaff();
}

/* ---------- экран сотрудника ---------- */
function drawStaff() {
  var st = C.staff, v = $('#v-staff');
  v.className = 'view staff' + (v.classList.contains('on') ? ' on' : '');
  var got = sent || st.demo;
  var rows = st.rows(got).map(function (r) {
    return '<div class="row"><span class="muted">' + esc(r.k) + '</span><b style="text-align:right">' + esc(r.v) + '</b></div>';
  }).join('');
  var thumbs = photos.length
    ? '<div class="thumbs">' + photos.map(function (u) { return '<div class="thumb"><img src="' + u + '" alt=""></div>'; }).join('') + '</div>'
    : '<div class="thumbs">' + (st.demoPhotos || []).map(function (c) { return '<div class="ph" style="width:66px;height:66px;aspect-ratio:auto;font-size:8px">' + esc(c) + '</div>'; }).join('') + '</div>';
  v.innerHTML =
    '<section class="sec">' +
    '  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
    '    <span class="badge b-new">Новая заявка</span>' +
    '    <span class="badge b-src">Источник: ' + esc(st.source) + '</span>' +
    '  </div>' +
    '  <h2>' + esc(st.title) + '</h2>' +
    '  <div class="tile" style="margin-top:4px">' + rows + (st.photos ? thumbs : '') + '</div>' +
    '  <div class="flow">' +
    '    <div class="step-row"><div class="step-dot done">✓</div><div><h3>Заявка получена</h3><p class="sm">' + esc(st.stepGot) + '</p></div></div>' +
    '    <div class="step-row"><div class="step-dot now">2</div><div><h3>Назначен ответственный</h3><p class="sm">' + esc(st.stepOwner) + '</p></div></div>' +
    '    <div class="step-row"><div class="step-dot">3</div><div><h3>' + esc(st.step3t) + '</h3><p class="sm">' + esc(st.step3p) + '</p></div></div>' +
    '  </div>' +
    '  <div class="btn-row"><button class="btn btn-main" id="confirm">' + esc(st.action) + '</button></div>' +
    '  <p class="note">' + esc(st.counter) + '</p>' +
    '</section>';
  var cf = $('#confirm');
  if (cf) cf.addEventListener('click', function () {
    cf.textContent = st.actionDone;
    cf.className = 'btn btn-ghost';
    cf.disabled = true;
  });
}
drawStaff();

/* ---------- отзывы ---------- */
function drawReviews() {
  var R = C.reviews, v = $('#v-rev');
  v.innerHTML =
    '<section class="sec">' +
    '  <div class="eyebrow">Репутация</div><h1 style="font-size:23px">' + esc(R.title) + '</h1>' +
    '  <p>' + esc(R.intro) + '</p>' +
    '  <div class="rev" style="margin-top:18px">' +
    '    <div class="who"><span>' + esc(R.author) + ' · ' + esc(R.platform) + '</span><span>' + esc(R.date) + '</span></div>' +
    '    <div class="stars">' + '★'.repeat(R.rating) + '<span style="color:#D6D6DE">' + '★'.repeat(5 - R.rating) + '</span></div>' +
    '    <p class="sm" style="margin-top:8px">' + esc(R.text) + '</p>' +
    '    <div id="draftbox"></div>' +
    '  </div>' +
    '  <div class="btn-row"><button class="btn btn-main" id="mkdraft">Подготовить ответ</button></div>' +
    '  <p class="note"><b>Отзыв вымышленный.</b> Так выглядит работа с отзывом: черновик готовит Tercia, публикует — только после вашего согласования.</p>' +
    '</section>';
  var i = 0;
  $('#mkdraft').addEventListener('click', function () {
    var btn = $('#mkdraft'), box = $('#draftbox');
    if (i === 0) {
      box.innerHTML = '<div class="draft"><div class="lbl">Черновик ответа · не опубликован</div>' +
                      '<p class="sm">' + esc(R.draft) + '</p></div>';
      btn.textContent = 'Отправить на согласование → ' + esc(R.approver);
      i = 1;
    } else if (i === 1) {
      box.querySelector('.lbl').textContent = 'На согласовании у ' + R.approver + ' · ждём ответа';
      btn.textContent = 'Отметить согласованным';
      i = 2;
    } else {
      box.querySelector('.lbl').textContent = 'Согласовано · можно публиковать';
      box.querySelector('.draft').style.borderColor = 'var(--ok)';
      btn.textContent = 'Согласовано';
      btn.className = 'btn btn-ghost';
      btn.disabled = true;
    }
  });
}
if (C.reviews) drawReviews();

/* ---------- карты ---------- */
function drawMaps() {
  var M = C.maps, v = $('#v-maps');
  function card(m) {
    return '<div class="mapcard"><div class="hd">' + esc(m.name) + '</div><div class="bd"><dl class="kv">' +
      '<dt>Адрес</dt><dd>' + esc(M.address) + '</dd>' +
      '<dt>Часы</dt><dd>' + esc(M.hours) + '</dd>' +
      '<dt>Телефон</dt><dd>' + esc(M.phone) + '</dd>' +
      '<dt>Ссылка</dt><dd>' + esc(M.link) + '</dd>' +
      '<dt>Рейтинг</dt><dd>' + esc(m.rating) + '</dd>' +
      '</dl></div></div>';
  }
  v.innerHTML = '<section class="sec"><div class="eyebrow">Карточки</div>' +
    '<h1 style="font-size:23px">Одинаково в Яндексе и 2ГИС</h1>' +
    '<p>' + esc(M.intro) + '</p>' +
    '<div class="maps" style="margin-top:18px">' + card(M.yandex) + card(M.gis) + '</div>' +
    '<div class="match"><svg width="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>Адрес, часы и ссылка совпадают на обеих площадках</div>' +
    '<p class="note">' + esc(M.note) + '</p></section>';
}
if (C.maps) drawMaps();
drawForm();

/* прямая ссылка на экран: #staff, #rev, #maps, #form */
(function () {
  var h = (location.hash || '').replace('#', '');
  if (['site','form','staff','rev','maps'].indexOf(h) > -1) show(h);
})();
})();
