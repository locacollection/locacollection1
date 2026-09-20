window.LOCA = window.LOCA || {};

LOCA.filter = "All";
LOCA.money = n => "PKR " + Number(n || 0).toLocaleString("en-PK");

LOCA.normalizeProduct = function(p, i){
  return {
    ...p,
    id: p.id,
    name: p.name,
    cat: p.category || p.cat || "",
    price: Number(p.price),
    old: p.old_price == null ? null : Number(p.old_price),
    new: !!(p.is_new ?? p.new),
    image: p.image_url || p.image || ""
  };
};

LOCA.escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
LOCA.safeImage = value => {
  try { const url = new URL(value); if(url.protocol === 'https:') return url.href; } catch {}
  return 'assets/product-placeholder.svg';
};
LOCA.productCard = function(p){
  const e=LOCA.escape; const id=Number(p.id);
  return `<article class="product">
    <div class="pic">
      <img loading="lazy" src="${e(LOCA.safeImage(p.image))}" alt="${e(p.name)}" onerror="this.onerror=null;this.src='assets/product-placeholder.svg'">
      ${p.new ? '<span class="badge">New</span>' : ''}
      <button class="heart" aria-label="Add ${e(p.name)} to bag" onclick="add(${id})">+</button>
    </div>
    <div class="product-info">
      <span class="category">${e(p.cat)}</span>
      <h3>${e(p.name)}</h3>
      <div class="price">${LOCA.money(p.price)}${p.old ? `<span class="old">${LOCA.money(p.old)}</span>` : ""}</div>
      ${p.description ? `<details class="product-description"><summary>Product details</summary><p>${e(p.description)}</p></details>` : ''}
      <button class="add" onclick="add(${id})">Add to bag +</button>
    </div>
  </article>`;
};

LOCA.matchesFilter = function(p){
  const c = (p.cat || "").toLowerCase();
  if(LOCA.filter === "All") return true;
  if(LOCA.filter === "Women") return c.includes("women") || c.includes("woman") || c.includes("ladies");
  if(LOCA.filter === "Men") return /\b(men|man|mens|male)\b/.test(c);
  if(LOCA.filter === "Footwear") return /footwear|shoe|chappal|khussa|sandal|slide|peshawari/.test(c);
  if(LOCA.filter === "Accessories") return /accessor|bag|jewell|jewelry|scarf|stole|wallet|belt|cap|fragrance|perfume/.test(c);
  return c === LOCA.filter.toLowerCase();
};

async function loadProducts(){
  try {
    const {data,error}=await LOCA.db.from("products").select("*").eq("active",true).order("id");
    if(error)throw error;
    LOCA.products=(data||[]).map(LOCA.normalizeProduct);
    initStoreUI();
  } catch(error) {
    LOCA.products=[];
    initStoreUI();
    document.getElementById("grid").innerHTML='<div class="search-empty"><h3>Products are taking a little longer.</h3><p>Please try again in a moment.</p><button class="btn" onclick="loadProducts()">Try again</button></div>';
    document.getElementById("newGrid").textContent='New arrivals are temporarily unavailable.';
    console.warn('Product load failed:',error.message);
  }
  if(window.drawCart)drawCart();
}

function render(){
  const query = (document.getElementById("productSearch")?.value || "").trim().toLowerCase();
  let list = (LOCA.products || []).filter(LOCA.matchesFilter).filter(p => !query || `${p.name} ${p.cat} ${p.description || ""}`.toLowerCase().includes(query));
  const sort = document.getElementById("sort")?.value || "featured";
  if(sort === "low") list.sort((a,b) => a.price - b.price);
  if(sort === "high") list.sort((a,b) => b.price - a.price);
  const grid = document.getElementById("grid");
  const count = document.getElementById("count");
  if(grid) grid.innerHTML = list.length ? list.map(LOCA.productCard).join("") : '<div class="search-empty"><h3>No matches just yet.</h3><p>Try another search or choose a different category.</p></div>';
  if(count) count.textContent = list.length + " products";
}

function initStoreUI(){
  const filters = document.getElementById("filters");
  if(filters){
    const categories=[...new Set(['All','Women','Men','Footwear','Accessories',...LOCA.products.map(p=>p.cat).filter(Boolean)])];
    filters.innerHTML=categories.map(x=>`<button class="filter ${x===LOCA.filter?'active':''}" data-category="${LOCA.escape(x)}" onclick="setFilter(this.dataset.category,this)">${LOCA.escape(x)}</button>`).join('');
  }
  const newGrid = document.getElementById("newGrid");
  if(newGrid) newGrid.innerHTML = LOCA.products.filter(p => p.new).slice(0,4).map(LOCA.productCard).join("") || '<p class="catalog-empty">New arrivals are on their way. Explore the collection below.</p>';
  render();
  reveal();
}

function setFilter(x, button){
  LOCA.filter = x;
  document.querySelectorAll(".filter").forEach(e => e.classList.remove("active"));
  if(button) button.classList.add("active");
  render();
}

function setFilterFromLink(x){
  setTimeout(() => {
    const button = [...document.querySelectorAll(".filter")].find(e => e.textContent === x);
    setFilter(x, button);
  }, 50);
}

function searchProducts(){
  document.getElementById("shop")?.scrollIntoView({behavior:"smooth"});
  document.getElementById("productSearch")?.focus({preventScroll:true});
}

window.loadProducts = loadProducts;
window.render = render;
window.setFilter = setFilter;
window.setFilterFromLink = setFilterFromLink;
window.searchProducts = searchProducts;

