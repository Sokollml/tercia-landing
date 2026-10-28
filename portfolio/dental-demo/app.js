/* ============================================================
   Логика демо: всё содержимое приходит из config.js.
   Ни библиотек, ни сборки — только то, что нужно странице.
   ============================================================ */
(function () {
'use strict';
var C = window.SITE_CONFIG, $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var money = function (n) { return n.toLocaleString('ru-RU') + ' ₽'; };
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
  return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* ---------- имя, город, контакты ---------- */
$$('[data-name]').forEach(function (el) { el.textContent = C.clinic.name; });
$$('[data-name-short]').forEach(function (el) { el.textContent = '«' + C.clinic.name + '»'; });
$$('[data-city]').forEach(function (el) { el.textContent = C.clinic.city + ' · м. ' + C.clinic.metro; });
$$('[data-city-short]').forEach(function (el) { el.textContent = C.clinic.city + ' · м. ' + C.clinic.metro; });
$$('[data-phone]').forEach(function (el) { el.textContent = C.clinic.phone; el.href = 'tel:' + C.clinic.phoneHref; });
$$('[data-wa]').forEach(function (el) { el.href = C.clinic.whatsapp; });
$$('[data-tg]').forEach(function (el) { el.href = C.clinic.telegram; });
$('#fAddr').textContent = C.clinic.address;
$('#legal').innerHTML = esc(C.clinic.legal) + '<br>© ' + new Date().getFullYear() +
  ' · сайт собран в <a href="../../">Tercia</a>';

/* ---------- цифры ---------- */
$('#heroFacts').innerHTML = C.facts.map(function (f) {
  return '<div><b>' + esc(f.v) + '</b><span>' + esc(f.l) + '</span></div>';
}).join('');
$('#figures').innerHTML = C.figures.map(function (f) {
  return '<div><b>' + esc(f.v) + '</b><span>' + esc(f.l) + '</span></div>';
}).join('');
$('#ratings').innerHTML = C.ratings.map(function (r) {
  return '<div><b>' + esc(r.score) + '</b><span>' + esc(r.src) + '</span></div>';
}).join('');

/* ---------- указатель услуг ---------- */
$('#serviceIndex').innerHTML = C.services.map(function (s, i) {
  return '<div class="ix"><span class="n">' + ('0' + (i + 1)).slice(-2) + '</span>' +
    '<h3>' + esc(s.name) + '</h3><p>' + esc(s.about) + '</p>' +
    '<div class="price">' + (s.our ? 'от ' + money(s.our) : 'бесплатно') +
    '<small>' + esc(s.unit || 'за курс') + '</small></div></div>';
}).join('');

/* ---------- смета ---------- */
var qty = {};
C.services.filter(function (s) { return s.calc; }).forEach(function (s) { qty[s.id] = s.start || 0; });
if (!C.pricesApproved) $('#demoNote').hidden = false;

function drawSrv() {
  $('#srv').innerHTML = C.services.filter(function (s) { return s.calc; }).map(function (s) {
    var on = qty[s.id] > 0;
    return '<label><input type="checkbox" data-id="' + s.id + '"' + (on ? ' checked' : '') + '>' +
      '<span class="nm">' + esc(s.name) + '<small>' + esc(s.unit || '') + '</small></span>' +
      '<span class="pr"><s>' + money(s.msk) + '</s>' + money(s.our) +
      (s.multi ? '<span class="qty"><button type="button" data-m="' + s.id + '" aria-label="Меньше">−</button>' +
        '<output>' + qty[s.id] + '</output>' +
        '<button type="button" data-p="' + s.id + '" aria-label="Больше">+</button></span>' : '') +
      '</span></label>';
  }).join('');
  $$('#srv input[data-id]').forEach(function (b) {
    b.addEventListener('change', function () { qty[b.dataset.id] = b.checked ? 1 : 0; drawSrv(); });
  });
  $$('#srv [data-p]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); bump(b.dataset.p, 1); });
  });
  $$('#srv [data-m]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); bump(b.dataset.m, -1); });
  });
  total();
}
function bump(id, d) {
  var s = C.services.filter(function (x) { return x.id === id; })[0];
  qty[id] = Math.max(0, Math.min(s.max || 8, qty[id] + d));
  drawSrv();
}
function total() {
  var our = 0, msk = 0;
  C.services.filter(function (s) { return s.calc; }).forEach(function (s) {
    our += s.our * qty[s.id]; msk += s.msk * qty[s.id];
  });
  $('#sOur').textContent = our ? money(our) : '—';
  $('#sMsk').textContent = msk ? money(msk) : '—';
  $('#sSave').textContent = our ? (msk - our > 0 ? '−' + money(msk - our) : money(0)) : '—';
  return { our: our, msk: msk };
}
drawSrv();

$('#calcSend').addEventListener('click', function () {
  var t = total();
  if (!t.our) { alert('Отметьте хотя бы одну услугу — тогда посчитаем смету.'); return; }
  var lines = C.services.filter(function (s) { return s.calc && qty[s.id] > 0; })
    .map(function (s) { return '• ' + s.name + (qty[s.id] > 1 ? ' × ' + qty[s.id] : ''); }).join('\n');
  var txt = 'Здравствуйте! Посчитал смету на сайте клиники «' + C.clinic.name + '»:\n' + lines +
    '\nИтого ориентировочно: ' + money(t.our) +
    '\nСредняя цена по Москве: ' + money(t.msk) + '\n\n(демо-сайт Tercia)';
  window.open(C.clinic.whatsapp + '?text=' + encodeURIComponent(txt), '_blank', 'noopener');
});

/* ---------- врачи ---------- */
function initials(n) { return n.split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join(''); }
$('#docs').innerHTML = C.doctors.map(function (d) {
  return '<article class="doc"><div class="ph"><span>' + esc(initials(d.name)) + '</span>' +
    '<i>' + d.years + ' лет</i></div>' +
    '<h3>' + esc(d.name) + '</h3><div class="role">' + esc(d.role) + '</div>' +
    '<p class="exp">' + esc(d.about) + '</p></article>';
}).join('');

/* ---------- отзывы, условия, вопросы ---------- */
$('#revs').innerHTML = C.reviews.map(function (r) {
  return '<article><q>' + esc(r.text) + '</q><div class="who">' + esc(r.who) + ' · ' + esc(r.src) + '</div></article>';
}).join('');

$('#offersList').innerHTML = C.offers.map(function (o) {
  return '<article class="offer"><span class="badge">' + esc(o.badge) + '</span>' +
    '<h3>' + esc(o.title) + '</h3><p>' + esc(o.text) + '</p>' +
    '<ul>' + o.perks.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></article>';
}).join('');
$('#offersNote').textContent = C.offersNote || '';

$('#faqList').innerHTML = C.faq.map(function (f, i) {
  return '<details' + (i === 0 ? ' open' : '') + '><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>';
}).join('');

$('#cinfo').innerHTML = C.contacts.map(function (c) {
  return '<div><dt>' + esc(c.k) + '</dt><dd>' + c.v + '</dd></div>';
}).join('');

/* ---------- карта по нажатию ---------- */
$('#mapLoad').addEventListener('click', function () {
  var m = $('#map'), f = document.createElement('iframe');
  f.title = 'Карта: ' + C.clinic.address;
  f.loading = 'lazy';
  f.style.cssText = 'position:absolute;inset:0;border:0;width:100%;height:100%;z-index:3;opacity:0;transition:opacity .5s';
  f.src = C.clinic.mapEmbed;
  f.addEventListener('load', function () { f.style.opacity = '1'; });
  this.remove();
  m.appendChild(f);
});

/* ---------- заявка ---------- */
$('#lead').addEventListener('submit', function (e) {
  e.preventDefault();
  var box = $('#fMsg');
  function say(t) { box.textContent = t; box.classList.add('on'); }
  if (!$('#fName').value.trim()) { say('Напишите, как вас зовут.'); return; }
  if ($('#fPhone').value.replace(/\D/g, '').length < 10) { say('Оставьте телефон — администратор перезвонит подтвердить.'); return; }
  if (!$('#fOk').checked) { say('Отметьте согласие на обработку данных.'); return; }
  var txt = 'Здравствуйте! Заявка с сайта клиники «' + C.clinic.name + '»:\n' +
    'Имя: ' + $('#fName').value.trim() + '\nТелефон: ' + $('#fPhone').value.trim() +
    '\nЗапрос: ' + $('#fTreat').value + '\n\n(демо-сайт Tercia)';
  window.open(C.clinic.whatsapp + '?text=' + encodeURIComponent(txt), '_blank', 'noopener');
  say('Это демо — заявка открылась в WhatsApp готовым текстом. На сайте клиники она ушла бы администратору в ту же секунду.');
});

/* ---------- бургер и появление блоков ---------- */
/* мобильное меню */
(function () {
  var b = $('#burger'), m = $('#mmenu');
  if (!b || !m) return;
  function set(open) {
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    m.classList.toggle('open', open);
    document.documentElement.classList.toggle('mm-lock', open);
  }
  b.addEventListener('click', function () { set(b.getAttribute('aria-expanded') !== 'true'); });
  m.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  var mq = window.matchMedia('(min-width:1001px)');
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(
    function (e) { if (e.matches) set(false); });
})();
if ('IntersectionObserver' in window) {
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -6% 0px' });
  $$('.rv').forEach(function (el) { io.observe(el); });
} else { $$('.rv').forEach(function (el) { el.classList.add('in'); }); }
})();
