window.LOCA=window.LOCA||{};

let siteNoticeResolver=null;

function ensureSiteNotice(){
  let layer=document.getElementById('siteNotice');
  if(layer)return layer;
  layer=document.createElement('div');
  layer.id='siteNotice';
  layer.className='site-notice-layer';
  layer.setAttribute('role','dialog');
  layer.setAttribute('aria-modal','true');
  layer.setAttribute('aria-labelledby','siteNoticeTitle');
  layer.setAttribute('aria-describedby','siteNoticeCopy');
  layer.innerHTML='<div class="site-notice-window"><button class="site-notice-close" type="button" aria-label="Close message">×</button><div class="site-notice-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></div><p class="site-notice-eyebrow"></p><h2 id="siteNoticeTitle"></h2><p class="site-notice-copy" id="siteNoticeCopy"></p><div class="site-notice-actions"><button class="site-notice-secondary" type="button" hidden></button><button class="site-notice-action" type="button"></button></div></div>';
  layer.querySelector('.site-notice-close').addEventListener('click',()=>closeNotice(false));
  layer.querySelector('.site-notice-secondary').addEventListener('click',()=>closeNotice(false));
  layer.querySelector('.site-notice-action').addEventListener('click',()=>closeNotice(layer.dataset.mode==='confirm'));
  layer.addEventListener('click',event=>{if(event.target===layer)closeNotice(false)});
  document.body.appendChild(layer);
  return layer;
}

function configureNotice(options){
  const config=typeof options==='string'?{title:options}:options||{};
  const layer=ensureSiteNotice();
  const secondary=layer.querySelector('.site-notice-secondary');
  const primary=layer.querySelector('.site-notice-action');
  layer.className='site-notice-layer '+(config.tone==='error'?'is-error':config.tone==='success'?'is-success':'is-info');
  layer.querySelector('.site-notice-eyebrow').textContent=config.eyebrow||'LOCA Collection';
  layer.querySelector('#siteNoticeTitle').textContent=config.title||'A quick note.';
  layer.querySelector('.site-notice-copy').textContent=config.message||'';
  primary.textContent=config.action||'Continue';
  secondary.textContent=config.secondaryAction||'Cancel';
  secondary.hidden=!config.secondaryAction;
  return layer;
}

function openNotice(layer,focusSelector){
  layer.classList.add('open');
  document.body.classList.add('lock');
  setTimeout(()=>layer.querySelector(focusSelector)?.focus(),80);
}

function showNotice(options){
  if(siteNoticeResolver)closeNotice(false);
  const layer=configureNotice(options);
  layer.dataset.mode='notice';
  layer.querySelector('.site-notice-secondary').hidden=true;
  openNotice(layer,'.site-notice-action');
}

function askNotice(options){
  if(siteNoticeResolver)closeNotice(false);
  const config=typeof options==='string'?{title:options}:options||{};
  const layer=configureNotice({...config,action:config.action||config.confirm||'Confirm',secondaryAction:config.secondaryAction||'Keep'});
  layer.dataset.mode='confirm';
  openNotice(layer,'.site-notice-secondary');
  return new Promise(resolve=>{siteNoticeResolver=resolve});
}

function closeNotice(result=false){
  const layer=document.getElementById('siteNotice');
  if(!layer)return;
  layer.classList.remove('open');
  delete layer.dataset.mode;
  if(siteNoticeResolver){
    const resolve=siteNoticeResolver;
    siteNoticeResolver=null;
    resolve(Boolean(result));
  }
  if(!document.querySelector('.modal-layer.open,.checkout-modal.open,.bag-drawer.open,.site-notice-layer.open'))document.body.classList.remove('lock');
}

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&document.getElementById('siteNotice')?.classList.contains('open'))closeNotice(false);
});

LOCA.notice=showNotice;
LOCA.ask=askNotice;

function toggleMenu(){
  const nav=document.getElementById('mainNav');
  const button=document.querySelector('.menu-toggle');
  const open=nav?.classList.toggle('is-open');
  button?.setAttribute('aria-expanded',String(!!open));
  document.body.classList.toggle('menu-open',!!open);
}

document.querySelectorAll('#mainNav a').forEach(link=>link.addEventListener('click',()=>{
  document.getElementById('mainNav')?.classList.remove('is-open');
  document.querySelector('.menu-toggle')?.setAttribute('aria-expanded','false');
  document.body.classList.remove('menu-open');
}));

async function subscribe(event){
  event.preventDefault();
  const form=event.currentTarget,msg=document.getElementById('msg');
  if(!LOCA.currentUser){
    openAuth('signup');
    LOCA.notice({eyebrow:'The LOCA list',title:'Create an account to join.',message:'Your verified account email keeps subscriptions private and lets you manage your LOCA details in one place.',action:'Continue'});
    return;
  }
  const input=form.querySelector('input[type="email"]'),registered=LOCA.currentUser.email||'',email=input?.value.trim().toLowerCase();
  if(email!==registered.toLowerCase()){
    LOCA.notice({eyebrow:'The LOCA list',title:'Use your registered email.',message:`Your signed-in LOCA email is ${registered}.`,tone:'error',action:'Update email'});
    if(input)input.value=registered;
    return;
  }
  const button=form.querySelector('button[type="submit"],button:not([type])');
  if(button){button.disabled=true;button.textContent='Joining…';}
  try{
    const{error}=await LOCA.db.from('newsletter_subscriptions').upsert({user_id:LOCA.currentUser.id,email:registered,subscribed:true,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(error)throw error;
    if(msg){msg.textContent="You're on the LOCA list. Watch for the next drop.";msg.className='success-message';msg.style.marginTop='16px';}
    form.reset();
  }catch(error){
    LOCA.notice({eyebrow:'The LOCA list',title:'You were not subscribed.',message:error.message||'Please try again in a moment.',tone:'error',action:'Try again'});
  }finally{
    if(button){button.disabled=false;button.textContent='Join LOCA ↗';}
  }
}

function reveal(){
  document.querySelectorAll('.reveal').forEach(el=>{
    if(el.dataset.revealed)return;
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        entry.target.dataset.revealed='1';
        observer.disconnect();
      }
    }),{threshold:.12});
    observer.observe(el);
  });
}

function ensureSyncPill(){
  return document.getElementById('syncPill')||null;
}

async function checkSupabaseConnection(){
  const pill=ensureSyncPill();
  if(!pill||!window.LOCA?.db)return;
  try{
    pill.classList.remove('error');
    pill.classList.add('loading');
    pill.lastElementChild.textContent='Connecting';
    const{error}=await LOCA.db.from('products').select('id').eq('active',true).limit(1);
    if(error)throw error;
    pill.classList.remove('loading');
    pill.classList.add('ready');
    pill.lastElementChild.textContent='Catalogue live';
  }catch(err){
    console.warn('Catalogue connection check failed',err);
    pill.classList.remove('loading','ready');
    pill.classList.add('error');
    pill.lastElementChild.textContent='Catalogue issue';
  }
}

window.addEventListener('focus',()=>{
  if(window.LOCA?.currentUser&&window.LOCA?.loadCart)LOCA.loadCart();
});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&window.LOCA?.currentUser&&window.LOCA?.loadCart)LOCA.loadCart();
});

window.toggleMenu=toggleMenu;
window.subscribe=subscribe;
window.reveal=reveal;
window.checkSupabaseConnection=checkSupabaseConnection;
window.closeNotice=closeNotice;
window.showNotice=showNotice;
window.askNotice=askNotice;
