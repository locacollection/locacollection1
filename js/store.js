window.LOCA = window.LOCA || {};

LOCA.fallbackProducts = [
  {id:1,name:"Noor Cotton 3-Piece Suit",cat:"Women",price:6490,old:null,new:true},
  {id:2,name:"Aariz Classic Kurta",cat:"Men",price:3990,old:null,new:true},
  {id:3,name:"Maira Embroidered 3-Piece",cat:"Women",price:11990,old:13990,new:true},
  {id:4,name:"Safa Printed Lawn 2-Piece",cat:"Women",price:8290,old:null,new:false},
  {id:5,name:"Rayan Kameez Shalwar",cat:"Men",price:8990,old:null,new:true},
  {id:6,name:"Zoya Ready-to-Wear Kurti",cat:"Women",price:5490,old:null,new:false},
  {id:7,name:"Naveed Formal Waistcoat",cat:"Men",price:8990,old:9990,new:false},
  {id:8,name:"Mina Structured Handbag",cat:"Accessories",price:5990,old:null,new:true},
  {id:9,name:"Resham Printed Dupatta",cat:"Accessories",price:2990,old:null,new:false},
  {id:10,name:"Ayla Everyday Tote",cat:"Accessories",price:6990,old:null,new:false},
  {id:11,name:"Hadi Essential Shalwar",cat:"Men",price:3490,old:null,new:true},
  {id:12,name:"Iris Embroidered Khussa",cat:"Footwear",price:4490,old:null,new:true},
  {id:13,name:"Sultan Peshawari Chappal",cat:"Footwear",price:4990,old:null,new:false},
  {id:14,name:"Mina Leather Slides",cat:"Footwear",price:3990,old:null,new:false},
  {id:15,name:"Areeba Gold-Tone Earrings",cat:"Accessories",price:2490,old:null,new:true},
  {id:16,name:"Noor Signature Fragrance",cat:"Accessories",price:4990,old:null,new:false}
];

LOCA.images = [
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=900&q=85"
];

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
    image: p.image_url || p.image || LOCA.images[i % LOCA.images.length]
  };
};

LOCA.productCard = function(p){
  return `<article class="product">
    <div class="pic">
      <img loading="lazy" src="${p.image || LOCA.images[0]}" alt="${p.name}" onerror="this.src='${LOCA.images[0]}'">
      ${p.new ? '<span class="badge">New</span>' : ''}
      <button class="heart" aria-label="Add to bag" onclick="event.stopPropagation();add(${p.id})">+</button>
    </div>
    <div class="product-info">
      <span class="category">${p.cat}</span>
      <h3>${p.name}</h3>
      <div class="price">${LOCA.money(p.price)}${p.old ? `<span class="old">${LOCA.money(p.old)}</span>` : ""}</div>
      <button class="add" onclick="add(${p.id})">Add to bag +</button>
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
  const {data, error} = await LOCA.db.from("products").select("*").eq("active", true).order("id");
  if(error || !data?.length){
    console.warn("Using fallback products:", error?.message || "No active products");
    LOCA.products = LOCA.fallbackProducts.map((p, i) => ({...p, image: LOCA.images[i % LOCA.images.length]}));
  } else {
    LOCA.products = data.map(LOCA.normalizeProduct);
  }
  initStoreUI();
  if(window.drawCart) drawCart();
}

function render(){
  const query = (document.getElementById("productSearch")?.value || "").trim().toLowerCase();
  let list = (LOCA.products || []).filter(LOCA.matchesFilter).filter(p => !query || `${p.name} ${p.cat}`.toLowerCase().includes(query));
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
    filters.innerHTML = ["All","Women","Men","Footwear","Accessories"]
      .map(x => `<button class="filter ${x === "All" ? "active" : ""}" onclick="setFilter('${x}',this)">${x}</button>`).join("");
  }
  const newGrid = document.getElementById("newGrid");
  if(newGrid) newGrid.innerHTML = LOCA.products.filter(p => p.new).slice(0,4).map(LOCA.productCard).join("");
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

