window.LOCA=window.LOCA||{};

let activeProduct=null;
let activeProductQuantity=1;
let approvedReviews=[];
let reviewsLoading=false;
let heroIndex=0;
let heroTimer=null;

function starRating(rating){
  const value=Math.max(0,Math.min(5,Number(rating)||0));
  return `<span class="review-stars" aria-label="${value} out of 5 stars">${'★'.repeat(value)}${'☆'.repeat(5-value)}</span>`;
}

function productReviews(productId){
  return approvedReviews.filter(review=>String(review.product_id)===String(productId));
}

function renderReviewCards(){
  const grid=document.getElementById('reviewGrid');
  if(!grid)return;
  if(!approvedReviews.length){
    grid.innerHTML='<div class="review-empty"><span>☆ ☆ ☆ ☆ ☆</span><strong>Customer notes are coming.</strong><p>Approved reviews will appear here after verified purchases.</p></div>';
    return;
  }
  grid.innerHTML=approvedReviews.slice(0,6).map(review=>{
    const product=(LOCA.products||[]).find(item=>String(item.id)===String(review.product_id));
    return `<article class="review-card">
      ${starRating(review.rating)}
      <blockquote>“${LOCA.escape(review.body)}”</blockquote>
      <div><strong>${LOCA.escape(review.display_name)}</strong><span>${LOCA.escape(product?.name||'LOCA purchase')} · Verified delivery</span></div>
    </article>`;
  }).join('');
}

async function loadApprovedReviews(){
  if(reviewsLoading)return;
  reviewsLoading=true;
  try{
    const{data,error}=await LOCA.db.from('product_reviews').select('id,product_id,display_name,rating,body,created_at').eq('approved',true).order('created_at',{ascending:false}).limit(24);
    if(error)throw error;
    approvedReviews=data||[];
    renderReviewCards();
    if(activeProduct)renderProductReviews(activeProduct.id);
  }catch(error){
    console.warn('Approved reviews could not be loaded',error);
    approvedReviews=[];
    renderReviewCards();
  }finally{
    reviewsLoading=false;
  }
}

function renderProductReviews(productId){
  const box=document.getElementById('productReviewList');
  const rating=document.getElementById('productModalRating');
  if(!box||!rating)return;
  const reviews=productReviews(productId);
  if(!reviews.length){
    rating.textContent='No approved reviews yet';
    box.innerHTML='<p class="product-review-empty">Be the first delivered customer to review this piece.</p>';
    return;
  }
  const average=reviews.reduce((total,review)=>total+Number(review.rating||0),0)/reviews.length;
  rating.innerHTML=`${starRating(Math.round(average))}<span>${average.toFixed(1)} · ${reviews.length} review${reviews.length===1?'':'s'}</span>`;
  box.innerHTML=reviews.map(review=>`<article><div>${starRating(review.rating)}<time>${new Date(review.created_at).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})}</time></div><p>${LOCA.escape(review.body)}</p><strong>${LOCA.escape(review.display_name)} · Verified delivery</strong></article>`).join('');
}

function renderRelatedProducts(product){
  const box=document.getElementById('relatedProducts');
  if(!box)return;
  const products=(LOCA.products||[]).filter(item=>String(item.id)!==String(product.id));
  const sameCategory=products.filter(item=>item.cat===product.cat);
  const related=[...sameCategory,...products].filter((item,index,list)=>list.findIndex(candidate=>String(candidate.id)===String(item.id))===index).slice(0,3);
  box.innerHTML=related.map(item=>`<button type="button" onclick="openProduct(${Number(item.id)})"><img src="${LOCA.escape(LOCA.safeImage(item.image))}" alt=""><span><b>${LOCA.escape(item.name)}</b><small>${LOCA.money(item.price)}</small></span></button>`).join('')||'<small>More pieces are being prepared.</small>';
}

function openProduct(productId){
  const product=(LOCA.products||[]).find(item=>String(item.id)===String(productId));
  const modal=document.getElementById('productModal');
  if(!product||!modal)return;
  activeProduct=product;
  activeProductQuantity=1;
  const discount=product.old&&product.old>product.price?Math.round((product.old-product.price)/product.old*100):0;
  const image=document.getElementById('productModalImage');
  image.src=LOCA.safeImage(product.image);
  image.alt=product.name;
  image.onerror=()=>{image.onerror=null;image.src='assets/product-placeholder.svg';};
  document.getElementById('productModalCategory').textContent=`LOCA / ${product.cat||'COLLECTION'}`;
  document.getElementById('productModalName').textContent=product.name;
  document.getElementById('productModalPrice').innerHTML=`<strong>${LOCA.money(product.price)}</strong>${product.old&&product.old>product.price?`<span>${LOCA.money(product.old)}</span>`:''}`;
  document.getElementById('productModalDescription').textContent=product.description||'A considered piece from the live LOCA collection.';
  document.getElementById('productModalDetails').textContent=product.description||'Detailed fabric, sizing and care information will be added by the LOCA catalogue team. Contact the store before ordering if you need clarification.';
  document.getElementById('productModalQuantity').textContent='1';
  const badge=document.getElementById('productModalBadge');
  badge.hidden=!discount&&!product.new;
  badge.textContent=discount?`Save ${discount}%`:'New arrival';
  const addButton=document.getElementById('productAddButton');
  const buyButton=document.getElementById('productBuyButton');
  addButton.onclick=async()=>{
    addButton.disabled=true;
    addButton.textContent='Adding…';
    try{
      closeProduct();
      await addQuantity(product.id,activeProductQuantity);
    }catch(error){
      LOCA.notice({eyebrow:'Your bag',title:'This piece was not added.',message:error.message||'Please try again.',tone:'error',action:'Close'});
    }finally{
      addButton.disabled=false;
      addButton.textContent='Add to bag';
    }
  };
  buyButton.onclick=async()=>{
    buyButton.disabled=true;
    buyButton.textContent='Preparing…';
    try{
      await addQuantity(product.id,activeProductQuantity,{open:false});
      closeProduct();
      await openCheckout();
    }catch(error){
      LOCA.notice({eyebrow:'Checkout',title:'Checkout could not start.',message:error.message||'Please try again.',tone:'error',action:'Close'});
    }finally{
      buyButton.disabled=false;
      buyButton.textContent='Buy it now';
    }
  };
  document.getElementById('productReviewMessage').textContent='';
  document.getElementById('productReviewForm')?.reset();
  renderProductReviews(product.id);
  renderRelatedProducts(product);
  modal.classList.add('open');
  document.body.classList.add('lock');
  setTimeout(()=>document.querySelector('.product-modal-close')?.focus(),60);
}

function closeProduct(){
  document.getElementById('productModal')?.classList.remove('open');
  if(!document.querySelector('.modal-layer.open,.checkout-modal.open,.bag-drawer.open,.site-notice-layer.open'))document.body.classList.remove('lock');
}

function changeProductQuantity(delta){
  activeProductQuantity=Math.max(1,Math.min(20,activeProductQuantity+Number(delta||0)));
  const value=document.getElementById('productModalQuantity');
  if(value)value.textContent=String(activeProductQuantity);
}

async function submitProductReview(event){
  event.preventDefault();
  const message=document.getElementById('productReviewMessage');
  const button=event.currentTarget.querySelector('button[type="submit"]');
  if(!activeProduct)return;
  if(!LOCA.currentUser){
    closeProduct();
    openAuth('signin');
    LOCA.notice({eyebrow:'Product review',title:'Sign in to review your purchase.',message:'Reviews are available after the product has been delivered.',action:'Continue'});
    return;
  }
  button.disabled=true;
  button.textContent='Sending…';
  message.textContent='Checking your delivered order…';
  try{
    await LOCA.ensureProfile();
    const displayName=LOCA.profile?.full_name||LOCA.currentUser.user_metadata?.full_name||LOCA.currentUser.email?.split('@')[0]||'LOCA customer';
    const{error}=await LOCA.db.from('product_reviews').insert({
      product_id:Number(activeProduct.id),
      user_id:LOCA.currentUser.id,
      display_name:displayName,
      rating:Number(document.getElementById('productReviewRating').value),
      body:document.getElementById('productReviewBody').value.trim()
    });
    if(error)throw error;
    event.currentTarget.reset();
    message.textContent='Thank you. Your review is waiting for admin approval.';
  }catch(error){
    message.textContent=error.message?.includes('row-level security')?'Reviews can only be sent after this product has been delivered to your account.':(error.message||'Your review could not be sent.');
  }finally{
    button.disabled=false;
    button.textContent='Send for approval';
  }
}

async function openStoreInfo(key){
  const modal=document.getElementById('infoModal'),title=document.getElementById('infoModalTitle'),body=document.getElementById('infoModalBody');
  if(!modal||!title||!body)return;
  modal.classList.add('open');
  document.body.classList.add('lock');
  title.textContent='Store information';
  body.textContent='Loading the latest information…';
  try{
    LOCA.storeContent=LOCA.storeContent||{};
    let content=LOCA.storeContent[key];
    if(!content){
      const{data,error}=await LOCA.db.from('store_content').select('key,title,body,updated_at').eq('key',key).maybeSingle();
      if(error)throw error;
      content=data;
      if(content)LOCA.storeContent[key]=content;
    }
    if(!content)throw new Error('This information has not been published yet.');
    title.textContent=content.title;
    body.textContent=content.body;
  }catch(error){
    title.textContent='Information unavailable';
    body.textContent=error.message||'Please try again in a moment.';
  }
}

function closeStoreInfo(){
  document.getElementById('infoModal')?.classList.remove('open');
  if(!document.querySelector('.modal-layer.open,.checkout-modal.open,.bag-drawer.open,.site-notice-layer.open'))document.body.classList.remove('lock');
}

function setHeroSlide(index){
  const slides=[...document.querySelectorAll('.hero-slide')],dots=[...document.querySelectorAll('[data-hero-slide]')];
  if(!slides.length)return;
  heroIndex=(Number(index)+slides.length)%slides.length;
  slides.forEach((slide,position)=>{
    const active=position===heroIndex;
    slide.classList.toggle('is-active',active);
    slide.setAttribute('aria-hidden',String(!active));
  });
  dots.forEach((dot,position)=>dot.classList.toggle('is-active',position===heroIndex));
  const counter=document.getElementById('heroCounter');
  if(counter)counter.textContent=`${String(heroIndex+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
}

function startHero(){
  clearInterval(heroTimer);
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  heroTimer=setInterval(()=>setHeroSlide(heroIndex+1),5600);
}

function initExperience(){
  document.querySelectorAll('[data-hero-slide]').forEach(button=>button.addEventListener('click',()=>{setHeroSlide(button.dataset.heroSlide);startHero();}));
  const gallery=document.getElementById('heroGallery');
  gallery?.addEventListener('mouseenter',()=>clearInterval(heroTimer));
  gallery?.addEventListener('mouseleave',startHero);
  document.getElementById('productReviewForm')?.addEventListener('submit',submitProductReview);
  document.getElementById('productModal')?.addEventListener('click',event=>{if(event.target.id==='productModal')closeProduct();});
  document.getElementById('infoModal')?.addEventListener('click',event=>{if(event.target.id==='infoModal')closeStoreInfo();});
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(document.getElementById('productModal')?.classList.contains('open'))closeProduct();
    if(document.getElementById('infoModal')?.classList.contains('open'))closeStoreInfo();
  });
  setHeroSlide(0);
  startHero();
}

window.openProduct=openProduct;
window.closeProduct=closeProduct;
window.changeProductQuantity=changeProductQuantity;
window.loadApprovedReviews=loadApprovedReviews;
window.openStoreInfo=openStoreInfo;
window.closeStoreInfo=closeStoreInfo;

import('./navbar.js').catch(error=>console.warn('Navbar access check could not start:',error));

document.addEventListener('DOMContentLoaded',async()=>{
  initExperience();
  try{
    LOCA.cart={};
    await loadProducts();
    drawCart();
    reveal();
    checkSupabaseConnection();
    await initAuth();
  }catch(error){
    console.error('LOCA initialization failed:',error);
  }
});
