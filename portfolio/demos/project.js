(() => {
  'use strict';

  const project = window.terciaProject;
  const app = document.querySelector('main');
  const panel = document.querySelector('#panel');
  const home = panel.innerHTML;
  const homePath = document.body.dataset.siteHome || './';
  const siteUrl = new URL(homePath,document.baseURI);
  const nav = document.querySelector('.demo-nav');
  const workshop = project.type === 'Мебельная мастерская';
  const workspaceViews = ['form','receipt','staff','client'];
  const params = new URLSearchParams(location.search);
  const initialView = ['staff','client'].includes(params.get('view')) ? params.get('view')
    : document.body.dataset.initialView === 'form' ? 'form' : 'site';
  const staffName = workshop ? 'Кабинет мастера' : 'Кабинет администратора';
  const safe = value => String(value ?? '').replace(/[&<>"']/g, character =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
  const switchButton = (title, view) => '<button type="button" data-view="'+view+'">'+safe(title)+'</button>';

  const workspace = window.createTerciaWorkspace({project,panel,siteUrl,onView:openView});
  const reviewKey = 'tercia-review-v1:' + project.brand;
  let review = {text:'',status:'new'};
  let reviewMessage = '';
  try {
    const saved = JSON.parse(sessionStorage.getItem(reviewKey));
    if (saved && typeof saved.text==='string' && ['new','draft','submitted'].includes(saved.status)) review=saved;
  } catch {}

  function saveReview(status) {
    review.status=status;
    try { sessionStorage.setItem(reviewKey,JSON.stringify(review)); }
    catch {}
    renderReviews();
  }

  function renderReviews() {
    if (!project.review) return;
    const statuses = {new:'Без ответа',draft:'Черновик',submitted:'На согласовании'};
    panel.innerHTML='<header class="ws-head"><span>'+safe(project.brand)+'</span><h1>Отзывы</h1>'+
      '<p>Подготовьте ответ и передайте его на согласование. Этот отзыв вымышлен, ответ останется в демо.</p></header>'+
      '<div class="ws-form-grid"><section class="ws-surface"><div class="ws-ticket-head"><div><span>'+safe(project.review[0])+
      '</span><h2>Отзыв клиента</h2></div><span class="ws-badge">'+safe(statuses[review.status])+'</span></div>'+
      '<blockquote class="ws-comment">'+safe(project.review[1])+'</blockquote>'+
      '<form data-review-form><label class="ws-field"><span>Ответ</span><textarea name="reply" required maxlength="800" rows="5">'+safe(review.text)+
      '</textarea></label><div class="ws-actions"><button type="submit" name="review-action" value="draft" class="alt">Сохранить черновик</button>'+
      '<button type="submit" name="review-action" value="submitted">Передать на согласование</button></div></form>'+
      '<p class="ws-feedback" role="status">'+safe(reviewMessage)+'</p></section>'+
      '<aside class="ws-side"><h2>Работа с отзывом</h2><p>Сохранённый черновик можно поправить перед согласованием.</p>'+
      '<button type="button" class="alt" data-view="review-example">Вставить пример ответа</button></aside></div>';
  }

  function renderMaps() {
    panel.innerHTML='<header class="ws-head"><span>'+safe(project.brand)+'</span><h1>Карточки на картах</h1>'+
      '<p>Проверьте, как источник обращения отображается в заявке и кабинете сотрудника.</p></header>'+
      '<div class="ws-map-grid">'+['Яндекс Карты','2ГИС'].map((source,index)=>
        '<section class="ws-surface"><h2>'+source+'</h2><dl class="ws-data"><div><dt>Адрес</dt><dd>'+safe(project.address)+
        '</dd></div><div><dt>Часы в демо</dt><dd>'+safe(project.hours)+'</dd></div></dl>'+
        '<div class="ws-actions"><button type="button" data-view="map-form" data-index="'+index+'">Открыть форму с этим источником</button>'+
        (index===0?'<a class="button secondary" href="'+safe(project.map)+'" target="_blank" rel="noopener">Карточка в Яндексе</a>':'')+
        '</div></section>').join('')+'</div>';
  }

  function openView(view,focus=true) {
    for (const button of nav.querySelectorAll('[data-view]')) {
      if (button.dataset.view===view) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    }
    if (!workspaceViews.includes(view)) workspace.leave();
    panel.dataset.workspaceView=view;
    panel.classList.toggle('workflow', view!=='site');
    if (view==='site') {
      if (panel.innerHTML!==home) panel.innerHTML=home;
    } else if (workspaceViews.includes(view)) workspace.render(view);
    else if (view==='review') renderReviews();
    else if (view==='maps') renderMaps();
    if (focus) {
      panel.focus({preventScroll:true});
      panel.scrollIntoView({block:'start'});
    }
  }

  app.addEventListener('click', event => {
    const control=event.target.closest('[data-view]');
    if (!control) return;
    const view=control.dataset.view;
    if (view==='site' && homePath!=='./') {location.assign(siteUrl);return;}
    if (view==='map-form') {
      workspace.choose({source:control.dataset.index==='0'?'Яндекс Карты':'2ГИС'});
      openView('form');
    } else if (view==='review-example') {
      panel.querySelector('[name=reply]').value=project.review[2];
      panel.querySelector('[name=reply]').focus();
    } else openView(view);
  });

  panel.addEventListener('submit',event=>{
    const form=event.target;
    if (!form.matches('[data-review-form]')) return;
    event.preventDefault();
    const text=form.elements.reply.value.trim();
    if (!text) {form.elements.reply.focus();return;}
    const status=event.submitter?.value==='submitted'?'submitted':'draft';
    review.text=text;
    reviewMessage=status==='submitted'?'Ответ передан на согласование.':'Черновик сохранён.';
    saveReview(status);
    panel.querySelector('.ws-feedback')?.focus();
  });

const gallery = document.querySelector('#gallery-dialog');
const galleryImage = document.querySelector('#gallery-image');
const galleryCaption = document.querySelector('#gallery-caption');
let galleryPhotos = [];
let photoIndex = 0;
let trigger;

function showPhoto(index) {
  photoIndex = (index + galleryPhotos.length) % galleryPhotos.length;
  const photo = galleryPhotos[photoIndex];
  galleryImage.src = photo.href;
  galleryImage.alt = photo.querySelector('img').alt;
  galleryCaption.textContent = photo.closest('figure').querySelector('h3').textContent;
}
if (gallery && typeof gallery.showModal === 'function') {
  app.addEventListener('click', event => {
    const link = event.target.closest('[data-gallery-photo]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    galleryPhotos = [...panel.querySelectorAll('[data-gallery-photo]')];
    trigger = link;
    showPhoto(galleryPhotos.indexOf(link));
    gallery.showModal();
  });
  gallery.addEventListener('click', event => {
    const button = event.target.closest('[data-gallery-step]');
    if (button) showPhoto(photoIndex + Number(button.dataset.galleryStep));
  });
  gallery.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    showPhoto(photoIndex + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  gallery.addEventListener('close', () => trigger?.focus());
}

  nav.innerHTML = switchButton('Сайт','site')+switchButton('Запись','form')+
    switchButton('Мои заявки','client')+switchButton(staffName,'staff')+switchButton('Карты','maps')+
    (project.review?switchButton('Отзывы','review'):'');
  openView(initialView,false);
})();
