window.LOCA=window.LOCA||{};

LOCA.filter='All';
LOCA.money=n=>'PKR '+Number(n||0).toLocaleString('en-PK');
LOCA.normalizeProduct=function(p){
  return {...p,id:p.id,name:p.name||'',cat:p.category||'',category:p.category||'',price:Number(p.price||0),old:p.old_price!=null?Number(p.old_price):null,new:!!p.is_new,description:p.description||'',image:p.image_url||''};
};
LOCA.esc=LOCA.escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
LOCA.safeImage=value=>{
  if(!value||typeof value!=='string')return'assets/product-placeholder.svg';
  const trimmed=value.trim();
  if(trimmed.startsWith('assets/')||trimmed.startsWith('/assets/')||trimmed.startsWith('src/assets/'))return trimmed;
  try{
    const url=new URL(trimmed);
    if(url.protocol==='https:')return url.href;
  }catch{}
  return'assets/product-placeholder.svg';
};

LOCA.productCard=function(p){
  const escape=LOCA.escape,id=Number(p.id),discount=p.old&&p.old>p.price?Math.round((p.old-p.price)/p.old*100):0,admin=LOCA.profile?.role==='admin';
  return `<article class="product" data-description="${escape(p.description||'')}">
    <div class="pic">
      <button class="product-image-button" type="button" onclick="openProduct(${id})" aria-label="View ${escape(p.name)} details">
        <img loading="lazy" src="${escape(LOCA.safeImage(p.image))}" alt="${escape(p.name)}" onerror="this.onerror=null;this.src='assets/product-placeholder.svg'">
      </button>
      <div class="product-badges">${p.new?'<span class="badge new-badge">New arrival</span>':''}${discount>0?`<span class="badge sale-badge">SAVE ${discount}%</span>`:''}</div>
      ${admin?`<button class="heart admin-edit-product" type="button" aria-label="Edit ${escape(p.name)}" onclick="openAdminProductEditor(${id})">✎</button>`:`<button class="heart" type="button" aria-label="Add ${escape(p.name)} to bag" onclick="add(${id})">＋</button>`}
      <button class="quick-view" type="button" onclick="openProduct(${id})">Quick view</button>
    </div>
    <div class="product-info">
      <div class="category-row"><span class="category">${escape(p.cat||'LOCA edit')}</span><span class="delivery-pill">COD in PK</span></div>
      <button class="product-title-button" type="button" onclick="openProduct(${id})"><h3>${escape(p.name)}</h3></button>
      <div class="price">${LOCA.money(p.price)}${p.old&&p.old>p.price?`<span class="old">${LOCA.money(p.old)}</span>`:''}</div>
      ${admin?`<button class="add admin-edit-product" type="button" onclick="openAdminProductEditor(${id})"><span aria-hidden="true">✎</span> Edit in Admin Studio</button>`:`<button class="add" type="button" onclick="add(${id})"><span aria-hidden="true">＋</span> Add to bag</button>`}
    </div>
  </article>`;
};

LOCA.matchesFilter=function(p){
  const category=(p.cat||'').toLowerCase(),filter=LOCA.filter;
  if(filter==='All')return true;
  if(filter==='Sale')return Boolean(p.old&&p.old>p.price);
  if(category===filter.toLowerCase())return true;
  if(filter.includes(' - ')){
    const subcategory=filter.split(' - ')[1].trim().toLowerCase();
    return category.includes(subcategory)||p.name.toLowerCase().includes(subcategory);
  }
  if(filter==='Women')return category.includes('women')||category.includes('woman')||category.includes('ladies');
  if(filter==='Men')return !category.includes('women')&&/\b(men|man|mens|male)\b/.test(category);
  if(filter==='Footwear')return/footwear|shoe|chappal|khussa|sandal|slide|peshawari|loafer|heel/.test(category);
  if(filter==='Accessories')return/accessor|bag|jewell|jewelry|scarf|stole|wallet|belt|cap|clutch|watch/.test(category);
  if(filter==='Fragrance')return/fragrance|perfume|attar|oudh|mist|scent/.test(category);
  if(filter==='Kids')return/kid|teen|boy|girl|child/.test(category);
  return category.includes(filter.toLowerCase());
};

async function loadProducts(){
  try{
    const{data,error}=await LOCA.db.from('products').select('*').eq('active',true).order('id');
    if(error)throw error;
    LOCA.products=(data||[]).map(LOCA.normalizeProduct);
    initStoreUI();
  }catch(error){
    LOCA.products=[];
    initStoreUI();
    console.warn('Production catalogue load failed:',error.message);
  }
  if(window.drawCart)drawCart();
}

function render(){
  const query=(document.getElementById('productSearch')?.value||'').trim().toLowerCase();
  let list=(LOCA.products||[]).filter(LOCA.matchesFilter).filter(p=>!query||`${p.name} ${p.cat} ${p.description||''}`.toLowerCase().includes(query));
  const sort=document.getElementById('sort')?.value||'featured';
  if(sort==='low')list=[...list].sort((a,b)=>a.price-b.price);
  if(sort==='high')list=[...list].sort((a,b)=>b.price-a.price);
  const grid=document.getElementById('grid'),count=document.getElementById('count');
  if(grid)grid.innerHTML=list.length?list.map(LOCA.productCard).join(''):'<div class="search-empty"><h3>No matches just yet.</h3><p>Try another search or choose a different category.</p></div>';
  if(count)count.textContent=`${list.length} product${list.length===1?'':'s'}${LOCA.filter==='All'?'':` · ${LOCA.filter}`}`;
}

function featuredProducts(){
  const products=LOCA.products||[],ordered=[
    ...products.filter(p=>p.old&&p.old>p.price),
    ...products.filter(p=>p.new),
    ...products
  ];
  return ordered.filter((product,index,list)=>list.findIndex(item=>String(item.id)===String(product.id))===index).slice(0,4);
}

function initStoreUI(){
  const filters=document.getElementById('filters');
  if(filters){
    const configured=window.LOCA.CATEGORY_TAXONOMY||[{id:'All',label:'All',subcategories:[]},{id:'Women',label:'Women',subcategories:[]},{id:'Men',label:'Men',subcategories:[]},{id:'Footwear',label:'Footwear',subcategories:[]},{id:'Accessories',label:'Accessories',subcategories:[]}];
    const taxonomy=configured.some(item=>item.id==='Sale')?configured:[...configured,{id:'Sale',label:'Sale',subcategories:[]}];
    let activeMain='All';
    if(LOCA.filter!=='All')activeMain=LOCA.filter.includes(' - ')?LOCA.filter.split(' - ')[0].trim():LOCA.filter;
    const current=taxonomy.find(item=>item.id===activeMain),hasSubcategories=current&&current.subcategories?.length;
    let html='<div class="main-filters">'+taxonomy.map(item=>`<button type="button" class="filter ${item.id===activeMain?'active':''}" data-category="${LOCA.escape(item.id)}" onclick="setFilter(this.dataset.category)">${LOCA.escape(item.label||item.id)}</button>`).join('')+'</div>';
    if(hasSubcategories){
      html+='<div class="sub-filters"><span class="sub-filter-label">Explore '+LOCA.escape(current.label||current.id)+':</span><button class="sub-chip '+(LOCA.filter===activeMain?'active':'')+'" data-category="'+LOCA.escape(activeMain)+'" onclick="setFilter(this.dataset.category)">All '+LOCA.escape(current.label||current.id)+'</button>'+current.subcategories.map(sub=>`<button class="sub-chip ${LOCA.filter===sub.id?'active':''}" data-category="${LOCA.escape(sub.id)}" onclick="setFilter(this.dataset.category)">${LOCA.escape(sub.label)}</button>`).join('')+'</div>';
    }
    filters.innerHTML=html;
  }
  const newGrid=document.getElementById('newGrid');
  if(newGrid)newGrid.innerHTML=LOCA.products.filter(p=>p.new).slice(0,4).map(LOCA.productCard).join('')||'<p class="catalog-empty">New arrivals are on their way. Explore the full collection.</p>';
  const bestGrid=document.getElementById('bestGrid');
  if(bestGrid)bestGrid.innerHTML=featuredProducts().map(LOCA.productCard).join('')||'<p class="catalog-empty">The live edit is being prepared.</p>';
  render();
  window.loadApprovedReviews?.();
  if(window.reveal)reveal();
}

function setFilter(category){LOCA.filter=category;initStoreUI();}
function setFilterFromLink(category){
  setTimeout(()=>{
    LOCA.filter=category;
    initStoreUI();
    document.getElementById('shop')?.scrollIntoView({behavior:'smooth'});
  },50);
}
function showSale(){setFilterFromLink('Sale');}
function searchProducts(){
  document.getElementById('shop')?.scrollIntoView({behavior:'smooth'});
  setTimeout(()=>document.getElementById('productSearch')?.focus({preventScroll:true}),450);
}

window.loadProducts=loadProducts;
window.render=render;
window.setFilter=setFilter;
window.setFilterFromLink=setFilterFromLink;
window.showSale=showSale;
window.searchProducts=searchProducts;
