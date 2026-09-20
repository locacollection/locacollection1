window.LOCA = window.LOCA || {};

LOCA.filter = "All";
LOCA.money = n => "PKR " + Number(n || 0).toLocaleString("en-PK");

LOCA.normalizeProduct = function(p, i){
  const catalogItem = (LOCA.CATALOG_PRODUCTS || []).find(c => Number(c.id) === Number(p.id));

  // Detect if product is using older generic/European/food unsplash photos or placeholder
  const isRejectedOldImg = !p.image_url ||
    p.image_url.includes('unsplash.com') ||
    p.image_url.includes('placeholder') ||
    p.image_url.includes('photo-');

  const name = (catalogItem && (!p.name || p.name.includes("Relaxed Kurta") || p.name.includes("Tailored Shirt") || p.name.includes("Draped Dress") || p.name.includes("Classic Blazer") || p.name.includes("Mini Bag") || p.name.includes("Essential Tee") || p.name.includes("Satin Skirt") || p.name.includes("Wide-Leg Trouser") || p.name.includes("Overshirt") || p.name.includes("Co-Ord Set") || p.name.includes("Silk Edge Scarf") || p.name.includes("Everyday Tote")))
    ? catalogItem.name
    : (p.name || catalogItem?.name || "");

  const cat = (catalogItem && (!p.category || p.category === "Women" || p.category === "Men" || p.category === "Accessories"))
    ? catalogItem.category
    : (p.category || p.cat || catalogItem?.category || "");

  const desc = (catalogItem && (!p.description || p.description.length < 30 || p.description.includes("Everyday") || p.description.includes("Relaxed")))
    ? catalogItem.description
    : (p.description || catalogItem?.description || "");

  // Always prefer the curated authentic Pakistani image if the DB has an old unplash image
  const img = (catalogItem && catalogItem.image_url && isRejectedOldImg)
    ? catalogItem.image_url
    : (p.image_url || catalogItem?.image_url || p.image || "");

  return {
    ...p,
    id: p.id,
    name: name,
    cat: cat,
    category: cat,
    price: Number(p.price || catalogItem?.price || 0),
    old: (p.old_price != null ? Number(p.old_price) : (catalogItem?.old_price ?? null)),
    new: !!(p.is_new ?? p.new ?? catalogItem?.is_new),
    description: desc,
    image: img
  };
};

LOCA.esc = LOCA.escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
LOCA.safeImage = value => {
  if (!value || typeof value !== 'string') return 'assets/product-placeholder.svg';
  const trimmed = value.trim();
  if (trimmed.startsWith('assets/') || trimmed.startsWith('/assets/') || trimmed.startsWith('src/assets/')) {
    return trimmed;
  }
  try { const url = new URL(trimmed); if(url.protocol === 'https:') return url.href; } catch {}
  return 'assets/product-placeholder.svg';
};
LOCA.productCard = function(p){
  const e=LOCA.escape; const id=Number(p.id);
  const discount = (p.old && p.old > p.price) ? Math.round(((p.old - p.price) / p.old) * 100) : 0;
  return `<article class="product">
    <div class="pic">
      <img loading="lazy" src="${e(LOCA.safeImage(p.image))}" alt="${e(p.name)}" onerror="this.onerror=null;this.src='assets/product-placeholder.svg'">
      <div class="product-badges">
        ${p.new ? '<span class="badge new-badge">New Arrival</span>' : ''}
        ${discount > 0 ? `<span class="badge sale-badge">SAVE ${discount}%</span>` : ''}
      </div>
      <button class="heart" aria-label="Add ${e(p.name)} to bag" onclick="add(${id})">+</button>
    </div>
    <div class="product-info">
      <div class="category-row">
        <span class="category">${e(p.cat)}</span>
        <span class="delivery-pill">COD in PK</span>
      </div>
      <h3>${e(p.name)}</h3>
      <div class="price">${LOCA.money(p.price)}${p.old ? `<span class="old">${LOCA.money(p.old)}</span>` : ""}</div>
      ${p.description ? `<details class="product-description"><summary>Fabric &amp; details</summary><p>${e(p.description)}</p></details>` : ''}
      <button class="add" onclick="add(${id})">Add to bag +</button>
    </div>
  </article>`;
};

LOCA.matchesFilter = function(p){
  const c = (p.cat || "").toLowerCase();
  const filter = LOCA.filter;
  if(filter === "All") return true;

  // Exact match first (handles specific subcategories like "Footwear - Men", "Accessories - Women", etc.)
  if(c === filter.toLowerCase()) return true;

  // If filtering by a specific subcategory (e.g. contains " - ")
  if(filter.includes(" - ")) {
    const parts = filter.split(" - ");
    const main = parts[0].trim().toLowerCase();
    const sub = parts[1].trim().toLowerCase();
    
    // Check if product's category matches or description/name has relevant subcategory keywords
    if(c.includes(sub)) return true;
    if(filter === "Footwear - Men") {
      return (c.includes("footwear") || c.includes("shoe") || c.includes("chappal") || c.includes("khussa")) && (c.includes("men") || /\b(men|man|mens|male)\b/.test(p.name.toLowerCase()));
    }
    if(filter === "Footwear - Women") {
      return (c.includes("footwear") || c.includes("shoe") || c.includes("khussa") || c.includes("heel") || c.includes("sandal")) && (c.includes("women") || /\b(women|woman|ladies)\b/.test(p.name.toLowerCase()));
    }
    if(filter === "Accessories - Men") {
      return (c.includes("accessor") || c.includes("wallet") || c.includes("belt") || c.includes("watch")) && (c.includes("men") || /\b(men|man|mens|male)\b/.test(p.name.toLowerCase()));
    }
    if(filter === "Accessories - Women") {
      return (c.includes("accessor") || c.includes("bag") || c.includes("clutch") || c.includes("jewel") || c.includes("scarf")) && !c.includes("men") && !/\b(men|man|mens|male)\b/.test(p.name.toLowerCase());
    }
    return c.includes(sub) || p.name.toLowerCase().includes(sub);
  }

  // Main category filters
  if(filter === "Women") {
    // Must be women's fashion and NOT explicitly men's footwear/accessories
    if(c.includes("men") && !c.includes("women")) return false;
    return c.includes("women") || c.includes("woman") || c.includes("ladies");
  }
  if(filter === "Men") {
    if(c.includes("women") || c.includes("woman") || c.includes("ladies")) return false;
    return /\b(men|man|mens|male)\b/.test(c);
  }
  if(filter === "Footwear") return /footwear|shoe|chappal|khussa|sandal|slide|peshawari|loafer|heel/.test(c);
  if(filter === "Accessories") return /accessor|bag|jewell|jewelry|scarf|stole|wallet|belt|cap|clutch|watch/.test(c);
  if(filter === "Fragrance") return /fragrance|perfume|attar|oudh|mist|scent/.test(c);
  if(filter === "Kids") return /kid|teen|boy|girl|child/.test(c);

  return c.includes(filter.toLowerCase());
};

async function loadProducts(){
  const deletedIds = new Set((() => {
    try { return JSON.parse(localStorage.getItem('loca_deleted_product_ids') || '[]').map(String); } catch { return []; }
  })());

  try {
    const {data,error}=await LOCA.db.from("products").select("*").eq("active",true).order("id");
    if(error)throw error;
    
    // Only render active database products. Catalog-only fallback items cannot be
    // saved to cart_items because that table enforces a products(id) foreign key.
    const dbProducts = (data || []).filter(p => !deletedIds.has(String(p.id)));
    LOCA.products = dbProducts.map(LOCA.normalizeProduct);
    initStoreUI();
  } catch(error) {
    // Do not render catalog-only demo items when the database is unavailable:
    // they cannot be checked out or persisted in an account cart.
    LOCA.products = [];
    initStoreUI();
    console.warn('Product load failed:', error.message);
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
    const taxonomy = window.LOCA.CATEGORY_TAXONOMY || [
      { id: "All", label: "All", subcategories: [] },
      { id: "Women", label: "Women", subcategories: [] },
      { id: "Men", label: "Men", subcategories: [] },
      { id: "Footwear", label: "Footwear", subcategories: [] },
      { id: "Accessories", label: "Accessories", subcategories: [] }
    ];

    // Determine currently active main category (handles when subcategory is chosen)
    let activeMain = "All";
    if (LOCA.filter !== "All") {
      if (LOCA.filter.includes(" - ")) {
        activeMain = LOCA.filter.split(" - ")[0].trim();
      } else {
        const found = taxonomy.find(t => t.id === LOCA.filter);
        if (found) activeMain = found.id;
        else activeMain = LOCA.filter;
      }
    }

    const currentTaxon = taxonomy.find(t => t.id === activeMain);
    const hasSubcategories = currentTaxon && currentTaxon.subcategories && currentTaxon.subcategories.length > 0;

    let html = `<div class="main-filters">`;
    html += taxonomy.map(x => {
      const isMainActive = x.id === activeMain;
      return `<button type="button" class="filter ${isMainActive ? 'active' : ''}" data-category="${LOCA.escape(x.id)}" onclick="setFilter(this.dataset.category, this)">${LOCA.escape(x.label || x.id)}</button>`;
    }).join('');
    html += `</div>`;

    if (hasSubcategories) {
      html += `<div class="sub-filters" id="subFilters">`;
      html += `<span class="sub-filter-label">Explore ${LOCA.escape(currentTaxon.label || currentTaxon.id)}:</span>`;
      html += `<button type="button" class="sub-chip ${LOCA.filter === activeMain ? 'active' : ''}" data-category="${LOCA.escape(activeMain)}" onclick="setFilter(this.dataset.category, this)">All ${LOCA.escape(currentTaxon.label || currentTaxon.id)}</button>`;
      html += currentTaxon.subcategories.map(sub => {
        const isSubActive = LOCA.filter === sub.id;
        return `<button type="button" class="sub-chip ${isSubActive ? 'active' : ''}" data-category="${LOCA.escape(sub.id)}" onclick="setFilter(this.dataset.category, this)">${LOCA.escape(sub.label)}</button>`;
      }).join('');
      html += `</div>`;
    }

    filters.innerHTML = html;
  }
  const newGrid = document.getElementById("newGrid");
  if(newGrid) newGrid.innerHTML = LOCA.products.filter(p => p.new).slice(0,4).map(LOCA.productCard).join("") || '<p class="catalog-empty">New arrivals are on their way. Explore the collection below.</p>';
  render();
  reveal();
}

function setFilter(x, button){
  LOCA.filter = x;
  initStoreUI();
}

function setFilterFromLink(x){
  setTimeout(() => {
    LOCA.filter = x;
    initStoreUI();
    document.getElementById("shop")?.scrollIntoView({behavior:"smooth"});
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

